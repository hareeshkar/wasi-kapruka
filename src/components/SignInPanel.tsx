import React, { useState } from 'react';
import { X, Mail, Lock, Sparkles, Loader2, CheckCircle2, ArrowLeft, KeyRound, User, Globe2, Cake, HelpCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { updateProfile } from '../lib/user-profile';

type Mode = 'signin' | 'signup' | 'magic';
type Status = 'idle' | 'sending' | 'success' | 'error';

interface SignInPanelProps {
  open: boolean;
  onClose: () => void;
  lang?: 'en' | 'si' | 'ta';
}

const COPY = {
  signinTitle:    { en: 'Welcome back',           si: 'නැවත සාදරයෙන්',     ta: 'மீண்டும் வரவேற்கிறேன்' },
  signupTitle:    { en: 'Save your gift history', si: 'ඔබේ තෑගි ඉතිහාසය සුරකින්න', ta: 'உங்கள் பரிசு வரலாற்றை சேமிக்கவும்' },
  magicTitle:     { en: 'Magic link sign-in',     si: 'මැජික් ලින්ක් පිවිසුම',  ta: 'மேஜிக் லிங்க் உள்நுழைவு' },
  firstNamePh:    { en: 'First name',             si: 'මුල් නම',           ta: 'முதல் பெயர்' },
  lastNamePh:     { en: 'Last name (optional)',   si: 'අවසාන නම (අමතර)',   ta: 'கடைசி பெயர் (விருப்பம்)' },
  emailPh:        { en: 'you@example.com',        si: 'ඔබ@උදාහරණ.com',  ta: 'நீங்கள்@உதாரணம்.com' },
  passwordPh:     { en: 'At least 6 characters',   si: 'අවම වශයෙන් අක්ෂර 6', ta: 'குறைந்தது 6 எழுத்துக்கள்' },
  firstNameLabel: { en: 'First name',             si: 'මුල් නම',           ta: 'முதல் பெயர்' },
  lastNameLabel:  { en: 'Last name',              si: 'අවසාන නම',         ta: 'கடைசி பெயர்' },
  emailLabel:     { en: 'Email',                  si: 'ඊමේල්',            ta: 'மின்னஞ்சல்' },
  passwordLabel:  { en: 'Password',               si: 'මුරපදය',           ta: 'கடவுச்சொல்' },
  languageLabel:  { en: 'I prefer',               si: 'මට වඩා කැමති',      ta: 'எனக்கு விருப்பம்' },
  signin:         { en: 'Sign in',                si: 'පිවිසෙන්න',        ta: 'உள்நுழைய' },
  signup:         { en: 'Create account',         si: 'ගිණුම සාදන්න',     ta: 'கணக்கை உருவாக்கு' },
  magicBtn:       { en: 'Send magic link',        si: 'මැජික් ලින්ක් එවන්න', ta: 'மேஜிக் லிங்கை அனுப்பு' },
  noAccount:      { en: "No account? Sign up",    si: 'ගිණුමක් නැද්ද? ලියාපදිංචි වන්න', ta: 'கணக்கு இல்லையா? பதிவு செய்யவும்' },
  hasAccount:     { en: 'Have an account? Sign in', si: 'ගිණුමක් තිබේද? පිවිසෙන්න', ta: 'கணக்கு உள்ளதா? உள்நுழையவும்' },
  useMagic:       { en: 'Use magic link instead', si: 'ඒ වෙනුවට මැජික් ලින්ක්', ta: 'அதற்கு பதிலாக மேஜிக் லிங்க்' },
  usePassword:    { en: 'Use password instead',   si: 'ඒ වෙනුවට මුරපදය',    ta: 'அதற்கு பதிலாக கடவுச்சொல்' },
  successMagic:   { en: 'Check your email! 📬 We sent a one-time sign-in link.', si: 'ඔබේ ඊමේල් පරීක්ෂා කරන්න! 📬 අපි එක් වරක් පිවිසුම් ලින්ක් එකක් යවා ඇත.', ta: 'உங்கள் மின்னஞ்சலைப் பாருங்கள்! 📬' },
  successSignup:  { en: 'Account created! Check your email to confirm before signing in.', si: 'ගිණුම සාදන ලදී! පිවිසෙන්න පෙර තහවුරු කිරීමට ඔබේ ඊමේල් පරීක්ෂා කරන්න.', ta: 'கணக்கு உருவாக்கப்பட்டது! உள்நுழைவதற்கு முன் உங்கள் மின்னஞ்சலை உறுதிப்படுத்தவும்.' },
  tagline:        { en: 'Sign in to persist your gift history and get a personalized concierge.', si: 'ඔබේ තෑගි ඉතිහාසය පවත්වා ගැනීමට සහ පුද්ගලීකරණය කළ උපදෙස්කරුවෙකු ලබා ගැනීමට පිවිසෙන්න.', ta: 'உங்கள் பரிசு வரலாற்றை தக்கவைக்கவும், தனிப்பயனாக்கப்பட்ட துணைவனைப் பெறவும் உள்நுழையவும்.' },
  englishLabel:   { en: 'English',                si: 'ඉංග්‍රීසි',          ta: 'ஆங்கிலம்' },
  sinhalaLabel:   { en: 'Sinhala',                si: 'සිංහල',             ta: 'சிங்களம்' },
  tamilLabel:     { en: 'Tamil',                  si: 'දෙමළ',              ta: 'தமிழ்' },
  dobLabel:       { en: 'Date of birth (optional)', si: 'උපන් දිනය (අමතර)', ta: 'பிறந்த தேதி (விருப்பம்)' },
  dobPh:          { en: 'Month / Day / Year',     si: 'මාසය / දිනය / වසර',  ta: 'மாதம் / நாள் / ஆண்டு' },
  dobWhy:         { en: 'Why we ask',             si: 'අපි ඇහුවේ ඇයි',     ta: 'ஏன் கேட்கிறோம்' },
  dobWhyBody:     { en: 'Your age helps Wasi suggest gifts that match your life stage — university, mid-career, retirement, etc. We never share this with anyone.',
                     si: 'ඔබේ වයස ඔබේ ජීවන අදියරයට ගැළපෙන තෑගි යෝජනා කිරීමට වාසිට උදව් කරයි — විශ්ව විද්‍යාලය, මධ්‍ය රැකියා, විශ්‍රාම ආදිය. අපි මෙය කිසිවෙකු සමඟ බෙදා නොගනිමු.',
                     ta: 'உங்கள் வாழ்க்கை நிலைக்கு ஏற்ற பரிசுகளை பரிந்துரைக்க உங்கள் வயது வாசிக்கு உதவுகிறது — பல்கலைக்கழகம், நடுத்தர தொழில், ஓய்வு போன்றவை. இதை யாருடனும் பகிர்ந்து கொள்ள மாட்டோம்.' },
};

const t = (key: keyof typeof COPY, lang: 'en' | 'si' | 'ta' = 'en'): string =>
  COPY[key][lang] ?? COPY[key].en;

export default function SignInPanel({ open, onClose, lang = 'en' }: SignInPanelProps) {
  const { signIn, signUp, signInWithMagicLink, user } = useAuth();
  const [mode, setMode]         = useState<Mode>('signin');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [preferredLang, setPreferredLang] = useState<'en' | 'si' | 'ta'>(lang);
  const [showDobWhy, setShowDobWhy] = useState(false);
  const [status, setStatus]     = useState<Status>('idle');
  const [message, setMessage]   = useState<string>('');

  if (!open) return null;

  const reset = () => {
    setFirstName(''); setLastName(''); setEmail(''); setPassword(''); setDateOfBirth('');
    setPreferredLang(lang);
    setShowDobWhy(false);
    setStatus('idle'); setMessage('');
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setMessage('');
    setStatus('idle');
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('sending');
    setMessage('');

    try {
      if (mode === 'magic') {
        const { error } = await signInWithMagicLink(email.trim());
        if (error) { setStatus('error'); setMessage(error); }
        else { setStatus('success'); setMessage(t('successMagic', lang)); }
        return;
      }

      if (mode === 'signup') {
        const { user, session, error } = await signUp(email.trim(), password);
        if (error) { setStatus('error'); setMessage(error); return; }

        // Profile fields — write immediately. The trigger on auth.users
        // creates an empty row, so this UPDATE will succeed.
        const userId = user?.id;
        if (userId) {
          await updateProfile(userId, {
            first_name: firstName.trim() || undefined,
            last_name:  lastName.trim()  || undefined,
            email:      email.trim(),
            date_of_birth: dateOfBirth || undefined,
            preferred_language: preferredLang,
            // Mark complete only if essentials are filled
            profile_complete: !!(firstName.trim() && preferredLang),
          });
        }

        if (session) {
          // Auto-signed in (no email confirmation)
          setStatus('success');
          setTimeout(onClose, 600);
        } else {
          setStatus('success');
          setMessage(t('successSignup', lang));
        }
        return;
      }

      // signin
      const { error } = await signIn(email.trim(), password);
      if (error) { setStatus('error'); setMessage(error); }
      else { setStatus('success'); setTimeout(onClose, 600);
      }
    } catch (err: any) {
      setStatus('error');
      setMessage(err?.message || 'Something went wrong');
    }
  };

  const title =
    mode === 'signup' ? t('signupTitle', lang) :
    mode === 'magic'  ? t('magicTitle', lang)  :
                        t('signinTitle', lang);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header strip */}
        <div className="relative bg-gradient-to-br from-[#0F6E56] to-[#0A5C45] px-6 py-5 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white cursor-pointer p-1 rounded-full hover:bg-white/10 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="w-4 h-4 text-[#C9A84C]" />
            <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-white/80">
              Wasi Account
            </span>
          </div>
          <h2 className="font-display font-bold text-xl leading-tight">{title}</h2>
          <p className="text-xs text-white/75 mt-1 leading-relaxed">{t('tagline', lang)}</p>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          {/* First name + last name — signup only */}
          {mode === 'signup' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-mono font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  <User className="w-3 h-3 inline mr-1" />
                  {t('firstNameLabel', lang)}
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder={t('firstNamePh', lang)}
                  autoComplete="given-name"
                  className="w-full px-3 py-3 bg-[#F7F5F1] border border-black/8 focus:border-[#0F6E56]/40 focus:bg-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/10 transition"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  {t('lastNameLabel', lang)}
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder={t('lastNamePh', lang)}
                  autoComplete="family-name"
                  className="w-full px-3 py-3 bg-[#F7F5F1] border border-black/8 focus:border-[#0F6E56]/40 focus:bg-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/10 transition"
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-[11px] font-mono font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              <Mail className="w-3 h-3 inline mr-1" />
              {t('emailLabel', lang)}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('emailPh', lang)}
              autoComplete="email"
              className="w-full px-4 py-3 bg-[#F7F5F1] border border-black/8 focus:border-[#0F6E56]/40 focus:bg-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/10 transition"
            />
          </div>

          {/* Password (hidden in magic-link mode) */}
          {mode !== 'magic' && (
            <div>
              <label className="block text-[11px] font-mono font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                <Lock className="w-3 h-3 inline mr-1" />
                {t('passwordLabel', lang)}
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('passwordPh', lang)}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                className="w-full px-4 py-3 bg-[#F7F5F1] border border-black/8 focus:border-[#0F6E56]/40 focus:bg-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/10 transition"
              />
            </div>
          )}

          {/* Language preference — signup only */}
          {mode === 'signup' && (
            <div>
              <label className="block text-[11px] font-mono font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                <Globe2 className="w-3 h-3 inline mr-1" />
                {t('languageLabel', lang)}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['en', 'si', 'ta'] as const).map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setPreferredLang(code)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border cursor-pointer transition-all ${
                      preferredLang === code
                        ? 'bg-[#0F6E56] text-white border-[#0F6E56] shadow-sm'
                        : 'bg-white border-black/10 text-gray-600 hover:bg-[#E1F5EE] hover:border-[#0F6E56]/30'
                    }`}
                  >
                    {code === 'en' ? t('englishLabel', lang)
                      : code === 'si' ? t('sinhalaLabel', lang)
                      : t('tamilLabel', lang)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Date of birth — signup only, optional, with "Why we ask" tooltip */}
          {mode === 'signup' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-mono font-semibold text-gray-500 uppercase tracking-wider">
                  <Cake className="w-3 h-3 inline mr-1" />
                  {t('dobLabel', lang)}
                </label>
                <button
                  type="button"
                  onClick={() => setShowDobWhy(s => !s)}
                  className="text-[10px] text-[#0A5C45] hover:text-[#0F6E56] font-semibold cursor-pointer inline-flex items-center gap-0.5"
                  aria-label={t('dobWhy', lang)}
                >
                  <HelpCircle className="w-3 h-3" />
                  {t('dobWhy', lang)}
                </button>
              </div>
              <input
                type="date"
                value={dateOfBirth}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full px-4 py-3 bg-[#F7F5F1] border border-black/8 focus:border-[#0F6E56]/40 focus:bg-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/10 transition"
              />
              {showDobWhy && (
                <p className="mt-2 text-[11px] text-gray-600 leading-relaxed bg-[#E1F5EE]/60 border border-[#0F6E56]/15 rounded-lg px-3 py-2 animate-fade-in">
                  {t('dobWhyBody', lang)}
                </p>
              )}
            </div>
          )}

          {/* Status / error */}
          {status === 'error' && message && (
            <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
              {message}
            </div>
          )}
          {status === 'success' && message && (
            <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{message}</span>
            </div>
          )}

          {/* Primary button */}
          <button
            type="submit"
            disabled={status === 'sending' || status === 'success'}
            className="w-full bg-gradient-to-br from-[#0F6E56] to-[#0A5C45] hover:from-[#0A5C45] hover:to-[#083D30] text-white font-semibold py-3 rounded-xl cursor-pointer transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md shadow-[#0F6E56]/20"
          >
            {status === 'sending' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>…</span>
              </>
            ) : status === 'success' ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Done</span>
              </>
            ) : mode === 'signup' ? (
              <>
                <Sparkles className="w-4 h-4" />
                <span>{t('signup', lang)}</span>
              </>
            ) : mode === 'magic' ? (
              <>
                <Mail className="w-4 h-4" />
                <span>{t('magicBtn', lang)}</span>
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                <span>{t('signin', lang)}</span>
              </>
            )}
          </button>

          {/* Mode switches */}
          <div className="text-center space-y-1.5 pt-2">
            {mode === 'signin' && (
              <>
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="block w-full text-xs text-[#0A5C45] hover:text-[#0F6E56] font-semibold cursor-pointer"
                >
                  {t('noAccount', lang)}
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('magic')}
                  className="block w-full text-[11px] text-gray-500 hover:text-gray-700 cursor-pointer"
                >
                  {t('useMagic', lang)}
                </button>
              </>
            )}
            {mode === 'signup' && (
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className="block w-full text-xs text-[#0A5C45] hover:text-[#0F6E56] font-semibold cursor-pointer"
              >
                {t('hasAccount', lang)}
              </button>
            )}
            {mode === 'magic' && (
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3" />
                {t('usePassword', lang)}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
