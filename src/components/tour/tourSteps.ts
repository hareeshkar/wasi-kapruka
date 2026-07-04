export type TourStepId =
  | 'welcome'
  | 'discover'
  | 'multimodal'
  | 'deliver'
  | 'checkout'
  | 'track'
  | 'remember';

export type TourLang = 'en' | 'si' | 'ta';

export const TOUR_STEPS: TourStepId[] = [
  'welcome', 'discover', 'multimodal', 'deliver', 'checkout', 'track', 'remember',
];

export interface TourFeature { label: string; detail: string; }

export interface TourStepContent {
  title: string;
  lead: string;
  features: TourFeature[];
  examplePrompt?: string;
}

export const TOUR_COPY: Record<TourStepId, Record<TourLang, TourStepContent>> = {
  welcome: {
    en: {
      title: 'Meet Wasi',
      lead: 'Your Kapruka shopping companion — built for finding and sending gifts across Sri Lanka.',
      features: [
        { label: 'Trilingual', detail: 'English, Sinhala, and Tamil in one conversation.' },
        { label: 'Gift-first', detail: 'Occasions, recipients, and relationships.' },
        { label: 'Kapruka native', detail: 'Live catalog, checkout, and delivery.' },
        { label: 'Free to browse', detail: 'No signup required to start.' },
      ],
    },
    si: {
      title: 'Wasi හමුවෙන්න',
      lead: 'ඔබේ Kapruka සාප්පු සහායක — ශ්‍රී ලංකාව පුරා තෑගි සොයාගැනීම සඳහා නිර්මාණය කළ AI.',
      features: [
        { label: 'භාෂා තුනෙන්ම', detail: 'ඉංග්‍රීසි, සිංහල සහ දෙමළ — එකම කතාබහක.' },
        { label: 'ලබන්නාගේ සන්දර්භය', detail: 'අවස්ථා, සම්බන්ධතා, සහ වයස් කාණ්ඩ.' },
        { label: 'Kapruka සම්බන්ධතාව', detail: 'සජීවී නිෂ්පාදන, ගෙවීම, බෙදාහැරීම.' },
        { label: 'නොමිලේ බැලීම', detail: 'ගිණුමක් නැතිව ආරම්භ කරන්න.' },
      ],
    },
    ta: {
      title: 'Wasi-யை சந்தியுங்கள்',
      lead: 'உங்கள் Kapruka ஷாப்பிங் துணை — இலங்கை முழுவதும் பரிசுகளைத் தேடவும் அனுப்பவும் வடிவமைக்கப்பட்ட AI.',
      features: [
        { label: 'மும்மொழி ஆதரவு', detail: 'ஆங்கிலம், சிங்களம், தமிழ் — ஒரே உரையாடலில்.' },
        { label: 'பெறுநர் சூழல்', detail: 'நிகழ்வுகள், உறவுகள், வயது குழுக்கள்.' },
        { label: 'Kapruka ஒருங்கிணைப்பு', detail: 'நேரடி பட்டியல், கட்டணம், விநியோகம்.' },
        { label: 'இலவச உலாவல்', detail: 'பதிவு செய்யாமல் தொடங்கலாம்.' },
      ],
    },
  },
  discover: {
    en: {
      title: 'Browse 120,000+ items',
      lead: 'Search and compare naturally. Wasi maps your words to real Kapruka listings.',
      features: [
        { label: 'Budget-aware search', detail: 'Results tuned to your LKR limit.' },
        { label: '64+ categories', detail: 'From cakes to electronics.' },
        { label: 'Compare picks', detail: 'Side-by-side on one panel.' },
        { label: 'Photo match', detail: 'Upload a reference to find it.' },
      ],
      examplePrompt: 'Show me birthday cakes under Rs. 5,000',
    },
    si: {
      title: 'භාණ්ඩ 120,000+ ගවේෂණය',
      lead: 'වෙහෙසකින් තොරව සොයන්න සහ සසඳන්න. Wasi ඔබේ වචන සැබෑ Kapruka නිෂ්පාදන වලට සම්බන්ධ කරයි.',
      features: [
        { label: 'අයවැය සැලකිල්ල', detail: 'ඔබේ රුපියල් සීමාවට ගැලපෙන ප්‍රතිඵල.' },
        { label: 'කාණ්ඩ 64+', detail: 'කේක් සිට විදුලි උපකරණ දක්වා.' },
        { label: 'සසඳන ලැයිස්තු', detail: 'එක තිරයක සසඳා බැලීම.' },
        { label: 'ඡායාරූප සෙවුම', detail: 'ඡායාරූපයක් upload කර හොයන්න.' },
      ],
      examplePrompt: 'රු. 5,000 යට උපන්දින කේක් පෙන්වන්න',
    },
    ta: {
      title: '120,000+ தயாரிப்புகள்',
      lead: 'எளிதாக தேடி ஒப்பிடுங்கள். உங்கள் வார்த்தைகளை உண்மையான Kapruka பட்டியல்களுடன் Wasi இணைக்கிறது.',
      features: [
        { label: 'பட்ஜெட் சரிசெய்தல்', detail: 'உங்கள் ரூபாய் வரம்புக்கு ஏற்ப முடிவுகள்.' },
        { label: '64+ வகைகள்', detail: 'கேக்குகள் முதல் மின்னணுவியல் வரை.' },
        { label: 'ஒப்பீட்டு பட்டியல்', detail: 'ஒரே திரையில் ஒப்பிடுதல்.' },
        { label: 'புகைப்பட தேடல்', detail: 'புகைப்படம் upload செய்து கண்டுபிடிக்கவும்.' },
      ],
      examplePrompt: 'ரூ. 5,000 க்கு குறைவான பிறந்தநாள் கேக்குகளைக் காட்டுங்கள்',
    },
  },
  multimodal: {
    en: {
      title: 'Talk, type, or show',
      lead: 'Voice notes, photos, or mixed language — Wasi understands how people actually shop in Sri Lanka.',
      features: [
        { label: 'Voice notes', detail: 'Hold the mic and speak naturally.' },
        { label: 'Image search', detail: 'Upload or paste product photos.' },
        { label: 'Mixed language', detail: 'English, Sinhala, and Tamil together.' },
        { label: 'Quick suggestions', detail: 'One-tap example chips.' },
      ],
      examplePrompt: 'Amma ku gift ekak — flowers plus chocolate',
    },
    si: {
      title: 'කතා කරන්න, ලියන්න, පෙන්වන්න',
      lead: 'ඔබට අවශ්‍ය ආකාරයටම සන්නිවේදනය කරන්න. Wasi voice note සහ ඡායාරූප මඟින් ඔබේ පණිවිඩ තේරුම් ගනී.',
      features: [
        { label: 'Voice note', detail: 'mic එක hold කරලා කතා කරන්න.' },
        { label: 'ඡායාරූප සෙවුම', detail: 'product photo upload හෝ paste.' },
        { label: 'භාෂා මිශ්‍ර', detail: 'ඉංග්‍රීසි, සිංහල, දෙමළ එකට.' },
        { label: 'ඉක්මන් යෝජනා', detail: 'tap එකකින් උදාහරණ chips.' },
      ],
      examplePrompt: 'අම්මාට තෑග්ගක් — මල් සහ චොකලට්',
    },
    ta: {
      title: 'பேசுங்கள், எழுதுங்கள், காட்டுங்கள்',
      lead: 'குரல் பதிவு, புகைப்படம், அல்லது நீங்கள் பேசும் வழி — Wasi புரிந்துகொள்கிறது.',
      features: [
        { label: 'குரல் பதிவுகள்', detail: 'mic-ஐ hold செய்து இயல்பாகப் பேசுங்கள்.' },
        { label: 'புகைப்பட தேடல்', detail: 'product photo upload அல்லது paste.' },
        { label: 'கலப்பு மொழி', detail: 'ஆங்கிலம், சிங்களம், தமிழ் ஒன்றாக.' },
        { label: 'விரைவு பரிந்துரை', detail: 'ஒரு tap-ல் எடுத்துக்காட்டு chips.' },
      ],
      examplePrompt: 'அம்மாவுக்கு பரிசு — பூக்கள் மற்றும் சாக்லேட்',
    },
  },
  deliver: {
    en: {
      title: 'Deliver anywhere in Sri Lanka',
      lead: 'Check availability and fees before you commit — Colombo to Kandy, Jaffna, or Galle.',
      features: [
        { label: 'City matching', detail: 'Fuzzy match for town names.' },
        { label: 'Fee preview', detail: 'Delivery cost before checkout.' },
        { label: 'Gift message', detail: 'Personal note on the card.' },
        { label: 'Fresh-item alerts', detail: 'Cakes and flowers handled carefully.' },
      ],
      examplePrompt: 'Can you deliver to Kandy tomorrow?',
    },
    si: {
      title: 'දේශීය බෙදාහැරීමේ නිරවද්‍යතාව',
      lead: 'ප්‍රවාහන සීමාවන් කල්තියා පරීක්ෂා කරන්න. කොළඹ සිට මහනුවර, යාපනය හෝ ගාල්ල දක්වාම.',
      features: [
        { label: 'ලිපින හඳුනාගැනීම', detail: 'විවිධ අක්ෂර වින්‍යාසයන් තිබුණද දේශීය ප්‍රදේශ නිවැරදිව හඳුනාගැනීම.' },
        { label: 'කල්තියා ගාස්තු ගණනය', detail: 'ඇණවුම් කිරීමට පෙර බෙදාහැරීමේ ගාස්තු ක්ෂණිකව දැකගැනීම.' },
        { label: 'තෑගි පණිවිඩය', detail: 'තෑගි කාඩ්පතේ පෞද්ගලික සටහන.' },
        { label: 'අලුත් භාණ්ඩ දැනුම්දීම', detail: 'කේක් සහ මල් වැනි අලුත් භාණ්ඩ ප්‍රවාහනයේදී විශේෂ සැලකිල්ල.' },
      ],
      examplePrompt: 'හෙට මහනුවරට බෙදාහැරිය හැකිද?',
    },
    ta: {
      title: 'துல்லியமான உள்ளூர் விநியோகம்',
      lead: 'விநியோக சாத்தியங்களை முன்கூட்டியே சரிபார்க்கவும். கொழும்பில் இருந்து யாழ்ப்பாணம், கண்டி அல்லது காலி வரை.',
      features: [
        { label: 'முகவரி பொருத்தம்', detail: 'எழுத்துப்பிழையாக இருந்தாலும் உள்ளூர் பகுதிகளை சரியாக கண்டறியும்.' },
        { label: 'முன்கூட்டியே கட்டணம்', detail: 'பதிவு செய்வதற்கு முன்பே விநியோக கட்டணங்களை அறியும்.' },
        { label: 'பரிசு செய்தி', detail: 'card-ல் தனிப்பட்ட குறிப்பு.' },
        { label: 'புதிய பொருள் எச்சரிக்கை', detail: 'கேக்குகள் மற்றும் மலர்களுக்கு சிறப்பு handling.' },
      ],
      examplePrompt: 'நாளை கண்டிக்கு விநியோகம் செய்ய முடியுமா?',
    },
  },
  checkout: {
    en: {
      title: 'Checkout with confidence',
      lead: 'Lock your total for 60 minutes and pay through secure Kapruka gateways.',
      features: [
        { label: '60-minute price lock', detail: 'LKR total held while you decide.' },
        { label: 'Share payment link', detail: 'Send via WhatsApp to family.' },
        { label: 'Multi-currency', detail: 'LKR, USD, GBP, AUD, CAD.' },
        { label: 'Guest checkout', detail: 'No account required to pay.' },
      ],
    },
    si: {
      title: 'විශ්වාසයෙන් checkout',
      lead: 'total එක මිනිත්තු 60ක් lock කර secure Kapruka gateways හරහා ගෙවන්න.',
      features: [
        { label: 'මිනිත්තු 60ක මිල තහවුරුව', detail: 'තීරණය ගන්නා තුරු LKR මුදල තහවුරුව.' },
        { label: 'payment link share', detail: 'WhatsApp හරහා පවුලට යවන්න.' },
        { label: 'multi-currency', detail: 'LKR, USD, GBP, AUD, CAD.' },
        { label: 'guest checkout', detail: 'account එකක් නොමැතිව ගෙවන්න.' },
      ],
    },
    ta: {
      title: 'நம்பிக்கையுடன் checkout',
      lead: 'total-ஐ 60 நிமிடங்கள் lock செய்து secure Kapruka gateways வழியாக செலுத்துங்கள்.',
      features: [
        { label: '60-நிமிட price lock', detail: 'LKR total முடிவு செய்யும் நேரத்தில் hold.' },
        { label: 'payment link share', detail: 'WhatsApp வழியாக குடும்பத்திற்கு அனுப்புங்கள்.' },
        { label: 'multi-currency', detail: 'LKR, USD, GBP, AUD, CAD.' },
        { label: 'guest checkout', detail: 'account இல்லாமல் செலுத்தலாம்.' },
      ],
    },
  },
  track: {
    en: {
      title: 'Track every gift',
      lead: 'From payment to doorstep — follow each step of the journey.',
      features: [
        { label: 'Live timeline', detail: 'Status updates as prep progresses.' },
        { label: 'Order lookup', detail: 'VPAY or KAP reference codes.' },
        { label: 'Recipient info', detail: 'Name, city, and contact.' },
        { label: 'Delivery proof', detail: 'Photo flags when available.' },
      ],
      examplePrompt: 'Track order VPAY827982BA',
    },
    si: {
      title: 'සෑම තෑගියක්ම track කරන්න',
      lead: 'ගෙවීමේ සිට දොරදාරය දක්වා — ගමනේ සෑම පියවරක්ම අනුගමනය කරන්න.',
      features: [
        { label: 'live timeline', detail: 'prep advance වන විට status updates.' },
        { label: 'order lookup', detail: 'VPAY හෝ KAP reference codes.' },
        { label: 'recipient info', detail: 'name, city, contact.' },
        { label: 'delivery proof', detail: 'photo flags when available.' },
      ],
      examplePrompt: 'VPAY827982BA order එක track කරන්න',
    },
    ta: {
      title: 'ஒவ்வொரு பரிசையும் track செய்யுங்கள்',
      lead: 'கட்டணம் முதல் doorstep வரை — journey-யின் ஒவ்வொரு படியும்.',
      features: [
        { label: 'live timeline', detail: 'prep advance ஆகும்போது status updates.' },
        { label: 'order lookup', detail: 'VPAY அல்லது KAP reference codes.' },
        { label: 'recipient info', detail: 'name, city, contact.' },
        { label: 'delivery proof', detail: 'photo flags when available.' },
      ],
      examplePrompt: 'VPAY827982BA order-ஐ track செய்யுங்கள்',
    },
  },
  remember: {
    en: {
      title: 'Wasi remembers you',
      lead: 'Sign in once — your cart, taste, and chat history follow you across sessions.',
      features: [
        { label: 'Chat history', detail: 'Pick up where you left off.' },
        { label: 'Saved carts', detail: 'Lists survive closing the tab.' },
        { label: 'Personal profile', detail: 'Name, city, and preferences.' },
        { label: 'Magic link sign-in', detail: 'Passwordless, secure access.' },
      ],
    },
    si: {
      title: 'Wasi ඔබව මතක තබාගනී',
      lead: 'වරක් පිවිසෙන්න — ඔබේ cart, කැමැත්ත, සහ කතාබහ ඉතිහාසය සැසි අතර අනුගමනය වේ.',
      features: [
        { label: 'chat history', detail: 'නතර කළ තැනින් continue.' },
        { label: 'saved carts', detail: 'tab close කළත් lists survive.' },
        { label: 'personal profile', detail: 'name, city, preferences.' },
        { label: 'magic link sign-in', detail: 'passwordless, secure access.' },
      ],
    },
    ta: {
      title: 'Wasi உங்களை நினைவில் வைத்திருக்கிறது',
      lead: 'ஒருமுறை sign in செய்யுங்கள் — cart, taste, chat history sessions across follow.',
      features: [
        { label: 'chat history', detail: 'நிறுத்திய இடத்திலிருந்து continue.' },
        { label: 'saved carts', detail: 'tab close செய்தாலும் lists survive.' },
        { label: 'personal profile', detail: 'name, city, preferences.' },
        { label: 'magic link sign-in', detail: 'passwordless, secure access.' },
      ],
    },
  },
};

export const TOUR_UI: Record<TourLang, {
  tourLabel: string;
  stepOf: (n: number, total: number) => string;
  next: string;
  back: string;
  skip: string;
  finish: string;
  getStarted: string;
  signIn: string;
  continueGuest: string;
  tryExample: string;
  sendToChat: string;
  signedInReady: string;
  readyLabel: string;
  readyTitle: string;
  readyLead: string;
}> = {
  en: {
    tourLabel: 'Product tour',
    stepOf: (n, t) => `Step ${n} of ${t}`,
    next: 'Next',
    back: 'Back',
    skip: 'Skip',
    finish: 'Finish',
    getStarted: 'Get started',
    signIn: 'Sign in',
    continueGuest: 'Continue as guest',
    tryExample: 'Try this example',
    sendToChat: 'Send to chat',
    signedInReady: 'Your account is active — personalized picks are on.',
    readyLabel: 'Ready to shop',
    readyTitle: 'You\'re all set',
    readyLead: 'Explore 120,000+ Kapruka products with trilingual chat, delivery checks, and live tracking.',
  },
  si: {
    tourLabel: 'නිෂ්පාදන සංචාරය',
    stepOf: (n, t) => `පියවර ${n} / ${t}`,
    next: 'ඊළඟ',
    back: 'ආපසු',
    skip: 'මඟ හරින්න',
    finish: 'අවසan',
    getStarted: 'ආරම්භ කරන්න',
    signIn: 'Sign in',
    continueGuest: 'අමුත්තා ලෙස ඉදිරියට',
    tryExample: 'මෙම උදාහරණය උත්සාහ කරන්න',
    sendToChat: 'chat එකට යවන්න',
    signedInReady: 'ගිණුම සක්‍රියයි — personalized picks on.',
    readyLabel: 'සාප්පුවට සූදානම්',
    readyTitle: 'සියල්ල සූදානම්',
    readyLead: 'Kapruka භාණ්ඩ 120,000+ trilingual chat, delivery checks, live tracking සමඟ explore කරන්න.',
  },
  ta: {
    tourLabel: 'தயாரிப்பு சுற்றுப்பயணம்',
    stepOf: (n, t) => `படி ${n} / ${t}`,
    next: 'அடுத்து',
    back: 'பின்',
    skip: 'தவிர்',
    finish: 'முடிக்க',
    getStarted: 'தொடங்குங்கள்',
    signIn: 'Sign in',
    continueGuest: 'விருந்தினராக தொடரவும்',
    tryExample: 'இந்த உதாரணத்தை முயற்சிக்கவும்',
    sendToChat: 'chat-க்கு அனுப்பு',
    signedInReady: 'கணக்கு செயலில் — personalized picks on.',
    readyLabel: 'ஷாப்பிங்குக்கு தயார்',
    readyTitle: 'எல்லாம் தயார்',
    readyLead: 'Kapruka 120,000+ பொருட்களை trilingual chat, delivery checks, live tracking உடன் explore செய்யுங்கள்.',
  },
};
