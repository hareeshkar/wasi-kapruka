import React from 'react';
import { X, Lock } from 'lucide-react';

interface SaveCartBannerProps {
  visible: boolean;
  onSignIn: () => void;
  onDismiss: () => void;
  lang?: 'en' | 'si' | 'ta';
  itemsAdded: number;
}

const COPY = {
  headline: {
    en: 'Your picks disappear when you close this tab.',
    si: 'ඔබ tab වසා දැමූ විට ඔබේ ලිස්ට් අතුරුදහන් වේ.',
    ta: 'நீங்கள் tab மூடும்போது உங்கள் பட்டியல் மறைந்துவிடும்.',
  },
  sub: {
    en: 'Sign in and Wasi remembers your taste — every time.',
    si: 'පිවිස Wasi ඔබේ රසය සිහිපත් කරයි — සෑම විටම.',
    ta: 'உள்நுழைந்தால் Wasi உங்கள் ருசியை நினைவில் வைக்கும்.',
  },
  cta: { en: 'Unlock memory →', si: 'මතකය විවෘත කරන්න →', ta: 'நினைவகத்தை திறக்க →' },
};

const t = (key: keyof typeof COPY, lang: 'en' | 'si' | 'ta' = 'en'): string =>
  COPY[key][lang] ?? COPY[key].en;

export default function SaveCartBanner({ visible, onSignIn, onDismiss, lang = 'en', itemsAdded }: SaveCartBannerProps) {
  if (!visible) return null;

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 animate-fade-in"
      style={{
        background: 'linear-gradient(135deg, rgba(26,18,40,0.97) 0%, rgba(20,14,34,0.97) 100%)',
        border: '1px solid rgba(123, 94, 167, 0.3)',
        borderRadius: 16,
        backdropFilter: 'blur(20px)',
        boxShadow: '0 8px 32px rgba(13,10,24,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}
    >
      {/* Icon */}
      <div
        className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center"
        style={{ background: 'rgba(123,94,167,0.2)', border: '1px solid rgba(123,94,167,0.25)' }}
      >
        <Lock className="w-3.5 h-3.5" style={{ color: '#C9A84C' }} />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold leading-snug" style={{ color: 'rgba(255,255,255,0.9)' }}>
          {t('headline', lang)}
          {itemsAdded > 0 && (
            <span
              className="ml-1.5 text-[9px] font-mono px-1.5 py-0.5 rounded-full"
              style={{ background: 'rgba(201,168,76,0.15)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.2)' }}
            >
              {itemsAdded} {itemsAdded === 1 ? 'item' : 'items'}
            </span>
          )}
        </p>
        <p className="text-[10px] mt-0.5 leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {t('sub', lang)}
        </p>
      </div>

      {/* CTA */}
      <button
        onClick={onSignIn}
        className="flex-shrink-0 text-[10px] font-bold uppercase tracking-wide px-3 py-2 rounded-lg cursor-pointer transition-all active:scale-95"
        style={{
          background: 'linear-gradient(135deg, #402970 0%, #5B3E8A 100%)',
          color: '#fff',
          border: '1px solid rgba(123,94,167,0.4)',
          whiteSpace: 'nowrap',
          boxShadow: '0 2px 8px rgba(64,41,112,0.4)',
        }}
      >
        {t('cta', lang)}
      </button>

      {/* Dismiss */}
      <button
        onClick={onDismiss}
        className="flex-shrink-0 p-1.5 rounded-full cursor-pointer transition-all"
        style={{ color: 'rgba(255,255,255,0.25)' }}
        onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.25)')}
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
