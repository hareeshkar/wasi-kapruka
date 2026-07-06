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
      lead: 'ඔබේ Kapruka සාප්පු සහායක — ශ්‍රී ලංකාව පුරා තෑගි සොයා යැවීමට නිර්මාණය කළ AI.',
      features: [
        { label: 'භාෂා තුනෙන්ම', detail: 'ඉංග්‍රීසි, සිංහල සහ දෙමළ — එකම කතාබහක.' },
        { label: 'ලබන්නාගේ සන්දර්භය', detail: 'අවස්ථා, සම්බන්ධතා, සහ වයස් කාණ්ඩ.' },
        { label: 'Kapruka සම්බන්ධතාව', detail: 'සජීවී නිෂ්පාදන, ගෙවීම, බෙදාහැරීම.' },
        { label: 'නොමිලේ බැලීම', detail: 'ගිණුමක් නැතිව ආරම්භ කරන්න.' },
      ],
    },
    ta: {
      title: 'Wasi-யை சந்தியுங்கள்',
      lead: 'உங்கள் Kapruka ஷாப்பிங் துணை — இலங்கை முழுவதும் பரிசுகளைத் தேடி அனுப்ப வடிவமைக்கப்பட்ட AI.',
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
        { label: 'Budget-aware search', detail: 'Results tuned to your limit — LKR or foreign currency.' },
        { label: '64+ categories', detail: 'From cakes to electronics.' },
        { label: 'Compare picks', detail: 'Side-by-side on one panel.' },
        { label: 'Photo match', detail: 'Upload a reference to find it.' },
      ],
      examplePrompt: 'Show me birthday cakes under $20',
    },
    si: {
      title: 'භාණ්ඩ 120,000+ ගවේෂණය',
      lead: 'වෙහෙසකින් තොරව සොයන්න සහ සසඳන්න. Wasi ඔබේ වචන සැබෑ Kapruka නිෂ්පාදන වලට සම්බන්ධ කරයි.',
      features: [
        { label: 'අයවැය සැලකිල්ල', detail: 'ඔබේ සීමාවට ගැලපෙන ප්‍රතිඵල — LKR හෝ විදේශීය මුදල්.' },
        { label: 'කාණ්ඩ 64+', detail: 'කේක් සිට විදුලි උපකරණ දක්වා.' },
        { label: 'සසඳන ලැයිස්තු', detail: 'එක තිරයක සසඳා බැලීම.' },
        { label: 'ඡායාරූප සෙවුම', detail: 'ඡායාරූපයක් උඩුගත කර හොයන්න.' },
      ],
      examplePrompt: '$20 යට උපන්දින කේක් පෙන්වන්න',
    },
    ta: {
      title: '120,000+ பொருட்களை உலாவுங்கள்',
      lead: 'எளிதாக தேடி ஒப்பிடுங்கள். உங்கள் வார்த்தைகளை உண்மையான Kapruka பட்டியல்களுடன் Wasi இணைக்கிறது.',
      features: [
        { label: 'பட்ஜெட் புரிதல்', detail: 'உங்கள் வரம்புக்கு ஏற்ப முடிவுகள் — LKR அல்லது வெளிநாட்டு நாணயம்.' },
        { label: '64+ வகைகள்', detail: 'கேக்குகள் முதல் மின்னணுவியல் வரை.' },
        { label: 'ஒப்பீட்டு பட்டியல்', detail: 'ஒரே திரையில் ஒப்பிடுதல்.' },
        { label: 'புகைப்பட தேடல்', detail: 'புகைப்படம் பதிவேற்றம் செய்து கண்டுபிடிக்கவும்.' },
      ],
      examplePrompt: '$20 க்கு குறைவான பிறந்தநாள் கேக்குகளைக் காட்டுங்கள்',
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
        { label: 'Hands-free mode', detail: 'Tap mic once for continuous voice input.' },
      ],
      examplePrompt: 'Amma ku gift ekak — flowers plus chocolate',
    },
    si: {
      title: 'කතා කරන්න, ලියන්න, පෙන්වන්න',
      lead: 'හඬ පණිවිඩ, ඡායාරූප, හෝ මිශ්‍ර භාෂා — ශ්‍රී ලංකාවේ මිනිසුන් සැබවින්ම සාප්පු සැලසුම් කරන ආකාරය Wasi තේරුම් ගනී.',
      features: [
        { label: 'හඬ පණිවිඩ', detail: 'මයික් එක අල්ලාගෙන ස්වාභාවිකව කතා කරන්න.' },
        { label: 'ඡායාරූප සෙවුම', detail: 'නිෂ්පාදන ඡායාරූප උඩුගත හෝ අලවන්න.' },
        { label: 'භාෂා මිශ්‍ර', detail: 'ඉංග්‍රීසි, සිංහල, දෙමළ එකට.' },
        { label: 'අත්හැරීම් රහිත ප්‍රකාරය', detail: 'අඛණ්ඩ හඬ ආදානය සඳහා මයික් එක තට්ටු කරන්න.' },
      ],
      examplePrompt: 'අම්මාට තෑග්ගක් — මල් සහ චොකලට්',
    },
    ta: {
      title: 'பேசுங்கள், எழுதுங்கள், காட்டுங்கள்',
      lead: 'குரல் பதிவுகள், புகைப்படங்கள், அல்லது கலப்பு மொழி — இலங்கையில் மக்கள் எப்படி உண்மையில் ஷாப்பிங் செய்கிறார்கள் என்பதை Wasi புரிந்துகொள்கிறது.',
      features: [
        { label: 'குரல் பதிவுகள்', detail: 'மைக்கைப் பிடித்து இயல்பாகப் பேசுங்கள்.' },
        { label: 'புகைப்பட தேடல்', detail: 'பொருள் புகைப்படங்களைப் பதிவேற்றம் அல்லது ஒட்டுங்கள்.' },
        { label: 'கலப்பு மொழி', detail: 'ஆங்கிலம், சிங்களம், தமிழ் ஒன்றாக.' },
        { label: 'கைவிடாத பயன்முறை', detail: 'தொடர்ச்சியான குரல் உள்ளீட்டிற்கு மைக்கை அழுத்தவும்.' },
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
      title: 'ශ්‍රී ලංකාව පුරාම බෙදාහැරීම',
      lead: 'ප්‍රවාහන සීමාවන් කල්තියා පරීක්ෂා කරන්න. කොළඹ සිට මහනුවර, යාපනය හෝ ගාල්ල දක්වාම.',
      features: [
        { label: 'නගර හඳුනාගැනීම', detail: 'විවිධ අක්ෂර වින්‍යාසයන් තිබුණද දේශීය ප්‍රදේශ නිවැරදිව හඳුනාගැනීම.' },
        { label: 'ගාස්තු පෙරදසුන', detail: 'ඇණවුම් කිරීමට පෙර බෙදාහැරීමේ ගාස්තු ක්ෂණිකව දැකගැනීම.' },
        { label: 'තෑගි පණිවිඩය', detail: 'තෑගි කාඩ්පතේ පෞද්ගලික සටහන.' },
        { label: 'සැලකිය යුතු භාණ්ඩ දැනුම්දීම', detail: 'කේක් සහ මල් වැනි සැලකිය යුතු භාණ්ඩ ප්‍රවාහනයේදී විශේෂ සැලකිල්ල.' },
      ],
      examplePrompt: 'හෙට මහනුවරට බෙදාහැරිය හැකිද?',
    },
    ta: {
      title: 'இலங்கை முழுவதும் விநியோகம்',
      lead: 'விநியோக சாத்தியங்களை முன்கூட்டியே சரிபார்க்கவும். கொழும்பில் இருந்து யாழ்ப்பாணம், கண்டி அல்லது காலி வரை.',
      features: [
        { label: 'நகர பொருத்தம்', detail: 'எழுத்துப்பிழையாக இருந்தாலும் உள்ளூர் பகுதிகளை சரியாக கண்டறியும்.' },
        { label: 'கட்டண முன்னோட்டம்', detail: 'பதிவு செய்வதற்கு முன்பே விநியோக கட்டணங்களை அறியும்.' },
        { label: 'பரிசு செய்தி', detail: 'பரிசு அட்டையில் தனிப்பட்ட குறிப்பு.' },
        { label: 'குளிர்ச்சியான பொருள் எச்சரிக்கை', detail: 'கேக்குகள் மற்றும் மலர்களுக்கு சிறப்பு கவனிப்பு.' },
      ],
      examplePrompt: 'நாளை கண்டிக்கு விநியோகம் செய்ய முடியுமா?',
    },
  },
  checkout: {
    en: {
      title: 'Checkout with confidence',
      lead: 'Review your order in the sidebar, then pay securely — all without leaving the chat.',
      features: [
        { label: 'In-app payment', detail: 'Kapruka checkout opens inside Wasi — no new tab.' },
        { label: 'Sidebar summary', detail: 'Double-check items, recipient, and total before paying.' },
        { label: 'Multi-currency', detail: 'See prices in USD, GBP, AUD, CAD, or EUR.' },
        { label: '60-minute price lock', detail: 'Total held while you decide.' },
      ],
    },
    si: {
      title: 'විශ්වාසයෙන් ගෙවන්න',
      lead: 'පැතිකඩ පරීක්ෂා කර ආරක්ෂිතව ගෙවන්න — කතාබහ හැර නොයා.',
      features: [
        { label: 'ඇතුළත ගෙවීම', detail: 'Kapruka ගෙවීම Wasi තුළම විවෘත වේ — නව ටැබ් නැත.' },
        { label: 'පැතිකඩ සාරාංශය', detail: 'ගෙවීමට පෙර භාණ්ඩ, ලබන්නා, මුළු මුදල පරීක්ෂා කරන්න.' },
        { label: 'බහු-මුදල්', detail: 'USD, GBP, AUD, CAD හෝ EUR වල මිල බලන්න.' },
        { label: 'මිනිත්තු 60ක මිල තහවුරුව', detail: 'තීරණය ගන්නා තුරු මුළු මුදල තහවුරුව.' },
      ],
    },
    ta: {
      title: 'நம்பிக்கையுடன் கட்டணம் செலுத்துங்கள்',
      lead: 'ஆர்டரை மதிப்பாய்வு செய்து பாதுகாப்பாக செலுத்துங்கள் — உரையாடலை விடாமல்.',
      features: [
        { label: 'உள்ளமை கட்டணம்', detail: 'Kapruka கட்டணம் Wasi-க்குள் திறக்கிறது — புதிய தாள் இல்லை.' },
        { label: 'பக்க சுருக்கம்', detail: 'செலுத்துவதற்கு முன் பொருள், பெறுநர், மொத்தத்தை சரிபார்க்கவும்.' },
        { label: 'பலநாணயம்', detail: 'USD, GBP, AUD, CAD அல்லது EUR-இல் விலைகளைக் காணுங்கள்.' },
        { label: '60-நிமிட விலை பூட்டு', detail: 'முடிவு செய்யும் வரை மொத்தம் பாதுகாக்கப்படும்.' },
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
      title: 'සෑම තෑගියක්ම නිරීක්ෂණය කරන්න',
      lead: 'ගෙවීමේ සිට දොරදාරය දක්වා — ගමනේ සෑම පියවරක්ම අනුගමනය කරන්න.',
      features: [
        { label: 'සජීවී කාලරේඛාව', detail: 'සකස් කිරීම ඉදිරියට යන විට තත්ත්ව යාවත්කාලීන.' },
        { label: 'ඇණවුම් සොයාගැනීම', detail: 'VPAY හෝ KAP සබැඳි කේත.' },
        { label: 'ලබන්නාගේ තොරතුරු', detail: 'නම, නගරය, සම්බන්ධතාවය.' },
        { label: 'බෙදාහැරීමේ සාක්ෂි', detail: 'ලැබුණු විට ඡායාරූප සලකුණු.' },
      ],
      examplePrompt: 'VPAY827982BA order එක track කරන්න',
    },
    ta: {
      title: 'ஒவ்வொரு பரிசையும் கண்காணியுங்கள்',
      lead: 'கட்டணம் முதல் வீட்டு வாயில் வரை — பயணத்தின் ஒவ்வொரு படியும்.',
      features: [
        { label: 'நேரலை காலவரிசை', detail: 'தயாரிப்பு முன்னேறும்போது நிலைப்புத் தகவல்கள்.' },
        { label: 'ஆர்டர் தேடல்', detail: 'VPAY அல்லது KAP குறியீடுகள்.' },
        { label: 'பெறுநர் தகவல்', detail: 'பெயர், நகரம், தொடர்பு.' },
        { label: 'விநியோக ஆதாரம்', detail: 'கிடைக்கும்போது புகைப்பட குறிகள்.' },
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
        { label: 'Smart suggestions', detail: 'Wasi learns your gifting patterns.' },
      ],
    },
    si: {
      title: 'Wasi ඔබව මතක තබාගනී',
      lead: 'වරක් පිවිසෙන්න — ඔබේ කරත්තය, කැමැත්ත, සහ කතාබහ ඉතිහාසය සැසි අතර අනුගමනය වේ.',
      features: [
        { label: 'කතාබහ ඉතිහාසය', detail: 'නතර කළ තැනින් ආපසු ආරම්භ කරන්න.' },
        { label: 'සුරැකුම් කළ කරත්ත', detail: 'tab එක වසාද ලැයිස්තු ආරක්ෂිතයි.' },
        { label: 'පෞද්ගලික පැතිකඩ', detail: 'නම, නගරය, මනාපයන්.' },
        { label: 'බුද්ධිමත් යෝජනා', detail: 'Wasi ඔබේ තෑගි දීමේ රටා ඉගෙනුම් කරයි.' },
      ],
    },
    ta: {
      title: 'Wasi உங்களை நினைவில் வைத்திருக்கிறது',
      lead: 'ஒருமுறை உள்நுழையுங்கள் — உங்கள் வண்டி, சுவை மற்றும் உரையாடல் வரலாறு அமர்வுகள் முழுவதும் பின்தொடரும்.',
      features: [
        { label: 'உரையாடல் வரலாறு', detail: 'நிறுத்திய இடத்திலிருந்து தொடருங்கள்.' },
        { label: 'சேமிக்கப்பட்ட வண்டிகள்', detail: 'தாளை மூடினாலும் பட்டியல்கள் பாதுகாப்பாக இருக்கும்.' },
        { label: 'தனிப்பட்ட சுயவிவரம்', detail: 'பெயர், நகரம், விருப்பத்தேர்வுகள்.' },
        { label: 'புத்திசாலி பரிந்துரைகள்', detail: 'Wasi உங்கள் பரிசு வழங்கும் முறைகளை கற்றுக்கொள்கிறது.' },
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
    readyLead: 'Explore 120,000+ Kapruka products with trilingual chat, multi-currency pricing, in-app checkout, and live tracking.',
  },
  si: {
    tourLabel: 'නිෂ්පාදන සංචාරය',
    stepOf: (n, t) => `පියවර ${n} / ${t}`,
    next: 'ඊළඟ',
    back: 'ආපසු',
    skip: 'මඟ හරින්න',
    finish: 'අවසන්',
    getStarted: 'ආරම්භ කරන්න',
    signIn: 'පිවිසෙන්න',
    continueGuest: 'අමුත්තා ලෙස ඉදිරියට',
    tryExample: 'මෙම උදාහරණය උත්සාහ කරන්න',
    sendToChat: 'කතාබහට යවන්න',
    signedInReady: 'ගිණුම සක්‍රියයි — පුද්ගලාරෝපිත තේරීම් සක්‍රියයි.',
    readyLabel: 'සාප්පුවට සූදානම්',
    readyTitle: 'සියල්ල සූදානම්',
    readyLead: 'Kapruka භාණ්ඩ 120,000+ ත්‍රිභාෂා කතාබහ, බහු-මුදල් මිල, ඇතුළත ගෙවීම, සහ සජීවී නිරීක්ෂණය සමඟ ගවේෂණය කරන්න.',
  },
  ta: {
    tourLabel: 'தயாரிப்பு சுற்றுப்பயணம்',
    stepOf: (n, t) => `படி ${n} / ${t}`,
    next: 'அடுத்து',
    back: 'பின்',
    skip: 'தவிர்',
    finish: 'முடிக்க',
    getStarted: 'தொடங்குங்கள்',
    signIn: 'உள்நுழையுங்கள்',
    continueGuest: 'விருந்தினராக தொடரவும்',
    tryExample: 'இந்த உதாரணத்தை முயற்சிக்கவும்',
    sendToChat: 'உரையாடலுக்கு அனுப்பு',
    signedInReady: 'கணக்கு செயலில் — தனிப்பட்ட தேர்வுகள் இயக்கத்தில்.',
    readyLabel: 'ஷாப்பிங்குக்கு தயார்',
    readyTitle: 'எல்லாம் தயார்',
    readyLead: 'Kapruka 120,000+ பொருட்களை மும்மொழி உரையாடல், பலநாணய விலை, உள்ளமை கட்டணம் மற்றும் நேரலை கண்காணிப்புடன் ஆராயுங்கள்.',
  },
};
