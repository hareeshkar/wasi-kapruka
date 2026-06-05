import React, { useState } from 'react';
import { Globe } from 'lucide-react';

interface OnboardingProps {
  onOnboard: (params: { occasion: string; budget: number; language: 'en' | 'si' | 'ta' }) => void;
  onStartDemo: () => void;
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
const TICKS = [1000, 5000, 10000, 15000, 25000];

export default function Onboarding({ onOnboard, onStartDemo }: OnboardingProps) {
  const [selectedOccasion, setSelectedOccasion] = useState('Birthday');
  const [budget, setBudget]   = useState(5000);
  const [language, setLanguage] = useState<'en' | 'si' | 'ta'>('en');

  const handleStart = () => onOnboard({ occasion: selectedOccasion, budget, language });

  const isSi = language === 'si';
  const isTa = language === 'ta';

  const copy = {
    en: {
      badge: 'KAPRUKA SPECIAL AGENT',
      hero: 'I am Wasi 🌿',
      sub: 'Tell me who you love. I find the perfect Kapruka gift, validate delivery to any Sri Lankan city, and take you to checkout.',
      langLabel: 'SELECT LANGUAGE',
      occasionLabel: 'WHO ARE YOU GIFTING?',
      budgetLabel: 'YOUR BUDGET CEILING',
      cta: 'Consult Wasi Now →',
      demo: 'Guided Demo (90-sec)',
    },
    si: {
      badge: 'කපෘක විශේෂ නියෝජිතයා',
      hero: 'මම වාසි 🌿',
      sub: 'ඔබ ආදරය කරන්නා කවුරුන්දැයි කියන්න. ශ්‍රී ලංකාවේ ඕනෑම නගරයකට සුදුසු හොඳම තෑග්ග සොයා ගනිමු.',
      langLabel: 'භාෂාව තෝරන්න',
      occasionLabel: 'තෑග්ග ලැබෙන්නේ කාටද?',
      budgetLabel: 'ඔබේ උපරිම අයවැය',
      cta: 'වාසි සමඟ ආරම්භ කරන්න →',
      demo: '90-තත්පර සංදර්ශනය',
    },
    ta: {
      badge: 'கப்ருகா சிறப்பு முகவர்',
      hero: 'நான் வாசி 🌿',
      sub: 'நீங்கள் யாரை நேசிக்கிறீர்கள் என்று சொல்லுங்கள். இலங்கை முழுவதும் சரியான பரிசை கண்டுபிடிப்போம்.',
      langLabel: 'மொழி தேர்ந்தெடுக்கவும்',
      occasionLabel: 'யாருக்கு பரிசு?',
      budgetLabel: 'உங்கள் பட்ஜெட்',
      cta: 'வாசியுடன் தொடங்கவும் →',
      demo: '90-வினாடி சுற்று',
    },
  };
  const c = copy[language];

  return (
    <div className="relative flex flex-col items-center justify-center min-h-[88vh] px-4 py-10 overflow-hidden">
      {/* Animated background orbs */}
      <div className="orb orb-green  w-96 h-96 -top-24 -left-24 opacity-60" />
      <div className="orb orb-gold   w-80 h-80 top-1/3 -right-20 opacity-50" />
      <div className="orb orb-cream  w-64 h-64 bottom-10 left-1/4 opacity-40" />

      {/* Hero text */}
      <div className="text-center space-y-4 mb-10 z-10 animate-fade-in">
        <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#E1F5EE] text-[#0A5C45] rounded-full text-[10px] font-mono font-bold tracking-widest uppercase border border-[#0F6E56]/15 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-[#0F6E56] animate-pulse" />
          {c.badge}
        </span>

        <h1 className={`text-5xl sm:text-6xl md:text-7xl font-display font-bold tracking-tight leading-none text-[#1A1A1A] ${isSi ? 'font-sinhala text-4xl' : isTa ? 'font-tamil text-4xl' : ''}`}>
          {c.hero}
        </h1>

        <p className={`text-base sm:text-lg text-[#6B6B6B] max-w-lg mx-auto leading-relaxed ${isSi ? 'font-sinhala' : isTa ? 'font-tamil' : 'font-sans'}`}>
          {c.sub}
        </p>
      </div>

      {/* Main card */}
      <div className="w-full max-w-2xl z-10 animate-fade-in" style={{ animationDelay: '0.1s', opacity: 0 }}>
        <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-white shadow-xl p-6 md:p-8 space-y-8"
             style={{ boxShadow: '0 8px 40px rgba(10,92,69,0.10), 0 2px 8px rgba(0,0,0,0.06)' }}>

          {/* Language selector */}
          <div className="space-y-3">
            <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#6B6B6B] flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-[#0F6E56]" />
              {c.langLabel}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['en', 'si', 'ta'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`py-3 px-4 rounded-2xl font-medium text-sm transition-all duration-200 cursor-pointer ${
                    language === lang
                      ? 'bg-[#0F6E56] text-white shadow-md shadow-[#0F6E56]/20 scale-[1.02]'
                      : 'bg-gray-50 text-[#1A1A1A] border border-black/5 hover:bg-gray-100/80 hover:border-[#0F6E56]/20'
                  } ${lang === 'si' ? 'font-sinhala' : lang === 'ta' ? 'font-tamil' : 'font-sans'}`}
                >
                  {lang === 'en' ? 'English' : lang === 'si' ? 'සිංහල' : 'தமிழ்'}
                </button>
              ))}
            </div>
          </div>

          {/* Occasion grid */}
          <div className="space-y-3">
            <label className={`text-[10px] font-mono font-bold uppercase tracking-widest text-[#6B6B6B] ${isSi ? 'font-sinhala' : ''}`}>
              {c.occasionLabel}
            </label>
            <div className="grid grid-cols-5 gap-2">
              {occasions.map((occ) => {
                const label = isSi ? occ.labelSi : isTa ? occ.labelTa : occ.label;
                const isSelected = selectedOccasion === occ.name;
                return (
                  <button
                    key={occ.name}
                    onClick={() => setSelectedOccasion(occ.name)}
                    className={`flex flex-col items-center justify-center py-4 px-2 rounded-2xl border text-xs cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? 'bg-[#E1F5EE] border-[#0F6E56] text-[#0A5C45] shadow-sm scale-[1.04]'
                        : 'bg-gray-50/60 border-black/5 text-gray-600 hover:bg-white hover:border-[#0F6E56]/25 hover:shadow-sm'
                    } ${isSi ? 'font-sinhala text-[10px]' : isTa ? 'font-tamil text-[10px]' : 'font-sans'}`}
                  >
                    <span className="text-2xl mb-1.5">{occ.icon}</span>
                    <span className="font-semibold leading-tight text-center">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Budget slider */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className={`text-[10px] font-mono font-bold uppercase tracking-widest text-[#6B6B6B] ${isSi ? 'font-sinhala' : ''}`}>
                {c.budgetLabel}
              </label>
              <div className="flex items-baseline gap-1 bg-[#E1F5EE] px-3 py-1.5 rounded-xl border border-[#0F6E56]/15">
                <span className="text-[10px] font-mono text-[#0A5C45] font-semibold">Rs.</span>
                <span className="text-lg font-display font-bold text-[#0A5C45] leading-none">
                  {budget.toLocaleString()}
                </span>
                <span className="text-[10px] font-mono text-[#0A5C45]/60 font-semibold">LKR</span>
              </div>
            </div>

            <div className="space-y-3">
              <input
                type="range"
                min={SLIDER_MIN}
                max={SLIDER_MAX}
                step={500}
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer accent-[#0F6E56]"
                style={{
                  background: `linear-gradient(to right, #0F6E56 ${((budget - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * 100}%, #E5E7EB ${((budget - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * 100}%)`
                }}
              />
              {/* Properly proportioned tick labels */}
              <div className="relative h-4">
                {TICKS.map((v) => {
                  const pct = ((v - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * 100;
                  return (
                    <span
                      key={v}
                      className={`absolute text-[9px] font-mono -translate-x-1/2 transition-colors ${
                        budget >= v ? 'text-[#0F6E56] font-bold' : 'text-gray-400'
                      }`}
                      style={{ left: `${pct}%` }}
                    >
                      {v >= 1000 ? `${(v / 1000)}k` : v}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* CTA — demo button removed (live MCP only) */}
          <div className="pt-1">
            <button
              onClick={handleStart}
              className={`w-full bg-[#0F6E56] hover:bg-[#0A5C45] text-white font-semibold py-4 px-6 rounded-2xl cursor-pointer shadow-lg shadow-[#0F6E56]/25 hover:shadow-xl hover:shadow-[#0F6E56]/30 transition-all duration-200 active:scale-[0.98] btn-shimmer ${isSi ? 'font-sinhala' : isTa ? 'font-tamil' : 'font-display'}`}
            >
              {c.cta}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
