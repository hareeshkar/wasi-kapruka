import React, { useState, useEffect } from 'react';
import { AlertCircle, Copy, Check, Share2, ExternalLink, MapPin, Calendar, MessageSquare, User, RefreshCw, Lock, LockOpen } from 'lucide-react';
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
}

const TOTAL_SECS = 3600;
const ARC_R = 22;
const ARC_CIRC = 2 * Math.PI * ARC_R;

export default function OrderConfirmationCard({
  order,
  cart = [],
  currency = 'LKR',
  deliveryMeta,
  onRenew,
  onShare,
}: OrderConfirmationCardProps) {
  const [timeLeft, setTimeLeft] = useState<number>(() => {
    const ms = new Date(order.expires_at).getTime();
    return isNaN(ms) ? 0 : Math.max(0, Math.floor((ms - Date.now()) / 1000));
  });
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    const expiresMs = new Date(order.expires_at).getTime();
    if (isNaN(expiresMs)) {
      setTimeLeft(0);
      return;
    }

    const calc = () => Math.max(0, Math.floor((expiresMs - Date.now()) / 1000));
    setTimeLeft(calc());

    if (calc() <= 0) return; // already expired — no interval needed

    const interval = setInterval(() => {
      const remaining = calc();
      setTimeLeft(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [order.expires_at]);

  const handleCopyLink = () => {
    if (!order.pay_url) return;
    navigator.clipboard.writeText(order.pay_url);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const effectiveCurrency = (order.summary?.currency || currency) as Currency;
  const total = order.total_lkr || order.summary?.grand_total || 0;
  // Prefer MCP summary fields — they're authoritative; computed cart totals are fallback only
  const summaryDeliveryFee = order.summary?.delivery_fee ?? null;
  const summaryAddonsTotal = order.summary?.addons_total ?? null;
  const cartItemsTotal = cart.reduce((s, i) => s + i.price_lkr * i.quantity, 0);
  const deliveryFee = summaryDeliveryFee ?? Math.max(0, total - cartItemsTotal);
  const hasPayUrl = Boolean(order.pay_url);

  // Arc timer derived state
  const progress = Math.min(1, Math.max(0, timeLeft / TOTAL_SECS));
  const dashOffset = ARC_CIRC * (1 - progress);
  const isExpired = timeLeft <= 0;
  const isWarning = timeLeft <= 300 && !isExpired;
  const arcColor = isExpired ? 'rgba(255,255,255,0.15)' : isWarning ? '#F59E0B' : '#7B5EA7';
  const mm = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const ss = (timeLeft % 60).toString().padStart(2, '0');

  // ── Expired state — completely different UI ──────────────────────────────
  if (isExpired) {
    return (
      <div
        className="text-white rounded-2xl overflow-hidden animate-fade-in relative select-none"
        style={{
          background: 'linear-gradient(145deg, #18141E 0%, #0E0C14 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}
      >
        <div className="h-[2px] w-full" style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.1) 0%, transparent 100%)' }} />
        <div className="p-5 space-y-4">
          {/* Expired header */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <LockOpen className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }} />
              <span
                className="text-[9px] font-mono font-bold uppercase tracking-[0.12em] px-2.5 py-1 rounded-full"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.35)',
                }}
              >
                Price lock expired
              </span>
            </div>
            <svg viewBox="0 0 56 56" width="46" height="46" aria-label="Expired">
              <circle cx="28" cy="28" r={ARC_R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
              <text x="28" y="26" textAnchor="middle" dominantBaseline="central"
                fontFamily="'JetBrains Mono', monospace" fontSize="9" fontWeight="700"
                fill="rgba(255,255,255,0.25)">--:--</text>
              <text x="28" y="37" textAnchor="middle" dominantBaseline="central"
                fontFamily="'JetBrains Mono', monospace" fontSize="6.5"
                fill="rgba(255,255,255,0.15)">expired</text>
            </svg>
          </div>

          {/* Dimmed total */}
          <div className="space-y-1">
            <span className="text-[9px] font-mono tracking-[0.15em] uppercase" style={{ color: 'rgba(255,255,255,0.2)' }}>
              Order total
            </span>
            {total > 0 && (
              <p className="font-display leading-none tracking-tight" style={{ fontSize: '1.75rem', color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>
                {formatPrice(total, effectiveCurrency)}
              </p>
            )}
          </div>

          {/* Delivery meta if available */}
          {deliveryMeta?.city && (
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.2)' }} />
              <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.25)' }}>
                {deliveryMeta.recipientName && `${deliveryMeta.recipientName} · `}{deliveryMeta.city}
              </span>
            </div>
          )}

          {/* Renew or info */}
          {onRenew ? (
            <button
              onClick={onRenew}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-mono font-bold text-xs uppercase tracking-wider transition-all duration-150 active:scale-[0.98] cursor-pointer"
              style={{ background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#FCD34D' }}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Re-lock price — new 60 min window
            </button>
          ) : (
            <div
              className="rounded-xl p-3 text-center"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <p className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>
                This order reference has expired.
              </p>
              <p className="text-[10px] font-mono mt-1" style={{ color: 'rgba(255,255,255,0.2)' }}>
                Start a new order in the chat ↑
              </p>
            </div>
          )}

          {/* Footer ref */}
          <div className="pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="text-[8px] font-mono tracking-[0.15em] uppercase mb-0.5" style={{ color: 'rgba(255,255,255,0.15)' }}>Reference</p>
            <p className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.25)' }}>{order.order_ref || '—'}</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Active (non-expired) state ───────────────────────────────────────────
  return (
    <div
      className="text-white rounded-2xl overflow-hidden animate-fade-in relative select-none"
      style={{
        background: 'linear-gradient(145deg, #1A1228 0%, #0F0C1E 50%, #0D0A18 100%)',
        border: '1px solid rgba(123, 94, 167, 0.25)',
        boxShadow: '0 20px 60px rgba(13, 10, 24, 0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}
    >
      {/* Subtle diagonal texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{ backgroundImage: 'repeating-linear-gradient(45deg, #ffffff 0px, #ffffff 1px, transparent 1px, transparent 10px)' }}
      />

      {/* Top accent line */}
      <div className="h-[2px] w-full" style={{ background: 'linear-gradient(90deg, #402970 0%, #7B5EA7 60%, transparent 100%)' }} />

      <div className="p-5 space-y-4 relative">

        {/* ── Header: status badge + arc timer ─────────────────────────── */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isWarning ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400 animate-pulse'}`} />
            <span
              className="text-[9px] font-mono font-bold uppercase tracking-[0.12em] px-2.5 py-1 rounded-full"
              style={{
                background: isWarning ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                border: isWarning ? '1px solid rgba(245, 158, 11, 0.2)' : '1px solid rgba(16, 185, 129, 0.2)',
                color: isWarning ? '#FCD34D' : '#6EE7B7',
              }}
            >
              <Lock className="w-2.5 h-2.5 inline-block mr-1 opacity-70" />
              {isWarning ? 'Expiring soon' : 'Payment lock active'}
            </span>
          </div>

          {/* Depleting arc timer */}
          <div className="flex-shrink-0 relative" style={{ width: 54, height: 54 }}>
            <svg viewBox="0 0 56 56" width="54" height="54" aria-label={`${mm}:${ss} remaining`}>
              <circle cx="28" cy="28" r={ARC_R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="2.5" />
              <circle
                cx="28" cy="28" r={ARC_R} fill="none"
                stroke={arcColor}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={`${ARC_CIRC} ${ARC_CIRC}`}
                strokeDashoffset={dashOffset}
                transform="rotate(-90 28 28)"
                style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease' }}
              />
              <text x="28" y="26" textAnchor="middle" dominantBaseline="central"
                fontFamily="'JetBrains Mono', monospace" fontSize="9.5" fontWeight="700"
                fill={isWarning ? '#F59E0B' : 'rgba(255,255,255,0.85)'}
                style={{ transition: 'fill 0.5s ease' }}>
                {mm}:{ss}
              </text>
              <text x="28" y="37" textAnchor="middle" dominantBaseline="central"
                fontFamily="'JetBrains Mono', monospace" fontSize="6.5" fill="rgba(255,255,255,0.3)">
                left
              </text>
            </svg>
          </div>
        </div>

        {/* ── Total amount ──────────────────────────────────────────────── */}
        <div className="space-y-1 pt-1">
          <span className="text-[9px] font-mono tracking-[0.15em] uppercase" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Locked total
          </span>
          {total > 0 ? (
            <p className="font-display leading-none tracking-tight" style={{ fontSize: '2rem', color: '#E8C96B', fontWeight: 600 }}>
              {formatPrice(total, effectiveCurrency)}
            </p>
          ) : (
            <p className="font-mono text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Calculating…</p>
          )}
        </div>

        {/* ── Item breakdown (only when cart has real ordered items) ────── */}
        {cart.length > 0 && (
          <div
            className="rounded-xl p-3 space-y-2"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            {cart.map((item, i) => (
              <div key={`${item.product_code}-${i}`} className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono truncate" style={{ color: 'rgba(255,255,255,0.6)', maxWidth: '60%' }}>
                  {item.name}
                </span>
                <span className="flex-1 border-b border-dashed border-white/10 mx-1 mb-0.5" />
                <span className="text-[10px] font-mono flex-shrink-0" style={{ color: 'rgba(255,255,255,0.75)' }}>
                  {item.quantity > 1 && <span className="opacity-50 mr-1">×{item.quantity}</span>}
                  {formatPrice(item.price_lkr * item.quantity, (item.currency || currency) as Currency)}
                </span>
              </div>
            ))}
            {(deliveryFee > 0 || summaryAddonsTotal != null) && (
              <div className="pt-2 space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                {deliveryFee > 0 && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.4)' }}>Delivery</span>
                    <span className="flex-1 border-b border-dashed border-white/10 mx-1 mb-0.5" />
                    <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      {formatPrice(deliveryFee, effectiveCurrency)}
                    </span>
                  </div>
                )}
                {summaryAddonsTotal != null && summaryAddonsTotal > 0 && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.4)' }}>Add-ons</span>
                    <span className="flex-1 border-b border-dashed border-white/10 mx-1 mb-0.5" />
                    <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      {formatPrice(summaryAddonsTotal, effectiveCurrency)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Delivery meta — recipient, date, city, gift message ───────── */}
        {deliveryMeta && (deliveryMeta.recipientName || deliveryMeta.city || deliveryMeta.deliveryDate || deliveryMeta.giftMessage) && (
          <div
            className="rounded-xl p-3 space-y-2"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            {/* Sender → Recipient */}
            {(deliveryMeta.recipientName || deliveryMeta.senderName) && (
              <div className="flex items-center gap-2">
                <User className="w-3 h-3 flex-shrink-0" style={{ color: '#7B5EA7' }} />
                <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {deliveryMeta.senderName && (
                    <span className="opacity-60">{deliveryMeta.senderName} → </span>
                  )}
                  {deliveryMeta.recipientName
                    ? <span style={{ color: '#E8C96B' }}>{deliveryMeta.recipientName}</span>
                    : <span className="opacity-40 italic">Recipient pending</span>}
                </span>
              </div>
            )}
            {/* City + Date */}
            {(deliveryMeta.city || deliveryMeta.deliveryDate) && (
              <div className="flex items-center gap-4 flex-wrap">
                {deliveryMeta.city && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 flex-shrink-0" style={{ color: '#7B5EA7' }} />
                    <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.6)' }}>
                      {deliveryMeta.city}
                    </span>
                  </div>
                )}
                {deliveryMeta.deliveryDate && (() => {
                  const d = new Date(deliveryMeta.deliveryDate!);
                  const dateStr = isNaN(d.getTime())
                    ? deliveryMeta.deliveryDate
                    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                  return (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 flex-shrink-0" style={{ color: '#7B5EA7' }} />
                      <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.6)' }}>
                        {dateStr}
                      </span>
                    </div>
                  );
                })()}
              </div>
            )}
            {/* Gift message preview */}
            {deliveryMeta.giftMessage && (
              <div className="flex items-start gap-1.5">
                <MessageSquare className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: '#7B5EA7' }} />
                <p className="text-[10px] font-mono italic leading-relaxed line-clamp-2"
                  style={{ color: 'rgba(255,255,255,0.4)' }}>
                  "{deliveryMeta.giftMessage.length > 90
                    ? deliveryMeta.giftMessage.slice(0, 90) + '…'
                    : deliveryMeta.giftMessage}"
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Renewal warning (T-5min, only while active) ───────────────── */}
        {isWarning && (
          <div
            className="rounded-xl p-3 space-y-2"
            style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)' }}
          >
            <p className="flex items-center gap-1.5 text-[11px] font-mono font-medium" style={{ color: '#FCD34D' }}>
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              Price lock expires in less than 5 min
            </p>
            {onRenew && (
              <button
                onClick={onRenew}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer"
                style={{ background: '#F59E0B', color: '#1C1400' }}
              >
                <RefreshCw className="w-3 h-3" />
                Renew price lock — 60 mins
              </button>
            )}
          </div>
        )}

        {/* ── Primary CTA ───────────────────────────────────────────────── */}
        <div className="space-y-2 pt-1">
          {hasPayUrl ? (
            <button
              type="button"
              onClick={() => window.open(order.pay_url, '_blank', 'noopener,noreferrer')}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-display font-semibold text-sm text-white transition-all duration-150 active:scale-[0.98] cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, #402970 0%, #5B3E8A 100%)',
                border: '1px solid rgba(123, 94, 167, 0.4)',
                boxShadow: '0 4px 16px rgba(64, 41, 112, 0.4)',
              }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 6px 24px rgba(64, 41, 112, 0.6)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(64, 41, 112, 0.4)')}
            >
              <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
              Complete payment on Kapruka
            </button>
          ) : (
            <div
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-mono"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)' }}
            >
              Payment link unavailable
            </div>
          )}

          {/* Secondary row: copy + share */}
          <div className={`grid gap-2 ${onShare ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <button
              type="button"
              onClick={handleCopyLink}
              disabled={!hasPayUrl}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-[11px] font-mono font-semibold transition-all duration-150 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: copySuccess ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255,255,255,0.06)',
                border: copySuccess ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255,255,255,0.1)',
                color: copySuccess ? '#6EE7B7' : 'rgba(255,255,255,0.65)',
              }}
            >
              {copySuccess ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copySuccess ? 'Copied!' : 'Copy link'}
            </button>

            {onShare && (
              <button
                type="button"
                onClick={onShare}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-[11px] font-mono font-semibold transition-all duration-150 cursor-pointer"
                style={{
                  background: 'rgba(232, 201, 107, 0.08)',
                  border: '1px solid rgba(232, 201, 107, 0.2)',
                  color: '#E8C96B',
                }}
              >
                <Share2 className="w-3.5 h-3.5" />
                Share gift card
              </button>
            )}
          </div>
        </div>

        {/* ── Footer: reference ID ───────────────────────────────────────── */}
        <div className="pt-3 flex justify-between items-center" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <div>
            <p className="text-[8px] font-mono tracking-[0.15em] uppercase mb-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>
              Reference
            </p>
            <p className="text-[11px] font-mono font-bold tracking-[0.12em]" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {order.order_ref || '—'}
            </p>
          </div>
          <div className="text-[8px] font-mono tracking-[0.08em] text-right" style={{ color: 'rgba(255,255,255,0.2)' }}>
            <p>Powered by</p>
            <p className="font-bold" style={{ color: 'rgba(255,255,255,0.35)' }}>KAPRUKA</p>
          </div>
        </div>

      </div>
    </div>
  );
}
