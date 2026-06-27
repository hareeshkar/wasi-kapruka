import React, { useState } from 'react';
import { Send, Pencil } from 'lucide-react';
import WasiRobotAvatar from './WasiRobotAvatar';

interface OnboardingTemplateProps {
  lang?: 'en' | 'si' | 'ta';
  onStart: (occasion: string, budget: number) => void;
  onCustom?: (text: string) => void;
  onCategory?: (query: string, label: string) => void;
}

const occasions = [
  { name: 'Birthday',           label: 'Birthday',         labelSi: 'උපන්දිනය',       labelTa: 'பிறந்த நாள்' },
  { name: 'Anniversary',        label: 'Anniversary',      labelSi: 'සංවත්සරය',       labelTa: 'திருமணம்' },
  { name: 'Mother\'s Day',      label: 'Mother\'s Day',    labelSi: 'මව්ගේ දිනය',     labelTa: 'அம்மா தினம்' },
  { name: 'Father\'s Day',      label: 'Father\'s Day',    labelSi: 'පියාගේ දිනය',    labelTa: 'அப்பா தினம்' },
  { name: 'Valentine\'s Day',   label: 'Valentine\'s',     labelSi: 'ආදර දිනය',       labelTa: 'காதல் நாள்' },
  { name: 'Graduation',         label: 'Graduation',       labelSi: 'උපාධිය',         labelTa: 'பட்டமேற்பு' },
  { name: 'Wedding',            label: 'Wedding',          labelSi: 'විවාහය',         labelTa: 'திருமணம்' },
  { name: 'Avurudu & Festival', label: 'Festival',         labelSi: 'අවුරුදු',         labelTa: 'திருவிழா' },
  { name: 'Thank You',          label: 'Thank You',        labelSi: 'ස්තූතියි',        labelTa: 'நன்றி' },
  { name: 'Just Because',       label: 'Just Because',     labelSi: 'නිකම්ම',          labelTa: 'சும்மா' },
];

const categoryChips = [
  { label: 'Cakes',       query: 'cake' },
  { label: 'Flowers',     query: 'rose' },
  { label: 'Chocolates',  query: 'chocolate' },
  { label: 'Groceries',   query: 'rice' },
  { label: 'Electronics', query: 'phone' },
  { label: 'Fashion',     query: 'saree' },
  { label: 'Jewellery',   query: 'ring' },
  { label: 'Pharmacy',    query: 'lotion' },
  { label: 'Hampers',     query: 'hamper' },
];

function getTimeGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Good morning';
  if (h >= 12 && h < 17) return 'Good afternoon';
  if (h >= 17 && h < 21) return 'Good evening';
  return 'Late night shopping?';
}

const SLIDER_MIN = 1000;
const SLIDER_MAX = 50000;

const COPY = {
  welcome:   { en: "Let's find the perfect gift for your loved ones today.", si: 'ආයුබෝවන්! මම වසී — ඔබේ Kapruka shopping යාළුවා. තෑගි, බඩු, electronics — අද මොනවද ඕනේ?', ta: 'வணக்கம்! நான் வசி — உங்கள் Kapruka shopping நண்பன். பரிசுகள், மளிகை, electronics — இன்று என்ன வேணும்?' },
  occasion:  { en: "What's the occasion?",  si: 'තෑග්ගක්ද? අවස්ථාව තෝරන්න', ta: 'பரிசா? சந்தர்ப்பத்தைத் தேர்வு' },
  browse:    { en: 'Or shop by category',         si: 'හෝ වර්ගය අනුව shop කරන්න', ta: 'அல்லது வகை வாரியாக' },
  budget:    { en: 'Your budget',               si: 'අයවැය (රු.)',        ta: 'பட்ஜெட் (ரூ.)' },
  start:     { en: 'Find It',                     si: 'සොයන්න',             ta: 'கண்டுபிடி' },
  custom:    { en: 'Something else',             si: 'වෙනත් දෙයක්',         ta: 'வேறு ஏதாவது' },
  customPh:  { en: 'e.g. a phone, rice, vitamins...', si: 'උදා: phone එකක්, හාල්...', ta: 'எ.கா. phone, அரிசி...' },
  customGo:  { en: 'Send',                        si: 'යවන්න',              ta: 'அனுப்பு' },
};

const t = (key: keyof typeof COPY, lang: 'en' | 'si' | 'ta' = 'en'): string =>
  COPY[key][lang] ?? COPY[key].en;

export default function OnboardingTemplate({ lang = 'en', onStart, onCustom, onCategory }: OnboardingTemplateProps) {
  const [selectedOccasion, setSelectedOccasion] = useState('Birthday');
  const [budget, setBudget] = useState(5000);
  const [showCustom, setShowCustom] = useState(false);
  const [customText, setCustomText] = useState('');
  const isSi = lang === 'si';
  const isTa = lang === 'ta';

  return (
    <div className="flex items-start gap-3 px-1">
      {/* AI avatar */}
      <div className="flex-shrink-0 mt-2">
        <WasiRobotAvatar size={32} />
      </div>

      {/* Editorial welcome card */}
      <div className="w-full max-w-lg">
        <div className="animate-onboard-in space-y-5">

          {/* Eyebrow */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-violet">AI Gift Concierge</span>
              <div className="h-px flex-1 bg-violet/15" />
            </div>

            {/* Hero greeting */}
            <h1 className={`text-ink leading-[1.1] ${isSi ? 'font-sinhala font-bold text-xl sm:text-2xl' : isTa ? 'font-tamil font-bold text-xl sm:text-2xl' : 'font-display font-semibold text-[28px] sm:text-[36px] tracking-tight'}`}>
              {getTimeGreeting()}!
            </h1>
            <p className={`text-ink-muted leading-relaxed ${isSi ? 'font-sinhala text-sm' : isTa ? 'font-tamil text-sm' : 'text-[14px] sm:text-[15px]'}`}>
              {t('welcome', lang)}
            </p>
          </div>

          {/* Occasion picker */}
          {!showCustom && (
            <>
              <div className="space-y-2.5">
                <p className={`text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint ${isSi ? 'font-sinhala' : ''}`}>
                  {t('occasion', lang)}
                </p>
                <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
                  {occasions.map((occ) => {
                    const label = isSi ? occ.labelSi : isTa ? occ.labelTa : occ.label;
                    const sel = selectedOccasion === occ.name;
                    return (
                      <button
                        key={occ.name}
                        type="button"
                        onClick={() => setSelectedOccasion(occ.name)}
                        className={`flex-shrink-0 px-4 py-2.5 min-h-[44px] rounded-full text-[12px] font-medium cursor-pointer transition-all border scale-in ${
                          sel
                            ? 'bg-violet text-white border-violet shadow-md shadow-violet/20'
                            : 'bg-white border-ink/10 text-ink hover:bg-violet-tint hover:border-violet/30 hover:text-violet'
                        }`}
                      >
                        <span className={isSi ? 'font-sinhala' : isTa ? 'font-tamil' : ''}>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Budget */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <p className={`text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint ${isSi ? 'font-sinhala' : ''}`}>
                    {t('budget', lang)}
                  </p>
                  <span className="font-display italic text-sm text-violet font-medium">
                    Rs. {budget.toLocaleString()}
                  </span>
                </div>
                <input
                  type="range"
                  min={SLIDER_MIN}
                  max={SLIDER_MAX}
                  step={500}
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full cursor-pointer"
                />
                <div className="flex justify-between text-[9px] font-mono text-ink-faint">
                  <span>1,000</span>
                  <span>50,000+</span>
                </div>
              </div>

              {/* Category grid */}
              {onCategory && (
                <div className="space-y-2.5">
                  <p className={`text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint ${isSi ? 'font-sinhala' : ''}`}>
                    {t('browse', lang)}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {categoryChips.map((chip) => (
                      <button
                        key={chip.query}
                        type="button"
                        onClick={() => onCategory(chip.query, chip.label)}
                        className="py-3 px-3 min-h-[44px] rounded-lg text-[12px] font-medium bg-surface-warm border border-ink/5 text-ink hover:bg-violet-tint hover:border-violet/20 hover:text-violet cursor-pointer transition-all text-center"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => onStart(selectedOccasion, budget)}
                  className="flex-1 text-white font-semibold py-3.5 min-h-[48px] px-5 rounded-xl cursor-pointer transition-all active:scale-[0.97] flex items-center justify-center gap-2 text-sm"
                  style={{ background: 'linear-gradient(135deg, #5B3E8A 0%, #402970 100%)', boxShadow: '0 4px 16px rgba(64,41,112,0.30)' }}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span className={isSi ? 'font-sinhala' : isTa ? 'font-tamil' : ''}>{t('start', lang)}</span>
                </button>
                <button
                  onClick={() => setShowCustom(true)}
                  className="px-3.5 py-3 text-[11px] font-medium text-ink-muted hover:text-violet border border-ink/10 hover:border-violet/30 rounded-xl cursor-pointer transition-all"
                  title={t('custom', lang)}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}

          {/* Custom input */}
          {showCustom && (
            <div className="space-y-3">
              <p className={`text-[12px] font-medium text-ink-muted ${isSi ? 'font-sinhala' : isTa ? 'font-tamil' : ''}`}>
                {t('custom', lang)}
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder={t('customPh', lang)}
                  className="flex-1 px-4 py-3 bg-white border border-ink/10 focus:border-violet/40 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet/8"
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
                  className="px-4 py-3 text-white rounded-xl cursor-pointer transition-all active:scale-[0.97] disabled:opacity-30"
                  style={{ background: 'linear-gradient(135deg, #5B3E8A 0%, #402970 100%)' }}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => setShowCustom(false)}
                className="text-[10px] text-ink-faint hover:text-violet cursor-pointer transition-colors"
              >
                ← Back to occasions
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
