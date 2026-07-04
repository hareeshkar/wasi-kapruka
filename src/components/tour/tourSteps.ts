export type TourStepId =
  | 'welcome'
  | 'discover'
  | 'multimodal'
  | 'deliver'
  | 'checkout'
  | 'track'
  | 'remember';

export const TOUR_STEPS: TourStepId[] = [
  'welcome',
  'discover',
  'multimodal',
  'deliver',
  'checkout',
  'track',
  'remember',
];

export interface TourFeature {
  label: string;
  detail: string;
}

export interface TourStepContent {
  title: string;
  lead: string;
  features: TourFeature[];
  examplePrompt?: string;
}

type Lang = 'en' | 'si' | 'ta';

export const TOUR_COPY: Record<TourStepId, Record<Lang, TourStepContent>> = {
  welcome: {
    en: {
      title: 'Meet Wasi',
      lead: 'Your Kapruka shopping bestie — a conversational AI built for gifting in Sri Lanka.',
      features: [
        { label: 'Trilingual', detail: 'English, Sinhala, Tamil' },
        { label: 'Gift-first', detail: 'Occasions & recipients' },
        { label: 'Kapruka native', detail: 'Live catalog & checkout' },
        { label: 'Free to browse', detail: 'No signup required' },
      ],
    },
    si: {
      title: 'Wasi හමුවෙන්න',
      lead: 'Kapruka shopping bestie — SL gifting වලට built conversational AI.',
      features: [
        { label: 'Trilingual', detail: 'English, Sinhala, Tamil' },
        { label: 'Gift-first', detail: 'Occasions & recipients' },
        { label: 'Kapruka native', detail: 'Live catalog & checkout' },
        { label: 'Free to browse', detail: 'Signup අවශ්‍ය නැහැ' },
      ],
    },
    ta: {
      title: 'Wasi-யை meet பண்ணுங்க',
      lead: 'Kapruka shopping bestie — SL gifting-ku built AI.',
      features: [
        { label: 'Trilingual', detail: 'English, Sinhala, Tamil' },
        { label: 'Gift-first', detail: 'Occasions & recipients' },
        { label: 'Kapruka native', detail: 'Live catalog & checkout' },
        { label: 'Free to browse', detail: 'Signup தேவையில்லை' },
      ],
    },
  },
  discover: {
    en: {
      title: 'Discover 120,000+ products',
      lead: 'Search, browse, and compare — Wasi maps your words to real Kapruka listings.',
      features: [
        { label: 'Smart search', detail: 'Budget & category aware' },
        { label: 'Browse grid', detail: '64+ categories' },
        { label: 'Compare', detail: 'Side-by-side picks' },
        { label: 'Photo match', detail: 'Upload what you want' },
      ],
      examplePrompt: 'Show me birthday cakes under Rs. 5,000',
    },
    si: {
      title: '120,000+ products discover',
      lead: 'Search, browse, compare — words real Kapruka listings walata map.',
      features: [
        { label: 'Smart search', detail: 'Budget & category' },
        { label: 'Browse grid', detail: '64+ categories' },
        { label: 'Compare', detail: 'Side-by-side' },
        { label: 'Photo match', detail: 'Upload & find' },
      ],
      examplePrompt: 'Rs. 5,000 yata birthday cakes show karanna',
    },
    ta: {
      title: '120,000+ products discover',
      lead: 'Search, browse, compare — words-ah real Kapruka listings-kku map.',
      features: [
        { label: 'Smart search', detail: 'Budget & category' },
        { label: 'Browse grid', detail: '64+ categories' },
        { label: 'Compare', detail: 'Side-by-side' },
        { label: 'Photo match', detail: 'Upload & find' },
      ],
      examplePrompt: 'Rs. 5,000 ku birthday cakes show pannunga',
    },
  },
  multimodal: {
    en: {
      title: 'Talk your way',
      lead: 'Type, speak, or show a photo. Mix Singlish, Tanglish, or formal English — Wasi keeps up.',
      features: [
        { label: 'Voice notes', detail: 'Hold mic & speak' },
        { label: 'Image search', detail: 'Paste or upload' },
        { label: 'Code-switch', detail: 'EN + SI + TA mix' },
        { label: 'Quick picks', detail: 'One-tap suggestions' },
      ],
      examplePrompt: 'Amma ku gift ekak — flowers plus chocolate',
    },
    si: {
      title: 'Talk your way',
      lead: 'Type, speak, photo. Singlish, Tanglish, English — Wasi follow කරනවා.',
      features: [
        { label: 'Voice notes', detail: 'Mic hold කරලා' },
        { label: 'Image search', detail: 'Upload / paste' },
        { label: 'Code-switch', detail: 'Languages mix' },
        { label: 'Quick picks', detail: 'One-tap chips' },
      ],
      examplePrompt: 'Amma ku gift ekak — flowers plus chocolate',
    },
    ta: {
      title: 'Talk your way',
      lead: 'Type, speak, photo. Singlish, Tanglish, English — Wasi follow பண்ணும்.',
      features: [
        { label: 'Voice notes', detail: 'Mic hold பண்ணி' },
        { label: 'Image search', detail: 'Upload / paste' },
        { label: 'Code-switch', detail: 'Languages mix' },
        { label: 'Quick picks', detail: 'One-tap chips' },
      ],
      examplePrompt: 'Amma ku gift ekak — flowers plus chocolate',
    },
  },
  deliver: {
    en: {
      title: 'Gift & deliver anywhere',
      lead: 'From Colombo to Jaffna — check availability, fees, and add a personal message.',
      features: [
        { label: 'City search', detail: 'Fuzzy SL matching' },
        { label: 'Fee check', detail: 'Before you commit' },
        { label: 'Gift message', detail: 'On the card' },
        { label: 'Perishable alerts', detail: 'Cakes & flowers' },
      ],
      examplePrompt: 'Deliver to Kandy tomorrow — is it available?',
    },
    si: {
      title: 'Gift & deliver anywhere',
      lead: 'Colombo to Jaffna — availability, fees, personal message.',
      features: [
        { label: 'City search', detail: 'SL fuzzy match' },
        { label: 'Fee check', detail: 'Before commit' },
        { label: 'Gift message', detail: 'Card එකේ' },
        { label: 'Fresh alerts', detail: 'Cakes & flowers' },
      ],
      examplePrompt: 'Kandy tomorrow deliver — available da?',
    },
    ta: {
      title: 'Gift & deliver anywhere',
      lead: 'Colombo to Jaffna — availability, fees, personal message.',
      features: [
        { label: 'City search', detail: 'SL fuzzy match' },
        { label: 'Fee check', detail: 'Before commit' },
        { label: 'Gift message', detail: 'Card-ல' },
        { label: 'Fresh alerts', detail: 'Cakes & flowers' },
      ],
      examplePrompt: 'Kandy tomorrow deliver — available-aa?',
    },
  },
  checkout: {
    en: {
      title: 'Checkout with confidence',
      lead: 'Lock your total for 60 minutes, pay on Kapruka, share the link with family.',
      features: [
        { label: 'Price lock', detail: '60-minute window' },
        { label: 'Guest checkout', detail: 'No account needed' },
        { label: 'Multi-currency', detail: 'LKR, USD, GBP+' },
        { label: 'Share link', detail: 'WhatsApp & copy' },
      ],
    },
    si: {
      title: 'Checkout with confidence',
      lead: 'Total 60 min lock, Kapruka pay, link share.',
      features: [
        { label: 'Price lock', detail: '60 min window' },
        { label: 'Guest checkout', detail: 'Account නැතුව' },
        { label: 'Multi-currency', detail: 'LKR, USD, GBP+' },
        { label: 'Share link', detail: 'WhatsApp & copy' },
      ],
    },
    ta: {
      title: 'Checkout with confidence',
      lead: 'Total 60 min lock, Kapruka pay, link share.',
      features: [
        { label: 'Price lock', detail: '60 min window' },
        { label: 'Guest checkout', detail: 'Account இல்லாம' },
        { label: 'Multi-currency', detail: 'LKR, USD, GBP+' },
        { label: 'Share link', detail: 'WhatsApp & copy' },
      ],
    },
  },
  track: {
    en: {
      title: 'Track every gift',
      lead: 'After payment, follow the full journey — from flower shop prep to doorstep delivery.',
      features: [
        { label: 'Live timeline', detail: 'Step-by-step status' },
        { label: 'Recipient info', detail: 'Name, city, phone' },
        { label: 'Order lookup', detail: 'VPAY / KAP numbers' },
        { label: 'Delivery proof', detail: 'Photo & video flags' },
      ],
      examplePrompt: 'Track order VPAY827982BA',
    },
    si: {
      title: 'Track every gift',
      lead: 'Payment එකෙන් පස්සේ full journey — prep to doorstep.',
      features: [
        { label: 'Live timeline', detail: 'Step-by-step' },
        { label: 'Recipient info', detail: 'Name, city, phone' },
        { label: 'Order lookup', detail: 'VPAY / KAP' },
        { label: 'Delivery proof', detail: 'Photo & video' },
      ],
      examplePrompt: 'Track order VPAY827982BA',
    },
    ta: {
      title: 'Track every gift',
      lead: 'Payment-க்கு பிறகு full journey — prep to doorstep.',
      features: [
        { label: 'Live timeline', detail: 'Step-by-step' },
        { label: 'Recipient info', detail: 'Name, city, phone' },
        { label: 'Order lookup', detail: 'VPAY / KAP' },
        { label: 'Delivery proof', detail: 'Photo & video' },
      ],
      examplePrompt: 'Track order VPAY827982BA',
    },
  },
  remember: {
    en: {
      title: 'Wasi remembers you',
      lead: 'Sign in once — your taste, cart, and conversations follow you across sessions.',
      features: [
        { label: 'Chat history', detail: 'Never lose context' },
        { label: 'Cart memory', detail: 'Survives tab close' },
        { label: 'Personal picks', detail: 'Name, city, taste' },
        { label: 'Magic link', detail: 'Passwordless option' },
      ],
    },
    si: {
      title: 'Wasi remembers you',
      lead: 'Sign in once — taste, cart, conversations save.',
      features: [
        { label: 'Chat history', detail: 'Context save' },
        { label: 'Cart memory', detail: 'Tab close OK' },
        { label: 'Personal picks', detail: 'Name, city, taste' },
        { label: 'Magic link', detail: 'Passwordless' },
      ],
    },
    ta: {
      title: 'Wasi remembers you',
      lead: 'Sign in once — taste, cart, conversations save.',
      features: [
        { label: 'Chat history', detail: 'Context save' },
        { label: 'Cart memory', detail: 'Tab close OK' },
        { label: 'Personal picks', detail: 'Name, city, taste' },
        { label: 'Magic link', detail: 'Passwordless' },
      ],
    },
  },
};

export const TOUR_UI: Record<Lang, {
  tourLabel: string;
  stepOf: (n: number, total: number) => string;
  next: string;
  back: string;
  skip: string;
  getStarted: string;
  signIn: string;
  continueGuest: string;
  tryExample: string;
  signedInReady: string;
}> = {
  en: {
    tourLabel: 'Product tour',
    stepOf: (n, t) => `Step ${n} of ${t}`,
    next: 'Next',
    back: 'Back',
    skip: 'Skip',
    getStarted: 'Get started',
    signIn: 'Sign in',
    continueGuest: 'Continue as guest',
    tryExample: 'Try this example',
    signedInReady: 'Your account is active — personalized picks are on.',
  },
  si: {
    tourLabel: 'Product tour',
    stepOf: (n, t) => `Step ${n} of ${t}`,
    next: 'Next',
    back: 'Back',
    skip: 'Skip',
    getStarted: 'Get started',
    signIn: 'Sign in',
    continueGuest: 'Guest ලෙස continue',
    tryExample: 'Example try කරන්න',
    signedInReady: 'Account active — personalized picks on.',
  },
  ta: {
    tourLabel: 'Product tour',
    stepOf: (n, t) => `Step ${n} of ${t}`,
    next: 'Next',
    back: 'Back',
    skip: 'Skip',
    getStarted: 'Get started',
    signIn: 'Sign in',
    continueGuest: 'Guest-ஆ continue',
    tryExample: 'Example try பண்ணுங்க',
    signedInReady: 'Account active — personalized picks on.',
  },
};
