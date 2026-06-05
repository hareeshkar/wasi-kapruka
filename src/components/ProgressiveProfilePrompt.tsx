import React, { useState } from 'react';
import { X, Cake, MapPin, Users, Sparkles, Loader2, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';
import { useUserProfile } from '../hooks/useUserProfile';
import type { UserProfile, OptionalProfileField } from '../lib/user-profile';

interface ProgressiveProfilePromptProps {
  userId: string;
  // Which fields to ask about (in order). Empty array = no-op.
  fields: OptionalProfileField[];
  onClose: () => void;
  onComplete?: () => void;
  lang?: 'en' | 'si' | 'ta';
}

const COPY = {
  intro:     { en: 'Help Wasi know you better', si: 'වාසිට ඔබව 更好 දැනගන්න උදව් කරන්න', ta: 'வாசி உங்களை更好 அறிந்துகொள்ள உதவுங்கள்' },
  why:       { en: 'Wasi uses these to suggest better gifts.', si: 'වඩා හොඳ තෑගි යෝජනා කිරීමට වාසි මේවා භාවිතා කරයි.', ta: 'சிறந்த பரிசுகளை பரிந்துரைக்க வாசி இவற்றைப் பயன்படுத்துகிறார்.' },
  skip:      { en: 'Skip for now',  si: 'දැනට මඟ හරින්න',  ta: 'இப்போது தவிர்' },
  next:      { en: 'Next',          si: 'ඊළඟ',          ta: 'அடுத்து' },
  done:      { en: 'Done',          si: 'අවසානයි',      ta: 'முடிந்தது' },
  dob:       { en: 'When is your birthday?',  si: 'ඔබේ උපන් දිනය කවදාද?',  ta: 'உங்கள் பிறந்த நாள் எப்போது?' },
  dobPh:     { en: 'Month / Day / Year',       si: 'මාසය / දිනය / වසර',  ta: 'மாதம் / நாள் / ஆண்டு' },
  city:      { en: 'Which city are you in?',    si: 'ඔබ කුමන නගරයේද?',  ta: 'நீங்கள் எந்த நகரத்தில்?' },
  cityPh:    { en: 'e.g. Colombo 03, Kandy',    si: 'උදා: කොළඹ 03, මහනුවර',  ta: 'எ.கா. கொழும்பு 03, கண்டி' },
  recipient: { en: 'Who do you usually gift to?', si: 'ඔබ සාමාන්‍යයෙන් කවුදට තෑගි දෙනවාද?', ta: 'நீங்கள் வழக்கமாக யாருக்கு பரிசு தருகிறீர்கள்?' },
  gender:    { en: 'Gender (optional)',         si: 'ස්ත්‍රී පුරුෂ භාවය (අමතර)',  ta: 'பாலினம் (விருப்பம்)' },
  recipientOpts: {
    self:      { en: 'Myself',     si: 'මට ම',         ta: 'எனக்கு' },
    partner:   { en: 'Partner',    si: 'සහකරුවා/සහකාරිය', ta: 'காதலன்/காதலி' },
    parent:    { en: 'Parent',     si: 'දෙමාපියන්',   ta: 'பெற்றோர்' },
    child:     { en: 'Child',      si: 'දරුවා',         ta: 'குழந்தை' },
    friend:    { en: 'Friend',     si: 'මිතුරා',         ta: 'நண்பன்' },
    colleague: { en: 'Colleague',  si: 'සගයා',         ta: 'சகாக்கள்' },
    other:     { en: 'Other',      si: 'වෙනත්',        ta: 'மற்றவை' },
  },
  genderOpts: {
    female:           { en: 'Female',          si: 'ගැහැණිය',  ta: 'பெண்' },
    male:             { en: 'Male',            si: 'පිරිමි',   ta: 'ஆண்' },
    nonbinary:        { en: 'Non-binary',      si: 'ද්වය නොවන',  ta: 'இருபால்' },
    prefer_not_to_say:{ en: 'Prefer not to say', si: 'කිවමනා නැත',  ta: 'சொல்ல விரும்பவில்லை' },
  },
};

// Nested lookup helper — recipientOpts/genderOpts are objects, not leaves
const t = (key: keyof typeof COPY, lang: 'en' | 'si' | 'ta' = 'en'): any => {
  const v = COPY[key] as any;
  return v[lang] ?? v.en;
};

export default function ProgressiveProfilePrompt({
  userId, fields, onClose, onComplete, lang = 'en',
}: ProgressiveProfilePromptProps) {
  const { save } = useUserProfile(userId);
  const [step, setStep]         = useState(0);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string>('');
  const [patch, setPatch]       = useState<Partial<UserProfile>>({});

  if (fields.length === 0) return null;

  const currentField = fields[step];
  const isLast       = step === fields.length - 1;

  const advance = async (moreFields?: Partial<UserProfile>) => {
    setSaving(true);
    setError('');
    const next = { ...patch, ...moreFields };
    if (Object.keys(moreFields || {}).length > 0) {
      const result = await save(moreFields as Partial<UserProfile>);
      if (!result.ok) {
        setError(result.error || 'Save failed');
        setSaving(false);
        return;
      }
      setPatch(next);
    }
    setSaving(false);

    if (isLast) {
      onComplete?.();
      onClose();
      return;
    }
    setStep(step + 1);
  };

  const skipAll = () => {
    onClose();
  };

  const renderField = () => {
    switch (currentField) {
      case 'date_of_birth': {
        const value = patch.date_of_birth || '';
        return (
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-[#1A1A1A]">
              <Cake className="w-4 h-4 text-[#0F6E56]" />
              {t('dob', lang)}
            </label>
            <input
              type="date"
              value={value}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => setPatch(p => ({ ...p, date_of_birth: e.target.value }))}
              className="w-full px-4 py-3 bg-[#F7F5F1] border border-black/8 focus:border-[#0F6E56]/40 focus:bg-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/10 transition"
            />
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Wasi will surprise you with a birthday gift idea a week before. 🎁
            </p>
          </div>
        );
      }
      case 'city': {
        const value = patch.city || '';
        return (
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-[#1A1A1A]">
              <MapPin className="w-4 h-4 text-[#0F6E56]" />
              {t('city', lang)}
            </label>
            <input
              type="text"
              value={value}
              onChange={(e) => setPatch(p => ({ ...p, city: e.target.value }))}
              placeholder={t('cityPh', lang)}
              className="w-full px-4 py-3 bg-[#F7F5F1] border border-black/8 focus:border-[#0F6E56]/40 focus:bg-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/10 transition"
            />
          </div>
        );
      }
      case 'typical_recipient': {
        const opts = (['self', 'partner', 'parent', 'child', 'friend', 'colleague', 'other'] as const);
        const value = patch.typical_recipient;
        return (
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-[#1A1A1A]">
              <Users className="w-4 h-4 text-[#0F6E56]" />
              {t('recipient', lang)}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {opts.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setPatch(p => ({ ...p, typical_recipient: code }))}
                  className={`px-3 py-2.5 rounded-xl text-xs font-semibold border cursor-pointer transition-all ${
                    value === code
                      ? 'bg-[#0F6E56] text-white border-[#0F6E56] shadow-sm'
                      : 'bg-white border-black/10 text-gray-600 hover:bg-[#E1F5EE] hover:border-[#0F6E56]/30'
                  }`}
                >
                  {t('recipientOpts', lang)[code]}
                </button>
              ))}
            </div>
          </div>
        );
      }
      case 'gender': {
        const opts = (['female', 'male', 'nonbinary', 'prefer_not_to_say'] as const);
        const value = patch.gender;
        return (
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-[#1A1A1A]">
              <Sparkles className="w-4 h-4 text-[#0F6E56]" />
              {t('gender', lang)}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {opts.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setPatch(p => ({ ...p, gender: code }))}
                  className={`px-3 py-2.5 rounded-xl text-xs font-semibold border cursor-pointer transition-all ${
                    value === code
                      ? 'bg-[#0F6E56] text-white border-[#0F6E56] shadow-sm'
                      : 'bg-white border-black/10 text-gray-600 hover:bg-[#E1F5EE] hover:border-[#0F6E56]/30'
                  }`}
                >
                  {t('genderOpts', lang)[code]}
                </button>
              ))}
            </div>
          </div>
        );
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={skipAll}
    >
      <div
        className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative bg-gradient-to-br from-[#0F6E56] to-[#0A5C45] px-5 py-4 text-white">
          <button
            onClick={skipAll}
            className="absolute top-3 right-3 text-white/70 hover:text-white cursor-pointer p-1 rounded-full hover:bg-white/10 transition"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-[#C9A84C]" />
            <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-white/80">
              {step + 1} / {fields.length}
            </span>
          </div>
          <h3 className="font-display font-bold text-base leading-tight">{t('intro', lang)}</h3>
          <p className="text-[11px] text-white/75 mt-0.5 leading-relaxed">{t('why', lang)}</p>
        </div>

        <div className="p-5 space-y-4">
          {renderField()}

          {error && (
            <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-2">
            <button
              type="button"
              onClick={skipAll}
              className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer font-medium"
            >
              {t('skip', lang)}
            </button>
            <button
              type="button"
              onClick={() => advance(patch)}
              disabled={saving}
              className="bg-gradient-to-br from-[#0F6E56] to-[#0A5C45] text-white text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-1.5 hover:from-[#0A5C45] hover:to-[#083D30] active:scale-95 disabled:opacity-60 transition shadow-md shadow-[#0F6E56]/20"
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : isLast ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{t('done', lang)}</span>
                </>
              ) : (
                <>
                  <span>{t('next', lang)}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5 pt-1">
            {fields.map((_, i) => (
              <span
                key={i}
                className={`h-1 rounded-full transition-all ${
                  i === step ? 'w-6 bg-[#0F6E56]' : 'w-1.5 bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
