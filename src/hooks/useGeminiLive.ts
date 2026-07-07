/**
 * useGeminiLive — Browser-side Gemini Live API hook
 *
 * Manages the full lifecycle of a Live API session:
 *  - Ephemeral token auth (API key stays server-side)
 *  - WebSocket connection to gemini-3.1-flash-live-preview
 *  - Mic capture → PCM 16kHz → sendRealtimeInput
 *  - Receive audio → PCM 24kHz → AudioContext playback
 *  - Transcription callbacks for chat UI streaming
 *  - Tool call execution via /api/live-tool
 *  - Interruption handling (barge-in)
 *  - History context seeding via sendClientContent
 *  - Graceful error handling with fallback callback
 *
 * Audio format per docs:
 *   Input:  16-bit PCM, 16kHz, little-endian, mono
 *   Output: 16-bit PCM, 24kHz, little-endian, mono
 *
 * Session limits:
 *   Audio-only: 15 minutes (no compression)
 *   Audio+video: 2 minutes
 *   Connection lifetime: ~10 minutes (use session resumption)
 */

import { useRef, useCallback, useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';

// ── Types ────────────────────────────────────────────────────────────────────

export type LiveState = 'idle' | 'connecting' | 'active' | 'disconnecting' | 'error';

export interface TranscriptEntry {
  id: number;
  role: 'user' | 'model';
  text: string;
}

export interface LiveCallbacks {
  /** Called when user speech is transcribed (streaming, partial or final) */
  onUserTranscript: (text: string) => void;
  /** Called when Gemini's response is transcribed (streaming, partial or final) */
  onModelTranscript: (text: string) => void;
  /**
   * Called when a role's turn ends — the consumer should stop appending
   * further fragments to the current message and start a new one on the
   * next transcript for that role. Fired for 'user' when the model starts
   * responding (role switch), and for 'model' on turnComplete/interrupted.
   */
  onTurnComplete?: (role: 'user' | 'model') => void;
  /** Called when a tool call is received from the model */
  onToolCall?: (name: string, args: Record<string, unknown>) => void;
  /** Called when the session ends normally */
  onEnd?: () => void;
  /** Called on error — consumer should fall back to text chat */
  onError?: (message: string, shouldFallback: boolean) => void;
}

export interface UseGeminiLiveReturn {
  state: LiveState;
  connect: (opts: { systemPrompt?: string; history?: Array<{ role: string; content: string }> }) => Promise<void>;
  disconnect: () => void;
  sendText: (text: string) => void;
  toggleMic: () => void;
  isMuted: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Decode base64 PCM 24kHz 16-bit LE to Float32Array for AudioContext playback */
function decodePcm24k(base64: string): Float32Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const int16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / (int16[i] < 0 ? 0x8000 : 0x7FFF);
  }
  return float32;
}

/** Encode Int16Array to base64 for sending to Gemini */
function encodePcm16ToBase64(int16: Int16Array): string {
  const bytes = new Uint8Array(int16.buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// ── Audio Worklet Processor (inline) ─────────────────────────────────────────
// Captures mic audio as raw PCM 16-bit LE at 16kHz and sends chunks to main thread.
// Buffer size 2048 samples = ~128ms at 16kHz — good balance of latency and overhead.
const WORKLET_CODE = `
class WasiLiveWorklet extends AudioWorkletProcessor {
  buffer = new Int16Array(2048);
  writeIdx = 0;

  process(inputs) {
    if (!inputs[0]?.length) return true;
    const channel = inputs[0][0];
    for (let i = 0; i < channel.length; i++) {
      const s = Math.max(-1, Math.min(1, channel[i]));
      this.buffer[this.writeIdx++] = s < 0 ? s * 32768 : s * 32767;
      if (this.writeIdx >= this.buffer.length) {
        this.port.postMessage({ event: 'chunk', data: this.buffer.slice(0, this.writeIdx).buffer });
        this.writeIdx = 0;
      }
    }
    return true;
  }
}
registerProcessor('wasi-live-worklet', WasiLiveWorklet);
`;

// ── Session timeout (15 min audio-only limit per docs) ───────────────────────
const SESSION_MAX_MS = 14 * 60 * 1000; // 14 min (1 min buffer before 15 min limit)

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useGeminiLive(callbacks: LiveCallbacks): UseGeminiLiveReturn {
  const [state, setState] = useState<LiveState>('idle');
  const [isMuted, setIsMuted] = useState(false);

  // Refs to avoid stale closures in async callbacks
  const sessionRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const playbackQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);
  const nextPlayTimeRef = useRef(0);
  const sessionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMutedRef = useRef(false);
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  // Keep isMutedRef in sync with state
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

  // ── Audio playback queue ──────────────────────────────────────────────────
  const playNextChunk = useCallback(() => {
    if (isPlayingRef.current || playbackQueueRef.current.length === 0) return;
    isPlayingRef.current = true;

    const ctx = audioCtxRef.current;
    if (!ctx || ctx.state === 'closed') {
      isPlayingRef.current = false;
      return;
    }

    const chunk = playbackQueueRef.current.shift()!;
    const buf = ctx.createBuffer(1, chunk.length, 24000);
    buf.copyToChannel(chunk, 0);

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);

    if (nextPlayTimeRef.current < ctx.currentTime) {
      nextPlayTimeRef.current = ctx.currentTime;
    }
    src.start(nextPlayTimeRef.current);
    nextPlayTimeRef.current += buf.duration;

    src.onended = () => {
      isPlayingRef.current = false;
      playNextChunk();
    };
  }, []);

  const clearPlaybackQueue = useCallback(() => {
    playbackQueueRef.current = [];
    isPlayingRef.current = false;
    nextPlayTimeRef.current = 0;
  }, []);

  const stopAudioContext = useCallback(() => {
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  }, []);

  // ── Mic capture via AudioWorklet ──────────────────────────────────────────
  const startMicCapture = useCallback(async (ctx: AudioContext) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
        sampleRate: 48000,
      },
    });
    micStreamRef.current = stream;

    // Add worklet module (blob URL to avoid CORS issues)
    const blob = new Blob([WORKLET_CODE], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    try {
      await ctx.audioWorklet.addModule(url);
    } finally {
      URL.revokeObjectURL(url);
    }

    const source = ctx.createMediaStreamSource(stream);
    const worklet = new AudioWorkletNode(ctx, 'wasi-live-worklet');
    workletNodeRef.current = worklet;

    let chunkCount = 0;
    worklet.port.onmessage = (e: MessageEvent) => {
      if (e.data.event === 'chunk' && sessionRef.current && !isMutedRef.current) {
        const int16 = new Int16Array(e.data.data);
        const base64 = encodePcm16ToBase64(int16);
        try {
          sessionRef.current.sendRealtimeInput({
            audio: { data: base64, mimeType: 'audio/pcm;rate=16000' },
          });
          chunkCount++;
          if (chunkCount % 50 === 1) {
            console.log(`[Live] Sent ${chunkCount} audio chunks, mic muted=${isMutedRef.current}`);
          }
        } catch (err) {
          // Session may have closed between worklet callback and here
          console.warn('[Live] Failed to send audio chunk:', err);
        }
      }
    };

    source.connect(worklet);
    // Don't connect to destination — capture only, no echo
  }, []);

  // ── Tool call execution ───────────────────────────────────────────────────
  const executeToolCall = useCallback(async (id: string, name: string, args: Record<string, unknown>) => {
    try {
      callbacksRef.current.onToolCall?.(name, args);
      const res = await fetch('/api/live-tool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, args }),
      });

      if (!res.ok) {
        throw new Error(`Tool endpoint returned ${res.status}`);
      }

      const data = await res.json();
      const result = data.result ?? data.error ?? { error: 'Tool execution failed' };

      // Send tool response back to the model (synchronous per 3.1 docs)
      sessionRef.current?.sendToolResponse({
        functionResponses: [{ id, name, response: result }],
      });
    } catch (err: any) {
      console.error('[Live] Tool call failed:', name, err);
      // Still send error response so model can recover gracefully
      try {
        sessionRef.current?.sendToolResponse({
          functionResponses: [{ id, name, response: { error: `Tool failed: ${err.message}` } }],
        });
      } catch {}
    }
  }, []);

  // ── Full cleanup ──────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    if (sessionTimerRef.current) {
      clearTimeout(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    }
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    stopAudioContext();
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch {}
      sessionRef.current = null;
    }
    clearPlaybackQueue();
  }, [stopAudioContext, clearPlaybackQueue]);

  // ── Connect ───────────────────────────────────────────────────────────────
  const connect = useCallback(async (opts: {
    systemPrompt?: string;
    history?: Array<{ role: string; content: string }>;
  }) => {
    if (state !== 'idle' && state !== 'error') return;
    setState('connecting');

    try {
      // 1. Get ephemeral token from server. The token bakes a
      // liveConnectConstraints.config into itself, and the constrained
      // endpoint it activates rejects the session if the config we pass to
      // ai.live.connect() below doesn't match it exactly. So the systemPrompt
      // must travel with the token request, and the config object built here
      // must mirror server.ts's /api/live-token liveConfig field-for-field.
      const tokenRes = await fetch('/api/live-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemPrompt: opts.systemPrompt }),
      });
      if (!tokenRes.ok) {
        const errBody = await tokenRes.text().catch(() => '');
        throw new Error(`Token request failed (${tokenRes.status}): ${errBody}`);
      }
      const { token } = await tokenRes.json();
      if (!token) throw new Error('No token returned from server');

      // 2. Initialize SDK with ephemeral token (v1alpha required per docs)
      const ai = new GoogleGenAI({
        apiKey: token,
        httpOptions: { apiVersion: 'v1alpha' },
      });

      // 3. Build config — MUST match the liveConnectConstraints.config the
      // server locked into the token (see server.ts /api/live-token).
      const config: Record<string, any> = {
        responseModalities: ['AUDIO'],
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      };
      if (opts.systemPrompt) {
        config.systemInstruction = { parts: [{ text: opts.systemPrompt }] };
      }

      // 4. Connect via WebSocket. ai.live.connect() resolves as soon as the
      // WebSocket opens — NOT once the server has processed setup. Sending
      // realtime input (mic audio) before the server's own setupComplete
      // message arrives races the server and gets the session closed with
      // "Request contains an invalid argument" (code 1007). So we gate
      // history-seeding and mic capture on a setupComplete signal below,
      // instead of firing them right after connect() resolves.
      let resolveSetupComplete: () => void;
      const setupCompletePromise = new Promise<void>((resolve) => { resolveSetupComplete = resolve; });

      const session = await ai.live.connect({
        model: 'gemini-3.1-flash-live-preview',
        config,
        callbacks: {
          onopen: () => {
            console.log('[Live] WebSocket connected');
            setState('active');

            // Session timeout — disconnect before 15 min limit
            sessionTimerRef.current = setTimeout(() => {
              console.warn('[Live] Session timeout approaching — disconnecting');
              callbacksRef.current.onError?.('Live session timed out (15 min limit). Starting a new session.', true);
              cleanup();
              setState('idle');
              callbacksRef.current.onEnd?.();
            }, SESSION_MAX_MS);
          },

          onmessage: (msg: any) => {
            // Log all messages for debugging
            const keys = Object.keys(msg);
            if (keys.length > 0) {
              console.log('[Live] onmessage keys:', keys.join(', '));
            }

            // Server has finished processing setup — safe to send realtime
            // input (mic audio, client content) from this point on.
            if (msg.setupComplete) {
              resolveSetupComplete();
              return;
            }

            // ── Tool calls from the model ───────────────────────────────
            if (msg.toolCall?.functionCalls) {
              for (const fc of msg.toolCall.functionCalls) {
                executeToolCall(fc.id, fc.name, fc.args);
              }
              return;
            }

            // ── Tool call cancellation ──────────────────────────────────
            if (msg.toolCallCancellation?.ids) {
              console.log('[Live] Tool calls cancelled:', msg.toolCallCancellation.ids);
              return;
            }

            // ── Server content (audio + transcriptions) ─────────────────
            const content = msg.serverContent;
            if (!content) return;

            // Interruption — clear playback queue (user barge-in) and close
            // out the model's in-progress turn so the next reply starts a
            // fresh message instead of appending to the cut-off one.
            if (content.interrupted) {
              clearPlaybackQueue();
              callbacksRef.current.onTurnComplete?.('model');
              return;
            }

            // Input transcription (user speech → show in chat). Appended
            // BEFORE ending the user's turn below: a single serverContent
            // event can carry both inputTranscription and model output
            // together (native-audio models send multiple parts per event),
            // so this fragment must land on the still-open user message
            // before that turn is closed — otherwise it re-opens a stray
            // new user bubble after the model has already started replying.
            if (content.inputTranscription?.text) {
              callbacksRef.current.onUserTranscript(content.inputTranscription.text);
            }

            // Any model content means the model has started responding —
            // the user's turn is over. Close it before appending the
            // model's content so the two don't merge into one message.
            if (content.modelTurn?.parts || content.outputTranscription?.text) {
              callbacksRef.current.onTurnComplete?.('user');
            }

            // Audio chunks → queue for speaker playback
            if (content.modelTurn?.parts) {
              for (const part of content.modelTurn.parts) {
                if (part.inlineData?.data) {
                  try {
                    const float32 = decodePcm24k(part.inlineData.data);
                    playbackQueueRef.current.push(float32);
                    playNextChunk();
                  } catch (err) {
                    console.warn('[Live] Failed to decode audio chunk:', err);
                  }
                }
              }
            }

            // Output transcription (model speech → show in chat)
            if (content.outputTranscription?.text) {
              callbacksRef.current.onModelTranscript(content.outputTranscription.text);
            }

            // Model's response finished — next model speech starts a new message.
            if (content.turnComplete) {
              callbacksRef.current.onTurnComplete?.('model');
            }
          },

          onerror: (e: any) => {
            const msg = e?.message || String(e) || 'WebSocket error';
            console.error('[Live] WebSocket error:', msg);
            cleanup();
            setState('error');
            // shouldFallback=true: consumer should fall back to text chat
            callbacksRef.current.onError?.(msg, true);
          },

          onclose: (e: any) => {
            const reason = e?.reason || e?.code || 'unknown';
            console.log('[Live] WebSocket closed:', reason, 'code:', e?.code, 'wasClean:', e?.wasClean);
            cleanup();
            setState('idle');
            callbacksRef.current.onEnd?.();
          },
        },
      });

      sessionRef.current = session;

      // Wait for the server's setupComplete ack before sending anything —
      // sending realtime input earlier races the server (see comment above)
      // and gets the session rejected. Guard with a timeout so a missing/
      // malformed setupComplete surfaces as a clear error instead of a hang.
      const setupTimedOut = await Promise.race([
        setupCompletePromise.then(() => false),
        new Promise<boolean>((resolve) => setTimeout(() => resolve(true), 8000)),
      ]);
      if (setupTimedOut) {
        throw new Error('Live session setup did not complete in time');
      }

      // Seed conversation history if provided (after setup is confirmed)
      if (opts.history && opts.history.length > 0) {
        try {
          const turns = opts.history.map(h => ({
            role: h.role,
            parts: [{ text: h.content }],
          }));
          session.sendClientContent({ turns, turnComplete: false });
        } catch (err) {
          console.warn('[Live] Failed to seed history:', err);
        }
      }

      // 5. Start mic capture (after setup is confirmed)
      // Use 16kHz so AudioWorklet captures at native rate — no resampling needed
      const audioCtx = new AudioContext({ sampleRate: 16000 });
      audioCtxRef.current = audioCtx;
      await startMicCapture(audioCtx);

    } catch (err: any) {
      console.error('[Live] Connect failed:', err);
      cleanup();
      setState('error');
      // shouldFallback=true on connection failure
      callbacksRef.current.onError?.(err.message || 'Connection failed', true);
    }
  }, [state, startMicCapture, executeToolCall, clearPlaybackQueue, playNextChunk, cleanup]);

  // ── Disconnect ────────────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    // Two synchronous setState calls in one tick would batch to just the
    // final value — 'disconnecting' would never actually render. Give it a
    // brief real window so the control bar's "Ending…" state is visible.
    setState('disconnecting');
    cleanup();
    setTimeout(() => {
      setState('idle');
      callbacksRef.current.onEnd?.();
    }, 150);
  }, [cleanup]);

  // ── Send text message (mid-conversation) ──────────────────────────────────
  const sendText = useCallback((text: string) => {
    if (!sessionRef.current) {
      console.warn('[Live] Cannot send text — no active session');
      return;
    }
    try {
      sessionRef.current.sendRealtimeInput({ text });
    } catch (err) {
      console.warn('[Live] Failed to send text:', err);
    }
  }, []);

  // ── Toggle mic mute ───────────────────────────────────────────────────────
  const toggleMic = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev;
      if (next && sessionRef.current) {
        // Muting — send audioStreamEnd to flush cached audio per docs
        try {
          sessionRef.current.sendRealtimeInput({ audioStreamEnd: true });
        } catch {}
      }
      return next;
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => { cleanup(); };
  }, [cleanup]);

  return {
    state,
    connect,
    disconnect,
    sendText,
    toggleMic,
    isMuted,
  };
}
