import React, { useState } from 'react';
import { Loader2, CheckCircle2, ArrowRight } from 'lucide-react';
import { useUserProfile } from '../hooks/useUserProfile';
import WasiRobotAvatar from './WasiRobotAvatar';
import type { UserProfile, OptionalProfileField } from '../lib/user-profile';

interface ProgressiveProfilePromptProps {
  userId: string;
  // Which fields to ask about. Controls whether step 3 (extras) appears.
  fields: OptionalProfileField[];
  onClose: () => void;
  onComplete?: () => void;
  lang?: 'en' | 'si' | 'ta';
}

// Step 1 recipient chips — culturally inflected SL English, always in English
const RECIPIENT_CHIPS: { code: UserProfile['typical_recipient']; label: string; emoji: string }[] = [
  { code: 'partner',   label: 'My partner',          emoji: '💑' },
  { code: 'parent',    label: 'My amma / thaththa',  emoji: '🙏' },
  { code: 'child',     label: 'My kids',              emoji: '🧸' },
  { code: 'friend',    label: 'A friend / machan',   emoji: '👋' },
  { code: 'self',      label: 'Myself',               emoji: '😄' },
  { code: 'colleague', label: 'Colleague / boss',     emoji: '💼' },
];

const SL_CITIES = ['Colombo', 'Kandy', 'Galle', 'Negombo', 'Jaffna', 'Matara', 'Kurunegala'];

const GENDER_OPTS: { code: NonNullable<UserProfile['gender']>; label: { en: string; si: string; ta: string } }[] = [
  { code: 'female',            label: { en: 'Female',             si: 'ගැහැණිය',    ta: 'பெண்' } },
  { code: 'male',              label: { en: 'Male',               si: 'පිරිමි',      ta: 'ஆண்' } },
  { code: 'nonbinary',         label: { en: 'Non-binary',         si: 'ද්වය නොවන',  ta: 'இருபால்' } },
  { code: 'prefer_not_to_say', label: { en: 'Prefer not to say', si: 'කිවමනා නැත', ta: 'சொல்ல விரும்பவில்லை' } },
];

const DOB_LABEL = { en: 'Your birthday', si: 'ඔබේ උපන් දිනය', ta: 'உங்கள் பிறந்த நாள்' };
const GENDER_LABEL = { en: 'Gender (optional)', si: 'ස්ත්‍රී පුරුෂ භාවය (අමතර)', ta: 'பாலினம் (விருப்பம்)' };

type ExtraField = 'date_of_birth' | 'gender';

export default function ProgressiveProfilePrompt({
  userId, fields, onClose, onComplete, lang = 'en',
}: ProgressiveProfilePromptProps) {
  const { save } = useUserProfile(userId);
  const [step, setStep]       = useState(0);
  const [saving, setSaving]   = useState(false);
  const [patch, setPatch]     = useState<Partial<UserProfile>>({});
  const [cityInput, setCityInput] = useState('');
  const [sliding, setSliding] = useState(false);

  if (fields.length === 0) return null;

  // Step 3 only appears if fields contains date_of_birth or gender
  const extraFields = fields.filter((f): f is ExtraField =>
    f === 'date_of_birth' || f === 'gender'
  );
  const hasExtras  = extraFields.length > 0;
  const totalSteps = hasExtras ? 3 : 2;
  const isLast     = step === totalSteps - 1;

  const advance = async (moreFields?: Partial<UserProfile>) => {
    setSaving(true);
    const fieldsToSave = moreFields ?? {};
    if (Object.keys(fieldsToSave).length > 0) {
      const result = await save(fieldsToSave as Partial<UserProfile>);
      if (result.ok) {
        setPatch(p => ({ ...p, ...fieldsToSave }));
      }
    }
    setSaving(false);

    if (isLast) {
      onComplete?.();
      onClose();
      return;
    }
    setSliding(true);
    setTimeout(() => {
      setStep(s => s + 1);
      setSliding(false);
    }, 180);
  };

  const skipAll = () => onClose();

  // Header title — always caps at "2 things" since step 3 is optional
  const headerTitle =
    step === 2 ? 'Almost done 🌿' :
    step === 1 ? 'Quick! 1 thing to know 🌿' :
                 'Quick! 2 things to know 🌿';

  // Progress bar fraction — based on mandatory steps only
  const progressPct = (step / totalSteps) * 100;

  // City autocomplete: show SL cities that match what's typed (or all if empty)
  const cityHints = SL_CITIES.filter(c =>
    !cityInput || c.toLowerCase().startsWith(cityInput.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={skipAll}
    >
      <div
        className="w-full sm:max-w-sm bg-white sm:rounded-2xl shadow-2xl overflow-hidden rounded-t-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Thin purple progress bar at very top */}
        <div className="h-0.5 bg-gray-100">
          <div
            className="h-full bg-[#402970] transition-all duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Header — white, no gradient, no X button */}
        <div className="px-5 pt-4 pb-3 flex items-center gap-3 border-b border-black/5">
          <WasiRobotAvatar size={36} />
          <h3 className="font-display font-bold text-base text-ink leading-tight flex-1">
            {headerTitle}
          </h3>
        </div>

        {/* Step content with slide-left animation */}
        <div
          className="px-5 pt-5 transition-all duration-200"
          style={{
            opacity:   sliding ? 0 : 1,
            transform: sliding ? 'translateX(-14px)' : 'translateX(0)',
          }}
        >
          {/* ── STEP 1: Who do you usually gift to? ── */}
          {step === 0 && (
            <div className="space-y-4">
              <p className="text-lg font-semibold text-ink leading-snug">
                Who do you usually gift to?
              </p>
              <div className="grid grid-cols-2 gap-2">
                {RECIPIENT_CHIPS.map(({ code, label, emoji }) => (
                  <button
                    key={code}
                    type="button"
                    disabled={saving}
                    onClick={() => advance({ typical_recipient: code })}
                    className="flex items-center gap-2 px-3 py-3 min-h-[48px] rounded-xl text-sm font-medium border border-black/10 bg-white text-gray-700 hover:bg-[#EDE5F8] hover:border-[#402970]/30 active:scale-95 transition-all cursor-pointer text-left disabled:opacity-50"
                  >
                    <span className="text-base leading-none">{emoji}</span>
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 2: Which city? ── */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-lg font-semibold text-ink leading-snug">
                And which city?{' '}
                <span className="text-gray-400 font-normal text-base">
                  I'll always check delivery first.
                </span>
              </p>
              <input
                type="text"
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                placeholder="e.g. Colombo, Kandy"
                autoFocus
                className="w-full px-4 py-3 min-h-[44px] bg-gray-50 border border-black/10 focus:border-[#402970]/40 focus:bg-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#402970]/10 transition"
              />
              {/* Gray hint chips — tap to fill */}
              {cityHints.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {cityHints.map(city => (
                    <button
                      key={city}
                      type="button"
                      onClick={() => setCityInput(city)}
                      className="text-xs text-gray-400 bg-gray-100 hover:bg-[#EDE5F8] hover:text-[#402970] px-2.5 py-1 rounded-full transition cursor-pointer"
                    >
                      {city}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── STEP 3: Optional extras (date_of_birth / gender) ── */}
          {step === 2 && hasExtras && (
            <div className="space-y-5">
              <p className="text-lg font-semibold text-ink leading-snug">
                Anything else to know?{' '}
                <span className="text-gray-400 font-normal text-base">(totally optional)</span>
              </p>

              {extraFields.includes('date_of_birth') && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    {DOB_LABEL[lang] ?? DOB_LABEL.en}
                  </label>
                  <input
                    type="date"
                    value={patch.date_of_birth ?? ''}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setPatch(p => ({ ...p, date_of_birth: e.target.value }))}
                    className="w-full px-4 py-3 min-h-[44px] bg-gray-50 border border-black/10 focus:border-[#402970]/40 focus:bg-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#402970]/10 transition"
                  />
                  <p className="text-[11px] text-gray-400">
                    Wasi will remind you a week before — great for yourself or gifting season! 🎂
                  </p>
                </div>
              )}

              {extraFields.includes('gender') && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    {GENDER_LABEL[lang] ?? GENDER_LABEL.en}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {GENDER_OPTS.map(({ code, label }) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => setPatch(p => ({ ...p, gender: code }))}
                        className={`px-3 py-2.5 min-h-[40px] rounded-xl text-xs font-semibold border cursor-pointer transition-all ${
                          patch.gender === code
                            ? 'bg-[#402970] text-white border-[#402970] shadow-sm'
                            : 'bg-white border-black/10 text-gray-600 hover:bg-[#EDE5F8] hover:border-[#402970]/30'
                        }`}
                      >
                        {label[lang] ?? label.en}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div className="px-5 pt-4 pb-6">
          {step === 0 && (
            // Step 1: no primary button — chip tap = auto-advance
            <div className="flex justify-center pt-1">
              <button
                type="button"
                onClick={skipAll}
                className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer transition"
              >
                Skip setup
              </button>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => {
                  const trimmed = cityInput.trim();
                  advance(trimmed ? { city: trimmed } : {});
                }}
                disabled={saving}
                className="w-full bg-[#402970] text-white text-sm font-semibold px-4 py-3 min-h-[44px] rounded-xl cursor-pointer flex items-center justify-center gap-2 hover:bg-[#321f5a] active:scale-95 disabled:opacity-60 transition shadow-sm"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>That's it, all set</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => advance()}
                  className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer transition"
                >
                  Skip this
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => {
                  const toSave: Partial<UserProfile> = {};
                  if (extraFields.includes('date_of_birth') && patch.date_of_birth) {
                    toSave.date_of_birth = patch.date_of_birth;
                  }
                  if (extraFields.includes('gender') && patch.gender) {
                    toSave.gender = patch.gender;
                  }
                  advance(toSave);
                }}
                disabled={saving}
                className="w-full bg-[#402970] text-white text-sm font-semibold px-4 py-3 min-h-[44px] rounded-xl cursor-pointer flex items-center justify-center gap-2 hover:bg-[#321f5a] active:scale-95 disabled:opacity-60 transition shadow-sm"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Done</span>
                  </>
                )}
              </button>
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={skipAll}
                  className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer transition"
                >
                  Skip setup
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
