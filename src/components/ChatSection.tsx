import React, { useRef, useEffect, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import TextareaAutosize from 'react-textarea-autosize';
import { Message, Product, City, Order } from '../types';
import { Send, ImagePlus, Play, Pause } from 'lucide-react';
import { formatPrice, detectCurrency, type Currency } from '../lib/currency';
import ProductCard from './ProductCard';
import ProductComparisonCard from './ProductComparisonCard';
import CategoryExplorer from './CategoryExplorer';
import WasiRobotAvatar from './WasiRobotAvatar';
import CodeBlock from './chat/CodeBlock';
import ImageLightbox from './chat/ImageLightbox';
import ScrollToBottom from './chat/ScrollToBottom';
import ThinkingIndicator from './chat/ThinkingIndicator';
import ErrorCard from './chat/ErrorCard';

// ── Types ───────────────────────────────────────────────────────────────────
export interface PendingImage {
  data: string;
  mimeType: string;
  preview: string;
  width: number;
  height: number;
}

interface ChatSectionProps {
  messages: Message[];
  isStreaming: boolean;
  onSendMessage: (text: string, images?: PendingImage[]) => void;
  onSendVoice?: (audioBase64: string, mimeType: string) => void;
  onRetryMessage?: (messageId: string) => void;
  onAddMessage?: (msg: Message) => void;
  onUpdateMessage?: (msgId: string, updates: Partial<Message>) => void;
  onNewChat?: () => void;
  lang: 'en' | 'si' | 'ta';
  onAddToBundle: (p: Product, variant?: any) => void;
  onViewDetails?: (productCode: string) => void;
  onQuickReply: (text: string) => void;
  cartSize?: number;
}

type ChatPhase = 'discovery' | 'browsing' | 'cart' | 'postorder';

// ── Constants ───────────────────────────────────────────────────────────────
const QUICK_PICKS: Record<ChatPhase, Record<'en' | 'si' | 'ta', string[]>> = {
  discovery: {
    en: ['Birthday gift', 'Groceries', 'I messed up — help', 'Track my order'],
    si: ['උපන්දින තෑග්ගක්', 'බඩු ගන්න', 'මට help එකක් ඕනේ', 'Order එක කොහෙද'],
    ta: ['பிறந்தநாள் பரிசு', 'மளிகை', 'உதவி வேணும்', 'ஆர்டர் எங்கே'],
  },
  browsing: {
    en: ['Add the first one', 'Show more options', 'Tell me more', 'Cheaper ones please'],
    si: ['පළවෙනි එක දාන්න', 'තව පෙන්නන්න', 'විස්තර කියන්න', 'අඩු මිල ඒවා'],
    ta: ['முதல்தை சேருங்க', 'இன்னும் காட்டுங்க', 'விவரம் சொல்லுங்க', 'குறைஞ்ச விலை'],
  },
  cart: {
    en: ['Checkout now', 'Add a gift message', 'Check delivery', 'Remove last item'],
    si: ['දැන් checkout කරන්න', 'තෑගි message එකක් දාන්න', 'Delivery check කරන්න', 'අන්තිම එක අයින් කරන්න'],
    ta: ['இப்போ checkout பண்ணுங்க', 'பரிசு செய்தி சேருங்க', 'டெலிவரி செக் பண்ணுங்க', 'கடைசி ஐட்டம் நீக்குங்க'],
  },
  postorder: {
    en: ['Track my order', 'Start a new order', 'What did I order?'],
    si: ['Order එක track කරන්න', 'අලුත් order එකක්', 'මම මොනවද ගත්තේ?'],
    ta: ['ஆர்டரை track பண்ணுங்க', 'புது ஆர்டர்', 'நான் என்ன வாங்கினேன்?'],
  },
};

const PLACEHOLDER = {
  en: 'Ask Wasi for gift ideas\u2026',
  si: '\u0DC3\u0DD2\u0D82\u0DC4\u0DCD\u0DBD \u0DC4\u0DDD English \u2014 \u0DC0\u0DCF\u0DC3\u0DD2\u0D9C\u0DD9\u0DB1\u0DCA \u0DDD\u0DB1\u0DCA \u0DAF\u0DD2\u0DB8 \u0D85\u0DC4\u0DB1\u0DCA\u0DB1\u2026',
  ta: '\u0BA4\u0BAE\u0BBF\u0BB4\u0BBF\u0BB2\u0BCD \u0B85\u0BB2\u0BCD\u0BB2\u0BA4\u0BC1 English \u2014 \u0BB5\u0BBE\u0B9A\u0BBF\u0BAF\u0BBF\u0B9F\u0BAE\u0BCD \u0D95\u0BC7\u0BB3\u0BC1\u0B99\u0BCD\u0B95\u0BB3\u0BCD\u2026',
};

const MAX_DIM = 800;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_REC_SECONDS = 60;

const isProgressMessage = (content: string): boolean => {
  const c = content.trim();
  return c.startsWith('*') && c.endsWith('*') && !c.slice(1, -1).includes('*');
};

// ── Component ───────────────────────────────────────────────────────────────
export default function ChatSection({
  messages, isStreaming, onSendMessage, onSendVoice, onRetryMessage, onAddMessage, onUpdateMessage,
  onNewChat, lang, onAddToBundle, onViewDetails, onQuickReply, cartSize = 0,
}: ChatSectionProps) {
  const [inputText, setInputText] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [showScrollFab, setShowScrollFab] = useState(false);
  const [lightbox, setLightbox] = useState<{ src: string; alt?: string } | null>(null);

  // ── Voice state ─────────────────────────────────────────────────────────
  type MicState = 'idle' | 'recording' | 'transcribing' | 'error';
  const [micState, setMicState] = useState<MicState>('idle');
  const [recSeconds, setRecSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(true);

  // ── Voice playback ──────────────────────────────────────────────────────
  const [playingMsgId, setPlayingMsgId] = useState<string | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  // ── Image upload ────────────────────────────────────────────────────────
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (recTimerRef.current) clearInterval(recTimerRef.current);
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.ondataavailable = null;
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      // Revoke any pending image object URLs to prevent memory leaks
      setPendingImages(prev => {
        prev.forEach(img => URL.revokeObjectURL(img.preview));
        return [];
      });
    };
  }, []);

  // ── Scroll lock detection ───────────────────────────────────────────────
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const atBottom = scrollHeight - scrollTop - clientHeight < 80;
      setShowScrollFab(!atBottom && messages.length > 3);
    };
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, [messages.length]);

  // ── Auto-scroll ─────────────────────────────────────────────────────────
  const isNearBottom = useCallback(() => {
    const c = chatContainerRef.current;
    if (!c) return true;
    return c.scrollHeight - c.scrollTop - c.clientHeight < 120;
  }, []);

  useEffect(() => {
    if (isNearBottom() || isStreaming) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isStreaming, isNearBottom]);

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // ── Image compression ───────────────────────────────────────────────────
  const compressImage = useCallback((file: File): Promise<PendingImage> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;
          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) { height = Math.round((height / width) * MAX_DIM); width = MAX_DIM; }
            else { width = Math.round((width / height) * MAX_DIM); height = MAX_DIM; }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error('Canvas error'));
          ctx.drawImage(img, 0, 0, width, height);
          const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
          canvas.toBlob((blob) => {
            if (!blob) return reject(new Error('Compression failed'));
            const r2 = new FileReader();
            r2.onloadend = () => resolve({
              data: (r2.result as string).split(',')[1],
              mimeType,
              preview: URL.createObjectURL(file),
              width,
              height,
            });
            r2.readAsDataURL(blob);
          }, mimeType, 0.80);
        };
        img.onerror = () => reject(new Error('Image load failed'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('File read failed'));
      reader.readAsDataURL(file);
    });
  }, []);

  const handleImageSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = 5 - pendingImages.length;
    for (const file of files.slice(0, remaining)) {
      if (file.size > MAX_FILE_SIZE) continue;
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) continue;
      try {
        const compressed = await compressImage(file);
        setPendingImages(prev => [...prev, compressed]);
      } catch { /* skip */ }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [pendingImages.length, compressImage]);

  const removeImage = useCallback((idx: number) => {
    setPendingImages(prev => {
      const removed = prev[idx];
      if (removed) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== idx);
    });
  }, []);

  // ── Paste image from clipboard ──────────────────────────────────────────
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const imageItems = items.filter(i => i.type.startsWith('image/'));
    if (imageItems.length === 0) return;
    e.preventDefault();
    for (const item of imageItems.slice(0, 5 - pendingImages.length)) {
      const file = item.getAsFile();
      if (!file) continue;
      try {
        const compressed = await compressImage(file);
        setPendingImages(prev => [...prev, compressed]);
      } catch { /* skip */ }
    }
  }, [pendingImages.length, compressImage]);

  // ── Submit ──────────────────────────────────────────────────────────────
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && pendingImages.length === 0) return;
    onSendMessage(inputText || 'Describe this image', pendingImages.length > 0 ? pendingImages : undefined);
    setInputText('');
    setPendingImages([]);
  }, [inputText, pendingImages, onSendMessage]);

  // ── Keyboard shortcuts ──────────────────────────────────────────────────
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  }, [handleSubmit]);

  // ── Voice recording ─────────────────────────────────────────────────────
  const stopRecordingAndTranscribe = useCallback(() => {
    if (recTimerRef.current) { clearInterval(recTimerRef.current); recTimerRef.current = null; }
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
  }, []);

  const cancelRecording = useCallback(() => {
    if (recTimerRef.current) { clearInterval(recTimerRef.current); recTimerRef.current = null; }
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    audioChunksRef.current = [];
    setRecSeconds(0);
    setMicState('idle');
  }, []);

  const handleMicClick = useCallback(async () => {
    if (micState === 'recording') { stopRecordingAndTranscribe(); return; }
    if (micState === 'transcribing') return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, sampleRate: 48000, channelCount: 1 },
      });
      streamRef.current = stream;
      const mimeType = ['audio/ogg;codecs=opus', 'audio/ogg', 'audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
        .find(t => MediaRecorder.isTypeSupported(t)) ?? '';
      const recorder = new MediaRecorder(stream, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 64000 });
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        if (!mountedRef.current) return;
        setRecSeconds(0);
        setMicState('transcribing');
        const blobMime = recorder.mimeType || mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: blobMime });
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        if (!mountedRef.current) return;
        const voiceMsg: Message = {
          id: `voice-${Date.now()}`, role: 'user', content: '',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          audio_data: base64, audio_mime_type: blobMime, transcription: undefined,
        };
        if (onAddMessage) onAddMessage(voiceMsg);
        fetch('/api/stt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ audio_base64: base64, mime_type: blobMime }) })
          .then(r => r.json())
          .then(data => { if (data.text?.trim() && onUpdateMessage) onUpdateMessage(voiceMsg.id, { transcription: data.text.trim() }); })
          .catch(() => {});
        if (onSendVoice) onSendVoice(base64, blobMime);
        if (mountedRef.current) setMicState('idle');
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecSeconds(0);
      setMicState('recording');
      recTimerRef.current = setInterval(() => {
        setRecSeconds(s => { const next = s + 1; if (next >= MAX_REC_SECONDS) cancelRecording(); return next; });
      }, 1000);
    } catch {
      if (mountedRef.current) { setMicState('error'); setTimeout(() => { if (mountedRef.current) setMicState('idle'); }, 3000); }
    }
  }, [micState, stopRecordingAndTranscribe, cancelRecording, onAddMessage, onUpdateMessage, onSendVoice]);

  // ── Voice playback ──────────────────────────────────────────────────────
  const handlePlayVoice = useCallback((msgId: string, audioData: string, mimeType: string) => {
    if (audioElRef.current) { audioElRef.current.pause(); audioElRef.current = null; }
    if (playingMsgId === msgId) { setPlayingMsgId(null); return; }
    const audio = new Audio(`data:${mimeType};base64,${audioData}`);
    audioElRef.current = audio;
    setPlayingMsgId(msgId);
    audio.onended = () => { setPlayingMsgId(null); audioElRef.current = null; };
    audio.onerror = () => { setPlayingMsgId(null); audioElRef.current = null; };
    audio.play().catch(() => { setPlayingMsgId(null); audioElRef.current = null; });
  }, [playingMsgId]);

  // ── Derived state ───────────────────────────────────────────────────────
  const fontClass = lang === 'si' ? 'font-sinhala' : lang === 'ta' ? 'font-tamil' : 'font-sans';
  const hasOrder = messages.some(m => m.order_created);
  const hasProducts = messages.some(m => m.products && m.products.length > 0);
  const phase: ChatPhase = hasOrder ? 'postorder' : cartSize > 0 ? 'cart' : hasProducts ? 'browsing' : 'discovery';
  const quickPicks = QUICK_PICKS[phase][lang] || QUICK_PICKS[phase].en;

  // ── Message grouping helper ─────────────────────────────────────────────
  const getGroupClass = (idx: number): string => {
    if (idx === 0) return 'msg-group-start';
    return messages[idx].role === messages[idx - 1].role ? 'msg-group-continue' : 'msg-group-start';
  };

  // ═════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════════
  return (
    <div className="flex flex-col overflow-hidden relative" style={{ height: '100dvh', background: '#FAFAF8' }}>

      {/* Lightbox */}
      {lightbox && <ImageLightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />}

      {/* Message list */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto" style={{ paddingBottom: 8 }}>
        <div className="max-w-2xl mx-auto px-4 pt-6 pb-4">

          {messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            const groupClass = getGroupClass(idx);

            return (
              <div key={msg.id} className={`msg-in group ${groupClass} ${isUser ? 'flex justify-end' : 'flex items-start gap-3'}`} style={{ animationDelay: `${idx * 0.03}s` }}>

                {/* AI avatar */}
                {!isUser && (
                  <div className="flex-shrink-0 mt-0.5">
                    <WasiRobotAvatar size={28} />
                  </div>
                )}

                <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5 min-w-0 ${isUser ? 'max-w-[85%]' : 'max-w-full w-full'}`}>

                  {/* ═══ USER MESSAGE ═══ */}
                  {isUser ? (
                    <div className="flex flex-col items-end gap-1.5">
                      {/* Uploaded images */}
                      {msg.uploaded_images && msg.uploaded_images.length > 0 && (
                        <div className="flex gap-1.5">
                          {msg.uploaded_images.map((img, i) => (
                            <img key={i} src={`data:${img.mimeType};base64,${img.data}`} alt="Uploaded"
                              className="max-w-[180px] max-h-[140px] rounded-xl object-cover border border-white/20"
                              style={{ boxShadow: '0 2px 8px rgba(64,41,112,0.15)' }} />
                          ))}
                        </div>
                      )}

                      {/* Voice message */}
                      {msg.audio_data && (
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-2.5 px-3 py-2 rounded-2xl rounded-br-sm min-w-[180px]"
                            style={{ background: 'linear-gradient(135deg, #5B3E8A 0%, #402970 100%)', boxShadow: '0 3px 12px rgba(64,41,112,0.25)' }}>
                            <button onClick={() => handlePlayVoice(msg.id, msg.audio_data!, msg.audio_mime_type || 'audio/webm')}
                              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-white/20 hover:bg-white/30 transition-colors">
                              {playingMsgId === msg.id ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white ml-0.5" />}
                            </button>
                            <div className="flex items-center gap-[3px] h-6 flex-1">
                              {Array.from({ length: 24 }).map((_, i) => {
                                const heights = [4,8,12,16,20,14,10,6,18,22,16,8,12,20,14,6,10,18,24,16,8,12,20,14];
                                return <span key={i} className="w-[3px] rounded-full bg-white/60"
                                  style={{ height: `${heights[i] || 8}%`, animation: playingMsgId === msg.id ? `waveform-bar 0.8s ease-in-out ${i * 0.03}s infinite alternate` : undefined }} />;
                              })}
                            </div>
                          </div>
                          {msg.transcription && (
                            <div className="px-3 py-1.5 max-w-[280px]">
                              <p className={`text-[12px] leading-relaxed text-ink-muted italic ${fontClass}`}>{msg.transcription}</p>
                            </div>
                          )}
                          {msg.audio_data && !msg.transcription && !msg.content && (
                            <p className="text-[11px] text-violet/60 italic px-3 py-1">Transcribing...</p>
                          )}
                        </div>
                      )}

                      {/* Text bubble */}
                      {msg.content && !(msg.audio_data && !msg.content) && (
                        <div className={`px-4 py-2.5 text-[13px] leading-relaxed text-white rounded-2xl rounded-br-sm ${fontClass}`}
                          style={{
                            background: msg.error ? 'rgba(64,41,112,0.85)' : msg.isRetrying ? 'rgba(64,41,112,0.60)' : 'linear-gradient(135deg, #5B3E8A 0%, #402970 100%)',
                            boxShadow: '0 3px 12px rgba(64,41,112,0.25)',
                            opacity: msg.isRetrying ? 0.7 : 1,
                          }}>
                          {msg.isRetrying ? 'Retrying\u2026' : msg.content}
                        </div>
                      )}

                      {/* Error card */}
                      {msg.error && !msg.isRetrying && (
                        <ErrorCard
                          error={msg.error}
                          onRetry={() => onRetryMessage?.(msg.id)}
                          onNewChat={onNewChat}
                        />
                      )}
                    </div>
                  ) : (
                    /* ═══ ASSISTANT MESSAGE ═══ */
                    <div className="px-0 py-1 w-full">
                      {isProgressMessage(msg.content) ? (
                        <p className={`text-[12px] text-ink-muted italic font-medium ${fontClass}`}>{msg.content.replace(/^\*|\*$/g, '')}</p>
                      ) : (
                        <div className={`text-[14px] ${fontClass}`} style={{ maxWidth: '85%' }}>
                          <div className="ai-prose">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              rehypePlugins={[rehypeHighlight]}
                              components={{
                                img: ({ src, alt }) => src ? (
                                  <div className="my-2">
                                    <img src={src} alt={alt || ''} className="ai-prose-img" onClick={() => setLightbox({ src, alt })} referrerPolicy="no-referrer" />
                                  </div>
                                ) : null,
                                pre: ({ children }) => <>{children}</>,
                                code: ({ className, children, ...props }) => {
                                  const isBlock = String(children).includes('\n');
                                  if (isBlock || className) {
                                    return <CodeBlock className={className} {...props}>{String(children).replace(/\n$/, '')}</CodeBlock>;
                                  }
                                  return <code className={className} {...props}>{children}</code>;
                                },
                                p: ({ children }) => <p>{children}</p>,
                                strong: ({ children }) => <strong>{children}</strong>,
                                em: ({ children }) => <em className="opacity-75">{children}</em>,
                                ul: ({ children }) => <ul>{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal list-inside space-y-0.5 my-1">{children}</ol>,
                                li: ({ children }) => <li><span className="text-violet flex-shrink-0 text-xs">{'\u2022'}</span><span>{children}</span></li>,
                                h1: ({ children }) => <p className="font-bold text-base text-violet mt-2 mb-1">{children}</p>,
                                h2: ({ children }) => <p className="font-bold text-sm text-violet mt-2 mb-1">{children}</p>,
                                h3: ({ children }) => <p className="font-semibold text-sm text-violet mt-1">{children}</p>,
                                blockquote: ({ children }) => <blockquote className="border-l-2 border-violet/15 pl-3 italic opacity-80 my-2">{children}</blockquote>,
                                table: ({ children }) => <div className="overflow-x-auto my-2 rounded-lg border border-violet/8">{children}</div>,
                                thead: ({ children }) => <thead>{children}</thead>,
                                tbody: ({ children }) => <tbody>{children}</tbody>,
                                tr: ({ children }) => <tr>{children}</tr>,
                                th: ({ children }) => <th>{children}</th>,
                                td: ({ children }) => <td>{children}</td>,
                                a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-violet underline underline-offset-2 hover:opacity-80">{children}</a>,
                              }}
                            >
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                        </div>
                      )}

                      {/* Retry button on hover */}
                      {!isUser && !isProgressMessage(msg.content) && onRetryMessage && (
                        <button onClick={() => onRetryMessage(msg.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity mt-1 flex items-center gap-1 text-[10px] text-ink-faint hover:text-violet cursor-pointer">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Regenerate
                        </button>
                      )}

                      {/* ═══ RICH MESSAGE TYPES ═══ */}

                      {/* Product strip */}
                      {msg.products && msg.products.length > 0 && (
                        <div className="flex gap-3 overflow-x-auto pb-2 pt-1 snap-x snap-mandatory scrollbar-none mt-2">
                          {msg.products.map((product, i) => (
                            <ProductCard key={product.product_code || i} product={product} compact
                              onAddToBundle={onAddToBundle} onViewDetails={onViewDetails ? () => onViewDetails(product.product_code) : undefined} />
                          ))}
                        </div>
                      )}

                      {/* Comparison card */}
                      {msg.compare_products && msg.compare_products.length > 0 && (
                        <div className="mt-2">
                          <ProductComparisonCard products={msg.compare_products} onAddToBundle={onAddToBundle} onViewDetails={onViewDetails} />
                        </div>
                      )}

                      {/* Category explorer */}
                      {msg.categories && msg.categories.length > 0 && (
                        <div className="mt-2">
                          <CategoryExplorer categories={msg.categories} onCategoryClick={(q) => onQuickReply(q)} lang={lang} />
                        </div>
                      )}

                      {/* Inline product detail */}
                      {msg.product_detail && (
                        <div className="mt-2 glass-bubble rounded-xl p-3">
                          <div className="flex gap-3">
                            {msg.product_detail.image_url && (
                              <img src={msg.product_detail.image_url} alt={msg.product_detail.name}
                                className="w-24 h-24 rounded-lg object-cover flex-shrink-0 border border-black/5" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-semibold text-ink leading-tight">{msg.product_detail.name}</p>
                              <p className="text-[12px] text-ink-muted mt-0.5">{msg.product_detail.category}</p>
                              <p className="text-[15px] font-bold text-violet mt-1">
                                {formatPrice(msg.product_detail.price_lkr, detectCurrency(msg.product_detail) as Currency)}
                              </p>
                              {msg.product_detail.description && (
                                <p className="text-[11px] text-ink-muted mt-1 line-clamp-2">{msg.product_detail.description}</p>
                              )}
                              <div className="flex gap-2 mt-2">
                                <button onClick={() => onAddToBundle(msg.product_detail!)}
                                  className="px-3 py-1.5 text-[11px] font-semibold rounded-lg bg-violet text-white hover:bg-violet-deep transition-colors cursor-pointer">
                                  Add to bundle
                                </button>
                                {onViewDetails && (
                                  <button onClick={() => onViewDetails(msg.product_detail!.product_code)}
                                    className="px-3 py-1.5 text-[11px] font-semibold rounded-lg border border-violet/20 text-violet hover:bg-violet-tint transition-colors cursor-pointer">
                                    Full details
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Order confirmation */}
                      {msg.order_created && (
                        <div className="mt-2 rounded-xl p-4" style={{ background: 'linear-gradient(135deg, #402970 0%, #2D1B69 100%)' }}>
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50 mb-2">Order Confirmed</p>
                          <p className="text-[14px] font-bold text-white">#{msg.order_created.order_id || msg.order_created.order_ref}</p>
                          {msg.order_created.total_lkr && (
                            <p className="text-[18px] font-bold text-gold-bright mt-1">
                              {formatPrice(msg.order_created.total_lkr, detectCurrency(msg.order_created.summary) as Currency)}
                            </p>
                          )}
                          <p className="text-[11px] text-white/60 mt-2">Kapruka will contact you for delivery details.</p>
                        </div>
                      )}

                      {/* Tracking result */}
                      {msg.tracking_result && (
                        <div className="mt-2 glass-bubble rounded-xl p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-violet/50 mb-2">Tracking</p>
                          <pre className="text-[12px] text-ink-muted font-mono whitespace-pre-wrap">{JSON.stringify(msg.tracking_result, null, 2)}</pre>
                        </div>
                      )}

                      {/* City suggestions */}
                      {msg.city_suggest && msg.city_suggest.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {msg.city_suggest.map((city, i) => (
                            <button key={i} onClick={() => onQuickReply(`Deliver to ${city.name}`)}
                              className="chip-violet px-3 py-1.5 text-[11px] rounded-full cursor-pointer">
                              {city.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Timestamp */}
                  <span className={`text-[9px] font-mono text-ink-faint opacity-0 group-hover:opacity-100 transition-opacity ${isUser ? 'text-right' : ''}`}>
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Streaming indicator */}
          {isStreaming && <ThinkingIndicator lang={lang} />}

          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Scroll to bottom FAB */}
      <ScrollToBottom visible={showScrollFab} onClick={scrollToBottom} />

      {/* Footer: gradient veil + quick replies + composer */}
      <div className="flex-shrink-0 relative" style={{ background: 'linear-gradient(to top, #FAFAF8 80%, transparent)', paddingTop: 20 }}>
        <div className="max-w-2xl mx-auto px-4">

          {/* Quick replies */}
          <div className="flex gap-2 overflow-x-auto scrollbar-none pb-3">
            {quickPicks.map((text, i) => (
              <button key={`${phase}-${i}`} onClick={() => onQuickReply(text)}
                className="chip-violet px-3.5 py-2 min-h-[40px] rounded-full cursor-pointer flex-shrink-0 whitespace-nowrap">
                {text}
              </button>
            ))}
          </div>

          {/* Mic status */}
          {micState !== 'idle' && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono font-medium mb-2 ${
              micState === 'recording' ? 'bg-rose-50 text-rose-600 border border-rose-200' :
              micState === 'transcribing' ? 'bg-violet-tint text-violet border border-violet/15' :
              'bg-red-50 text-red-600 border border-red-200'
            }`}>
              {micState === 'recording' && <><span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse flex-shrink-0" /><span>Recording\u2026 {recSeconds}s</span><span className="ml-auto text-rose-400">{MAX_REC_SECONDS - recSeconds}s left</span></>}
              {micState === 'transcribing' && <><span className="w-2 h-2 rounded-full bg-violet animate-pulse" />Transcribing\u2026</>}
              {micState === 'error' && <><span>⚠</span>Transcription failed — try again</>}
            </div>
          )}

          {/* Composer pill */}
          <form onSubmit={handleSubmit} className="pb-4">
            {pendingImages.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2 px-1 scrollbar-none mb-1">
                {pendingImages.map((img, i) => (
                  <div key={i} className="relative flex-shrink-0">
                    <img src={img.preview} alt="Upload" className="w-16 h-16 rounded-lg object-cover border border-violet/10" />
                    <button type="button" onClick={() => removeImage(i)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] cursor-pointer shadow-md">x</button>
                  </div>
                ))}
              </div>
            )}

            <div className="chat-composer-pill flex items-center gap-1.5 rounded-full pl-2 pr-1.5 py-1 min-h-[48px]">
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={handleImageSelect} />

              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={micState === 'transcribing'}
                className="p-2 min-w-[36px] min-h-[36px] rounded-full cursor-pointer text-ink-faint hover:bg-violet-tint hover:text-violet transition-all disabled:opacity-30" title="Upload image">
                <ImagePlus className="w-4 h-4" />
              </button>

              <TextareaAutosize
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder={micState === 'transcribing' ? 'Transcribing your voice\u2026' : PLACEHOLDER[lang]}
                disabled={micState === 'transcribing'}
                minRows={1}
                maxRows={5}
                className={`chat-textarea ${fontClass}`}
              />

              <button type="button" onClick={handleMicClick} disabled={micState === 'transcribing'}
                title={micState === 'recording' ? 'Stop recording' : 'Voice input'}
                className={`p-2.5 min-w-[40px] min-h-[40px] rounded-full cursor-pointer transition-all active:scale-90 disabled:cursor-not-allowed ${
                  micState === 'recording' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/25'
                  : micState === 'transcribing' ? 'bg-violet-tint text-violet animate-pulse'
                  : 'text-ink-faint hover:bg-violet-tint hover:text-violet'
                }`}>
                {micState === 'recording' ? (
                  <div className="w-3 h-3 rounded-[2px] bg-white" style={{ animation: 'pulseViolet 1s ease-in-out infinite' }} />
                ) : micState === 'transcribing' ? (
                  <div className="flex items-center gap-[2px] h-3">
                    {[0, 1, 2].map(i => <span key={i} className="w-[2px] rounded-full bg-violet" style={{ height: i === 1 ? '12px' : '8px', animation: `waveBar 0.8s ease-in-out ${i * 0.1}s infinite` }} />)}
                  </div>
                ) : (
                  <div className="flex items-center gap-[2px] h-3">
                    {[0, 1, 2].map(i => <span key={i} className="w-[2px] rounded-full bg-current" style={{ height: i === 1 ? '12px' : '8px', opacity: 0.8, animation: `waveBar 1.2s ease-in-out ${i * 0.15}s infinite` }} />)}
                  </div>
                )}
              </button>

              <button type="submit" disabled={(!inputText.trim() && pendingImages.length === 0) || micState === 'transcribing'}
                className="p-2.5 min-w-[40px] min-h-[40px] rounded-full cursor-pointer transition-all active:scale-90 disabled:opacity-25 disabled:cursor-not-allowed"
                style={(inputText.trim() || pendingImages.length > 0) ? { background: 'linear-gradient(135deg, #5B3E8A 0%, #402970 100%)', boxShadow: '0 3px 12px rgba(64,41,112,0.35)' } : { background: '#e5e7eb' }}>
                <Send className={`w-3.5 h-3.5 ${(inputText.trim() || pendingImages.length > 0) ? 'text-white' : 'text-gray-400'}`} />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
