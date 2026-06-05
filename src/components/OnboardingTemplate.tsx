import React, { useState } from 'react';
import { Send, Pencil } from 'lucide-react';
import { Bot } from 'lucide-react';

interface OnboardingTemplateProps {
  lang?: 'en' | 'si' | 'ta';
  onStart: (occasion: string, budget: number) => void;
  onCustom?: (text: string) => void;
}

const occasions = [
  { name: 'Birthday',           icon: '🎂', label: 'Birthday',         labelSi: 'උපන්දිනය',       labelTa: 'பிறந்த நாள்' },
  { name: 'Anniversary',        icon: '💖', label: 'Anniversary',      labelSi: 'සංවත්සරය',       labelTa: 'திருமணம்' },
  { name: 'Avurudu & Festival', icon: '🌅', label: 'Festival',         labelSi: 'අවුරුදු',         labelTa: 'திருவிழா' },
  { name: 'Thank You',          icon: '🙏', label: 'Thank You',        labelSi: 'ස්තූතියි',        labelTa: 'நன்றி' },
  { name: 'Just Because',       icon: '🎈', label: 'Just Because',     labelSi: 'නිකම්ම',          labelTa: 'சும்மா' },
];

const SLIDER_MIN = 1000;
const SLIDER_MAX = 25000;

const COPY = {
  welcome:   { en: "Hey, I'm Kapruka's gift agent. Choose your occasion and I'll find the perfect gift!", si: 'ආයුබෝවන්! මම කපෘක තෑගි නියෝජිතයා. ඔබේ අවස්ථාව තෝරන්න!', ta: 'வணக்கம்! நான் கப்ருகா பரிசு முகவர். உங்கள் சந்தர்ப்பத்தைத் தேர்ந்தெடுங்கள்!' },
  occasion:  { en: 'What are you celebrating?',  si: 'ඔබ සමරන්නේ කුමක්ද?', ta: 'நீங்கள் எதைக் கொண்டாடுகிறீர்கள்?' },
  budget:    { en: 'Budget (LKR)',               si: 'අයවැය (රු.)',        ta: 'பட்ஜெட் (ரூ.)' },
  start:     { en: 'Find Gift',                   si: 'තෑගි සොයන්න',        ta: 'பரிசைக் கண்டுபிடி' },
  custom:    { en: 'Something else',             si: 'වෙනත් දෙයක්',         ta: 'வேறு ஏதாவது' },
  customPh:  { en: 'e.g. gadget, groceries...',  si: 'උදා: ගැජට් එකක්...', ta: 'எ.கா. ஒரு கேஜெட்...' },
  customGo:  { en: 'Send',                        si: 'යවන්න',              ta: 'அனுப்பு' },
};

const t = (key: keyof typeof COPY, lang: 'en' | 'si' | 'ta' = 'en'): string =>
  COPY[key][lang] ?? COPY[key].en;

export default function OnboardingTemplate({ lang = 'en', onStart, onCustom }: OnboardingTemplateProps) {
  const [selectedOccasion, setSelectedOccasion] = useState('Birthday');
  const [budget, setBudget] = useState(5000);
  const [showCustom, setShowCustom] = useState(false);
  const [customText, setCustomText] = useState('');
  const isSi = lang === 'si';
  const isTa = lang === 'ta';

  return (
    <div className="flex items-start gap-2 px-1">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0F6E56] to-[#0A5C45] flex items-center justify-center flex-shrink-0 mt-2">
        <Bot className="w-4 h-4 text-white" />
      </div>

      <div className="glass-bubble rounded-2xl rounded-bl-none px-5 py-4 max-w-md w-full space-y-4 animate-onboard-in">
        {/* Welcome message */}
        <p className={`text-sm font-semibold text-[#1A1A1A] leading-relaxed ${isSi ? 'font-sinhala' : isTa ? 'font-tamil' : 'font-sans'}`}>
          {t('welcome', lang)}
        </p>

        {!showCustom ? (
          <>
            <p className={`text-xs font-mono font-bold uppercase tracking-widest text-gray-400 ${isSi ? 'font-sinhala' : ''}`}>
              {t('occasion', lang)}
            </p>
            <div className="grid grid-cols-5 gap-1.5">
              {occasions.map((occ) => {
                const label = isSi ? occ.labelSi : isTa ? occ.labelTa : occ.label;
                const sel = selectedOccasion === occ.name;
                return (
                  <button
                    key={occ.name}
                    type="button"
                    onClick={() => setSelectedOccasion(occ.name)}
                    className={`flex flex-col items-center py-2.5 px-1 rounded-xl text-[10px] leading-tight cursor-pointer transition border scale-in ${
                      sel
                        ? 'bg-[#E1F5EE] border-[#0F6E56] text-[#0A5C45] shadow-sm scale-[1.04]'
                        : 'bg-white border-black/10 text-gray-600 hover:bg-gray-50 hover:border-[#0F6E56]/30'
                    }`}
                  >
                    <span className="text-lg mb-0.5">{occ.icon}</span>
                    <span className={`font-semibold text-center leading-snug ${isSi ? 'font-sinhala' : isTa ? 'font-tamil' : ''}`}>{label}</span>
                  </button>
                );
              })}
            </div>

            <p className={`text-sm font-semibold text-[#1A1A1A] pt-1 ${isSi ? 'font-sinhala' : isTa ? 'font-tamil' : 'font-sans'}`}>
              {t('budget', lang)}
            </p>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-bold text-[#0A5C45] bg-[#E1F5EE] px-2.5 py-1 rounded-lg whitespace-nowrap">
                Rs.{budget.toLocaleString()}
              </span>
              <input
                type="range"
                min={SLIDER_MIN}
                max={SLIDER_MAX}
                step={500}
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="flex-1 h-1.5 rounded-full accent-[#0F6E56] cursor-pointer"
              />
              <span className="text-[9px] font-mono text-gray-400 whitespace-nowrap">25k</span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => onStart(selectedOccasion, budget)}
                className="flex-1 bg-gradient-to-br from-[#0F6E56] to-[#0A5C45] hover:from-[#0A5C45] hover:to-[#083D30] text-white font-semibold py-3 rounded-xl cursor-pointer transition active:scale-95 flex items-center justify-center gap-2 shadow-sm text-sm"
              >
                <Send className="w-4 h-4" />
                {t('start', lang)}
              </button>
              <button
                onClick={() => setShowCustom(true)}
                className="px-3 py-3 text-xs font-semibold text-gray-500 hover:text-[#0A5C45] border border-gray-200 hover:border-[#0F6E56]/30 rounded-xl cursor-pointer transition"
                title={t('custom', lang)}
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <p className={`text-sm font-semibold text-[#1A1A1A] ${isSi ? 'font-sinhala' : isTa ? 'font-tamil' : 'font-sans'}`}>
              {t('custom', lang)}
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder={t('customPh', lang)}
                className="flex-1 px-4 py-3 bg-white border border-black/10 focus:border-[#0F6E56]/40 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/10"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && customText.trim()) {
                    onCustom?.(customText.trim());
                  }
                }}
              />
              <button
                onClick={() => {
                  if (customText.trim()) onCustom?.(customText.trim());
                }}
                disabled={!customText.trim()}
                className="px-4 py-3 bg-gradient-to-br from-[#0F6E56] to-[#0A5C45] text-white rounded-xl cursor-pointer transition active:scale-95 disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={() => setShowCustom(false)}
              className="text-[10px] text-gray-500 hover:text-[#0A5C45] cursor-pointer"
            >
              ← Back to occasions
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
