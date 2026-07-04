import React, { useEffect, useRef, useState } from 'react';
import { LogOut, User as UserIcon, ChevronDown, Sparkles, Edit3 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useUserProfile } from '../hooks/useUserProfile';

interface UserMenuProps {
  lang?: 'en' | 'si' | 'ta';
  // When set, renders a "Complete my profile" item that calls this with a no-op arg
  onOpenProfilePrompt?: () => void;
}

const COPY = {
  greeting:    { en: 'Hi, ',          si: 'ආයුබෝවන්, ',     ta: 'வணக்கம், ' },
  signOut:     { en: 'Sign out',       si: 'ඉවත් වන්න',       ta: 'வெளியேறு' },
  profile:     { en: 'Your profile',   si: 'ඔබේ පැතිකඩ',     ta: 'உங்கள் சுயவிவரம்' },
  notSet:      { en: 'Add your name',  si: 'ඔබේ නම එකතු කරන්න', ta: 'உங்கள் பெயரைச் சேர்க்கவும்' },
  complete:    { en: 'Complete my profile', si: 'මගේ පැතිකඩ සම්පූර්ණ කරන්න', ta: 'எனது சுயவிவரத்தை நிரப்பவும்' },
  incomplete:  { en: 'Add city, birthday, recipient', si: 'නගරය, උපන් දිනය, ලබන්නා එකතු කරන්න', ta: 'நகரம், பிறந்தநாள், பெறுநரைச் சேர்க்கவும்' },
};

const t = (key: keyof typeof COPY, lang: 'en' | 'si' | 'ta' = 'en'): string =>
  COPY[key][lang] ?? COPY[key].en;

export default function UserMenu({ lang = 'en', onOpenProfilePrompt }: UserMenuProps) {
  const { user, signOut } = useAuth();
  const { profile } = useUserProfile(user?.id ?? null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  if (!user) return null;

  const firstName = profile?.first_name;
  const initials = firstName
    ? firstName.slice(0, 1).toUpperCase()
    : (user.email || '?').slice(0, 1).toUpperCase();

  // Profile is "incomplete for personalization" if DOB, city, or typical_recipient is missing
  const profileIsIncomplete =
    !profile?.date_of_birth || !profile?.city || !profile?.typical_recipient;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 bg-white border border-black/8 hover:border-[#402970]/30 px-2 py-1.5 rounded-full cursor-pointer transition-all shadow-xs active:scale-95"
      >
        <span className="w-6 h-6 rounded-full bg-gradient-to-br from-[#402970] to-[#5B3E8A] flex items-center justify-center text-white text-[10px] font-bold">
          {initials}
        </span>
        <span className="hidden sm:inline text-[11px] font-semibold text-[#1A1A1A] max-w-[100px] truncate">
          {firstName || user.email}
        </span>
        <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-xl border border-black/5 overflow-hidden z-40 animate-fade-in">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-br from-[#EDE5F8] to-white border-b border-black/5">
            <p className="text-[11px] text-gray-500 font-mono uppercase tracking-wider">
              {t('greeting', lang)}{firstName || ''}
            </p>
            <p className="text-sm font-semibold text-[#1A1A1A] truncate">
              {user.email}
            </p>
            {profile?.profile_complete ? (
              <p className="text-[10px] text-emerald-700 mt-1 inline-flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" />
                Personalized
              </p>
            ) : (
              <p className="text-[10px] text-amber-700 mt-1">Profile incomplete</p>
            )}
          </div>

          {/* Actions */}
          <div className="py-1">
            <div className="px-4 py-2 text-[10px] font-mono font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <UserIcon className="w-3 h-3" />
              {t('profile', lang)}
            </div>
            <div className="px-4 pb-2 text-[11px] text-gray-500">
              {firstName
                ? <>Name: <span className="text-[#1A1A1A] font-semibold">{firstName} {profile?.last_name || ''}</span></>
                : <span className="italic">{t('notSet', lang)}</span>
              }
              {profile?.city && <span className="block mt-0.5">📍 {profile.city}</span>}
            </div>

            <div className="border-t border-black/5" />

            {/* Complete my profile — explicit user action, not auto */}
            {onOpenProfilePrompt && (
              <button
                onClick={() => {
                  setOpen(false);
                  onOpenProfilePrompt();
                }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-[#5B3E8A] hover:bg-[#EDE5F8] cursor-pointer transition text-left"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <div className="flex flex-col">
                  <span>{t('complete', lang)}</span>
                  {profileIsIncomplete && (
                    <span className="text-[10px] font-normal text-amber-700 mt-0.5">
                      {t('incomplete', lang)}
                    </span>
                  )}
                </div>
              </button>
            )}

            <div className="border-t border-black/5" />

            <button
              onClick={async () => {
                setOpen(false);
                await signOut();
              }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 cursor-pointer transition text-left"
            >
              <LogOut className="w-3.5 h-3.5" />
              {t('signOut', lang)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
