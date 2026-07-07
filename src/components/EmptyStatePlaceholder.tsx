import { useState, useRef, useCallback, useEffect } from 'react';
import { Gift, Cake, Plus, ImagePlus, Send, X, ShoppingBag, Smartphone, Radio } from 'lucide-react';
import type { Message } from '../types';
import WasiRobot from './WasiRobot';
import LiveControlBar from './LiveControlBar';

interface EmptyStatePlaceholderProps {
  lang?: 'en' | 'si' | 'ta';
  isSignedIn: boolean;
  userName?: string;
  onSignIn: () => void;
  onNewChat: () => void;
  onSendMessage: (text: string, images?: Array<{ data: string; mimeType: string }>) => void;
  onSendVoice?: (audioBase64: string, mimeType: string) => void;
  onAddMessage?: (msg: Message) => void;
  onUpdateMessage?: (msgId: string, updates: Partial<Message>) => void;
  onLiveToggle?: () => void;
  isLiveActive?: boolean;
  liveState?: 'idle' | 'connecting' | 'active' | 'disconnecting' | 'error';
  liveIsMuted?: boolean;
  onLiveToggleMic?: () => void;
  liveElapsedLabel?: string;
}

// Rotating phrases — equal-length arrays (same count required for safe lang-switch mid-rotation)
const PHRASES: Record<'en' | 'si' | 'ta', string[]> = {
  en: ['the perfect gift', 'a birthday surprise', 'fresh groceries', 'the latest phone', 'a chocolate hamper', 'flowers & cakes', 'fashion & style', 'something special'],
  si: ['perfect gift එක', 'birthday surprise එකක්', 'fresh groceries ටිකක්', 'latest phone එක', 'chocolate hamper එකක්', 'flowers සහ cakes', 'fashion සහ style', 'special දෙයක්'],
  ta: ['perfect பரிசு ஒண்டு', 'birthday surprise ஒண்டு', 'fresh காய்கறிகள்', 'latest phone ஒண்டு', 'chocolate hamper ஒண்டு', 'பூவும் cakeம்', 'fashion & style', 'special ஏதாவது'],
};

// UI copy — same L/t() pattern as ProductCard
const L = {
  eyebrow:      { en: 'Kapruka Shopping Bestie',               si: 'ඔයාගේ Kapruka Shopping Bestie',     ta: 'உங்கள் Kapruka Shopping நண்பன்' },
  letsFind:     { en: "Let's find",                            si: 'හොයමු',                              ta: 'தேடலாம்' },
  placeholder:  { en: 'Ask Wasi anything…',                    si: 'Wasi ගෙන් ඕනෑ දෙයක් අහන්න…',        ta: 'Wasi-கிட்ட எதுவும் கேளு…' },
  signIn:       { en: 'Sign in to save your history',          si: 'History save කරන්න sign in වෙන්න',  ta: 'history save ஆக sign in பண்ணு' },
  listening:    { en: 'Listening…',                            si: 'අහගෙන ඉන්නවා…',                     ta: 'கேக்குறேன்…' },
  transcribing: { en: 'Transcribing…',                         si: 'Convert කරනවා…',                    ta: 'எழுதுறேன்…' },
  micDenied:    { en: 'Mic access denied — check browser settings', si: 'Mic access නෑ — browser settings check කරන්න', ta: 'Mic access இல்ல — browser settings பாரு' },
  hiName:       { en: 'Hi',                                    si: 'හායි',                               ta: 'ஹாய்' },
  imWasi:       { en: "I'm Wasi",                              si: 'මම Wasi',                            ta: 'நான் Wasi' },
};
const t = (k: keyof typeof L, lang: 'en' | 'si' | 'ta') => L[k][lang] ?? L[k].en;

const CARDS = [
  {
    icon: Gift, bg: 'rgba(244,114,182,0.10)', color: '#EC4899', query: 'Show me gift hampers from Kapruka',
    copy: { en: { title: 'Gifts & Hampers', body: 'Curated bundles, wrapped & ready' }, si: { title: 'තෑගි සහ Hampers', body: 'Pack කරලා ready, deliver කරන්නත් ready' }, ta: { title: 'பரிசுகளும் Hamper-களும்', body: 'அழகாக wrap பண்ணி ready-யா இருக்கு' } },
  },
  {
    icon: Cake, bg: 'rgba(16,185,129,0.08)', color: '#10B981', query: 'Show me cakes and sweets from Kapruka',
    copy: { en: { title: 'Cakes & Sweets', body: 'Freshly baked, same-day delivery' }, si: { title: 'Cakes සහ Sweets', body: 'Fresh bake කරලා, same day deliver' }, ta: { title: 'Cakes & இனிப்புகள்', body: 'Fresh-ஆ bake பண்ணி, அன்றே deliver' } },
  },
  {
    icon: Smartphone, bg: 'rgba(99,102,241,0.08)', color: '#6366F1', query: 'Show me electronics from Kapruka',
    copy: { en: { title: 'Electronics & Gadgets', body: 'Phones, laptops & accessories' }, si: { title: 'Electronics සහ Gadgets', body: 'Phones, laptops සහ accessories' }, ta: { title: 'Electronics & Gadgets', body: 'Phone, laptop, accessories எல்லாமே' } },
  },
  {
    icon: ShoppingBag, bg: 'rgba(245,158,11,0.08)', color: '#F59E0B', query: 'Show me groceries from Kapruka',
    copy: { en: { title: 'Groceries & Essentials', body: 'Rice, dal, spices & more' }, si: { title: 'Groceries සහ Essentials', body: 'හාල්, පරිප්පු, කුළුබඩු සහ තවත්' }, ta: { title: 'Grocery & அத்தியாவசியங்கள்', body: 'அரிசி, பருப்பு, மசாலா இன்னும் நிறைய' } },
  },
];

const MAX_DIM = 800;
const MAX_REC_SECONDS = 60;

function compressImage(file: File): Promise<{ data: string; mimeType: string }> {
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
          const reader2 = new FileReader();
          reader2.onloadend = () => resolve({ data: (reader2.result as string).split(',')[1], mimeType });
          reader2.readAsDataURL(blob);
        }, mimeType, 0.80);
      };
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('File read failed'));
    reader.readAsDataURL(file);
  });
}

export default function EmptyStatePlaceholder({
  lang = 'en', isSignedIn, userName, onSignIn, onNewChat, onSendMessage, onSendVoice, onAddMessage, onUpdateMessage,
  onLiveToggle, isLiveActive, liveState, liveIsMuted, onLiveToggleMic, liveElapsedLabel,
}: EmptyStatePlaceholderProps) {
  const [inputText, setInputText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [pendingImages, setPendingImages] = useState<Array<{ data: string; mimeType: string; preview: string }>>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Rotating phrase state
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [phraseVisible, setPhraseVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseVisible(false);
      setTimeout(() => {
        setPhraseIndex(prev => (prev + 1) % PHRASES.en.length);
        setPhraseVisible(true);
      }, 400);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Reset phrase index when language switches to avoid undefined (arrays equal length, but reset for clean transition)
  useEffect(() => {
    setPhraseVisible(false);
    setTimeout(() => { setPhraseIndex(0); setPhraseVisible(true); }, 300);
  }, [lang]);

  // Voice
  type VoiceState = 'idle' | 'recording' | 'transcribing' | 'error';
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [recSeconds, setRecSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(true);

  const displayName = userName?.split(' ')[0] || '';
  const isRecording = voiceState === 'recording';
  const isTranscribing = voiceState === 'transcribing';
  const isError = voiceState === 'error';

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
    };
  }, []);

  useEffect(() => {
    return () => { pendingImages.forEach(img => URL.revokeObjectURL(img.preview)); };
  }, [pendingImages]);

  const cancelRecording = () => {
    if (recTimerRef.current) { clearInterval(recTimerRef.current); recTimerRef.current = null; }
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    audioChunksRef.current = [];
    setRecSeconds(0);
    setVoiceState('idle');
  };

  const startRecording = async () => {
    if (!onSendVoice) return;
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
        setVoiceState('transcribing');

        const blobMime = recorder.mimeType || mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: blobMime });
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        if (!mountedRef.current) return;

        const voiceMsgId = `voice-${Date.now()}`;
        if (onAddMessage) {
          onAddMessage({
            id: voiceMsgId, role: 'user', content: '',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            audio_data: base64, audio_mime_type: blobMime, transcription: undefined,
          });
        }

        fetch('/api/stt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ audio_base64: base64, mime_type: blobMime }) })
          .then(r => r.json())
          .then(data => { if (data.text?.trim() && onUpdateMessage) onUpdateMessage(voiceMsgId, { transcription: data.text.trim() }); })
          .catch(() => {});

        onSendVoice(base64, blobMime);
        if (mountedRef.current) setVoiceState('idle');
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecSeconds(0);
      setVoiceState('recording');
      recTimerRef.current = setInterval(() => {
        setRecSeconds(s => { const next = s + 1; if (next >= MAX_REC_SECONDS) cancelRecording(); return next; });
      }, 1000);
    } catch {
      if (mountedRef.current) { setVoiceState('error'); setTimeout(() => { if (mountedRef.current) setVoiceState('idle'); }, 3000); }
    }
  };

  const stopAndSend = () => {
    if (recTimerRef.current) { clearInterval(recTimerRef.current); recTimerRef.current = null; }
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isRecording) { stopAndSend(); return; }
    if (isTranscribing) return;
    const text = inputText.trim();
    if (!text && pendingImages.length === 0) { startRecording(); return; }
    const images = pendingImages.map(img => ({ data: img.data, mimeType: img.mimeType }));
    pendingImages.forEach(img => URL.revokeObjectURL(img.preview));
    setInputText('');
    setPendingImages([]);
    onSendMessage(text, images.length > 0 ? images : undefined);
  };

  const handleImageSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const results = await Promise.all(files.slice(0, 4).map(async (file) => {
      try { const r = await compressImage(file); return { ...r, preview: URL.createObjectURL(file) }; } catch { return null; }
    }));
    setPendingImages(prev => [...prev, ...results.filter((r): r is NonNullable<typeof r> => r !== null)]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const removeImage = (idx: number) => {
    setPendingImages(prev => { const removed = prev[idx]; if (removed) URL.revokeObjectURL(removed.preview); return prev.filter((_, i) => i !== idx); });
  };

  const handleCardClick = (query: string) => onSendMessage(query);
  const hasContent = inputText.trim().length > 0 || pendingImages.length > 0;

  return (
    <div className="relative flex flex-col items-center justify-center flex-1 w-full overflow-hidden" style={{ background: '#FAFAF8' }}>

      {/* Background atmosphere — layered gradient meshes */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full blur-[140px] opacity-40" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full blur-[120px] opacity-30" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)' }} />
        <div className="absolute top-[40%] left-[50%] w-[300px] h-[300px] rounded-full blur-[100px] opacity-20" style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.10) 0%, transparent 70%)' }} />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-[820px] px-6 animate-fadeInUp">

        {/* 3D Wasi Robot — interactive, tracks mouse + text caret */}
        <WasiRobot inputRef={inputRef} width={240} height={280} />

        {/* Greeting */}
        <div className="text-center mb-4 px-4 py-2">
          {/* Eyebrow */}
          <div className="flex items-center justify-center gap-2 mb-3 animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
            <div className="h-px w-8" style={{ background: 'linear-gradient(to right, transparent, rgba(64,41,112,0.20))' }} />
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'rgba(64,41,112,0.45)' }}>{t('eyebrow', lang)}</span>
            <div className="h-px w-8" style={{ background: 'linear-gradient(to left, transparent, rgba(64,41,112,0.20))' }} />
          </div>

          {/* Main greeting */}
          <h1 className={`mb-2 animate-fadeInUp ${lang === 'si' ? 'font-sinhala font-bold text-2xl' : lang === 'ta' ? 'font-tamil font-bold text-2xl' : 'font-sans font-bold text-[32px] sm:text-[38px] tracking-tight'}`}
            style={{ color: '#1a1a2e', animationDelay: '0.2s' }}>
            {displayName ? (
              <>{t('hiName', lang)} <span style={{ fontFamily: '"Fraunces", Georgia, serif', color: '#402970', fontStyle: 'italic' }}>{displayName}</span>, {t('imWasi', lang)}</>
            ) : (
              <>{t('hiName', lang)}, <span style={{ fontFamily: '"Fraunces", Georgia, serif', color: '#402970', fontStyle: 'italic' }}>{t('imWasi', lang)}</span></>
            )}
          </h1>

          {/* Rotating subtitle */}
          <div className="flex items-center justify-center gap-2 flex-wrap animate-fadeInUp" style={{ animationDelay: '0.35s' }}>
            <span className={`text-[20px] sm:text-[24px] font-medium ${lang === 'si' ? 'font-sinhala' : lang === 'ta' ? 'font-tamil' : ''}`} style={{ color: 'rgba(64,41,112,0.55)' }}>
              {t('letsFind', lang)}
            </span>
            <span className="inline-flex items-center overflow-visible relative" style={{ minWidth: '220px', paddingTop: '0.15em', paddingBottom: '0.15em', width: 'fit-content' }}>
              <span
                className={`text-[20px] sm:text-[24px] font-semibold ${lang === 'si' ? 'font-sinhala' : lang === 'ta' ? 'font-tamil' : 'font-display italic'}`}
                style={{
                  color: '#402970',
                  opacity: phraseVisible ? 1 : 0,
                  transform: phraseVisible ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.96)',
                  transition: 'opacity 0.4s cubic-bezier(0.22, 1, 0.36, 1), transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              >
                {PHRASES[lang][phraseIndex]}
              </span>
            </span>
          </div>
        </div>

        {/* Cards — 4 columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 w-full mb-6 px-1">
          {CARDS.map(({ icon: Icon, bg, color, query, copy }, i) => {
            const c = copy[lang] ?? copy.en;
            return (
              <button
                key={query}
                onClick={() => handleCardClick(query)}
                className="group text-left rounded-2xl p-3 sm:p-4 transition-all duration-300 cursor-pointer border border-transparent hover:border-violet/10 active:scale-[0.97] animate-fadeInUp flex flex-col"
                style={{
                  background: 'rgba(255,255,255,0.75)',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 2px 8px rgba(64,41,112,0.06), 0 1px 2px rgba(0,0,0,0.03)',
                  animationDelay: `${0.4 + i * 0.10}s`,
                  animationFillMode: 'both',
                  minHeight: '120px',
                }}
              >
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center mb-2 sm:mb-3 transition-all duration-250 group-hover:-translate-y-1 group-hover:scale-110 group-hover:shadow-md" style={{ background: bg }}>
                  <Icon className="w-4 h-4 sm:w-[18px] sm:h-[18px]" style={{ color }} />
                </div>
                <h3
                  className={`font-semibold text-ink mb-1.5 leading-snug break-words ${lang === 'si' ? 'font-sinhala' : lang === 'ta' ? 'font-tamil' : ''}`}
                  style={{ fontSize: 'clamp(12px, 2.8vw, 14px)', textWrap: 'balance' }}
                >{c.title}</h3>
                <p
                  className={`font-medium leading-relaxed break-words line-clamp-2 ${lang === 'si' ? 'font-sinhala' : lang === 'ta' ? 'font-tamil' : ''}`}
                  style={{ fontSize: 'clamp(10px, 2.4vw, 12px)', color: 'rgba(64,41,112,0.45)', textWrap: 'balance' }}
                >{c.body}</p>
              </button>
            );
          })}
        </div>

        {/* Input Composer */}
        <div className="w-full max-w-[600px] animate-fadeInUp" style={{ animationDelay: '0.75s' }}>
          {isRecording && (
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl mb-2.5" style={{ background: 'rgba(254,226,226,0.6)', border: '1px solid rgba(244,63,94,0.15)' }}>
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse flex-shrink-0" />
              <span className="text-[12px] font-mono font-medium text-rose-600">{t('listening', lang)} {recSeconds}s</span>
              <span className="text-[10px] text-rose-400 ml-auto font-mono">{MAX_REC_SECONDS - recSeconds}s</span>
            </div>
          )}
          {isTranscribing && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl mb-2.5" style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.10)' }}>
              <span className="w-2 h-2 rounded-full bg-violet animate-pulse" />
              <span className="text-[12px] font-mono font-medium text-violet">{t('transcribing', lang)}</span>
            </div>
          )}
          {isError && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl mb-2.5" style={{ background: 'rgba(254,226,226,0.6)', border: '1px solid rgba(244,63,94,0.15)' }}>
              <span className="text-[12px] font-medium text-rose-600">{t('micDenied', lang)}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {pendingImages.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2 px-1 scrollbar-none mb-2">
                {pendingImages.map((img, i) => (
                  <div key={i} className="relative flex-shrink-0">
                    <img src={img.preview} alt="Upload" className="w-14 h-14 rounded-xl object-cover border border-violet/8" />
                    <button type="button" onClick={() => removeImage(i)} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] cursor-pointer shadow-md font-bold">x</button>
                  </div>
                ))}
              </div>
            )}

            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={handleImageSelect} />

            {isLiveActive ? (
              <LiveControlBar
                state={liveState ?? 'idle'}
                isMuted={!!liveIsMuted}
                elapsedLabel={liveElapsedLabel ?? '00:00'}
                onToggleMic={() => onLiveToggleMic?.()}
                onEnd={() => onLiveToggle?.()}
              />
            ) : (
            <div className="flex items-center w-full rounded-full transition-all duration-250"
              style={{
                minHeight: '54px',
                background: isRecording ? 'rgba(254,226,226,0.65)' : 'rgba(255,255,255,0.80)',
                backdropFilter: 'blur(12px)',
                border: isRecording ? '1.5px solid rgba(244,63,94,0.25)' : isFocused ? '1.5px solid rgba(139,92,246,0.30)' : '1.5px solid rgba(64,41,112,0.08)',
                boxShadow: isRecording ? '0 0 0 3px rgba(244,63,94,0.05), 0 6px 24px rgba(244,63,94,0.06)' : isFocused ? '0 6px 28px rgba(139,92,246,0.08), 0 0 0 3px rgba(139,92,246,0.04)' : '0 2px 12px rgba(0,0,0,0.03)',
                padding: '4px 6px 4px 4px',
              }}>

              <div className="flex items-center gap-0.5 pl-1 shrink-0">
                <button type="button" onClick={onNewChat} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-black/4 transition-colors cursor-pointer" style={{ color: 'rgba(64,41,112,0.35)' }} title="New conversation">
                  <Plus className="w-[17px] h-[17px]" />
                </button>
                <button type="button" onClick={() => fileInputRef.current?.click()} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-violet/6 transition-colors cursor-pointer" style={{ color: 'rgba(64,41,112,0.35)' }} title="Upload image">
                  <ImagePlus className="w-[17px] h-[17px]" />
                </button>
              </div>

              <input ref={inputRef} type="text" value={inputText} onChange={(e) => setInputText(e.target.value)}
                onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)}
                placeholder={isRecording ? t('listening', lang) : isTranscribing ? t('transcribing', lang) : t('placeholder', lang)}
                className={`flex-1 h-full bg-transparent px-3 text-[13.5px] text-ink outline-none placeholder:opacity-40 font-medium ${lang === 'si' ? 'font-sinhala' : lang === 'ta' ? 'font-tamil' : ''}`}
              />

              <div className="flex items-center gap-1 shrink-0">
                {isRecording && (
                  <button type="button" onClick={cancelRecording} className="w-9 h-9 rounded-full flex items-center justify-center bg-rose-50 text-rose-500 hover:bg-rose-100 transition-all cursor-pointer" title="Cancel">
                    <X className="w-[17px] h-[17px]" />
                  </button>
                )}
                <button type="button" onClick={onLiveToggle} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-violet/6 transition-colors cursor-pointer" style={{ color: 'rgba(64,41,112,0.35)' }} title="Start live voice">
                  <Radio className="w-[17px] h-[17px]" />
                </button>
                <button type="submit" className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer"
                  style={isRecording
                    ? { background: 'linear-gradient(135deg, #DC3545 0%, #BD2130 100%)', boxShadow: '0 3px 10px rgba(220,53,69,0.30)' }
                    : hasContent
                      ? { background: 'linear-gradient(135deg, #5B3E8A 0%, #402970 100%)', boxShadow: '0 3px 10px rgba(64,41,112,0.25)' }
                      : { background: 'linear-gradient(135deg, #5B3E8A 0%, #402970 50%, #2D1B69 100%)', boxShadow: '0 2px 8px rgba(64,41,112,0.18)' }
                  }>
                  {isRecording ? (
                    <div className="w-3 h-3 rounded-[2px] bg-white" style={{ animation: 'pulseViolet 1s ease-in-out infinite' }} />
                  ) : hasContent ? (
                    <Send className="w-3.5 h-3.5 text-white" />
                  ) : (
                    <div className="flex items-center gap-[2px] h-3">
                      {[0, 1, 2].map((i) => (
                        <span key={i} className="w-[2px] rounded-full bg-white" style={{ height: i === 1 ? '11px' : '7px', opacity: 0.85, animation: `waveBar 1.2s ease-in-out ${i * 0.15}s infinite` }} />
                      ))}
                    </div>
                  )}
                </button>
              </div>
            </div>
            )}
          </form>

          {/* Voice hands-free hint */}
          {onSendVoice && (
            <div className="mt-3 flex items-center justify-center gap-1.5 animate-fadeInUp" style={{ animationDelay: '0.85s' }}>
              <div className="flex items-center gap-[2px] h-3">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="w-[2px] rounded-full" style={{ height: i === 1 ? '10px' : '6px', background: 'rgba(64,41,112,0.20)', animation: `waveBar 1.2s ease-in-out ${i * 0.15}s infinite` }} />
                ))}
              </div>
              <span className="text-[10px] font-mono" style={{ color: 'rgba(64,41,112,0.30)' }}>
                {lang === 'en' ? 'Tap mic for a fully hands-free experience' : lang === 'si' ? 'Mic එක tap කරන්න hands-free අත්දැකීමක් සඳහා' : 'Mic-ஐ அழுத்தி hands-free அனுபவத்தைப் பெறுங்கள்'}
              </span>
            </div>
          )}

          {!isSignedIn && (
            <button onClick={onSignIn} className="mt-4 text-[11px] cursor-pointer block w-full text-center transition-colors font-medium" style={{ color: 'rgba(109,40,217,0.50)' }}>
              {t('signIn', lang)}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
