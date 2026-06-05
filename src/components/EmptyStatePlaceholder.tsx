import React from 'react';
import { Sparkles } from 'lucide-react';

interface EmptyStatePlaceholderProps {
  lang?: 'en' | 'si' | 'ta';
  isSignedIn: boolean;
  onSignIn: () => void;
  onNewChat: () => void;
}

const COPY = {
  title:  { en: 'Press new chat to start',           si: 'ආරම්භ කිරීමට නව කතාබහ ඔබන්න',       ta: 'தொடங்க புதிய அரட்டையை அழுத்தவும்' },
  body:   { en: "Select 'New chat' in the sidebar. Wasi will greet you by name and suggest gifts from Kapruka's catalog.",
            si: "පැතිකඩෙහි 'නව කතාබහ' තෝරන්න. වාසි ඔබව නමින් පිළිගනු ඇත.",
            ta: "பக்கப்பட்டியில் 'புதிய அரட்டை' என்பதைத் தேர்ந்தெடுக்கவும்." },
  newChat: { en: 'Start a new chat',                 si: 'නව කතාබහක් ආරම්භ කරන්න',              ta: 'புதிய அரட்டையைத் தொடங்கு' },
  signIn:  { en: 'Or sign in to keep your history',  si: 'නැතහොත් පිවිසෙන්න',                    ta: 'அல்லது உங்கள் வரலாற்றை வைக்க உள்நுழையவும்' },
};

const t = (key: keyof typeof COPY, lang: 'en' | 'si' | 'ta' = 'en'): string =>
  COPY[key][lang] ?? COPY[key].en;

export default function EmptyStatePlaceholder({ lang = 'en', isSignedIn, onSignIn, onNewChat }: EmptyStatePlaceholderProps) {
  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="w-full max-w-md rounded-3xl border-2 border-dashed border-black/10 bg-gray-50 p-8 text-center space-y-4 animate-fade-in">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-gray-400" />
          </div>
        </div>
        <div>
          <h3 className="font-display font-bold text-lg text-[#1A1A1A]">{t('title', lang)}</h3>
          <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{t('body', lang)}</p>
        </div>
        <button
          onClick={onNewChat}
          className="inline-flex items-center gap-2 bg-gradient-to-br from-[#0F6E56] to-[#0A5C45] hover:from-[#0A5C45] hover:to-[#083D30] text-white font-semibold py-2.5 px-5 rounded-xl cursor-pointer transition active:scale-95 shadow-md"
        >
          <Sparkles className="w-4 h-4" />
          {t('newChat', lang)}
        </button>
        {!isSignedIn && (
          <button onClick={onSignIn} className="text-[11px] text-[#0A5C45] hover:underline cursor-pointer">
            {t('signIn', lang)}
          </button>
        )}
      </div>
    </div>
  );
}
