import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, CheckCircle2, Sparkles } from 'lucide-react';
import { useUserProfile } from '../hooks/useUserProfile';
import WasiRobotAvatar from './WasiRobotAvatar';
import type { UserProfile, OptionalProfileField } from '../lib/user-profile';

interface ProgressiveProfilePromptProps {
  userId: string;
  fields: OptionalProfileField[];
  onClose: () => void;
  onComplete?: () => void;
  lang?: 'en' | 'si' | 'ta';
}

const GENDER_OPTS: { code: NonNullable<UserProfile['gender']>; label: { en: string; si: string; ta: string }; emoji: string }[] = [
  { code: 'female',            label: { en: 'Female',             si: 'ගැහැණිය',    ta: 'பெண்' },       emoji: '♀️' },
  { code: 'male',              label: { en: 'Male',               si: 'පිරිමි',      ta: 'ஆண்' },        emoji: '♂️' },
  { code: 'nonbinary',         label: { en: 'Non-binary',         si: 'ද්වය නොවන',  ta: 'இருபால்' },    emoji: '⚧️' },
  { code: 'prefer_not_to_say', label: { en: 'Prefer not to say', si: 'කිවමනා නැත', ta: 'சொல்ல விரும்பவில்லை' }, emoji: '🙈' },
];

const RECIPIENT_CHIPS: { code: UserProfile['typical_recipient']; label: { en: string; si: string; ta: string }; emoji: string }[] = [
  { code: 'partner',   label: { en: 'My partner',          si: 'මගේ සහකරු',          ta: 'என் காதலர்' },   emoji: '💑' },
  { code: 'parent',    label: { en: 'My amma / thaththa',  si: 'මගේ අම්මා / තාත්තා', ta: 'என் அம்மா / அப்பா' }, emoji: '🙏' },
  { code: 'child',     label: { en: 'My kids',             si: 'මගේ ළමයි',           ta: 'என் குழந்தைகள்' }, emoji: '🧸' },
  { code: 'friend',    label: { en: 'A friend / machan',   si: 'යාලුවෙක්',           ta: 'ஒரு நண்பர்' },    emoji: '👋' },
  { code: 'self',      label: { en: 'Myself',              si: 'මම',                  ta: 'நானே' },          emoji: '😄' },
  { code: 'colleague', label: { en: 'Colleague / boss',    si: 'සගයෙක් / ලොක්කා',   ta: 'சக ஊழியர் / முதலாளி' }, emoji: '💼' },
];

const SL_CITIES = ['Colombo', 'Kandy', 'Galle', 'Negombo', 'Jaffna', 'Matara', 'Kurunegala'];

const STEP_TITLES: Record<string, { en: string; emoji: string }> = {
  gender:            { en: 'First up — your gender?',          emoji: '🌿' },
  typical_recipient: { en: 'Who do you usually gift to?',      emoji: '🎁' },
  city:              { en: 'And your city?',                   emoji: '📍' },
};

export default function ProgressiveProfilePrompt({
  userId, fields, onClose, onComplete, lang = 'en',
}: ProgressiveProfilePromptProps) {
  const { save } = useUserProfile(userId);
  const [step, setStep]       = useState(0);
  const [saving, setSaving]   = useState(false);
  const [cityInput, setCityInput] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const firstFieldRef = useRef<HTMLButtonElement>(null);

  if (fields.length === 0) return null;

  // Build ordered steps from ONLY the missing fields
  const orderedFields = ['gender', 'typical_recipient', 'city']
    .filter(f => fields.includes(f as OptionalProfileField)) as OptionalProfileField[];
  const totalSteps = orderedFields.length;
  const currentField = orderedFields[step];
  const isLast = step === totalSteps - 1;

  const advance = useCallback(async (moreFields?: Partial<UserProfile>) => {
    setSaving(true);
    setSaveError(null);
    let saved = true;
    const fieldsToSave = moreFields ?? {};
    if (Object.keys(fieldsToSave).length > 0) {
      const result = await save(fieldsToSave as Partial<UserProfile>);
      if (!result.ok) { saved = false; setSaveError(result.error || 'Failed to save'); }
    }
    setSaving(false);

    if (isLast) {
      onComplete?.();
      onClose();
      return;
    }
    if (saved) {
      setStep(s => s + 1);
    }
  }, [isLast, onComplete, onClose, save]);

  const finishNow = useCallback(async () => {
    onComplete?.();
    onClose();
  }, [onComplete, onClose]);

  const skipAll = useCallback(() => onClose(), [onClose]);

  // Escape key handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') skipAll();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [skipAll]);

  // Focus first interactive element on step change
  useEffect(() => {
    if (firstFieldRef.current) {
      firstFieldRef.current.focus();
    }
  }, [step]);

  const headerTitle = STEP_TITLES[currentField]?.en ?? 'Quick setup 🌿';
  const progressPct = ((step + 1) / totalSteps) * 100;

  const cityHints = SL_CITIES.filter(c =>
    !cityInput || c.toLowerCase().startsWith(cityInput.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={skipAll}
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-step-title"
    >
      <div
        className="w-full sm:max-w-sm bg-white sm:rounded-2xl shadow-2xl overflow-hidden rounded-t-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress bar */}
        <div
          className="h-1 bg-gray-100"
          role="progressbar"
          aria-valuenow={step + 1}
          aria-valuemin={1}
          aria-valuemax={totalSteps}
          aria-label={`Step ${step + 1} of ${totalSteps}`}
        >
          <div
            className="h-full transition-all duration-500 ease-out"
            style={{
              width: `${progressPct}%`,
              background: 'linear-gradient(90deg, #402970 0%, #7B5EA7 100%)',
            }}
          />
        </div>

        {/* Header */}
        <div className="px-5 pt-4 pb-3 flex items-center gap-3 border-b border-black/5">
          <WasiRobotAvatar size={36} />
          <div className="flex-1">
            <h3 id="profile-step-title" className="font-display font-bold text-base text-ink leading-tight">
              {headerTitle}
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Step {step + 1} of {totalSteps}
            </p>
          </div>
        </div>

        {/* Step content */}
        <div className="px-5 pt-5">
          {/* ── STEP: Gender ── */}
          {currentField === 'gender' && (
            <div className="space-y-4">
              <p className="text-lg font-semibold text-ink leading-snug">
                First up — your gender?
              </p>
              <p className="text-sm text-gray-400 -mt-2">
                Helps Wasi tailor suggestions. Always optional.
              </p>
              <div role="radiogroup" aria-label="Select gender" className="grid grid-cols-2 gap-2">
                {GENDER_OPTS.map(({ code, label, emoji }, i) => (
                  <button
                    key={code}
                    ref={i === 0 ? firstFieldRef : undefined}
                    type="button"
                    disabled={saving}
                    onClick={() => advance({ gender: code })}
                    className="flex items-center gap-2.5 px-3 py-3 min-h-[48px] rounded-xl text-sm font-medium border border-black/10 bg-white text-gray-700 hover:bg-[#EDE5F8] hover:border-[#402970]/30 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <span className="text-base leading-none">{emoji}</span>
                    <span>{label[lang] ?? label.en}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP: Recipient ── */}
          {currentField === 'typical_recipient' && (
            <div className="space-y-4">
              <p className="text-lg font-semibold text-ink leading-snug">
                Who do you usually gift to?
              </p>
              <div role="radiogroup" aria-label="Select recipient" className="grid grid-cols-2 gap-2">
                {RECIPIENT_CHIPS.map(({ code, label, emoji }, i) => (
                  <button
                    key={code}
                    ref={i === 0 ? firstFieldRef : undefined}
                    type="button"
                    disabled={saving}
                    onClick={() => advance({ typical_recipient: code })}
                    className="flex items-center gap-2.5 px-3 py-3 min-h-[48px] rounded-xl text-sm font-medium border border-black/10 bg-white text-gray-700 hover:bg-[#EDE5F8] hover:border-[#402970]/30 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <span className="text-base leading-none">{emoji}</span>
                    <span>{label[lang] ?? label.en}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP: City ── */}
          {currentField === 'city' && (
            <div className="space-y-4">
              <p className="text-lg font-semibold text-ink leading-snug">
                And your city?{' '}
                <span className="text-gray-400 font-normal text-base">
                  So we can find delivery options near you.
                </span>
              </p>
              <input
                ref={firstFieldRef as React.RefObject<HTMLInputElement>}
                type="text"
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                placeholder="e.g. Colombo, Kandy"
                aria-label="Your city"
                autoFocus
                className="w-full px-4 py-3 min-h-[48px] bg-gray-50 border border-black/10 focus:border-[#402970]/40 focus:bg-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#402970]/10 transition"
              />
              {cityHints.length > 0 && (
                <div role="group" aria-label="Suggested cities" className="flex flex-wrap gap-1.5">
                  {cityHints.map(city => (
                    <button
                      key={city}
                      type="button"
                      onClick={() => setCityInput(city)}
                      className="text-xs text-gray-400 bg-gray-100 hover:bg-[#EDE5F8] hover:text-[#402970] px-3 py-1.5 min-h-[32px] rounded-full transition cursor-pointer"
                    >
                      {city}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer buttons */}
        <div className="px-5 pt-4 pb-6">
          {saveError && (
            <p className="text-[11px] text-rose-600 text-center mb-3 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              {saveError}
            </p>
          )}

          {currentField === 'gender' && (
            <div className="flex justify-center pt-1">
              <button
                type="button"
                onClick={() => advance()}
                className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer transition"
              >
                Skip
              </button>
            </div>
          )}

          {currentField === 'typical_recipient' && (
            <div className="flex justify-center pt-1">
              <button
                type="button"
                onClick={() => advance()}
                className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer transition"
              >
                Skip
              </button>
            </div>
          )}

          {currentField === 'city' && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => {
                  const trimmed = cityInput.trim();
                  advance(trimmed ? { city: trimmed } : {});
                }}
                disabled={saving}
                className="w-full text-white text-sm font-semibold px-4 py-3 min-h-[48px] rounded-xl cursor-pointer flex items-center justify-center gap-2 active:scale-95 disabled:opacity-60 transition shadow-sm"
                style={{
                  background: 'linear-gradient(135deg, #402970 0%, #5B3E8A 100%)',
                  boxShadow: '0 4px 14px rgba(64,41,112,0.3)',
                }}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>You're all set</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                )}
              </button>
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={finishNow}
                  className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer transition"
                >
                  Skip
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
