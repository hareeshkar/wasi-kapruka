import React from 'react';
import { X, ShieldCheck, Sparkles } from 'lucide-react';

interface SaveCartBannerProps {
  visible: boolean;          // true after first add-to-cart
  onSignIn: () => void;      // opens SignInPanel
  onDismiss: () => void;     // permanent dismiss for this session
  lang?: 'en' | 'si' | 'ta';
  itemsAdded: number;        // number of items in cart, for dynamic copy
}

const COPY = {
  title:    { en: 'Save this gift bundle',
             si: 'මෙම තෑගි කට්ටල සුරකින්න',
             ta: 'இந்த பரிசு தொகுப்பை சேமி' },
  body:     { en: 'Sign in to keep this across devices, get a birthday surprise from Wasi, and unlock personalised picks.',
             si: 'උපාංග හරහා මෙය තිබීමට, වාසිගෙන් උපන්දින පුදුමයක් ලබා ගැනීමට සහ පුද්ගලීකරණය කළ උපදෙස්කරුවෙකු ලබා ගැනීමට පිවිසෙන්න.',
             ta: 'சாதனங்களில் இதை வைத்திருக்கவும், வாசியிடமிருந்து பிறந்தநாள் ஆச்சரியத்தைப் பெறவும், தனிப்பயனாக்கப்பட்ட துணைவனைத் திறக்கவும் உள்நுழையவும்.' },
  cta:      { en: 'Sign in',    si: 'පිවිසෙන්න',  ta: 'உள்நுழைய' },
  later:    { en: 'Maybe later', si: 'පසුව සමහරවිට', ta: 'பின்னர்' },
};

const t = (key: keyof typeof COPY, lang: 'en' | 'si' | 'ta' = 'en'): string =>
  COPY[key][lang] ?? COPY[key].en;

export default function SaveCartBanner({ visible, onSignIn, onDismiss, lang = 'en', itemsAdded }: SaveCartBannerProps) {
  if (!visible) return null;
  return (
    <div className="bg-gradient-to-r from-amber-50 to-[#FDF3DC] border border-amber-200/60 rounded-2xl p-4 shadow-sm animate-fade-in relative">
      <button
        onClick={onDismiss}
        className="absolute top-2 right-2 text-amber-700/60 hover:text-amber-900 cursor-pointer p-1 rounded-full hover:bg-amber-100/60 transition"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <div className="w-9 h-9 rounded-full bg-[#402970]/10 flex items-center justify-center flex-shrink-0">
          <ShieldCheck className="w-4.5 h-4.5 text-[#402970]" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-[#1A1A1A] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#C9A84C]" />
            {t('title', lang)}
            {itemsAdded > 0 && (
              <span className="text-[10px] font-mono text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
                {itemsAdded} {itemsAdded === 1 ? 'item' : 'items'}
              </span>
            )}
          </h4>
          <p className="text-[11px] text-gray-600 leading-relaxed mt-1">
            {t('body', lang)}
          </p>
          <div className="flex items-center gap-2 mt-2.5">
            <button
              onClick={onSignIn}
              className="text-xs font-semibold text-white bg-violet hover:bg-violet-deep px-3.5 py-2 min-h-[40px] rounded-lg cursor-pointer transition active:scale-95 shadow-sm"
            >
              {t('cta', lang)}
            </button>
            <button
              onClick={onDismiss}
              className="text-[11px] text-gray-500 hover:text-gray-700 cursor-pointer px-2"
            >
              {t('later', lang)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
