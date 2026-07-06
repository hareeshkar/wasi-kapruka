import React, { useState, useEffect, useRef } from 'react';
import { X, ExternalLink, RefreshCw, CheckCircle2, Loader2, MapPin, Calendar, User, AlertCircle } from 'lucide-react';
import { CartItem, Order } from '../types';
import { formatPrice, type Currency } from '../lib/currency';
import type { OrderDeliveryMeta } from './OrderConfirmationCard';

interface PaymentModalProps {
  order: Order;
  cart?: CartItem[];
  currency?: string;
  deliveryMeta?: OrderDeliveryMeta;
  isOpen: boolean;
  onClose: () => void;
  onOpenExternal?: () => void;
  lang?: 'en' | 'si' | 'ta';
}

const LOCALE = {
  en: {
    title: 'Complete Your Payment',
    subtitle: 'Review your order details below, then complete payment on Kapruka',
    payOnKapruka: 'Pay on Kapruka',
    openExternal: 'Open in Browser',
    close: 'Close',
    orderSummary: 'Order Summary',
    deliveringTo: 'Delivering to',
    deliveryDate: 'Delivery date',
    sender: 'From',
    giftMessage: 'Gift message',
    total: 'Total',
    iframeHint: 'If the payment page does not load, use the button below to open it in a new tab.',
    loading: 'Loading payment page…',
    error: 'Payment page could not be embedded.',
    orderRef: 'Order ref',
    closeWarningTitle: 'Cancel payment?',
    closeWarning: 'If you close this, your payment session will be interrupted. You can reopen it from the order link in chat.',
    closeWarningConfirm: 'Yes, close',
    closeWarningCancel: 'Keep paying',
  },
  si: {
    title: 'Payment සම්පූර්ණ කරන්න',
    subtitle: 'ඔබේ order details පහතින් බලා Kapruka වල payment සම්පූර්ණ කරන්න',
    payOnKapruka: 'Kapruka වල Pay කරන්න',
    openExternal: 'Browser එකේ විවෘත කරන්න',
    close: 'වසන්න',
    orderSummary: 'Order සාරාංශය',
    deliveringTo: ' deliver කරන්නේ',
    deliveryDate: 'දිනය',
    sender: 'යවන්නේ',
    giftMessage: 'තෑගි පණිවිඩය',
    total: 'මුළු එකතුව',
    iframeHint: 'Payment page load නොවුණොත්, පහත button එකෙන් new tab එකක විවෘත කරන්න.',
    loading: 'Payment page load වෙනවා…',
    error: 'Payment page embed කරන්න බැහැ.',
    orderRef: 'Order ref',
    closeWarningTitle: 'Payment අවලංගු කරන්නද?',
    closeWarning: 'මෙය වැසුවොත්, ඔබේ payment session බාධාවට ලක් වේ. ඔබට chat එකේ order link එකෙන් නැවත විවෘත කළ හැක.',
    closeWarningConfirm: 'ඔව්, වසන්න',
    closeWarningCancel: 'Payment කරන්න',
  },
  ta: {
    title: 'பணம் செலுத்துவதை முடிக்கவும்',
    subtitle: 'கீழே உங்கள் ஆர்டர் விவரங்களை மதிப்பாய்வு செய்து, Kapruka-ல பணம் செலுத்துங்கள்',
    payOnKapruka: 'Kapruka-ல Pay பண்ணுங்க',
    openExternal: 'Browser-ல திறக்க',
    close: 'மூடு',
    orderSummary: 'ஆர்டர் சுருக்கம்',
    deliveringTo: 'வழங்கும் இடம்',
    deliveryDate: 'தேதி',
    sender: 'அனுப்பியவர்',
    giftMessage: 'பரிசு செய்தி',
    total: 'மொத்தம்',
    iframeHint: 'பணம் செலுத்தும் பக்கம் ஏற்றப்படாவிட்டால், கீழே உள்ள பொத்தானைப் பயன்படுத்தி புது tab-ல திறக்கவும்.',
    loading: 'பணம் செலுத்தும் பக்கம் ஏற்றப்படுகிறது…',
    error: 'பணம் செலுத்தும் பக்கத்தை embed செய்ய முடியவில்லை.',
    orderRef: 'ஆர்டர் எண்',
    closeWarningTitle: 'பணம் செலுத்துவதை ரத்து செய்யவா?',
    closeWarning: 'இதை மூடினால், உங்கள் பணம் செலுத்தும் அமர்வு இடையூறு செய்யப்படும். Chat-ல உள்ள ஆர்டர் இணைப்பிலிருந்து மீண்டும் திறக்கலாம்.',
    closeWarningConfirm: 'ஆம், மூடு',
    closeWarningCancel: 'பணம் செலுத்து',
  },
};

export default function PaymentModal({
  order, cart = [], currency = 'LKR', deliveryMeta, isOpen, onClose, onOpenExternal, lang = 'en',
}: PaymentModalProps) {
  const t = LOCALE[lang] || LOCALE.en;
  const fontClass = lang === 'si' ? 'font-sinhala' : lang === 'ta' ? 'font-tamil' : '';
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const [showCloseWarning, setShowCloseWarning] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const payUrl = order.pay_url;
  const total = order.total_lkr || order.summary?.grand_total || 0;
  const effectiveCurrency = (order.summary?.currency || currency) as Currency;
  const cartItemsTotal = cart.reduce((s, i) => s + i.price_lkr * i.quantity, 0);
  const deliveryFee = order.summary?.delivery_fee ?? Math.max(0, total - cartItemsTotal);

  // Reset iframe state when URL changes
  useEffect(() => {
    setIframeLoaded(false);
    setIframeError(false);
  }, [payUrl]);

  // Close on Escape — show warning first
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowCloseWarning(true);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  if (!isOpen || !payUrl) return null;

  const handleClose = () => setShowCloseWarning(true);
  const confirmClose = () => { setShowCloseWarning(false); onClose(); };
  const cancelClose = () => setShowCloseWarning(false);

  const handleOpenExternal = () => {
    if (onOpenExternal) {
      onOpenExternal();
    } else {
      window.open(payUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        className={`relative w-full max-w-3xl h-[85vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scale-in ${fontClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-black/5 bg-violet-tint/40 flex-shrink-0">
          <div>
            <h2 className="text-sm font-display font-bold text-violet-deep">{t.title}</h2>
            <p className="text-[10px] font-mono text-ink-muted mt-0.5">{t.subtitle}</p>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/5 transition cursor-pointer"
            aria-label={t.close}
          >
            <X className="w-4 h-4 text-ink-muted" />
          </button>
        </div>

        {/* Body — split layout: iframe left, summary right */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Left: Payment iframe */}
          <div className="flex-1 relative bg-gray-50 flex flex-col min-w-0">
            {!iframeLoaded && !iframeError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 bg-gray-50">
                <Loader2 className="w-6 h-6 text-violet animate-spin" />
                <p className="text-xs font-mono text-ink-muted">{t.loading}</p>
              </div>
            )}
            {iframeError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 bg-gray-50 p-6">
                <AlertCircle className="w-8 h-8 text-amber-500" />
                <p className="text-xs font-mono text-ink-muted text-center max-w-xs">{t.error}</p>
                <p className="text-[10px] font-mono text-ink-faint text-center max-w-xs">{t.iframeHint}</p>
                <button
                  onClick={handleOpenExternal}
                  className="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet text-white text-xs font-semibold hover:bg-violet-deep transition cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {t.openExternal}
                </button>
              </div>
            )}
            <iframe
              ref={iframeRef}
              src={payUrl}
              className={`w-full h-full border-0 ${iframeLoaded && !iframeError ? '' : 'hidden'}`}
              onLoad={() => setIframeLoaded(true)}
              onError={() => setIframeError(true)}
              sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
              title="Kapruka Checkout"
            />
          </div>

          {/* Right: Order summary sidebar */}
          <div className="w-72 flex-shrink-0 border-l border-black/5 bg-white overflow-y-auto hidden md:flex flex-col">
            <div className="p-4 space-y-4">
              {/* Order ref */}
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono text-ink-faint uppercase tracking-wider">{t.orderRef}</span>
                <span className="text-[10px] font-mono font-bold text-violet">{order.order_ref || '—'}</span>
              </div>

              {/* Delivery info */}
              {(deliveryMeta?.recipientName || deliveryMeta?.city || deliveryMeta?.deliveryDate) && (
                <div className="space-y-2 pb-3 border-b border-black/5">
                  {deliveryMeta.recipientName && (
                    <div className="flex items-center gap-2 text-[10px] font-mono">
                      <User className="w-3 h-3 text-violet-soft flex-shrink-0" />
                      <span className="text-ink-muted">{t.deliveringTo}:</span>
                      <span className="font-semibold text-violet-deep">{deliveryMeta.recipientName}</span>
                    </div>
                  )}
                  {deliveryMeta.city && (
                    <div className="flex items-center gap-2 text-[10px] font-mono">
                      <MapPin className="w-3 h-3 text-violet-soft flex-shrink-0" />
                      <span className="text-ink-muted">{deliveryMeta.city}</span>
                    </div>
                  )}
                  {deliveryMeta.deliveryDate && (
                    <div className="flex items-center gap-2 text-[10px] font-mono">
                      <Calendar className="w-3 h-3 text-violet-soft flex-shrink-0" />
                      <span className="text-ink-muted">{deliveryMeta.deliveryDate}</span>
                    </div>
                  )}
                  {deliveryMeta.senderName && (
                    <div className="flex items-center gap-2 text-[10px] font-mono">
                      <span className="text-ink-faint ml-5">{t.sender}: {deliveryMeta.senderName}</span>
                    </div>
                  )}
                  {deliveryMeta.giftMessage && (
                    <div className="text-[10px] font-mono text-ink-muted italic pl-5 border-l-2 border-violet/10">
                      "{deliveryMeta.giftMessage.length > 80 ? deliveryMeta.giftMessage.slice(0, 80) + '…' : deliveryMeta.giftMessage}"
                    </div>
                  )}
                </div>
              )}

              {/* Cart items */}
              {cart.length > 0 && (
                <div className="space-y-2 pb-3 border-b border-black/5">
                  <span className="text-[9px] font-mono text-ink-faint uppercase tracking-wider">{t.orderSummary}</span>
                  <div className="space-y-1.5">
                    {cart.map((item, i) => (
                      <div key={`${item.product_code}-${i}`} className="flex items-center gap-2">
                        <img src={item.image_url} alt="" className="w-7 h-7 rounded-md object-cover border border-black/5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-mono text-ink truncate">{item.name}</p>
                          {item.variant_name && (
                            <p className="text-[8px] font-mono text-violet">{item.variant_name}</p>
                          )}
                        </div>
                        <span className="text-[10px] font-mono font-semibold text-ink flex-shrink-0">
                          {item.quantity > 1 && <span className="text-ink-faint mr-0.5">x{item.quantity}</span>}
                          {formatPrice(item.price_lkr * item.quantity, (item.currency || currency) as Currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Total */}
              {total > 0 && (
                <div className="space-y-1">
                  {deliveryFee > 0 && (
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-ink-faint">Delivery</span>
                      <span className="text-ink-muted">{formatPrice(deliveryFee, effectiveCurrency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-baseline pt-1 border-t border-black/5">
                    <span className="text-[10px] font-mono text-ink-faint uppercase">{t.total}</span>
                    <span className="font-display text-lg font-bold text-violet-deep">{formatPrice(total, effectiveCurrency)}</span>
                  </div>
                </div>
              )}

              {/* Open external button */}
              <button
                onClick={handleOpenExternal}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-violet/15 text-[11px] font-mono font-semibold text-violet hover:bg-violet-tint transition cursor-pointer"
              >
                <ExternalLink className="w-3 h-3" />
                {t.openExternal}
              </button>
            </div>
          </div>
        </div>

        {/* Footer — mobile only: external button */}
        <div className="flex-shrink-0 px-4 py-3 border-t border-black/5 bg-white md:hidden">
          <button
            onClick={handleOpenExternal}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-violet text-white text-xs font-semibold hover:bg-violet-deep transition cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {t.payOnKapruka}
          </button>
        </div>
      </div>

      {/* Close warning confirmation */}
      {showCloseWarning && (
        <div className="absolute inset-0 z-[70] flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 mx-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-display font-bold text-ink">{t.closeWarningTitle}</h3>
            </div>
            <p className="text-xs text-ink-muted leading-relaxed mb-5">{t.closeWarning}</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={cancelClose}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer transition"
              >
                {t.closeWarningCancel}
              </button>
              <button
                onClick={confirmClose}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 rounded-lg cursor-pointer transition"
              >
                {t.closeWarningConfirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
