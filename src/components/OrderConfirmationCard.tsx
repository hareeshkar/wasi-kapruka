import React, { useState, useEffect } from 'react';
import { AlertCircle, Copy, Check, Share2, ExternalLink, MapPin, Calendar, RefreshCw, Lock, LockOpen, Loader2 } from 'lucide-react';
import { CartItem, Order } from '../types';
import { formatPrice, type Currency } from '../lib/currency';

export interface OrderDeliveryMeta {
  recipientName?: string;
  deliveryDate?: string;
  city?: string;
  giftMessage?: string;
  occasion?: string;
  senderName?: string;
}

interface OrderConfirmationCardProps {
  order: Order;
  cart?: CartItem[];
  currency?: string;
  deliveryMeta?: OrderDeliveryMeta;
  onRenew?: () => void;
  onShare?: () => void;
  lang?: 'en' | 'si' | 'ta';
  /** Shown while create-order is in flight */
  isLoading?: boolean;
  /** Server or validation error — takes precedence over active card */
  errorMessage?: string | null;
  /** Retry checkout after error */
  onRetry?: () => void;
  /** Override default window.open behavior for in-app payment */
  onPay?: (order: Order) => void;
}

const LOCALE = {
  en: {
    lockActive: 'Lock active',
    expiringSoon: 'Expiring soon',
    lockExpired: 'Lock expired',
    readyToPay: 'Ready to pay',
    orderExpired: 'Reference expired',
    relockPrice: 'Re-lock price — 60 min',
    expiredMessage: 'This reference has expired. Start a new order in chat.',
    lockedTotal: 'Total',
    previousTotal: 'Was',
    calculating: 'Calculating…',
    delivery: 'Delivery',
    addons: 'Add-ons',
    recipientPending: 'Recipient TBD',
    lockWarning: 'Less than 5 min left on price lock',
    renewLock: 'Renew — 60 min',
    payOnKapruka: 'Pay on Kapruka',
    payUnavailable: 'Payment link unavailable',
    copyLink: 'Copy',
    copied: 'Copied',
    shareCard: 'Share',
    reference: 'Ref',
    expiredSublabel: 'done',
    leftSublabel: 'left',
    loadingTitle: 'Locking your order',
    loadingHint: 'Confirming prices with Kapruka…',
    errorTitle: 'Checkout failed',
    errorDefault: 'Kapruka did not return a checkout link. Try again or adjust delivery details.',
    incompleteTitle: 'Order incomplete',
    incompleteHint: 'Missing reference or payment link. Re-lock or start checkout again.',
    retry: 'Try again',
    copyFailed: 'Could not copy link',
  },
  si: {
    lockActive: 'Lock active',
    expiringSoon: 'ඉක්මනින් expire',
    lockExpired: 'Lock expired',
    readyToPay: 'Pay කරන්න',
    orderExpired: 'Reference expired',
    relockPrice: 'Price re-lock — 60 min',
    expiredMessage: 'Reference expired. Chat එකෙන් අලුත් order එකක් දාන්න.',
    lockedTotal: 'Total',
    previousTotal: 'Was',
    calculating: 'Calculate වෙනවා…',
    delivery: 'Delivery',
    addons: 'Add-ons',
    recipientPending: 'Recipient TBD',
    lockWarning: 'Price lock එකට 5 min ට අඩු',
    renewLock: 'Renew — 60 min',
    payOnKapruka: 'Kapruka වල Pay කරන්න',
    payUnavailable: 'Payment link නැහැ',
    copyLink: 'Copy',
    copied: 'Copied',
    shareCard: 'Share',
    reference: 'Ref',
    expiredSublabel: 'done',
    leftSublabel: 'left',
    loadingTitle: 'Order lock වෙනවා',
    loadingHint: 'Kapruka prices confirm වෙනවා…',
    errorTitle: 'Checkout fail',
    errorDefault: 'Checkout link එක නැහැ. නැවත try කරන්න.',
    incompleteTitle: 'Order incomplete',
    incompleteHint: 'Reference හෝ payment link missing. Re-lock කරන්න.',
    retry: 'Try again',
    copyFailed: 'Copy fail',
  },
  ta: {
    lockActive: 'Lock active',
    expiringSoon: 'விரைவில் expire',
    lockExpired: 'Lock expired',
    readyToPay: 'Pay பண்ணுங்க',
    orderExpired: 'Reference expired',
    relockPrice: 'Price re-lock — 60 min',
    expiredMessage: 'Reference expire ஆயிடுச்சு. Chat-ல புது order start பண்ணுங்க.',
    lockedTotal: 'Total',
    previousTotal: 'Was',
    calculating: 'Calculate ஆகுது…',
    delivery: 'Delivery',
    addons: 'Add-ons',
    recipientPending: 'Recipient TBD',
    lockWarning: 'Price lock-க்கு 5 min-க்கு குறைவு',
    renewLock: 'Renew — 60 min',
    payOnKapruka: 'Kapruka-ல Pay பண்ணுங்க',
    payUnavailable: 'Payment link இல்லை',
    copyLink: 'Copy',
    copied: 'Copied',
    shareCard: 'Share',
    reference: 'Ref',
    expiredSublabel: 'done',
    leftSublabel: 'left',
    loadingTitle: 'Order lock ஆகுது',
    loadingHint: 'Kapruka prices confirm ஆகுது…',
    errorTitle: 'Checkout fail',
    errorDefault: 'Checkout link வரல. மறுபடி try பண்ணுங்க.',
    incompleteTitle: 'Order incomplete',
    incompleteHint: 'Reference அல்லது payment link missing.',
    retry: 'Try again',
    copyFailed: 'Copy fail',
  },
};

const TOTAL_SECS = 3600;
const ARC_R = 18;
const ARC_CIRC = 2 * Math.PI * ARC_R;

function ArcTimer({ mm, ss, dashOffset, arcColor, textColor, sublabel }: {
  mm: string; ss: string; dashOffset: number; arcColor: string; textColor: string; sublabel: string;
}) {
  return (
    <svg viewBox="0 0 44 44" width="40" height="40" aria-label={`${mm}:${ss} ${sublabel}`} className="flex-shrink-0">
      <circle cx="22" cy="22" r={ARC_R} fill="none" stroke="rgba(64,41,112,0.08)" strokeWidth="2.5" />
      <circle cx="22" cy="22" r={ARC_R} fill="none" stroke={arcColor} strokeWidth="2.5" strokeLinecap="round"
        strokeDasharray={`${ARC_CIRC} ${ARC_CIRC}`} strokeDashoffset={dashOffset}
        transform="rotate(-90 22 22)" style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease' }} />
      <text x="22" y="21" textAnchor="middle" dominantBaseline="central"
        fontFamily="'JetBrains Mono', monospace" fontSize="8" fontWeight="700" fill={textColor}>{mm}:{ss}</text>
    </svg>
  );
}

function isOrderActionable(order: Order): boolean {
  return Boolean(
    (order.order_ref && order.order_ref.trim()) ||
    (order.pay_url && order.pay_url.trim()) ||
    (order.order_id && order.order_id.trim())
  );
}

export default function OrderConfirmationCard({
  order, cart = [], currency = 'LKR', deliveryMeta, onRenew, onShare, lang = 'en',
  isLoading = false, errorMessage = null, onRetry, onPay,
}: OrderConfirmationCardProps) {
  const t = LOCALE[lang] || LOCALE.en;
  const fontClass = lang === 'si' ? 'font-sinhala' : lang === 'ta' ? 'font-tamil' : '';

  const [timeLeft, setTimeLeft] = useState<number>(() => {
    const ms = new Date(order.expires_at).getTime();
    return isNaN(ms) ? 0 : Math.max(0, Math.floor((ms - Date.now()) / 1000));
  });
  const [copySuccess, setCopySuccess] = useState(false);
  const [copyError, setCopyError] = useState(false);

  useEffect(() => {
    const expiresMs = new Date(order.expires_at).getTime();
    if (isNaN(expiresMs)) { setTimeLeft(0); return; }
    const calc = () => Math.max(0, Math.floor((expiresMs - Date.now()) / 1000));
    setTimeLeft(calc());
    if (calc() <= 0) return;
    const interval = setInterval(() => {
      const remaining = calc();
      setTimeLeft(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [order.expires_at]);

  const handleCopyLink = async () => {
    if (!order.pay_url) return;
    setCopyError(false);
    try {
      await navigator.clipboard.writeText(order.pay_url);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      setCopyError(true);
      setTimeout(() => setCopyError(false), 3000);
    }
  };

  const effectiveCurrency = (order.summary?.currency || currency) as Currency;
  const total = order.total_lkr || order.summary?.grand_total || 0;
  const summaryDeliveryFee = order.summary?.delivery_fee ?? null;
  const summaryAddonsTotal = order.summary?.addons_total ?? null;
  const cartItemsTotal = cart.reduce((s, i) => s + i.price_lkr * i.quantity, 0);
  const deliveryFee = summaryDeliveryFee ?? Math.max(0, total - cartItemsTotal);
  const hasPayUrl = Boolean(order.pay_url?.trim());
  const orderActionable = isOrderActionable(order);

  const dashOffset = ARC_CIRC * (1 - Math.min(1, Math.max(0, timeLeft / TOTAL_SECS)));
  const isExpired = !isLoading && !errorMessage && orderActionable && timeLeft <= 0;
  const isWarning = !isLoading && !errorMessage && orderActionable && timeLeft <= 300 && !isExpired;
  const arcColor = isExpired ? '#D1D5DB' : isWarning ? '#F59E0B' : '#7B5EA7';
  const arcTextColor = isExpired ? '#B0A8BC' : isWarning ? '#D97706' : '#402970';
  const mm = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const ss = (timeLeft % 60).toString().padStart(2, '0');

  const deliveryDateStr = deliveryMeta?.deliveryDate && (() => {
    const d = new Date(deliveryMeta.deliveryDate!);
    return isNaN(d.getTime())
      ? deliveryMeta.deliveryDate
      : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  })();

  const hasDelivery = deliveryMeta && (deliveryMeta.recipientName || deliveryMeta.city || deliveryMeta.deliveryDate || deliveryMeta.giftMessage);
  const hasBreakdown = cart.length > 0 || deliveryFee > 0 || (summaryAddonsTotal != null && summaryAddonsTotal > 0);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className={`w-full max-w-lg glass-bubble rounded-xl overflow-hidden animate-fade-in ${fontClass}`} role="status" aria-live="polite">
        <div className="px-3 py-2 border-b border-ink/5 bg-violet-tint/60 flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-violet animate-spin flex-shrink-0" />
          <div>
            <p className="text-[11px] font-bold text-ink">{t.loadingTitle}</p>
            <p className="text-[9px] font-mono text-ink-faint">{t.loadingHint}</p>
          </div>
        </div>
        <div className="px-3 py-3 space-y-2">
          <div className="h-6 w-32 rounded bg-violet/10 animate-pulse" />
          <div className="h-3 w-full rounded bg-ink/5 animate-pulse" />
          <div className="h-3 w-2/3 rounded bg-ink/5 animate-pulse" />
        </div>
      </div>
    );
  }

  // ── Error from server / network ───────────────────────────────────────────
  if (errorMessage) {
    return (
      <div className={`w-full max-w-lg glass-bubble rounded-xl overflow-hidden animate-fade-in ${fontClass}`} role="alert">
        <div className="px-3 py-2 border-b border-red-200/60 bg-red-50/80 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <p className="text-[11px] font-bold text-red-900">{t.errorTitle}</p>
        </div>
        <div className="px-3 py-2.5 space-y-2">
          <p className="text-[11px] font-mono text-ink-muted leading-relaxed">{errorMessage}</p>
          {onRetry && (
            <button type="button" onClick={onRetry}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg font-mono font-bold text-[10px] uppercase tracking-wide cursor-pointer bg-violet text-white hover:bg-violet-mid active:scale-[0.98]">
              <RefreshCw className="w-3 h-3" />{t.retry}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Empty / malformed MCP response ────────────────────────────────────────
  if (!orderActionable) {
    return (
      <div className={`w-full max-w-lg glass-bubble rounded-xl overflow-hidden animate-fade-in ${fontClass}`} role="alert">
        <div className="px-3 py-2 border-b border-amber-200/60 bg-amber-50/80 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0" />
          <p className="text-[11px] font-bold text-amber-900">{t.incompleteTitle}</p>
        </div>
        <div className="px-3 py-2.5 space-y-2">
          <p className="text-[11px] font-mono text-ink-muted leading-relaxed">{t.incompleteHint}</p>
          {onRetry && (
            <button type="button" onClick={onRetry}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg font-mono font-bold text-[10px] uppercase tracking-wide cursor-pointer bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-200 active:scale-[0.98]">
              <RefreshCw className="w-3 h-3" />{t.retry}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className={`w-full max-w-lg glass-bubble rounded-xl overflow-hidden animate-fade-in ${fontClass}`}>
        <div className="px-3 py-2 border-b border-ink/5 bg-gray-50/80 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <LockOpen className="w-3 h-3 text-ink-faint flex-shrink-0" />
            <span className="text-[9px] font-mono font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-gray-100 text-ink-faint border border-ink/5">
              {t.lockExpired}
            </span>
            <span className="text-[11px] font-bold text-ink-muted truncate">{t.orderExpired}</span>
          </div>
          <ArcTimer mm="--" ss="--" dashOffset={ARC_CIRC} arcColor="#D1D5DB" textColor="#B0A8BC" sublabel={t.expiredSublabel} />
        </div>
        <div className="px-3 py-2.5 space-y-2">
          {total > 0 && (
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[10px] font-mono text-ink-faint">{t.previousTotal}</span>
              <span className="font-display text-lg font-semibold text-ink-faint">{formatPrice(total, effectiveCurrency)}</span>
            </div>
          )}
          {deliveryMeta?.city && (
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-ink-muted">
              <MapPin className="w-3 h-3 text-violet-soft flex-shrink-0" />
              {deliveryMeta.recipientName && <span>{deliveryMeta.recipientName} · </span>}
              {deliveryMeta.city}
            </div>
          )}
          {onRenew ? (
            <button onClick={onRenew}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg font-mono font-bold text-[10px] uppercase tracking-wide cursor-pointer bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 active:scale-[0.98]">
              <RefreshCw className="w-3 h-3" />{t.relockPrice}
            </button>
          ) : (
            <p className="text-[10px] font-mono text-ink-muted text-center">{t.expiredMessage}</p>
          )}
          <div className="flex justify-between items-center pt-1 border-t border-ink/5 text-[9px] font-mono text-ink-faint">
            <span>{t.reference} · <strong className="text-ink-muted">{order.order_ref || '—'}</strong></span>
            <span>Kapruka</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full max-w-lg glass-bubble rounded-xl overflow-hidden animate-fade-in ${fontClass}`}>
      <div className="foil-edge w-full" />
      <div className={`px-3 py-2 border-b border-ink/5 flex items-center gap-2 ${
        isWarning ? 'bg-amber-50/80' : 'bg-violet-tint/60'
      }`}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isWarning ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 animate-pulse'}`} />
            <span className={`inline-flex items-center gap-0.5 text-[8px] font-mono font-bold uppercase tracking-wide px-1.5 py-px rounded-full border ${
              isWarning ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}>
              <Lock className="w-2 h-2 opacity-70" />
              {isWarning ? t.expiringSoon : t.lockActive}
            </span>
            <span className="text-[10px] font-mono font-bold text-ink-muted truncate">{t.readyToPay}</span>
          </div>
          {total > 0 ? (
            <p className="font-display text-xl font-bold text-violet-deep leading-none tracking-tight">
              {formatPrice(total, effectiveCurrency)}
            </p>
          ) : (
            <p className="font-mono text-xs text-ink-faint">{t.calculating}</p>
          )}
        </div>
        <ArcTimer mm={mm} ss={ss} dashOffset={dashOffset} arcColor={arcColor} textColor={arcTextColor} sublabel={t.leftSublabel} />
      </div>

      <div className="px-3 py-2 space-y-2">
        {hasDelivery && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-mono text-ink-muted">
            {(deliveryMeta!.recipientName || deliveryMeta!.senderName) && (
              <span>
                {deliveryMeta!.senderName && <span className="text-ink-faint">{deliveryMeta!.senderName} → </span>}
                <span className="font-semibold text-violet-deep">
                  {deliveryMeta!.recipientName || t.recipientPending}
                </span>
              </span>
            )}
            {deliveryMeta!.city && (
              <span className="inline-flex items-center gap-0.5">
                <MapPin className="w-2.5 h-2.5 text-violet-soft" />{deliveryMeta!.city}
              </span>
            )}
            {deliveryDateStr && (
              <span className="inline-flex items-center gap-0.5">
                <Calendar className="w-2.5 h-2.5 text-violet-soft" />{deliveryDateStr}
              </span>
            )}
            {deliveryMeta!.giftMessage && (
              <span className="w-full ai-pullquote text-[10px] leading-snug line-clamp-1 border-violet/20 pl-2 mt-0.5">
                "{deliveryMeta!.giftMessage.length > 60 ? deliveryMeta!.giftMessage.slice(0, 60) + '…' : deliveryMeta!.giftMessage}"
              </span>
            )}
          </div>
        )}

        {hasBreakdown && (
          <div className="rounded-lg bg-white/70 border border-ink/5 px-2.5 py-2 space-y-1">
            {cart.map((item, i) => (
              <div key={`${item.product_code}-${i}`} className="flex items-center justify-between gap-1.5">
                <span className="text-[10px] font-mono text-ink-muted truncate">{item.name}</span>
                <span className="text-[10px] font-mono font-semibold text-ink flex-shrink-0">
                  {item.quantity > 1 && <span className="text-ink-faint mr-0.5">×{item.quantity}</span>}
                  {formatPrice(item.price_lkr * item.quantity, (item.currency || currency) as Currency)}
                </span>
              </div>
            ))}
            {deliveryFee > 0 && (
              <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-ink/5">
                <span className="text-[9px] font-mono text-ink-faint">{t.delivery}</span>
                <span className="text-[10px] font-mono text-ink-muted">{formatPrice(deliveryFee, effectiveCurrency)}</span>
              </div>
            )}
            {summaryAddonsTotal != null && summaryAddonsTotal > 0 && (
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-[9px] font-mono text-ink-faint">{t.addons}</span>
                <span className="text-[10px] font-mono text-ink-muted">{formatPrice(summaryAddonsTotal, effectiveCurrency)}</span>
              </div>
            )}
          </div>
        )}

        {isWarning && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1.5 flex items-center gap-2">
            <AlertCircle className="w-3 h-3 text-amber-600 flex-shrink-0" />
            <p className="text-[10px] font-mono text-amber-800 flex-1">{t.lockWarning}</p>
            {onRenew && (
              <button onClick={onRenew}
                className="flex-shrink-0 flex items-center gap-1 py-1 px-2 rounded-md text-[9px] font-mono font-bold uppercase cursor-pointer bg-amber-500 text-white hover:bg-amber-600">
                <RefreshCw className="w-2.5 h-2.5" />{t.renewLock}
              </button>
            )}
          </div>
        )}

        {hasPayUrl ? (
          <button type="button" onClick={() => onPay ? onPay(order) : window.open(order.pay_url, '_blank', 'noopener,noreferrer')}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg font-display font-semibold text-[13px] text-white cursor-pointer bg-violet hover:bg-violet-mid active:scale-[0.98] shadow-sm">
            <ExternalLink className="w-3.5 h-3.5" />{t.payOnKapruka}
          </button>
        ) : (
          <div className="w-full py-2 px-3 rounded-lg text-xs font-mono text-center bg-amber-50 border border-amber-200 text-amber-800">
            {t.payUnavailable}
          </div>
        )}

        <div className={`grid gap-1.5 ${onShare ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <button type="button" onClick={handleCopyLink} disabled={!hasPayUrl}
            className={`flex items-center justify-center gap-1 py-1.5 max-sm:py-2.5 px-2 rounded-lg text-[10px] font-mono font-semibold cursor-pointer disabled:opacity-30 border ${
              copySuccess ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : copyError ? 'bg-red-50 text-red-700 border-red-200'
                : 'bg-white text-ink-muted border-ink/10 hover:border-violet/20'
            }`}>
            {copySuccess ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copySuccess ? t.copied : copyError ? t.copyFailed : t.copyLink}
          </button>
          <a href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
            `My Kapruka order from Wasi\n\nOrder: ${order.order_ref}\n${deliveryMeta?.city ? `Delivering to: ${deliveryMeta.city}\n` : ''}${deliveryMeta?.deliveryDate ? `Date: ${deliveryMeta.deliveryDate}\n` : ''}Total: ${formatPrice(total, effectiveCurrency)}\n\nPay here: ${order.pay_url || ''}`
          )}`} target="_blank" rel="noreferrer"
            className="flex items-center justify-center gap-1 py-1.5 max-sm:py-2.5 px-2 rounded-lg text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100">
            <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            WhatsApp
          </a>
          {onShare && (
            <button type="button" onClick={onShare}
              className="flex items-center justify-center gap-1 py-1.5 max-sm:py-2.5 px-2 rounded-lg text-[10px] font-mono font-semibold cursor-pointer bg-gold-light text-amber-800 border border-amber-200/60 hover:bg-amber-50">
              <Share2 className="w-3 h-3" />{t.shareCard}
            </button>
          )}
        </div>

        <div className="flex justify-between items-center pt-1 border-t border-ink/5 text-[9px] font-mono text-ink-faint">
          <span>{t.reference} · <strong className="text-ink tracking-wide">{order.order_ref || '—'}</strong></span>
          <span className="font-bold text-violet/50">Kapruka</span>
        </div>
      </div>
    </div>
  );
}
