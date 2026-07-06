import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Product, ProductVariant } from '../types';
import { Plus, Check, Eye } from 'lucide-react';
import { formatPrice, detectCurrency, type Currency } from '../lib/currency';
import { KAPRUKA } from '../lib/kapruka';

interface ProductCardProps {
  product: Product;
  onAddToBundle: (product: Product, variant?: ProductVariant) => void;
  onViewDetails?: (productCode: string) => void;
  lang?: 'en' | 'si' | 'ta';
  compact?: boolean;
  accentSide?: 'left' | 'right';
  isAdded?: boolean;
}

const L = {
  add:     { en: 'Add to Bundle',   si: 'තෑග්ගට',      ta: 'சேர்க்க' },
  added:   { en: 'Added',           si: 'එකතු කළා',    ta: 'சேர்ந்தது' },
  details: { en: 'Details',         si: 'විස්තර',       ta: 'விவரம்' },
};
const t = (k: keyof typeof L, lang: 'en' | 'si' | 'ta') => L[k][lang] ?? L[k].en;

// ── LazyImage: IntersectionObserver + blur-up fade ─────────────────────────
function LazyImage({ src, alt, className, style }: { src: string; alt: string; className?: string; style?: React.CSSProperties }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect(); } },
      { rootMargin: '200px' }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  const onLoad = useCallback(() => setLoaded(true), []);
  const onError = useCallback(() => { setLoaded(true); setError(true); }, []);

  return (
    <div ref={ref} className={className} style={{ ...style, background: 'linear-gradient(135deg, #f0ecf5 0%, #e8e4ef 100%)' }}>
      {/* Kapruka logo watermark — always visible until image loads */}
      {!loaded && (
        <img
          src={KAPRUKA.logo}
          alt=""
          draggable={false}
          style={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '40%', height: 'auto',
            opacity: 0.18,
            pointerEvents: 'none',
          }}
        />
      )}
      {inView && (
        <img
          src={error ? KAPRUKA.logo : src}
          alt={alt}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={onLoad}
          onError={onError}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: error ? 'contain' : 'cover',
            opacity: loaded ? 1 : 0,
            transition: 'opacity 0.3s ease',
            padding: error ? '20%' : 0,
          }}
        />
      )}
    </div>
  );
}

export default function ProductCard({ product, onAddToBundle, onViewDetails, lang = 'en', compact = false, accentSide = 'right', isAdded: isAddedProp }: ProductCardProps) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>(
    product.variants?.length ? product.variants[0] : undefined
  );
  const [isAddedLocal, setIsAddedLocal] = useState(false);

  // Use prop if provided, otherwise use local state
  const isAdded = isAddedProp ?? isAddedLocal;

  // Reset local state when product changes
  useEffect(() => { setIsAddedLocal(false); }, [product.product_code]);

  const handleAdd = () => {
    if (isAdded) return;
    onAddToBundle(product, selectedVariant);
    setIsAddedLocal(true);
  };

  const price = selectedVariant ? selectedVariant.price_lkr : product.price_lkr;
  const hasSale = product.compare_at_price && product.compare_at_price > price;
  const currency: Currency = detectCurrency(product) as Currency;

  const accentClass = accentSide === 'left' ? 'accent-line-left' : 'accent-line-right';

  if (compact) {
    // Compact: editorial card for chat product strips
    return (
      <div
        className={`product-card-hover relative flex-shrink-0 overflow-hidden cursor-pointer animate-fade-in ${accentClass}`}
        style={{
          width: 'min(175px, 42vw)',
          aspectRatio: '3 / 5',
          borderRadius: 14,
          boxShadow: '0 4px 20px rgba(64,41,112,0.12), 0 1px 4px rgba(0,0,0,0.06)',
        }}
      >
        {/* Full-bleed product image */}
        <LazyImage
          src={product.image_url}
          alt={product.name}
          className="absolute inset-0 w-full h-full"
        />

        {/* Violet gradient veil */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to top, #1E0E45 0%, rgba(64,41,112,0.55) 40%, rgba(64,41,112,0.08) 70%, transparent 100%)',
          }}
        />

        {/* Top badges — category left, sale + price stacked right so they never collide */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between gap-1 z-10">
          <span
            className="text-[8px] font-semibold font-mono uppercase tracking-wider px-2 py-0.5 rounded-full"
            style={{
              background: 'rgba(255,255,255,0.12)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.88)',
            }}
          >
            {product.category}
          </span>

          <div className="flex flex-col items-end gap-1">
            {hasSale && (
              <span className="text-[8px] font-bold bg-error text-white px-1.5 py-0.5 rounded-full">
                SALE
              </span>
            )}
            <div
              className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md"
              style={{
                background: '#ffffff',
                color: '#1E0E45',
                boxShadow: '0 2px 6px rgba(64,41,112,0.18)',
              }}
            >
              {formatPrice(price, currency)}
            </div>
          </div>
        </div>

        {/* Bottom overlay — name + CTAs */}
        <div className="absolute bottom-0 left-0 right-0 z-10 p-3 flex flex-col gap-2">
          <h3 className="text-white text-[12px] font-semibold leading-tight line-clamp-2 drop-shadow-sm">
            {product.name}
          </h3>

          {/* Add to bundle */}
          <button
            onClick={handleAdd}
            disabled={isAdded}
            className="w-full h-9 min-h-[36px] rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer"
            style={isAdded ? {
              background: 'rgba(255,255,255,0.12)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.20)',
              color: 'rgba(255,255,255,0.80)',
            } : {
              background: '#402970',
              color: '#ffffff',
              boxShadow: '0 3px 12px rgba(64,41,112,0.40)',
            }}
          >
            {isAdded ? (
              <><Check className="w-3 h-3 stroke-[2.5]" />{t('added', lang)}</>
            ) : (
              <><Plus className="w-3 h-3 stroke-[2.5]" />{t('add', lang)}</>
            )}
          </button>

          {/* Details */}
          {onViewDetails && (
            <button
              onClick={(e) => { e.stopPropagation(); onViewDetails(product.product_code); }}
              className="w-full h-8 min-h-[36px] rounded-lg text-[10px] font-medium flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: 'rgba(255,255,255,0.65)',
              }}
            >
              <Eye className="w-2.5 h-2.5" />{t('details', lang)}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Standard: editorial card for discovery/browse
  return (
    <div
      className={`card-spring flex flex-col bg-white overflow-hidden flex-shrink-0 animate-fade-in select-none ${accentClass}`}
      style={{
        width: 'min(230px, 42vw)',
        borderRadius: 14,
        boxShadow: 'var(--shadow-card)',
        border: '1px solid rgba(64,41,112,0.06)',
      }}
    >
      {/* Image */}
      <div className="relative overflow-hidden" style={{ aspectRatio: '4/3' }}>
        <LazyImage
          src={product.image_url}
          alt={product.name}
          className="absolute inset-0 w-full h-full"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

        {/* Category badge */}
        <div className="absolute top-2.5 left-2.5">
          <span className="text-[8px] font-semibold font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-violet text-white">
            {product.category}
          </span>
        </div>

        {/* Sale */}
        {hasSale && (
          <div className="absolute top-2.5 right-2.5">
            <span className="text-[8px] font-bold bg-error text-white px-1.5 py-0.5 rounded-full">SALE</span>
          </div>
        )}

        {/* Price */}
        <div className="absolute bottom-2.5 right-2.5 bg-white rounded-lg px-2.5 py-1.5" style={{ boxShadow: '0 2px 8px rgba(64,41,112,0.15)' }}>
          {hasSale && (
            <p className="text-[8px] font-mono text-ink-faint line-through leading-none">
              {formatPrice(product.compare_at_price!, currency)}
            </p>
          )}
          <p className="text-[13px] font-mono font-bold text-ink leading-none">
          {formatPrice(price, currency)}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col p-3 gap-2">
        <h3 className="font-semibold text-ink text-[13px] leading-snug line-clamp-2">
          {product.name}
        </h3>

        {/* Variants */}
        {product.variants && product.variants.length > 1 && (
          <div className="flex gap-1 flex-wrap">
            {product.variants.slice(0, 4).map((v) => (
              <button
                key={v.id}
                onClick={() => setSelectedVariant(v)}
                className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded-md border cursor-pointer transition-all ${
                  selectedVariant?.id === v.id
                    ? 'bg-violet text-white border-violet'
                    : 'bg-white border-violet/15 text-violet hover:border-violet/40'
                }`}
              >
                {v.name}
              </button>
            ))}
          </div>
        )}

        {product.url && (
          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[9px] text-violet underline underline-offset-2 font-mono hover:text-violet-deep transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            View on Kapruka ↗
          </a>
        )}

        <button
          onClick={handleAdd}
          disabled={isAdded}
          className={`mt-auto w-full py-3 min-h-[44px] px-3 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-[0.97] ${
            isAdded
              ? 'bg-violet-tint text-violet border border-violet/15'
              : 'bg-violet hover:bg-violet-deep text-white'
          }`}
          style={!isAdded ? { boxShadow: '0 3px 12px rgba(64,41,112,0.30)' } : undefined}
        >
          {isAdded ? (
            <><Check className="w-3 h-3 stroke-[2.5]" />{t('added', lang)}</>
          ) : (
            <><Plus className="w-3 h-3 stroke-[2.5]" />{t('add', lang)}</>
          )}
        </button>

        {onViewDetails && (
          <button
            onClick={() => onViewDetails(product.product_code)}
            className="w-full py-2.5 min-h-[40px] rounded-lg text-[10px] font-medium flex items-center justify-center gap-1 cursor-pointer transition-all border border-violet/10 text-violet hover:bg-violet-tint active:scale-[0.98]"
          >
            <Eye className="w-2.5 h-2.5" />{t('details', lang)}
          </button>
        )}
      </div>
    </div>
  );
}
