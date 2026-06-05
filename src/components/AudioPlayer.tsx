import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Volume2, Square, Loader2, AlertCircle } from 'lucide-react';

interface AudioPlayerProps {
  text: string;
  language?: 'en' | 'si' | 'ta';
  // Optional stable key — if omitted we hash the text+lang. Pass msg.id for true cache stability across re-renders.
  cacheKey?: string;
  // Visual variant: 'inline' next to bubble, 'compact' for tight spaces
  variant?: 'inline' | 'compact';
}

// In-memory cache: same message text + lang → same audio blob URL.
// Survives re-renders within a session. Browsers evict unused blob URLs on page refresh;
// the server-side Cache-Control header keeps repeated plays cheap across refreshes.
const audioCache = new Map<string, string>();
const fetchInFlight = new Map<string, Promise<string>>();

const hashKey = (text: string, lang: string): string => {
  // Lightweight FNV-1a hash — fast + deterministic, avoids bloating cache key with full text
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `${lang}:${(h >>> 0).toString(36)}:${text.length}`;
};

export default function AudioPlayer({
  text,
  language = 'en',
  cacheKey,
  variant = 'inline',
}: AudioPlayerProps) {
  const [state, setState] = useState<'idle' | 'loading' | 'playing' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Stash the blob URL so we can revoke it on unmount
  const activeUrlRef = useRef<string | null>(null);

  const key = cacheKey || hashKey(text, language);

  // Cleanup on unmount: pause + release blob URL
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (activeUrlRef.current) {
        URL.revokeObjectURL(activeUrlRef.current);
        activeUrlRef.current = null;
      }
    };
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setState('idle');
  }, []);

  const play = useCallback(async () => {
    if (!text || !text.trim()) return;

    try {
      // 1) Hit cache first
      let url = audioCache.get(key);

      // 2) De-dupe concurrent fetches for the same key
      if (!url) {
        let inflight = fetchInFlight.get(key);
        if (!inflight) {
          setState('loading');
          inflight = (async () => {
            const res = await fetch('/api/tts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text, language }),
            });
            if (!res.ok) {
              const errBody = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
              throw new Error(errBody.error || `TTS failed (${res.status})`);
            }
            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);
            audioCache.set(key, blobUrl);
            return blobUrl;
          })();
          fetchInFlight.set(key, inflight);
          inflight.finally(() => fetchInFlight.delete(key));
        }
        url = await inflight;
      }

      // 3) Play
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }
      const audio = audioRef.current;
      if (audio.src !== url) audio.src = url;
      activeUrlRef.current = url;

      // Reset handlers in case we replay the same element
      audio.onended = () => setState('idle');
      audio.onerror = () => {
        setState('error');
        setErrorMsg('Audio playback failed');
      };

      await audio.play();
      setState('playing');
    } catch (err: any) {
      console.error('[AudioPlayer]', err);
      setState('error');
      setErrorMsg(err?.message || 'Playback failed');
    }
  }, [text, language, key]);

  const handleClick = () => {
    if (state === 'playing') stop();
    else play();
  };

  // Don't render anything for empty text (e.g. progress messages like "*…*")
  if (!text || !text.trim()) return null;

  const isLoading = state === 'loading';
  const isPlaying = state === 'playing';
  const isError   = state === 'error';

  const size = variant === 'compact' ? 'w-7 h-7' : 'w-8 h-8';
  const iconSize = variant === 'compact' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  return (
    <div className="inline-flex items-center gap-1.5 select-none">
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        title={
          isError   ? errorMsg :
          isLoading ? 'Generating audio…' :
          isPlaying ? 'Stop' :
          `Listen in ${language === 'si' ? 'Sinhala' : language === 'ta' ? 'Tamil' : 'English'}`
        }
        aria-label={
          isPlaying ? 'Stop audio playback' :
          isLoading ? 'Loading audio' :
          'Play audio'
        }
        className={`${size} rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 active:scale-90 border ${
          isError
            ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100'
            : isPlaying
            ? 'bg-[#0F6E56] border-[#0F6E56] text-white shadow-md shadow-[#0F6E56]/30 hover:bg-[#0A5C45]'
            : isLoading
            ? 'bg-[#E1F5EE] border-[#0F6E56]/20 text-[#0A5C45] cursor-wait'
            : 'bg-white/80 border-black/8 text-[#0A5C45] hover:bg-[#E1F5EE] hover:border-[#0F6E56]/30 shadow-xs'
        }`}
      >
        {isError ? (
          <AlertCircle className={iconSize} />
        ) : isLoading ? (
          <Loader2 className={`${iconSize} animate-spin`} />
        ) : isPlaying ? (
          <Square className={`${iconSize} fill-current`} />
        ) : (
          <Volume2 className={iconSize} />
        )}
      </button>

      {/* Playing indicator — animated bars */}
      {isPlaying && (
        <span className="inline-flex items-end gap-0.5 h-3.5" aria-hidden>
          {[0, 120, 240, 360].map((delay) => (
            <span
              key={delay}
              className="w-0.5 bg-[#0F6E56] rounded-full animate-audio-bar"
              style={{
                height: '100%',
                animationDelay: `${delay}ms`,
              }}
            />
          ))}
        </span>
      )}
    </div>
  );
}
