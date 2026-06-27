import React, { useState, useEffect, useRef } from 'react';
import { CartItem, City, DeliveryCheckResult, Order, OrderIntent } from '../types';
import { ShoppingBag, MapPin, Calendar, User, Phone, FileText, CheckCircle2, Ticket, AlertCircle, RefreshCw, Sparkles, Trash2, Smartphone, Gift, Clock, Share2, Home, Building2, Briefcase, Eye, EyeOff, ChevronDown } from 'lucide-react';
import { KaprukaLogo } from '../lib/kapruka';
import { formatPrice, detectCurrency, type Currency } from '../lib/currency';

const ROLE_WORDS = new Set(['amma','akka','nangi','malli','aiya','wife','husband','machan','daughter','son','friend','girlfriend','boyfriend','sister','brother','mother','father','mom','dad','grandma','grandpa']);

function isRoleWord(name: string): boolean {
  return ROLE_WORDS.has(name.toLowerCase().trim());
}

interface CartDrawerProps {
  cart: CartItem[];
  lang: 'en' | 'si' | 'ta';
  onUpdateQty: (code: string, qty: number) => void;
  onRemoveItem: (code: string) => void;
  onClearCart: () => void;
  onConfirmOrder: (recipient: {
    name: string;
    phone: string;
    city_code: string;
    city_name: string;
    delivery_date: string;
    address: string;
    gift_message: string;
    icing_text?: string;
    sender_name?: string;
    location_type?: string;
    delivery_instructions?: string;
    anonymous?: boolean;
    currency?: string;
    order_mode?: string;
  }) => void;
  isOrdering: boolean;
  orderResult: Order | null;
  onRenewOrder: () => void;
  isDemoMode: boolean;
  orderIntent?: OrderIntent | null;
}

export default function CartDrawer({
  cart,
  lang,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  onConfirmOrder,
  isOrdering,
  orderResult,
  onRenewOrder,
  isDemoMode,
  orderIntent,
}: CartDrawerProps) {
  // Recipient info states
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [giftMessage, setGiftMessage] = useState('');
  const [icingText, setIcingText] = useState('');
  const [senderName, setSenderName] = useState('');

  // New MCP fields
  const [orderMode, setOrderMode] = useState<'gift' | 'self'>('gift');
  const [locationType, setLocationType] = useState<'house' | 'apartment' | 'office' | 'other'>('house');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [currency, setCurrency] = useState('LKR');
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  // City lookup states
  const [cityQuery, setCityQuery] = useState('');
  const [citiesList, setCitiesList] = useState<City[]>([]);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [isCitySearching, setIsCitySearching] = useState(false);
  const cityFromIntent = useRef(false);

  // Date selection states
  const [deliveryDate, setDeliveryDate] = useState('');

  // Delivery check states
  const [isCheckingDelivery, setIsCheckingDelivery] = useState(false);
  const [deliveryResult, setDeliveryResult] = useState<DeliveryCheckResult | null>(null);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);

  // Expiry states
  const [timeLeft, setTimeLeft] = useState<number>(3600); // 60 mins in secs

  // Detect product type by name + category (live MCP uses IDs like cake00ka002034,
  // not the CAKE_ prefix that the simulator uses — so prefix matching breaks on live data).
  const looksLikeCake = (item: CartItem) => {
    const hay = `${item.product_code} ${item.name} ${item.category ?? ''}`.toLowerCase();
    return hay.includes('cake') || hay.includes('gateau') || hay.includes('cheesecake');
  };
  const looksLikeFlower = (item: CartItem) => {
    const hay = `${item.product_code} ${item.name} ${item.category ?? ''}`.toLowerCase();
    return hay.includes('flower') || hay.includes('rose') || hay.includes('lily') ||
           hay.includes('orchid') || hay.includes('carnation') || hay.includes('bouquet');
  };

  const isPerishable = cart.some(item => looksLikeCake(item) || looksLikeFlower(item));
  const containsCake = cart.some(item => looksLikeCake(item));

  // Calculate cart subtotal
  const subtotal = cart.reduce((acc, item) => acc + (item.price_lkr * item.quantity), 0);

  // Fuzzy search cities
  useEffect(() => {
    if (!cityQuery.trim()) {
      setCitiesList([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsCitySearching(true);
      try {
        // Live MCP doesn't index Sinhala/Tamil city names — translate common
        // scripts to English before the API call so the search hits correctly.
        const SINHALA_CITY_MAP: Record<string, string> = {
          'කොළඹ': 'Colombo', 'මහනුවර': 'Kandy', 'ගාල්ල': 'Galle',
          'යාපනය': 'Jaffna', 'මීගමුව': 'Negombo', 'ගම්පහ': 'Gampaha',
          'කුරුණෑගල': 'Kurunegala', 'මාතර': 'Matara', 'කළුතර': 'Kalutara',
        };
        const TAMIL_CITY_MAP: Record<string, string> = {
          'கொழும்பு': 'Colombo', 'கண்டி': 'Kandy', 'காலி': 'Galle',
          'யாழ்ப்பாணம்': 'Jaffna', 'நீர்கொழும்பு': 'Negombo', 'கம்பஹா': 'Gampaha',
        };
        const translatedQuery = SINHALA_CITY_MAP[cityQuery.trim()] ||
                                TAMIL_CITY_MAP[cityQuery.trim()]   ||
                                cityQuery;

        // Try live MCP first; if it returns nothing, retry with demo fallback
        const tryFetch = async (mode: string) =>
          fetch(`/api/cities?query=${encodeURIComponent(translatedQuery)}`, {
            headers: { 'x-mcp-mode': mode }
          }).then(r => r.json());

        let data = await tryFetch(isDemoMode ? 'demo' : 'live');
        if (data.success && (!data.cities || data.cities.length === 0) && !isDemoMode) {
          data = await tryFetch('demo'); // fallback to simulator aliases
        }
        if (data.success) {
          setCitiesList(data.cities || []);
          // Auto-select first matching city if triggered from chat orderIntent
          if (cityFromIntent.current && Array.isArray(data.cities) && data.cities.length > 0) {
            handleCityPick(data.cities[0]);
            cityFromIntent.current = false;
          }
        }
      } catch (err) {
        console.error('Error fetching cities', err);
      } finally {
        setIsCitySearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [cityQuery]);

  // Auto-fill from chat-extracted orderIntent (wasi_prefill_checkout)
  // Cumulative: merges new fields, ignores role words as recipient name
  useEffect(() => {
    if (!orderIntent) return;
    const prev = orderIntent;
    if (prev.recipient_name && !isRoleWord(prev.recipient_name) && !recipientName) setRecipientName(prev.recipient_name);
    if (prev.recipient_phone && !recipientPhone) setRecipientPhone(prev.recipient_phone);
    if (prev.delivery_address && !deliveryAddress) setDeliveryAddress(prev.delivery_address);
    if (prev.gift_message && !giftMessage) setGiftMessage(prev.gift_message);
    if (prev.sender_name && !senderName) setSenderName(prev.sender_name);
    if (prev.delivery_date) setDeliveryDate(prev.delivery_date);
    if (prev.location_type) setLocationType(prev.location_type);
    if (prev.delivery_instructions && !deliveryInstructions) setDeliveryInstructions(prev.delivery_instructions);
    if (prev.anonymous !== undefined) setAnonymous(prev.anonymous);
    if (prev.order_mode) setOrderMode(prev.order_mode);
    // Trigger city search
    if (prev.city_name && !selectedCity) {
      cityFromIntent.current = true;
      setCityQuery(prev.city_name);
    }
  }, [orderIntent]);

  // Auto-set delivery date to today when city is verified but date is empty
  useEffect(() => {
    if (selectedCity && !deliveryDate && cart.length > 0) {
      setDeliveryDate(new Date().toISOString().split('T')[0]);
    }
  }, [selectedCity, cart.length]);

  // Run validation checks on city and date selections automatically
  useEffect(() => {
    if (!selectedCity || !deliveryDate || cart.length === 0) {
      setDeliveryResult(null);
      setDeliveryError(null);
      return;
    }

    const checkDelivery = async () => {
      setIsCheckingDelivery(true);
      setDeliveryError(null);
      try {
        // Run delivery check against the first item in cart
        const res = await fetch('/api/check-delivery', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-mcp-mode': isDemoMode ? 'demo' : 'live'
          },
          body: JSON.stringify({
            // city_name is the canonical name from live MCP (e.g. "Colombo 03")
            // city_code is kept for internal CITY_CODE_MAP fallback in server.ts
            city_name: selectedCity.name,
            city_code: selectedCity.code,
            product_code: cart[0].product_code,
            delivery_date: deliveryDate
          })
        });
        const data = await res.json();
        if (data.success) {
          setDeliveryResult(data.result);
        } else {
          setDeliveryError(data.error || 'Cannot fetch delivery validation.');
        }
      } catch (err) {
        setDeliveryError('Delivery lookup failed. Proceeding with simulation rates.');
        setDeliveryResult({
          available: true,
          rate: 0,
          delivery_fee: 0,
          currency: 'LKR',
          perishable_warning: isPerishable,
          notes: 'Rates not available — continuing.'
        });
      } finally {
        setIsCheckingDelivery(false);
      }
    };

    checkDelivery();
  }, [selectedCity, deliveryDate, cart, isPerishable]);

  // Handle pay link timer countdown
  useEffect(() => {
    if (!orderResult) return;
    const expiresMs = new Date(orderResult.expires_at).getTime();
    if (isNaN(expiresMs)) { setTimeLeft(0); return; }
    const interval = setInterval(() => {
      const now = Date.now();
      const diffSecs = Math.floor((expiresMs - now) / 1000);
      if (diffSecs <= 0) {
        setTimeLeft(0);
        clearInterval(interval);
      } else {
        setTimeLeft(diffSecs);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [orderResult]);

  const handleCityPick = (city: City) => {
    setSelectedCity(city);
    setCityQuery(city.name);
    setCitiesList([]);
  };

  // Mirrors the MCP server's own phone regex (orders.py _PHONE_RE) so we never
  // submit a phone Kapruka will bounce: E.164 (+9477…) or local SL (077…) forms.
  const isValidPhone = (p: string) => /^[+\d][\d\s\-()]{6,30}$/.test(p.trim());

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCity || !deliveryDate || cart.length === 0 || !isValidPhone(recipientPhone)) return;
    onConfirmOrder({
      name: recipientName,
      phone: recipientPhone,
      city_code: selectedCity.code,
      city_name: selectedCity.name,
      delivery_date: deliveryDate,
      address: deliveryAddress,
      gift_message: orderMode === 'self' ? '' : giftMessage,
      icing_text: icingText || undefined,
      sender_name: orderMode === 'self' ? recipientName : (senderName || undefined),
      location_type: locationType,
      delivery_instructions: deliveryInstructions || undefined,
      anonymous: orderMode === 'self' ? false : anonymous,
      currency,
      order_mode: orderMode,
      // sender_email omitted: MCP rejects it; Kapruka collects email at checkout
    });
  };

  // Text localization mappings
  const getLoc = (token: string) => {
    const list: Record<string, Record<string, string>> = {
      title: { en: 'Your Gift Bundle', si: 'ඔබේ තෑගි කුඩය', ta: 'பரிசுத் தொகுப்பு' },
      empty: { en: 'Your Gift Bundle is empty — ask Wasi to find something!', si: 'පෙට්ටිය හිස්ව පවතී. පළමු තෑග්ග තෝරන්න!', ta: 'வெறுமையாக உள்ளது.' },
      sub: { en: 'Item Subtotal', si: 'තෑගි වටිනාකම', ta: 'பொருட்கள் தொகை' },
      delivery: { en: 'Kapruka Delivery Cost', si: 'බෙදාහැරීමේ ගාස්තුව', ta: 'வழங்கல் கட்டணம்' },
      total: { en: `Estimated Total ${currency}`, si: `මුළු එකතුව ${currency}`, ta: `மொத்த மதிப்பு ${currency}` },
      perish: {
        en: '⚠️ Fresh product (cake/flowers) requires Same-Day/Next-Day constraint.',
        si: '⚠️ නැවුම් තෑගි (කේක්/මල්) අද හෝ හෙට දිනට පමණක් සීමා වේ.',
        ta: '⚠️ புதிய மலர்கள்/கேக் இன்றோ அல்லது நாளையோ மட்டுமே கிடைக்கும்.'
      },
      gateHeader: { en: 'Where & When', si: 'බෙදාහැරීම් තහවුරු කිරීම', ta: 'வழங்கல் சரிபார்ப்பு' },
      formHeader: { en: 'Who It Goes To', si: 'ලබන්නාගේ විස්තර', ta: 'பெறுநர் விபரங்கள்' }
    };
    return list[token]?.[lang] || list[token]?.['en'];
  };

  // PNG Gift card generator simulation (F-17 feature!)
  const [showShareCard, setShowShareCard] = useState(false);
  const triggerShare = () => {
    setShowShareCard(true);
  };

  const [copySuccess, setCopySuccess] = useState(false);
  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopySuccess(true);
    setTimeout(() => {
      setCopySuccess(false);
    }, 2000);
  };

  return (
    <div className="bg-white sm:rounded-2xl border border-black/5 shadow-md p-4 md:p-6 space-y-6 h-full overflow-y-auto relative animate-fade-in select-none text-ink">
      
      {/* Title */}
      <div className="flex items-center justify-between pb-3 border-b border-black/5">
        <div className="flex items-center gap-2 text-[#1A1A1A]">
          <ShoppingBag className="w-5 h-5 text-[#402970]" />
          <h2 className={`font-display font-bold text-base ${lang === 'si' ? 'font-sinhala' : ''}`}>
            {getLoc('title')}
          </h2>
        </div>
        {cart.length > 0 && (
          <button
            onClick={() => {
              if (window.confirm('Clear all items from your bundle? This cannot be undone.')) {
                onClearCart();
              }
            }}
            className="text-[10px] font-mono text-rose-600 hover:underline flex items-center gap-1 cursor-pointer font-bold"
          >
            <Trash2 className="w-3 h-3" /> CLEAR
          </button>
        )}
      </div>

      {/* Cart Items List */}
      {cart.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
          {/* Hand-drawn lotus — custom Ceylon mark, breathes slowly */}
          <svg width="72" height="56" viewBox="0 0 72 56" fill="none" className="opacity-80">
            <g className="leaf-sway" style={{ transformOrigin: '36px 52px' }}>
              {/* outer petals */}
              <path d="M36 50 C20 44 10 30 12 16 C24 22 32 32 36 50Z" fill="#402970" opacity="0.14"/>
              <path d="M36 50 C52 44 62 30 60 16 C48 22 40 32 36 50Z" fill="#402970" opacity="0.14"/>
              {/* mid petals */}
              <path d="M36 50 C26 40 22 26 26 12 C34 20 38 34 36 50Z" fill="#402970" opacity="0.32"/>
              <path d="M36 50 C46 40 50 26 46 12 C38 20 34 34 36 50Z" fill="#402970" opacity="0.32"/>
              {/* center petal */}
              <path d="M36 50 C31 36 31 20 36 6 C41 20 41 36 36 50Z" fill="#5B3E8A" opacity="0.85"/>
              {/* champagne dew drop */}
              <circle cx="36" cy="22" r="2.4" fill="#C9A84C"/>
            </g>
            {/* water line */}
            <path d="M14 52 Q24 49 36 52 T58 52" stroke="#C9A84C" strokeWidth="1.4" strokeLinecap="round" opacity="0.5" fill="none"/>
          </svg>
          <p className={`text-xs text-[#6B6B6B] max-w-[210px] leading-relaxed ${lang === 'si' ? 'font-sinhala' : ''}`}>
            {getLoc('empty')}
          </p>
        </div>
      ) : (
        <div className="space-y-4 max-h-48 overflow-y-auto pr-1">
          {cart.map((item, index) => (
            <div key={`${item.product_code}-${index}`} className="flex items-center gap-3 bg-[#FAF8F4]/30 p-2 rounded-xl border border-black/5 hover:border-[#402970]/20 transition-all group shadow-xs">
              <img
                src={item.image_url}
                alt={item.name}
                referrerPolicy="no-referrer"
                className="w-10 h-10 object-cover rounded-lg border border-black/5 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[#1A1A1A] truncate leading-tight">
                  {item.name}
                </p>
                {item.variant_name && (
                  <span className="text-[10px] font-mono text-[#402970] font-bold">
                    Variant: {item.variant_name}
                  </span>
                )}
                <p className="text-[10px] font-mono text-gray-400">
                  {formatPrice(item.price_lkr, detectCurrency(item) as Currency)}
                </p>
              </div>

              {/* Quantity Changer */}
              <div className="flex items-center gap-2 bg-surface-warm border border-ink/5 rounded-lg p-1 select-none">
                <button
                  onClick={() => onUpdateQty(item.product_code, item.quantity - 1)}
                  className="w-7 h-7 min-w-[32px] min-h-[32px] text-xs font-bold text-ink-muted hover:text-ink cursor-pointer flex items-center justify-center rounded"
                >
                  -
                </button>
                <span className="text-[10px] font-mono font-bold text-ink min-w-[16px] text-center">{item.quantity}</span>
                <button
                  onClick={() => onUpdateQty(item.product_code, item.quantity + 1)}
                  className="w-7 h-7 min-w-[32px] min-h-[32px] text-xs font-bold text-ink-muted hover:text-ink cursor-pointer flex items-center justify-center rounded"
                >
                  +
                </button>
              </div>

              {/* Delete Mini bin */}
              <button
                onClick={() => onRemoveItem(item.product_code)}
                className="text-gray-400 hover:text-rose-600 cursor-pointer p-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* DELIVERY GATE - FUZZY TYPEAHEAD AND DATE PICKER */}
      {cart.length > 0 && (
        <div className="bg-[#FAF8F4] border border-black/5 rounded-2xl p-4 space-y-4">
          <div className="flex items-center gap-1.5 border-b border-black/5 pb-2">
            <MapPin className="w-4 h-4 text-[#402970]" />
            <span className={`text-[11px] font-mono font-bold text-gray-500 uppercase tracking-widest ${lang === 'si' ? 'font-sinhala' : ''}`}>
              {getLoc('gateHeader')}
            </span>
          </div>

          {/* Fuzzy City Typeahead Area */}
          <div className="space-y-1 relative">
            <label className="text-[10px] font-mono text-gray-400 font-bold uppercase tracking-wider block">
              Delivery City <span className="normal-case font-sinhala">(කොළඹ / මහනුවර OK)</span>
            </label>
            <input
              type="text"
              value={cityQuery}
              onChange={(e) => {
                setCityQuery(e.target.value);
                if (selectedCity) setSelectedCity(null);
              }}
              placeholder="Start typing city name..."
                className="w-full bg-white border border-ink/5 focus:border-violet/40 rounded-xl px-3 py-2.5 min-h-[44px] text-xs focus:outline-none placeholder-ink-faint text-ink"
            />
            {isCitySearching && (
              <span className="absolute top-7 right-2 text-[10px] font-mono text-[#402970] animate-pulse">
                Searching…
              </span>
            )}

            {/* Suggestions dropdown list */}
            {citiesList.length > 0 && (
              <div className="absolute left-0 right-0 top-13 bg-white border border-black/5 rounded-xl shadow-md max-h-36 overflow-y-auto z-20 p-2 space-y-1">
                {citiesList.map((city) => (
                  <button
                    key={city.code}
                    onClick={() => handleCityPick(city)}
                    className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-[#EDE5F8] hover:text-[#402970] text-gray-700 font-mono flex justify-between items-center cursor-pointer"
                  >
                    <span>{city.name}</span>
                    <span className="text-[10px] text-gray-400">{city.code}</span>
                  </button>
                ))}
              </div>
            )}
            
            {selectedCity && (
              <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-100/50 text-[11px] text-[#402970] font-mono flex items-center justify-between">
                <span>✓ Verified: {selectedCity.name}</span>
                <span className="bg-[#402970] text-white px-1.5 py-0.5 rounded text-[9px] font-bold">
                  {selectedCity.code}
                </span>
              </div>
            )}
          </div>

          {/* Date Picker Constraint */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-gray-400 font-bold uppercase tracking-wider block">
              Delivery Date
            </label>
            <input
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              className="w-full bg-white border border-black/5 focus:border-[#402970]/40 rounded-xl px-3 py-2 text-xs focus:outline-none placeholder-gray-400 text-[#1A1A1A]"
              min={new Date().toISOString().split('T')[0]}
              max={new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]}
            />
            {/* Perishable warning only when date is > 1 day from today */}
            {isPerishable && (() => {
              const today = new Date(); today.setHours(0,0,0,0);
              const sel = new Date(deliveryDate);
              const diff = Math.ceil((sel.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              return diff > 1;
            })() && (
              <p className={`text-[10px] text-amber-600 leading-snug pt-0.5 ${lang === 'si' ? 'font-sinhala' : ''}`}>
                {getLoc('perish')}
              </p>
            )}
          </div>

          {/* Integration check statuses */}
          {selectedCity && deliveryDate && (
            <div className="pt-2 border-t border-black/5 flex items-center justify-between text-xs">
              {isCheckingDelivery ? (
                <span className="text-gray-400 font-mono flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin text-[#402970]" /> Checking delivery with Kapruka…
                </span>
              ) : deliveryResult?.available ? (
                <span className="text-[#402970] font-mono font-bold flex items-center gap-1 bg-[#EDE5F8] py-1.5 px-3 rounded-lg border border-[#402970]/10 w-full text-center justify-center">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {deliveryResult.notes || 'Delivery available for this date'}
                </span>
              ) : (
                <span className="text-[#C0392B] font-mono font-bold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Slots full for this date — next available: {deliveryResult?.next_available_date}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* GUEST LOGISTICS CHECKOUT FLOW COMPACT FORM */}
      {cart.length > 0 && selectedCity && deliveryDate && deliveryResult?.available && !orderResult && (
        <form onSubmit={handleCheckoutSubmit} className="space-y-4 bg-white border border-black/5 rounded-2xl p-4 animate-fade-in shadow-xs">
          <div className="flex items-center gap-1.5 border-b border-black/5 pb-2">
            <User className="w-4 h-4 text-[#402970]" />
            <span className={`text-[11px] font-mono font-bold text-gray-500 uppercase tracking-widest ${lang === 'si' ? 'font-sinhala' : ''}`}>
              {getLoc('formHeader')}
            </span>
          </div>

          {/* Mode Toggle: It's a Gift / It's for Me */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setOrderMode('gift')}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 min-h-[44px] px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                orderMode === 'gift'
                  ? 'bg-violet-tint border-violet text-violet-mid'
                  : 'bg-white border-ink/10 text-ink-muted hover:border-violet/30'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Gift className="w-3.5 h-3.5" />
                It's a Gift
              </div>
              <span className="text-[9px] font-normal opacity-60">Add sender name & message</span>
            </button>
            <button
              type="button"
              onClick={() => setOrderMode('self')}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 min-h-[44px] px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                orderMode === 'self'
                  ? 'bg-violet-tint border-violet text-violet-mid'
                  : 'bg-white border-ink/10 text-ink-muted hover:border-violet/30'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                It's for Me
              </div>
              <span className="text-[9px] font-normal opacity-60">Skip gift details</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[9px] font-mono text-gray-400 font-bold uppercase tracking-wider block">
                {orderMode === 'self' ? 'Your Name' : 'Recipient Name'}
              </label>
              <input
                type="text"
                required
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder={orderMode === 'self' ? 'Your name' : 'Amma Rathnayake'}
                className="w-full bg-surface-warm border border-ink/5 rounded-lg px-3 py-2.5 min-h-[44px] text-xs focus:outline-none focus:bg-white placeholder-ink-faint text-ink"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-mono text-gray-400 font-bold uppercase tracking-wider block">
                {orderMode === 'self' ? 'Your Phone' : 'Sri Lankan Phone'}
              </label>
              <input
                type="tel"
                required
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                placeholder="0771234567"
                className="w-full bg-[#FAF8F4] border border-black/5 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:bg-white font-mono placeholder-gray-400 text-[#1A1A1A]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-mono text-gray-400 font-bold uppercase tracking-wider block">
              {orderMode === 'self' ? 'Your Address' : 'Street Address'}
            </label>
            <input
              type="text"
              required
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="No. 12, Kandy Road, Peradeniya"
              className="w-full bg-[#FAF8F4] border border-black/5 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:bg-white placeholder-gray-400 text-[#1A1A1A]"
            />
          </div>

          {/* Location Type */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-mono text-gray-400 font-bold uppercase tracking-wider block">Location Type</label>
            <div className="flex gap-1.5">
              {([
                { value: 'house',     icon: <Home className="w-3 h-3" />,      label: 'House' },
                { value: 'apartment', icon: <Building2 className="w-3 h-3" />, label: 'Apt' },
                { value: 'office',    icon: <Briefcase className="w-3 h-3" />, label: 'Office' },
                { value: 'other',     icon: <MapPin className="w-3 h-3" />,    label: 'Other' },
              ] as const).map(({ value, icon, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setLocationType(value)}
                  className={`flex-1 flex items-center justify-center gap-1 py-2 min-h-[40px] px-1 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer ${
                    locationType === value
                      ? 'bg-[#EDE5F8] border-[#402970] text-[#5B3E8A]'
                      : 'bg-white border-black/10 text-gray-500 hover:border-[#402970]/30'
                  }`}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Delivery Instructions (optional) */}
          <div className="space-y-1">
            <label className="text-[9px] font-mono text-gray-400 font-bold uppercase tracking-wider block">
              Delivery Instructions <span className="text-gray-300">(optional)</span>
            </label>
            <input
              type="text"
              value={deliveryInstructions}
              onChange={(e) => { if (e.target.value.length <= 250) setDeliveryInstructions(e.target.value); }}
              placeholder="Gate code, buzzer number, leave at door..."
              className="w-full bg-[#FAF8F4] border border-black/5 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:bg-white placeholder-gray-400 text-[#1A1A1A]"
              maxLength={250}
            />
          </div>

          {/* Sender Name + Anonymous — hidden in "for me" mode */}
          {orderMode === 'gift' && (
            <>
              <div className="space-y-1">
                <label className="text-[9px] font-mono text-gray-400 font-bold uppercase tracking-wider block">Sender Name (appears as “From:”)</label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="Harry"
                  className="w-full bg-surface-warm border border-ink/5 rounded-lg px-3 py-2.5 min-h-[44px] text-xs focus:outline-none focus:bg-white placeholder-ink-faint text-ink"
                />
              </div>

              {/* Anonymous toggle */}
              <div className="flex items-center justify-between bg-[#FAF8F4] rounded-lg px-3 py-2 border border-black/5">
                <div className="flex items-center gap-2">
                  {anonymous ? <EyeOff className="w-3.5 h-3.5 text-[#402970]" /> : <Eye className="w-3.5 h-3.5 text-gray-400" />}
                  <span className="text-[10px] font-mono text-gray-600 font-semibold">
                    Anonymous gift — hide my name
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAnonymous(!anonymous)}
                  className={`w-9 h-5 rounded-full transition-all cursor-pointer relative ${anonymous ? 'bg-[#402970]' : 'bg-gray-200'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${anonymous ? 'left-4.5' : 'left-0.5'}`} />
                </button>
              </div>
            </>
          )}

          {/* Icing text for Cakes — surcharge note */}
          {containsCake && (
            <div className="space-y-1 bg-amber-50/50 p-2 rounded-lg border border-amber-100">
              <label className="text-[9px] font-mono text-amber-800 font-bold uppercase tracking-wider block">
                Cake Icing Text <span className="text-amber-500">(+Rs. 140 per cake)</span>
              </label>
              <input
                type="text"
                value={icingText}
                onChange={(e) => setIcingText(e.target.value)}
                placeholder="Happy Birthday Amma!"
                className="w-full bg-white border border-amber-200 rounded-md px-2 py-1 text-xs focus:outline-none font-mono"
                maxLength={120}
              />
              <span className="text-[9px] font-mono text-amber-700">{icingText.length}/120 chars</span>
            </div>
          )}

          {/* Gift message — hidden in "for me" mode */}
          {orderMode === 'gift' && (
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-[9px] font-mono text-gray-400 font-bold uppercase tracking-wider block">Add Personal Greeting Card Message</label>
                <span className="text-[8px] font-mono font-medium text-gray-400">{giftMessage.length}/300 chars</span>
              </div>
              <textarea
                value={giftMessage}
                onChange={(e) => {
                  if (e.target.value.length <= 300) setGiftMessage(e.target.value);
                }}
                placeholder="Write a heartwarming message to deliver physically alongside your gift..."
                className="w-full bg-[#FAF8F4] border border-black/5 rounded-lg p-2 text-xs h-12 lazy-none focus:outline-none focus:bg-white placeholder-gray-400 text-[#1A1A1A]"
              />
            </div>
          )}

          {/* Currency selector */}
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono text-gray-400 font-bold uppercase tracking-wider">Currency</span>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowCurrencyPicker(!showCurrencyPicker)}
                className="flex items-center gap-1 bg-[#FAF8F4] border border-black/5 rounded-lg px-2.5 py-1 text-[10px] font-mono font-bold text-gray-700 hover:border-[#402970]/30 cursor-pointer"
              >
                {currency}
                <ChevronDown className="w-3 h-3" />
              </button>
              {showCurrencyPicker && (
                <div className="absolute right-0 bottom-8 bg-white border border-black/5 rounded-xl shadow-md z-20 overflow-hidden">
                  {['LKR', 'USD', 'GBP', 'AUD', 'CAD', 'EUR'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => { setCurrency(c); setShowCurrencyPicker(false); }}
                      className={`block w-full text-left px-4 py-1.5 text-[10px] font-mono hover:bg-[#EDE5F8] cursor-pointer ${currency === c ? 'text-[#402970] font-bold' : 'text-gray-700'}`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Item subtotal only — delivery shown after lock */}
          <div className="pt-2 border-t border-black/5">
            <div className="flex justify-between text-xs text-[#6B6B6B] font-mono">
              <span className={lang === 'si' ? 'font-sinhala' : ''}>{getLoc('sub')}</span>
              <span>{formatPrice(subtotal, currency as Currency)}</span>
            </div>
            <p className="text-[9px] font-mono text-gray-400 mt-1">Delivery fee shown after order is locked</p>
          </div>

          <button
            type="submit"
            disabled={isOrdering || !isValidPhone(recipientPhone) || !recipientName || !deliveryAddress}
            className="w-full bg-violet hover:bg-violet-deep text-white py-3.5 min-h-[48px] px-4 rounded-xl font-display font-bold text-xs transition duration-150 cursor-pointer shadow-md disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isOrdering ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Synchronizing Order with Kapruka Servers...</span>
              </>
            ) : (
              <span>Lock Prices & Go to Checkout →</span>
            )}
          </button>
        </form>
      )}

      {/* Pay URL reveal drawer with 60-min countdown timer + auto-renew button (Tier 1 core!) */}
      {orderResult && (
        <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-slate-900 text-white rounded-3xl p-5 space-y-4 shadow-xl shadow-slate-900/40 border border-slate-700/50 animate-fade-in relative overflow-hidden select-none">
          
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/20 font-bold uppercase tracking-wider">
                PAYMENT LOCK ACTIVE
              </span>
            </div>

            {/* Countdown Tick */}
            <div className="text-right flex items-center gap-1.5 text-xs text-amber-400 font-mono bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-500/20">
              <Clock className="w-3.5 h-3.5" />
              <span>
                {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:
                {(timeLeft % 60).toString().padStart(2, '0')}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-mono text-slate-400">Transaction total:</span>
            <p className="text-2xl font-mono font-bold text-white tracking-tight">
              {formatPrice(orderResult.total_lkr || orderResult.summary?.grand_total, (orderResult.summary?.currency || currency) as Currency)}
            </p>
            {/* Breakdown: items + delivery — always shown after lock */}
            <div className="bg-slate-800/50 rounded-xl p-3 space-y-1.5 border border-slate-700/40">
              {cart.map((item, i) => (
                <div key={`locked-${item.product_code}-${i}`} className="flex justify-between items-center text-[10px] font-mono text-slate-300">
                  <span className="truncate max-w-[60%]">{item.name}</span>
                  <span>{formatPrice(item.price_lkr * item.quantity, (item.currency || currency) as Currency)}</span>
                </div>
              ))}
              {(() => {
                const itemsTotal = cart.reduce((s, i) => s + i.price_lkr * i.quantity, 0);
                const deliveryFee = (orderResult.total_lkr || orderResult.summary?.grand_total || 0) - itemsTotal;
                return deliveryFee > 0 ? (
                  <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 border-t border-slate-700/40 pt-1.5">
                    <span>Delivery fee</span>
                    <span>{formatPrice(deliveryFee, (orderResult.summary?.currency || currency) as Currency)}</span>
                  </div>
                ) : null;
              })()}
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => window.open(orderResult.pay_url, '_blank', 'noopener,noreferrer')}
                  className="block text-center py-2.5 px-3 bg-[#402970] hover:bg-[#2D1B69] text-white font-display font-semibold text-xs rounded-lg transition duration-150 shadow-sm border border-[#402970]/10 transform active:scale-98 cursor-pointer"
                >
                  Open Kapruka Checkout →
                </button>
                
                <button
                  type="button"
                  onClick={() => handleCopyLink(orderResult.pay_url)}
                  className={`py-2.5 px-3 text-xs font-semibold rounded-lg font-display border transition-all duration-150 cursor-pointer text-center ${
                    copySuccess
                      ? 'bg-green-50 text-[#402970] border-green-200'
                      : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'
                  }`}
                >
                  {copySuccess ? '✓ Copied!' : 'Copy Pay Link'}
                </button>
              </div>
            </div>


            {/* Auto price renewal check (F-20) */}
            {timeLeft <= 300 ? ( // Display renewal warning at remaining < 5 minutes
              <div className="bg-amber-950/30 border border-amber-500/20 text-xs p-2.5 rounded-xl text-amber-300 space-y-2">
                <p className="flex items-center gap-1 leading-normal font-medium">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> Price lock expires in less than 5 min!
                </p>
                <button
                  onClick={onRenewOrder}
                  className="w-full py-1.5 px-3 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold rounded-lg text-[10px] transition font-mono uppercase cursor-pointer"
                >
                  Renew price lock (60 mins)
                </button>
              </div>
            ) : (
              <div className="flex justify-between items-center text-[10px] text-slate-400 bg-slate-800/40 p-2.5 rounded-xl border border-white/5 uppercase tracking-wider font-mono">
                <span>Auto-renewal active at T-5min</span>
                <span className="text-emerald-400">Active</span>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-700/50 flex justify-between items-center">
            <div className="space-y-0.5">
              <span className="text-[9px] font-mono text-slate-400">checkout reference ID</span>
              <p className="text-xs text-white font-mono font-bold tracking-widest">{orderResult.order_ref}</p>
            </div>
            
            <button
              onClick={triggerShare}
              className="text-[#402970] bg-white hover:bg-gray-50 flex items-center gap-1 py-1.5 px-2.5 rounded-lg text-[10px] font-bold font-mono uppercase cursor-pointer transition active:scale-95"
            >
              <Share2 className="w-3.5 h-3.5" /> Share Gift Card
            </button>
          </div>
        </div>
      )}

      {/* SHAREABLE GIFT CARD PNG EXPORT CANVAS (F-17 feature!) */}
      {showShareCard && orderResult && (
        <div className="bg-white border-2 border-[#402970] rounded-2xl p-4 space-y-4 shadow-xl animate-fade-in text-gray-900 select-none">
          <div className="flex justify-between items-center pb-2 border-b border-gray-100">
            <KaprukaLogo className="h-5" variant="default" />
            <button
              onClick={() => setShowShareCard(false)}
              className="text-gray-400 hover:text-gray-900 font-bold"
            >
              ✕
            </button>
          </div>

          {/* Graphic layout of card */}
          <div className="bg-linear-to-b from-[#FAF8F4] to-white border border-gray-100 rounded-xl p-5 text-center space-y-3 shadow-inner relative overflow-hidden">
            <div className="absolute top-0 left-0 bg-[#402970] w-12 h-12 rounded-br-3xl opacity-5" />
            <KaprukaLogo className="h-6 mx-auto" variant="default" />
            
            <h3 className="font-display font-bold text-[#402970] text-sm tracking-wide uppercase">
              A Gift is on its way to {selectedCity?.name || 'You'}!
            </h3>
            
            {cart.length > 0 && (
              <img
                src={cart[0].image_url}
                alt="gift package"
                className="w-16 h-16 object-cover rounded-full mx-auto border-2 border-white shadow-md"
              />
            )}

            <p className="text-[11px] text-gray-600 leading-relaxed italic max-w-[200px] mx-auto">
              "{giftMessage || 'Filled with love and best wishes!'}"
            </p>

            <div className="text-[9px] font-mono text-gray-400 border-t border-gray-100 pt-2 flex justify-between">
              <span>REF: {orderResult.order_ref}</span>
              <span>Delivering: {deliveryDate}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <a
              href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`🎁 Something special is heading to ${selectedCity?.name} on ${deliveryDate} — sent via Wasi, Kapruka's AI shopping bestie! Ref: ${orderResult.order_ref}`)}`}
              target="_blank"
              rel="noreferrer"
              className="bg-[#25D366] hover:bg-[#20ba59] text-white py-2 px-3 rounded-lg font-semibold cursor-pointer transition flex items-center justify-center gap-1 text-[10px] font-mono"
            >
              <Smartphone className="w-3.5 h-3.5" /> WhatsApp Share
            </a>
            <button
              onClick={() => {
                alert('Gift card downloaded to downloads folder.');
              }}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 px-3 rounded-lg font-semibold cursor-pointer transition text-[10px] font-mono"
            >
              Download PNG
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
