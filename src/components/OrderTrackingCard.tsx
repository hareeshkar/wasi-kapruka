import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Copy,
  Check,
  MapPin,
  MessageSquare,
  Package,
  Phone,
  Truck,
  Camera,
  Video,
  Radio,
} from 'lucide-react';
import { formatPrice, type Currency } from '../lib/currency';
import type { OrderTrackingData } from '../types';

interface OrderTrackingCardProps {
  tracking: OrderTrackingData;
  lang?: 'en' | 'si' | 'ta';
}

type NormalizedStep = {
  label: string;
  timestamp: string;
  parsedMs: number;
  phase: 'prep' | 'logistics' | 'transit' | 'delivered' | 'other';
};

const LOCALE = {
  en: {
    tracking: 'Order tracking',
    to: 'Delivered to',
    greeting: 'Gift message',
    timeline: 'Journey',
    showAll: 'Show all steps',
    showLess: 'Show fewer steps',
    orderTotal: 'Order total',
    ref: 'Payment ref',
    placed: 'Placed',
    deliveredOn: 'Delivered',
    shipped: 'Shipped',
    items: 'Items',
    live: 'Live tracking',
    photo: 'Delivery photo',
    video: 'Delivery video',
    copyOrder: 'Copy order #',
    copied: 'Copied',
  },
  si: {
    tracking: 'Order tracking',
    to: 'Deliver කළේ',
    greeting: 'තෑගි පණිවිඩය',
    timeline: 'ගමන',
    showAll: 'සියලු පියවර',
    showLess: 'අඩුවෙන්',
    orderTotal: 'Total',
    ref: 'Payment ref',
    placed: 'Placed',
    deliveredOn: 'Delivered',
    shipped: 'Shipped',
    items: 'Items',
    live: 'Live track',
    photo: 'Delivery photo',
    video: 'Delivery video',
    copyOrder: 'Order # copy',
    copied: 'Copied',
  },
  ta: {
    tracking: 'Order tracking',
    to: 'Delivered to',
    greeting: 'பரிசு செய்தி',
    timeline: 'பயணம்',
    showAll: 'எல்லா steps-ம்',
    showLess: 'குறைவாக',
    orderTotal: 'Total',
    ref: 'Payment ref',
    placed: 'Placed',
    deliveredOn: 'Delivered',
    shipped: 'Shipped',
    items: 'Items',
    live: 'Live track',
    photo: 'Delivery photo',
    video: 'Delivery video',
    copyOrder: 'Order # copy',
    copied: 'Copied',
  },
};

function cleanText(value?: string): string {
  if (!value) return '';
  return value
    .replace(/<BR[^>]*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleCase(value?: string): string {
  const text = cleanText(value);
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());
}

function parseTimestamp(raw?: string): number {
  if (!raw) return 0;
  const cleaned = cleanText(raw);
  const direct = Date.parse(cleaned);
  if (!Number.isNaN(direct)) return direct;

  const slashDate = cleaned.match(/^(\d{1,2})\s*\/\s*([A-Za-z]+)\s*\/\s*(\d{4})/);
  if (slashDate) {
    const ms = Date.parse(`${slashDate[2]} ${slashDate[1]}, ${slashDate[3]}`);
    if (!Number.isNaN(ms)) return ms;
  }

  const normalized = cleaned
    .replace(/^JUN\b/i, 'Jun')
    .replace(/^JUL\b/i, 'Jul')
    .replace(/^AUG\b/i, 'Aug')
    .replace(/^SEP\b/i, 'Sep')
    .replace(/^OCT\b/i, 'Oct')
    .replace(/^NOV\b/i, 'Nov')
    .replace(/^DEC\b/i, 'Dec')
    .replace(/^JAN\b/i, 'Jan')
    .replace(/^FEB\b/i, 'Feb')
    .replace(/^MAR\b/i, 'Mar')
    .replace(/^APR\b/i, 'Apr')
    .replace(/^MAY\b/i, 'May');

  const retry = Date.parse(normalized);
  return Number.isNaN(retry) ? 0 : retry;
}

function formatStepTime(raw?: string): string {
  const ms = parseTimestamp(raw);
  if (!ms) return cleanText(raw) || '—';
  return new Date(ms).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDayKey(raw?: string): string {
  const ms = parseTimestamp(raw);
  if (!ms) return 'Updates';
  return new Date(ms).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function detectPhase(label: string): NormalizedStep['phase'] {
  const l = label.toLowerCase();
  if (/delivered/.test(l)) return 'delivered';
  if (/out for delivery|delivery agent|dispatched/.test(l)) return 'transit';
  if (/logistics|warehouse|facility|received to/.test(l)) return 'logistics';
  if (/confirm|prepar|received|order/.test(l)) return 'prep';
  return 'other';
}

function normalizeSteps(tracking: OrderTrackingData): NormalizedStep[] {
  const raw = tracking.progress?.length
    ? tracking.progress
    : tracking.timeline?.map(e => ({ step: e.event, timestamp: e.timestamp })) ?? [];

  const seen = new Set<string>();
  const steps: NormalizedStep[] = [];

  for (const entry of raw) {
    const label = cleanText(entry.step || (entry as { event?: string }).event);
    const timestamp = cleanText(entry.timestamp);
    if (!label) continue;

    const key = `${label.toLowerCase()}|${timestamp.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    steps.push({
      label,
      timestamp,
      parsedMs: parseTimestamp(timestamp),
      phase: detectPhase(label),
    });
  }

  return steps.sort((a, b) => a.parsedMs - b.parsedMs || a.label.localeCompare(b.label));
}

function statusTheme(status?: string) {
  const s = (status || '').toLowerCase();
  if (s.includes('deliver')) {
    return {
      label: 'Delivered',
      dot: 'bg-emerald-500',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      headerBg: 'linear-gradient(135deg, rgba(236,253,245,0.95) 0%, rgba(255,255,255,0.9) 100%)',
    };
  }
  if (s.includes('dispatch') || s.includes('transit') || s.includes('out')) {
    return {
      label: 'On the way',
      dot: 'bg-sky-500',
      badge: 'bg-sky-50 text-sky-700 border-sky-200',
      headerBg: 'linear-gradient(135deg, rgba(239,246,255,0.95) 0%, rgba(255,255,255,0.9) 100%)',
    };
  }
  if (s.includes('cancel')) {
    return {
      label: 'Cancelled',
      dot: 'bg-red-400',
      badge: 'bg-red-50 text-red-700 border-red-200',
      headerBg: 'linear-gradient(135deg, rgba(254,242,242,0.95) 0%, rgba(255,255,255,0.9) 100%)',
    };
  }
  if (s.includes('process') || s.includes('prepar') || s.includes('confirm')) {
    return {
      label: 'Preparing',
      dot: 'bg-amber-400',
      badge: 'bg-amber-50 text-amber-700 border-amber-200',
      headerBg: 'linear-gradient(135deg, rgba(255,251,235,0.95) 0%, rgba(255,255,255,0.9) 100%)',
    };
  }
  return {
    label: 'In progress',
    dot: 'bg-violet-soft',
    badge: 'bg-violet-tint text-violet border-violet/15',
    headerBg: 'linear-gradient(135deg, rgba(237,229,248,0.95) 0%, rgba(255,255,255,0.9) 100%)',
  };
}

function phaseIcon(phase: NormalizedStep['phase'], isLatest: boolean, isComplete: boolean) {
  if (phase === 'delivered' || (isLatest && isComplete)) {
    return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
  }
  if (phase === 'transit') {
    return <Truck className={`w-3.5 h-3.5 ${isLatest ? 'text-sky-600' : 'text-ink-faint'}`} />;
  }
  if (phase === 'logistics') {
    return <Package className={`w-3.5 h-3.5 ${isLatest ? 'text-violet-soft' : 'text-ink-faint'}`} />;
  }
  return (
    <Circle
      className={`w-3 h-3 ${isLatest ? 'fill-violet/20 text-violet-soft' : 'fill-ink/5 text-ink-faint'}`}
    />
  );
}

const COLLAPSED_LIMIT = 4;

export default function OrderTrackingCard({ tracking, lang = 'en' }: OrderTrackingCardProps) {
  const t = LOCALE[lang] || LOCALE.en;
  const fontClass = lang === 'si' ? 'font-sinhala' : lang === 'ta' ? 'font-tamil' : '';
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const steps = useMemo(() => normalizeSteps(tracking), [tracking]);
  const theme = statusTheme(tracking.status_display || tracking.status);
  const isDelivered = (tracking.status || tracking.status_display || '').toLowerCase().includes('deliver');

  const visibleSteps = expanded ? steps : steps.slice(Math.max(0, steps.length - COLLAPSED_LIMIT));
  const hiddenCount = Math.max(0, steps.length - COLLAPSED_LIMIT);

  const grouped = useMemo(() => {
    const map = new Map<string, NormalizedStep[]>();
    for (const step of visibleSteps) {
      const key = formatDayKey(step.timestamp);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(step);
    }
    return Array.from(map.entries());
  }, [visibleSteps]);

  const recipientName = titleCase(tracking.recipient?.name);
  const recipientCity = titleCase(tracking.recipient?.city);
  const recipientPhone = cleanText(tracking.recipient?.phone);
  const recipientAddress = titleCase(tracking.recipient?.address);
  const greeting = cleanText(tracking.greeting_message);
  const orderNumber = tracking.order_number || '—';
  const deliveryDate = cleanText(tracking.delivery_date);
  const comments = cleanText(tracking.comments);

  const amountValue = tracking.amount?.value != null ? Number(tracking.amount.value) : 0;
  const amountCurrency = (tracking.amount?.currency || 'LKR') as Currency;

  const handleCopy = () => {
    if (!tracking.order_number) return;
    navigator.clipboard.writeText(tracking.order_number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`relative w-full max-w-lg glass-bubble rounded-xl overflow-hidden animate-fade-in ${fontClass}`}>
      <div className="foil-edge w-full" />
      {/* Header */}
      <div className="px-4 py-3 border-b border-ink/5" style={{ background: theme.headerBg }}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 text-[9px] font-mono font-bold uppercase tracking-[0.12em] px-2 py-0.5 rounded-full border ${theme.badge}`}>
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${theme.dot}`} />
                {tracking.status_display || theme.label}
              </span>
              {tracking.live_tracking_available && (
                <span className="inline-flex items-center gap-1 text-[9px] font-mono uppercase tracking-[0.1em] px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                  <Radio className="w-2.5 h-2.5" />
                  {t.live}
                </span>
              )}
            </div>
            {comments && (
              <p className="text-[11px] font-mono text-ink-muted leading-relaxed">{comments}</p>
            )}
            <h3 className="text-[12px] font-bold text-ink font-mono uppercase tracking-wider">{t.tracking}</h3>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="flex-shrink-0 text-right group cursor-pointer"
            title={t.copyOrder}
          >
            <p className="text-[8px] font-mono uppercase tracking-[0.14em] text-ink-faint mb-0.5">Order #</p>
            <p className="text-[11px] font-mono font-bold text-violet-deep tracking-wide flex items-center gap-1 justify-end">
              {orderNumber}
              {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-ink-faint opacity-0 group-hover:opacity-100 transition-opacity" />}
            </p>
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Delivery headline */}
        {(deliveryDate || recipientCity) && (
          <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
            {deliveryDate && (
              <div>
                <p className="text-[9px] font-mono uppercase tracking-[0.14em] text-ink-faint">{t.deliveredOn}</p>
                <p className="font-display text-xl font-bold text-violet-deep leading-tight">
                  {titleCase(deliveryDate.replace(/\//g, ' '))}
                </p>
              </div>
            )}
            {recipientCity && (
              <div className="flex items-center gap-1.5 pb-0.5">
                <MapPin className="w-3.5 h-3.5 text-violet-soft flex-shrink-0" />
                <span className="text-[11px] font-mono text-ink-muted">{recipientCity}</span>
              </div>
            )}
          </div>
        )}

        {/* Recipient */}
        {(recipientName || recipientPhone || recipientAddress) && (
          <div className="rounded-lg bg-white/80 border border-ink/5 p-3 space-y-1.5">
            <p className="text-[9px] font-mono uppercase tracking-[0.14em] text-ink-faint">{t.to}</p>
            {recipientName && (
              <p className="font-display text-[15px] font-bold text-violet-deep leading-snug">{recipientName}</p>
            )}
            {recipientAddress && (
              <p className="text-[11px] font-mono text-ink-muted leading-relaxed">{recipientAddress}</p>
            )}
            {recipientPhone && (
              <div className="flex items-center gap-1.5 pt-0.5">
                <Phone className="w-3 h-3 text-violet-soft flex-shrink-0" />
                <a
                  href={`tel:${recipientPhone.replace(/[^\d+]/g, '')}`}
                  className="text-[11px] font-mono text-ink hover:text-violet transition-colors"
                >
                  {recipientPhone}
                </a>
              </div>
            )}
          </div>
        )}

        {/* Greeting */}
        {greeting && (
          <div className="rounded-lg bg-gold-light/60 border border-amber-200/40 p-3">
            <p className="text-[9px] font-mono uppercase tracking-[0.14em] text-amber-700/70 mb-1.5 flex items-center gap-1.5">
              <MessageSquare className="w-3 h-3" />
              {t.greeting}
            </p>
            <p className="ai-pullquote text-[11px] leading-relaxed border-amber-400/40">"{greeting}"</p>
          </div>
        )}

        {/* Items */}
        {tracking.items && tracking.items.length > 0 && (
          <div className="rounded-lg bg-white/80 border border-ink/5 p-3 space-y-2">
            <p className="text-[9px] font-mono uppercase tracking-[0.14em] text-ink-faint">{t.items}</p>
            {tracking.items.map((item, i) => (
              <div key={`${item.product_code || item.name}-${i}`} className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-mono text-ink-muted truncate max-w-[70%]">{item.name}</span>
                {item.quantity != null && item.quantity > 1 && (
                  <span className="text-[11px] font-mono text-ink-faint flex-shrink-0">×{item.quantity}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Timeline */}
        {steps.length > 0 && (
          <div className="rounded-lg bg-white/80 border border-ink/5 p-3 accent-line-left">
            <p className="text-[9px] font-mono uppercase tracking-[0.14em] text-ink-faint mb-3 pl-1">{t.timeline}</p>

            <div className="space-y-4 pl-2">
              {grouped.map(([day, daySteps]) => (
                <div key={day}>
                  <p className="text-[9px] font-mono font-bold uppercase tracking-[0.12em] text-violet/60 mb-2">{day}</p>
                  <div className="relative">
                    {daySteps.map((step, idx) => {
                      const globalIdx = steps.indexOf(step);
                      const isLatest = globalIdx === steps.length - 1;
                      const isLastInGroup = idx === daySteps.length - 1;
                      const showConnector = !(isLastInGroup && grouped[grouped.length - 1][0] === day);

                      return (
                        <div key={`${step.label}-${step.timestamp}-${idx}`} className="flex gap-3 pb-3 last:pb-0 relative">
                          {showConnector && (
                            <div
                              className={`absolute left-[7px] top-[18px] bottom-0 w-px ${
                                isLatest && isDelivered ? 'bg-emerald-200' : 'bg-violet/15'
                              }`}
                            />
                          )}
                          <div
                            className={`relative z-10 flex-shrink-0 w-[15px] h-[15px] flex items-center justify-center mt-0.5 rounded-full ${
                              isLatest && isDelivered ? 'bg-emerald-50 seal-dot-active' : isLatest ? 'bg-violet-tint ring-2 ring-violet/10' : ''
                            }`}
                          >
                            {phaseIcon(step.phase, isLatest, isDelivered)}
                          </div>
                          <div className="flex-1 min-w-0 pt-px">
                            <p className={`text-[11px] font-mono leading-snug ${isLatest ? 'text-ink font-semibold' : 'text-ink-muted'}`}>
                              {step.label}
                            </p>
                            <p className="text-[9px] font-mono text-ink-faint mt-0.5">{formatStepTime(step.timestamp)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {hiddenCount > 0 && (
              <button
                type="button"
                onClick={() => setExpanded(v => !v)}
                className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-mono font-semibold transition-colors cursor-pointer bg-violet-tint/50 text-violet border border-violet/10 hover:bg-violet-tint"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="w-3 h-3" />
                    {t.showLess}
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3" />
                    {t.showAll} ({steps.length})
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 border-t border-ink/5 flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {tracking.has_delivery_photo && (
              <span className="inline-flex items-center gap-1 text-[9px] font-mono px-2 py-1 rounded-full bg-white border border-ink/5 text-ink-muted">
                <Camera className="w-3 h-3" />
                {t.photo}
              </span>
            )}
            {tracking.has_delivery_video && (
              <span className="inline-flex items-center gap-1 text-[9px] font-mono px-2 py-1 rounded-full bg-white border border-ink/5 text-ink-muted">
                <Video className="w-3 h-3" />
                {t.video}
              </span>
            )}
          </div>

          <div className="text-right ml-auto">
            {amountValue > 0 && (
              <>
                <p className="text-[9px] font-mono uppercase tracking-[0.14em] text-ink-faint">{t.orderTotal}</p>
                <p className="font-display text-lg font-bold text-violet-deep leading-none">
                  {formatPrice(amountValue, amountCurrency)}
                </p>
              </>
            )}
            {tracking.pnref && (
              <p className="text-[9px] font-mono text-ink-faint mt-1">{t.ref} · {tracking.pnref}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
