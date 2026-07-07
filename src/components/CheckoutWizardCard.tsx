import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  User, Phone, MapPin, Calendar, Home, Building2, Briefcase,
  Gift, ChevronRight, ChevronLeft, CheckCircle2, Search,
  Sparkles, Send, AlertCircle, Eye, EyeOff, ShoppingBag, Cake,
} from 'lucide-react';
import WasiRobotAvatar from './WasiRobotAvatar';
import type { OrderIntent, CartItem } from '../types';

interface CheckoutWizardCardProps {
  orderMode?: 'gift' | 'self';
  initialData?: OrderIntent | null;
  cart?: CartItem[];
  onComplete: (data: OrderIntent) => void;
  onOpenCart?: () => void;
  onCancel?: () => void;
}

type WizardStep =
  | 'recipient_name'
  | 'recipient_phone'
  | 'city'
  | 'address'
  | 'delivery_date'
  | 'location_type'
  | 'icing_text'
  | 'gift_details';

const SL_CITIES = [
  'Agalawatta','Agunukolapelassa','Ahangama','Ahungalla','Akmeemana',
  'Akurana','Akuressa','Alawwa','Aluthgama','Ambalangoda','Ambanpola','Ambepussa',
  'Ampara','Anamaduwa','Anguruwathota','Anuradhapura','Aranayaka',
  'Attidiya','Aturugiriya','Avissawella','Ayagama',
  'Baddegama','Badulla','Balangoda','Bandaragama','Bandarawela',
  'Batapola','Battaramulla','Batticaloa','Beliatta',
  'Benthota','Beruwala','Bibila','Bingiriya','Boralesgamuwa',
  'Chillaw',
  'Colombo 01','Colombo 02','Colombo 03','Colombo 04','Colombo 05','Colombo 06',
  'Colombo 07','Colombo 08','Colombo 09','Colombo 10','Colombo 11','Colombo 12',
  'Colombo 13','Colombo 14','Colombo 15',
  'Dambulla','Dankotuwa','Dehiwala','Delgoda',
  'Delkanda','Deniyaya','Dharga Town','Digana',
  'Dodanduwa','Dompe',
  'Eheliyagoda','Ekala','Elpitiya','Embilipitiya','Eppawala',
  'Galle','Gampaha','Gampola',
  'Hambanthota','Hanwella','Henegama','Hokandara','Homagama','Horana','Horawala',
  'Ja-Ela','Jaffna',
  'Kandana','Kandy','Kanthale','Karagampitiya','Karuwalagaswewa','Kataragama',
  'Katugasthota','Katunayaka','Kegalle','Kekirawa','Kelaniya','Kesbewa',
  'Kilinochchiya','Kochchikade','Kohuwala','Kosgama','Kundasale',
  'Kurunegala','Kuruwita',
  'Madampe','Maharagama','Mahiyanganaya','Makandura',
  'Maskeliya','Matale','Matara','Mathugama','Mattegoda',
  'Medawachiya','Melsiripura','Moragollagama','Moratuwa','Morawaka',
  'Mount Lavinia',
  'Nawagathegama','Nawala','Nawalapitiya','Negombo','Nivithigala',
  'Padaviya','Palavee','Panchikawatte','Pilimathalawa',
  'Polgasovita','Pothuvil',
  'Rajagiriya','Rambukkana',
  'Thangalle','Trincomalee',
  'Vavuniya','Vellankulam','Veyangoda',
  'Wadduwa','Waduramba','Wijerama',
];

const LOCATION_TYPES = [
  { value: 'house' as const,     icon: Home,      label: 'House' },
  { value: 'apartment' as const, icon: Building2,  label: 'Apartment' },
  { value: 'office' as const,    icon: Briefcase,  label: 'Office' },
  { value: 'other' as const,     icon: MapPin,     label: 'Other' },
];

const STEP_META: Record<WizardStep, { title: string; emoji: string; subtitle: string }> = {
  recipient_name:  { title: "Who are you sending to?",    emoji: '💌', subtitle: "The actual name of the person receiving your gift" },
  recipient_phone: { title: "What's their phone number?", emoji: '📱', subtitle: "Sri Lankan mobile number for delivery updates" },
  city:            { title: "Which city are they in?",     emoji: '📍', subtitle: "So we can find delivery options near them" },
  address:         { title: "Street address for delivery", emoji: '🏠', subtitle: "Where should we deliver the gift?" },
  delivery_date:   { title: "When should we deliver?",     emoji: '📅', subtitle: "Pick a date that works best" },
  location_type:   { title: "What type of location?",      emoji: '🏢', subtitle: "Helps our delivery team find them faster" },
  icing_text:      { title: "What should the cake say?",   emoji: '🎂', subtitle: "Custom icing message (+Rs. 140 per cake)" },
  gift_details:    { title: "Add a personal touch?",       emoji: '🎁', subtitle: "Gift message and who it's from (optional)" },
};

const BASE_STEPS: WizardStep[] = [
  'recipient_name', 'recipient_phone', 'city', 'address',
  'delivery_date', 'location_type', 'gift_details',
];

const REQUIRED_STEPS: WizardStep[] = [
  'recipient_name', 'recipient_phone', 'city', 'address', 'delivery_date',
];

const isValidPhone = (p: string) => /^[+\d][\d\s\-()]{6,30}$/.test(p.trim());

export default function CheckoutWizardCard({
  orderMode: initialMode = 'gift',
  initialData,
  cart = [],
  onComplete,
  onOpenCart,
  onCancel,
}: CheckoutWizardCardProps) {
  const hasCake = cart.some(i => i.category?.toLowerCase().includes('cake'));
  const stepOrder = hasCake
    ? [...BASE_STEPS.slice(0, 6), 'icing_text' as WizardStep, ...BASE_STEPS.slice(6)]
    : BASE_STEPS;

  const [step, setStep] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);

  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [cityName, setCityName] = useState('');
  const [cityInput, setCityInput] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [locationType, setLocationType] = useState<'house' | 'apartment' | 'office' | 'other'>('house');
  const [orderMode, setOrderMode] = useState<'gift' | 'self'>(initialMode);
  const [senderName, setSenderName] = useState('');
  const [giftMessage, setGiftMessage] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [icingText, setIcingText] = useState('');

  const userEditedRef = useRef<Set<string>>(new Set());

  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [citySearchQuery, setCitySearchQuery] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set());
  const [wizardCompleted, setWizardCompleted] = useState(false);
  const [deliveryCheck, setDeliveryCheck] = useState<{
    checking: boolean;
    available: boolean | null;
    message: string;
    nextDate?: string;
  }>({ checking: false, available: null, message: '' });
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const firstBtnRef = useRef<HTMLButtonElement>(null);
  const cityInputRef = useRef<HTMLInputElement>(null);

  const currentField = stepOrder[step];
  const meta = STEP_META[currentField];
  const progressPct = ((step + 1) / stepOrder.length) * 100;
  const isLast = step === stepOrder.length - 1;

  const filteredCities = citySearchQuery
    ? SL_CITIES.filter(c => c.toLowerCase().includes(citySearchQuery.toLowerCase())).slice(0, 20)
    : SL_CITIES.slice(0, 20);

  const markUserEdited = useCallback((field: string) => {
    userEditedRef.current.add(field);
    setAutoFilledFields(prev => { const next = new Set(prev); next.delete(field); return next; });
  }, []);

  const renderAutoFillBadge = (field: string) => {
    if (!autoFilledFields.has(field)) return null;
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-mono text-violet bg-violet-tight px-2 py-0.5 rounded-full ml-2 animate-fade-in">
        <Sparkles className="w-2.5 h-2.5" />
        auto-filled
      </span>
    );
  };

  // Auto-fill from initialData
  useEffect(() => {
    if (!initialData) return;
    const autoFilled = new Set<string>();
    if (initialData.recipient_name && !userEditedRef.current.has('recipient_name')) {
      setRecipientName(initialData.recipient_name); autoFilled.add('recipient_name');
    }
    if (initialData.recipient_phone && !userEditedRef.current.has('recipient_phone')) {
      setRecipientPhone(initialData.recipient_phone); autoFilled.add('recipient_phone');
    }
    if (initialData.city_name && !userEditedRef.current.has('city')) {
      setCityName(initialData.city_name); setCityInput(initialData.city_name); autoFilled.add('city');
    }
    if (initialData.delivery_address && !userEditedRef.current.has('address')) {
      setDeliveryAddress(initialData.delivery_address); autoFilled.add('address');
    }
    if (initialData.delivery_date && !userEditedRef.current.has('delivery_date')) {
      setDeliveryDate(initialData.delivery_date); autoFilled.add('delivery_date');
    }
    if (initialData.location_type && !userEditedRef.current.has('location_type')) {
      setLocationType(initialData.location_type as any); autoFilled.add('location_type');
    }
    if (initialData.sender_name && !userEditedRef.current.has('sender_name')) {
      setSenderName(initialData.sender_name); autoFilled.add('sender_name');
    }
    if (initialData.gift_message && !userEditedRef.current.has('gift_message')) {
      setGiftMessage(initialData.gift_message); autoFilled.add('gift_message');
    }
    if (initialData.order_mode) setOrderMode(initialData.order_mode);
    if (initialData.anonymous !== undefined) setAnonymous(initialData.anonymous);
    setAutoFilledFields(autoFilled);
  }, [initialData]);

  // Focus input on step change
  useEffect(() => {
    setFieldError(null);
    const timer = setTimeout(() => {
      if (currentField === 'city' && cityInputRef.current) cityInputRef.current.focus();
      else if (inputRef.current) inputRef.current.focus();
      else if (firstBtnRef.current) firstBtnRef.current.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, [step, currentField]);

  // Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel?.(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onCancel]);

  // Live delivery check when date or city changes
  useEffect(() => {
    if (!deliveryDate || !cityName) {
      setDeliveryCheck({ checking: false, available: null, message: '' });
      return;
    }
    let cancelled = false;
    const check = async () => {
      setDeliveryCheck(prev => ({ ...prev, checking: true }));
      try {
        const res = await fetch('/api/check-delivery', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            city_name: cityName,
            delivery_date: deliveryDate,
            product_code: cart[0]?.product_code || '',
          }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (data.success && data.result) {
          const r = data.result;
          setDeliveryCheck({
            checking: false,
            available: r.available,
            message: r.available
              ? `Delivery available (est. Rs. ${r.delivery_fee || r.rate})`
              : `Delivery not available on this date. ${r.next_available_date ? `Try ${r.next_available_date}.` : 'Try tomorrow or another date.'}`,
            nextDate: r.next_available_date,
          });
        } else {
          setDeliveryCheck({ checking: false, available: null, message: '' });
        }
      } catch {
        if (!cancelled) setDeliveryCheck({ checking: false, available: null, message: '' });
      }
    };
    check();
    return () => { cancelled = true; };
  }, [deliveryDate, cityName, cart]);

  const minDate = new Date().toISOString().split('T')[0];

  const buildOrderIntent = useCallback((): OrderIntent => ({
    recipient_name: recipientName.trim(),
    recipient_phone: recipientPhone.trim(),
    city_name: cityName.trim(),
    delivery_address: deliveryAddress.trim(),
    delivery_date: deliveryDate,
    location_type: orderMode === 'self' ? undefined : locationType,
    sender_name: orderMode === 'gift' ? (senderName.trim() || undefined) : undefined,
    gift_message: orderMode === 'gift' ? (giftMessage.trim() || undefined) : undefined,
    anonymous: orderMode === 'gift' ? anonymous : undefined,
    order_mode: orderMode,
  }), [recipientName, recipientPhone, cityName, deliveryAddress, deliveryDate, locationType, orderMode, senderName, giftMessage, anonymous]);

  const validateCurrentStep = useCallback((): boolean => {
    switch (currentField) {
      case 'recipient_name':
        if (!recipientName.trim()) { setFieldError('Please enter a name'); return false; }
        return true;
      case 'recipient_phone':
        if (!recipientPhone.trim()) { setFieldError('Please enter a phone number'); return false; }
        if (!isValidPhone(recipientPhone)) { setFieldError('Invalid phone number format'); return false; }
        return true;
      case 'city':
        if (!cityName.trim()) { setFieldError('Please select or type a city'); return false; }
        return true;
      case 'address':
        if (!deliveryAddress.trim()) { setFieldError('Please enter a delivery address'); return false; }
        return true;
      case 'delivery_date':
        if (!deliveryDate) { setFieldError('Please pick a delivery date'); return false; }
        return true;
      default:
        return true;
    }
  }, [currentField, recipientName, recipientPhone, cityName, deliveryAddress, deliveryDate]);

  const advanceStep = useCallback(() => {
    if (!validateCurrentStep()) return;
    if (isLast) {
      setIsCompleting(true);
      setWizardCompleted(true);
      setTimeout(() => onComplete(buildOrderIntent()), 300);
      return;
    }
    setStep(s => s + 1);
  }, [validateCurrentStep, isLast, onComplete, buildOrderIntent]);

  const goBack = useCallback(() => { if (step > 0) setStep(s => s - 1); }, [step]);

  const handleCitySelect = useCallback((city: string) => {
    setCityName(city);
    setCityInput(city);
    setShowCityDropdown(false);
    setCitySearchQuery('');
    markUserEdited('city');
  }, [markUserEdited]);

  const renderProgressBar = () => (
    <div className="h-1 bg-black/5 rounded-full overflow-hidden" role="progressbar"
      aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={stepOrder.length}>
      <div className="h-full transition-all duration-500 ease-out rounded-full"
        style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg, #402970 0%, #7B5EA7 60%, #B794F6 100%)' }} />
    </div>
  );

  const renderStepIndicator = () => (
    <div className="flex items-center gap-1 justify-center">
      {stepOrder.map((s, i) => (
        <div key={i} className={`rounded-full transition-all duration-300 ${
          i < step ? 'bg-violet w-1.5 h-1.5'
          : i === step ? 'bg-violet w-4 h-1.5'
          : REQUIRED_STEPS.includes(s) ? 'bg-black/10 w-1.5 h-1.5'
          : 'bg-black/5 w-1.5 h-1.5'
        }`} />
      ))}
    </div>
  );

  const renderDeliveryCheck = () => {
    if (deliveryCheck.checking) {
      return (
        <div className="flex items-center gap-2 text-[11px] text-violet bg-violet-tight rounded-lg px-3 py-2 mt-2">
          <div className="w-3 h-3 border-2 border-violet/30 border-t-violet rounded-full animate-spin" />
          Checking delivery availability...
        </div>
      );
    }
    if (deliveryCheck.available === true && deliveryCheck.message) {
      return (
        <div className="flex items-center gap-2 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mt-2">
          <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
          {deliveryCheck.message}
        </div>
      );
    }
    if (deliveryCheck.available === false && deliveryCheck.message) {
      return (
        <div className="flex items-start gap-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
          <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
          <span>{deliveryCheck.message}</span>
        </div>
      );
    }
    return null;
  };

  const renderError = () => fieldError ? (
    <div className="flex items-center gap-1.5 text-[11px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mt-2">
      <AlertCircle className="w-3 h-3 flex-shrink-0" />
      {fieldError}
    </div>
  ) : null;

  const renderNavigation = () => (
    <div className="flex items-center gap-2 pt-2">
      {step > 0 && (
        <button type="button" onClick={goBack}
          className="flex items-center justify-center w-10 h-10 rounded-xl border border-black/10 text-ink-muted hover:bg-black/5 hover:text-ink transition-all cursor-pointer">
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}
      <button type="button" ref={firstBtnRef} onClick={advanceStep} disabled={isCompleting}
        className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl font-display font-bold text-sm text-white transition-all cursor-pointer disabled:opacity-50 active:scale-[0.98]"
        style={{
          background: isLast ? 'linear-gradient(135deg, #402970 0%, #7B5EA7 100%)' : 'linear-gradient(135deg, #5B3E8A 0%, #402970 100%)',
          boxShadow: '0 4px 14px rgba(64,41,112,0.3)',
        }}>
        {isCompleting ? (
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : isLast ? (
          <><Send className="w-4 h-4" /><span>Done</span><CheckCircle2 className="w-4 h-4" /></>
        ) : (
          <><span>Next</span><ChevronRight className="w-4 h-4" /></>
        )}
      </button>
    </div>
  );

  const renderStepContent = () => {
    switch (currentField) {
      case 'recipient_name':
        return (
          <div className="space-y-3">
            <div className="relative">
              <input ref={inputRef as React.RefObject<HTMLInputElement>} type="text"
                value={recipientName}
                onChange={(e) => { setRecipientName(e.target.value); markUserEdited('recipient_name'); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); advanceStep(); } }}
                placeholder="e.g. Nirmala, Kumari"
                className="w-full px-4 py-3.5 min-h-[48px] bg-white border border-black/10 focus:border-violet/40 rounded-xl text-[15px] text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-violet/10 transition" />
              {renderAutoFillBadge('recipient_name')}
            </div>
            <p className="text-[11px] text-ink-muted italic">Use their real name — not just "Amma" or "Wife". This goes on the gift card.</p>
            <p className="text-[10px] text-ink-faint">You can also type or say the name in chat — I'll pick it up automatically.</p>
          </div>
        );
      case 'recipient_phone':
        return (
          <div className="space-y-3">
            <div className="relative">
              <input ref={inputRef as React.RefObject<HTMLInputElement>} type="tel"
                value={recipientPhone}
                onChange={(e) => { setRecipientPhone(e.target.value); markUserEdited('recipient_phone'); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); advanceStep(); } }}
                placeholder="077 123 4567"
                className="w-full px-4 py-3.5 min-h-[48px] bg-white border border-black/10 focus:border-violet/40 rounded-xl text-[15px] text-ink font-mono placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-violet/10 transition" />
              {renderAutoFillBadge('recipient_phone')}
            </div>
            <div className="flex gap-2 flex-wrap">
              {['077', '076', '071', '070', '078', '075'].map(prefix => (
                <button key={prefix} type="button"
                  onClick={() => { setRecipientPhone(prefix + ' '); markUserEdited('recipient_phone'); }}
                  className="text-[11px] font-mono text-ink-muted bg-black/5 hover:bg-violet-tint hover:text-violet px-2.5 py-1 rounded-full transition cursor-pointer">
                  {prefix}
                </button>
              ))}
            </div>
          </div>
        );
      case 'city':
        return (
          <div className="space-y-3 relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint pointer-events-none" />
              <input ref={cityInputRef} type="text"
                value={cityInput}
                onChange={(e) => {
                  setCityInput(e.target.value);
                  setCitySearchQuery(e.target.value);
                  if (e.target.value.length > 0) {
                    setCityName(e.target.value);
                    markUserEdited('city');
                  }
                  setShowCityDropdown(true);
                }}
                onFocus={() => setShowCityDropdown(true)}
                onBlur={() => setTimeout(() => setShowCityDropdown(false), 200)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); advanceStep(); } }}
                placeholder="Search your city..."
                className="w-full pl-10 pr-4 py-3.5 min-h-[48px] bg-white border border-black/10 focus:border-violet/40 rounded-xl text-[15px] text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-violet/10 transition" />
              {renderAutoFillBadge('city')}
            </div>
            {showCityDropdown && filteredCities.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-black/10 rounded-xl shadow-lg z-20 max-h-[200px] overflow-y-auto">
                {filteredCities.map(city => (
                  <button key={city} type="button"
                    onMouseDown={() => handleCitySelect(city)}
                    className={`w-full text-left px-4 py-2.5 text-sm transition cursor-pointer ${
                      cityName === city ? 'bg-violet-tint text-violet font-semibold' : 'text-ink hover:bg-violet-tint'
                    }`}>
                    {city}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      case 'address':
        return (
          <div className="space-y-3">
            <div className="relative">
              <input ref={inputRef as React.RefObject<HTMLInputElement>} type="text"
                value={deliveryAddress}
                onChange={(e) => { setDeliveryAddress(e.target.value); markUserEdited('address'); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); advanceStep(); } }}
                placeholder="No. 12, Kandy Road, Peradeniya"
                className="w-full px-4 py-3.5 min-h-[48px] bg-white border border-black/10 focus:border-violet/40 rounded-xl text-[15px] text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-violet/10 transition" />
              {renderAutoFillBadge('address')}
            </div>
            <p className="text-[11px] text-ink-muted italic">Include house number, street, and any landmarks for easier delivery.</p>
          </div>
        );
      case 'delivery_date':
        return (
          <div className="space-y-3">
            <div className="relative">
              <input ref={inputRef as React.RefObject<HTMLInputElement>} type="date"
                value={deliveryDate} min={minDate}
                onChange={(e) => { setDeliveryDate(e.target.value); markUserEdited('delivery_date'); }}
                className="w-full px-4 py-3.5 min-h-[48px] bg-white border border-black/10 focus:border-violet/40 rounded-xl text-[15px] text-ink font-mono focus:outline-none focus:ring-2 focus:ring-violet/10 transition" />
              {renderAutoFillBadge('delivery_date')}
            </div>
            <div className="flex gap-2 flex-wrap">
              {[
                { label: 'Today', value: new Date().toISOString().split('T')[0] },
                { label: 'Tomorrow', value: new Date(Date.now() + 86400000).toISOString().split('T')[0] },
                { label: 'Next week', value: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0] },
              ].map(opt => (
                <button key={opt.value} type="button"
                  onClick={() => { setDeliveryDate(opt.value); markUserEdited('delivery_date'); }}
                  className={`text-[11px] px-3 py-1.5 rounded-full transition cursor-pointer ${
                    deliveryDate === opt.value ? 'bg-violet text-white' : 'bg-black/5 text-ink-muted hover:bg-violet-tint hover:text-violet'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
            {renderDeliveryCheck()}
          </div>
        );
      case 'location_type':
        return (
          <div className="grid grid-cols-2 gap-2">
            {LOCATION_TYPES.map(({ value, icon: Icon, label }, i) => (
              <button key={value} type="button"
                ref={i === 0 ? firstBtnRef : undefined}
                onClick={() => {
                  setLocationType(value);
                  markUserEdited('location_type');
                  setTimeout(() => { if (!isLast) setStep(s => s + 1); }, 200);
                }}
                className={`flex items-center gap-2.5 px-3 py-3.5 min-h-[52px] rounded-xl text-sm font-medium border transition-all cursor-pointer ${
                  locationType === value
                    ? 'bg-violet-tint border-violet text-violet-mid shadow-sm'
                    : 'bg-white border-black/10 text-ink hover:border-violet/30 hover:bg-violet-tint/50'
                }`}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{label}</span>
                {locationType === value && <CheckCircle2 className="w-3.5 h-3.5 ml-auto text-violet" />}
              </button>
            ))}
          </div>
        );
      case 'icing_text':
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2 bg-amber-50/50 border border-amber-100 rounded-xl px-3 py-2 mb-2">
              <Cake className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span className="text-[11px] text-amber-700 font-medium">+Rs. 140 per cake for custom icing</span>
            </div>
            <div className="relative">
              <input ref={inputRef as React.RefObject<HTMLInputElement>} type="text"
                value={icingText}
                onChange={(e) => { if (e.target.value.length <= 120) setIcingText(e.target.value); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); advanceStep(); } }}
                placeholder="Happy Birthday Amma!"
                maxLength={120}
                className="w-full px-4 py-3.5 min-h-[48px] bg-white border border-amber-200 focus:border-amber-400 rounded-xl text-[15px] text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-amber-100 transition" />
            </div>
            <div className="flex justify-between items-center">
              <p className="text-[11px] text-ink-muted italic">Leave blank for no icing text</p>
              <span className="text-[9px] font-mono text-ink-faint">{icingText.length}/120</span>
            </div>
          </div>
        );
      case 'gift_details':
        return (
          <div className="space-y-4">
            <div className="flex gap-2">
              <button type="button" onClick={() => setOrderMode('gift')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 min-h-[48px] rounded-xl text-sm font-semibold border transition-all cursor-pointer ${
                  orderMode === 'gift' ? 'bg-violet-tint border-violet text-violet-mid' : 'bg-white border-black/10 text-ink-muted hover:border-violet/30'
                }`}>
                <Gift className="w-4 h-4" /> It's a Gift
              </button>
              <button type="button" onClick={() => setOrderMode('self')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 min-h-[48px] rounded-xl text-sm font-semibold border transition-all cursor-pointer ${
                  orderMode === 'self' ? 'bg-violet-tint border-violet text-violet-mid' : 'bg-white border-black/10 text-ink-muted hover:border-violet/30'
                }`}>
                <User className="w-4 h-4" /> It's for Me
              </button>
            </div>
            {orderMode === 'gift' && (
              <>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-ink-muted font-bold uppercase tracking-wider block">
                    Your Name <span className="text-ink-faint">(appears as "From:")</span>
                  </label>
                  <div className="relative">
                    <input type="text" value={senderName}
                      onChange={(e) => { setSenderName(e.target.value); markUserEdited('sender_name'); }}
                      placeholder="Harry"
                      className="w-full px-4 py-3 min-h-[44px] bg-white border border-black/10 focus:border-violet/40 rounded-xl text-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-violet/10 transition" />
                    {renderAutoFillBadge('sender_name')}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-mono text-ink-muted font-bold uppercase tracking-wider block">Gift Card Message</label>
                    <span className="text-[9px] font-mono text-ink-faint">{giftMessage.length}/300</span>
                  </div>
                  <div className="relative">
                    <textarea ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                      value={giftMessage}
                      onChange={(e) => { if (e.target.value.length <= 300) { setGiftMessage(e.target.value); markUserEdited('gift_message'); } }}
                      placeholder="Write a heartwarming message to deliver with your gift..."
                      className="w-full px-4 py-3 min-h-[80px] bg-white border border-black/10 focus:border-violet/40 rounded-xl text-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-violet/10 transition resize-none"
                      maxLength={300} />
                    {renderAutoFillBadge('gift_message')}
                  </div>
                </div>
                <div className="flex items-center justify-between bg-black/[0.02] rounded-xl px-4 py-3 border border-black/5">
                  <div className="flex items-center gap-2.5">
                    {anonymous ? <EyeOff className="w-4 h-4 text-violet" /> : <Eye className="w-4 h-4 text-ink-muted" />}
                    <span className="text-[11px] font-mono text-ink-muted font-semibold">Anonymous gift — hide my name</span>
                  </div>
                  <button type="button" onClick={() => setAnonymous(!anonymous)}
                    className={`w-10 h-[22px] rounded-full transition-all cursor-pointer relative ${anonymous ? 'bg-violet' : 'bg-black/15'}`}>
                    <span className={`absolute top-[3px] w-4 h-4 bg-white rounded-full shadow-sm transition-all ${anonymous ? 'left-[22px]' : 'left-[3px]'}`} />
                  </button>
                </div>
              </>
            )}
            {orderMode === 'self' && (
              <p className="text-[11px] text-ink-muted italic text-center py-2">No gift details needed — we'll skip the greeting card.</p>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  // "Go to Cart" prompt — only shows AFTER wizard is completed (Done clicked)
  const renderGoToCartPrompt = () => {
    if (!wizardCompleted) return null;
    return (
      <div className="mx-5 mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl animate-fade-in">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span className="text-[12px] font-semibold text-emerald-800">All delivery details are ready!</span>
        </div>
        <p className="text-[11px] text-emerald-700 mb-3">
          {recipientName.trim()} in {cityName.trim()} — check your cart to confirm and pay.
        </p>
        <button type="button" onClick={onOpenCart}
          className="w-full flex items-center justify-center gap-2 py-2.5 min-h-[40px] rounded-xl font-display font-bold text-[12px] text-white transition-all cursor-pointer active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)', boxShadow: '0 4px 14px rgba(16,185,129,0.3)' }}>
          <ShoppingBag className="w-4 h-4" />
          Go to Cart & Checkout
        </button>
      </div>
    );
  };

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-black/[0.06]"
      style={{ background: 'linear-gradient(180deg, #FFFFFF 0%, #FAF8F4 100%)', boxShadow: '0 8px 32px rgba(64,41,112,0.08), 0 2px 8px rgba(0,0,0,0.04)' }}>
      <div className="px-5 pt-4 pb-1">{renderProgressBar()}</div>
      <div className="px-5 pt-3 pb-3 flex items-center gap-3">
        <WasiRobotAvatar size={36} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-base">{meta.emoji}</span>
            <h3 className="font-display font-bold text-[15px] text-ink leading-tight truncate">{meta.title}</h3>
          </div>
          <p className="text-[11px] text-ink-muted mt-0.5 truncate">{meta.subtitle}</p>
        </div>
        <span className="text-[10px] font-mono text-ink-faint flex-shrink-0">{step + 1}/{stepOrder.length}</span>
      </div>
      <div className="px-5 pb-3">{renderStepIndicator()}</div>
      <div className="px-5 pb-2 min-h-[120px]">
        {renderStepContent()}
        {renderError()}
      </div>
      {renderGoToCartPrompt()}
      <div className="px-5 pb-5">{renderNavigation()}</div>
    </div>
  );
}

