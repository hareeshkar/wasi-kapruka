import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X, ChevronLeft, ChevronRight, Check, Plus, ExternalLink,
  Package, Globe, Truck, Scale, Building2, Tag, AlertTriangle,
  ShieldCheck, Hash,
} from 'lucide-react';
import { formatPrice, getCurrencySymbol, detectCurrency, type Currency } from '../lib/currency';
import { Product, ProductVariant } from '../types';

interface Props {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onAddToBundle: (product: Product, variant?: ProductVariant) => void;
  isAdded: boolean;
  lang?: 'en' | 'si' | 'ta';
}

const L: Record<string, Record<string, string>> = {
  add:        { en: 'Add to Bundle',    si: 'Bundle එකට දාන්න', ta: 'தொகுப்பில் சேர்க்க' },
  added:      { en: 'Added',            si: 'දැම්මා',            ta: 'சேர்த்தாச்சு' },
  kapruka:    { en: 'View on Kapruka',  si: 'Kapruka වල බලන්න',  ta: 'Kapruka-ல் பாரு' },
  low:        { en: 'Low Stock',        si: 'ස්වල්පයයි',        ta: 'குறைவு' },
  out:        { en: 'Out of Stock',     si: 'නැත',              ta: 'இல்லை' },
  instock:    { en: 'In Stock',         si: 'ඇත',              ta: 'இருக்கிறது' },
  about:      { en: 'About',            si: 'ගැන',              ta: 'பற்றி' },
  specs:      { en: 'Specifications',   si: 'විශේෂාංග',         ta: 'விவரக்குறிப்புகள்' },
  productinfo:{ en: 'Product Info',     si: 'නිෂ්පාදන තොරතුරු',  ta: 'தயாரிப்பு தகவல்' },
  delivery:   { en: 'Delivery',         si: 'බෙදාහැරීම',       ta: 'டெலிவரி' },
  weight:     { en: 'Weight',           si: 'බර',              ta: 'எடை' },
  vendor:     { en: 'Sold by',          si: 'විකිණීම',         ta: 'விற்பனை' },
  category:   { en: 'Category',         si: 'වර්ගය',           ta: 'வகை' },
  sku:        { en: 'SKU',              si: 'SKU',             ta: 'SKU' },
  origin:     { en: 'Ships from',       si: 'සිට',             ta: 'இருந்து' },
  worldwide:  { en: 'Ships worldwide',  si: 'ලොව පුරා',        ta: 'உலகளாவிய' },
  options:    { en: 'Options',          si: 'විකල්ප',          ta: 'விருப்பங்கள்' },
  readmore:   { en: 'Show more',        si: 'තව',              ta: 'மேலும்' },
  readless:   { en: 'Show less',        si: 'අඩු',             ta: 'குறைவாக' },
  restricted: { en: 'Not available in', si: 'ලබාගත නොහැකිය',  ta: 'கிடைக்காது' },
};

// ─── Description parser ──────────────────────────────────────────────────────
// Kapruka descriptions embed spec pairs as "Key: value" inside a prose blob.
const SPEC_KEYS = [
  'Composition','Toppings','Flavors','Flavor','Filling','Decoration',
  'Ingredients','Size','Material','Color','Dimensions','Quantity',
  'Contains','Includes','Base','Type',
];

interface Parsed { intro: string; specs: Array<{ key: string; value: string }> }

function parseDescription(raw: string): Parsed {
  if (!raw) return { intro: '', specs: [] };

  let t = raw.replace(/\s+/g, ' ').trim();

  // Strip leading product-code token (6+ uppercase alphanum)
  t = t.replace(/^[A-Z0-9]{5,}\s+/, '');

  // Remove embedded weight sentences (weight is in attributes)
  t = t.replace(/Weight:\s*[\d.]+\s*(?:Lbs?|KG|kg)[\s()0-9A-Za-z.]*/gi, ' ');

  // Remove store+category echoes: "Kapruka Cakes Cakes", "Kapruka Flowers"
  t = t.replace(/Kapruka\s+(\w+)\s+\1/gi, '');
  t = t.replace(/Kapruka\s+(?:Cakes?|Flowers?|Chocolates?|Hampers?|Gifts?)\s*/gi, '');

  // Extract spec key:value pairs
  const specs: Array<{ key: string; value: string }> = [];
  const lookahead = SPEC_KEYS.join('|');
  for (const key of SPEC_KEYS) {
    const re = new RegExp(
      `\\b${key}:\\s*([\\s\\S]*?)(?=\\s+(?:${lookahead}):|Enjoy\\b|$)`,
      'i',
    );
    const m = re.exec(t);
    if (m) {
      const val = m[1].replace(/\s+/g, ' ').trim().replace(/^[,\s]+|[,\s]+$/g, '');
      if (val.length > 1) {
        specs.push({ key, value: val });
        t = t.replace(m[0], ' ');
      }
    }
  }

  const intro = t.replace(/\s{2,}/g, ' ').trim().replace(/^[,\s.]+/, '');
  return { intro, specs };
}

const COUNTRY: Record<string, string> = {
  LK: 'Sri Lanka', US: 'USA', GB: 'United Kingdom',
  AU: 'Australia', CA: 'Canada', IN: 'India', SG: 'Singapore', AE: 'UAE',
};
const countryName = (c: string) => COUNTRY[c] ?? c;

function useSwipe(onNext: () => void, onPrev: () => void) {
  const startX = useRef<number | null>(null);
  return {
    onTouchStart: (e: React.TouchEvent) => { startX.current = e.touches[0].clientX; },
    onTouchEnd:   (e: React.TouchEvent) => {
      if (startX.current === null) return;
      const dx = e.changedTouches[0].clientX - startX.current;
      if (Math.abs(dx) > 44) dx < 0 ? onNext() : onPrev();
      startX.current = null;
    },
  };
}

export default function ProductDetailModal({
  product, isOpen, onClose, onAddToBundle, isAdded, lang = 'en',
}: Props) {
  const t = useCallback((k: string) => L[k]?.[lang] ?? L[k]?.en ?? k, [lang]);

  const images: string[] = product.images?.length
    ? product.images
    : product.image_url ? [product.image_url] : [];

  const [imgIdx,   setImgIdx]   = useState(0);
  const [imgErrs,  setImgErrs]  = useState<Set<number>>(new Set());
  const [expanded, setExpanded] = useState(false);
  const [variant,  setVariant]  = useState<ProductVariant | null>(product.variants?.[0] ?? null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setImgIdx(0); setImgErrs(new Set()); setExpanded(false);
    setVariant(product.variants?.[0] ?? null);
    contentRef.current?.scrollTo({ top: 0 });
  }, [product.product_code]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape')      onClose();
      if (e.key === 'ArrowLeft')   setImgIdx(i => Math.max(0, i - 1));
      if (e.key === 'ArrowRight')  setImgIdx(i => Math.min(images.length - 1, i + 1));
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isOpen, onClose, images.length]);

  const swipe = useSwipe(
    () => setImgIdx(i => Math.min(images.length - 1, i + 1)),
    () => setImgIdx(i => Math.max(0, i - 1)),
  );

  if (!isOpen) return null;

  // ── Derived values from MCP payload ──────────────────────────────────────
  const price           = variant?.price_lkr ?? product.price_lkr;
  const currSymbol      = getCurrencySymbol(detectCurrency(product) as Currency);
  const comparePrice    = product.compare_at_price;
  const discountPct     = comparePrice && comparePrice > price
    ? Math.round((1 - price / comparePrice) * 100) : null;

  const inStock         = variant ? variant.in_stock !== false : product.in_stock !== false;
  const stockLevel      = variant?.stock_level ?? product.stock_level;
  const outOfStock      = !inStock;

  const rawWeight       = variant?.attributes?.weight ?? product.attributes?.weight;
  const weightKg        = rawWeight ? parseFloat(rawWeight) : null;
  const weightLbs       = weightKg ? (weightKg * 2.20462).toFixed(2) : null;

  // Clean vendor: "Kapruka Cakes Cake" → trim trailing duplicate word
  const vendor = product.attributes?.vendor
    ?.replace(/(\b\w+)\s+\1$/i, '$1').trim() ?? null;

  const catRaw  = product.category ?? '';
  const catName = catRaw.charAt(0).toUpperCase() + catRaw.slice(1).toLowerCase();
  const sku     = product.variants?.[0]?.sku ?? null;

  const shipsFrom           = product.shipping?.ships_from ?? null;
  const shipsIntl           = product.shipping?.ships_internationally ?? false;
  const restrictedCountries = product.shipping?.restricted_countries ?? [];

  const meaningfulVariants  = (product.variants ?? []).filter(
    v => !(product.variants!.length === 1 && v.name.toLowerCase() === 'default'),
  );

  const { intro, specs } = parseDescription(product.description ?? product.summary ?? '');
  const INTRO_LIMIT = 240;
  const introCapped   = intro.length > INTRO_LIMIT;
  const displayIntro  = introCapped && !expanded ? intro.slice(0, INTRO_LIMIT) + '…' : intro;

  const stockBadge =
    outOfStock       ? { label: t('out'),     bg: '#FEF2F2', text: '#DC2626', dot: '#DC2626' } :
    stockLevel === 'low' || stockLevel === 'medium'
                     ? { label: t('low'),     bg: '#FFFBEB', text: '#D97706', dot: '#F59E0B' } :
                       { label: t('instock'), bg: '#F0FDF4', text: '#16A34A', dot: '#22C55E' };

  const validImg = images[imgIdx] && !imgErrs.has(imgIdx);

  return (
    /* ── Overlay ───────────────────────────────────────────────────────────── */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={product.name}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal card — bottom sheet on mobile, centered on desktop */}
      <div
        className="relative w-full flex flex-col bg-white sm:rounded-2xl overflow-hidden animate-fade-in rounded-t-2xl sm:rounded-t-2xl"
        style={{
          maxWidth: 520,
          maxHeight: '92dvh',
          boxShadow: '0 24px 80px rgba(64,41,112,0.18), 0 0 0 1px rgba(0,0,0,0.04)',
        }}
      >

        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center pt-2 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* GALLERY */}
        <div className="flex-shrink-0" {...swipe}>

          {/* Main image — square, object-contain, neutral bg */}
          <div
            className="relative w-full bg-[#F7F8F7]"
            style={{ aspectRatio: '1 / 1', maxHeight: 300 }}
          >
            {validImg ? (
              <img
                key={imgIdx}
                src={images[imgIdx]}
                alt={product.name}
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full animate-fade-in"
                style={{ objectFit: 'contain', padding: 16 }}
                onError={() => setImgErrs(p => new Set(p).add(imgIdx))}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Package className="w-14 h-14 text-gray-200" />
              </div>
            )}

            {/* Prev / Next */}
            {images.length > 1 && (
              <>
                <button
                  onClick={() => setImgIdx(i => Math.max(0, i - 1))}
                  disabled={imgIdx === 0}
                  aria-label="Previous image"
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/90 shadow-md flex items-center justify-center cursor-pointer transition-all hover:bg-white disabled:opacity-20"
                >
                  <ChevronLeft className="w-4 h-4 text-[#2D1B69]" />
                </button>
                <button
                  onClick={() => setImgIdx(i => Math.min(images.length - 1, i + 1))}
                  disabled={imgIdx === images.length - 1}
                  aria-label="Next image"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/90 shadow-md flex items-center justify-center cursor-pointer transition-all hover:bg-white disabled:opacity-20"
                >
                  <ChevronRight className="w-4 h-4 text-[#2D1B69]" />
                </button>
              </>
            )}

            {/* Image counter */}
            {images.length > 1 && (
              <div className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold text-white bg-black/40 backdrop-blur-sm">
                {imgIdx + 1} / {images.length}
              </div>
            )}

            {/* Sale badge */}
            {discountPct && (
              <div className="absolute top-3 right-10 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                -{discountPct}%
              </div>
            )}
          </div>

          {/* Thumbnail strip */}
          {images.length > 1 && (
            <div
              className="flex gap-2 px-4 py-2.5 border-b border-gray-100 overflow-x-auto scrollbar-none"
              style={{ background: '#FAFAFA' }}
            >
              {images.map((url, i) => (
                <button
                  key={i}
                  onClick={() => setImgIdx(i)}
                  aria-label={`Thumbnail ${i + 1}`}
                  className="flex-shrink-0 rounded-xl overflow-hidden cursor-pointer transition-all bg-white"
                  style={{
                    width: 48, height: 48,
                    border: i === imgIdx
                      ? '2.5px solid #402970'
                      : '2px solid #E5E7EB',
                    opacity: i === imgIdx ? 1 : 0.55,
                    transform: i === imgIdx ? 'scale(1.06)' : 'scale(1)',
                  }}
                >
                  {!imgErrs.has(i) ? (
                    <img
                      src={url} alt=""
                      loading="lazy"
                      className="w-full h-full"
                      style={{ objectFit: 'contain', padding: 4 }}
                      onError={() => setImgErrs(p => new Set(p).add(i))}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-50">
                      <Package className="w-4 h-4 text-gray-300" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all hover:bg-black/10"
          style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(4px)', boxShadow: '0 1px 4px rgba(0,0,0,0.12)' }}
        >
          <X className="w-4 h-4 text-gray-700" />
        </button>

        {/* ── SCROLLABLE CONTENT ────────────────────────────────────────────── */}
        <div ref={contentRef} className="flex-1 overflow-y-auto overscroll-contain">
          <div className="px-5 pt-4 pb-3 space-y-4">

            {/* ── Name, badges, price ──────────────────────────────────────── */}
            <div className="space-y-2.5">

              {/* Badges */}
              <div className="flex flex-wrap items-center gap-1.5">
                {catName && (
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold font-mono uppercase tracking-[0.18em] px-2.5 py-1 rounded-full bg-[#402970]/8 text-[#402970] border border-[#402970]/15">
                    <Tag className="w-2.5 h-2.5" />{catName}
                  </span>
                )}
                <span
                  className="inline-flex items-center gap-1.5 text-[9px] font-bold font-mono uppercase tracking-[0.15em] px-2.5 py-1 rounded-full"
                  style={{ background: stockBadge.bg, color: stockBadge.text }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: stockBadge.dot }} />
                  {stockBadge.label}
                </span>
                {shipsIntl && (
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold font-mono uppercase tracking-[0.15em] px-2.5 py-1 rounded-full bg-sky-50 text-sky-600 border border-sky-200">
                    <Globe className="w-2.5 h-2.5" />Worldwide
                  </span>
                )}
              </div>

              {/* Product name */}
              <h2 className="font-display text-[17px] font-bold text-[#2D1B69] leading-snug tracking-tight">
                {product.name}
              </h2>

              {/* Price row */}
              <div className="flex items-center gap-2.5">
                <span className="text-xl font-black font-mono text-violet">
                  {formatPrice(price, detectCurrency(product) as Currency)}
                </span>
                {comparePrice && comparePrice > price && (
                  <span className="text-sm font-mono text-gray-400 line-through">
                    {formatPrice(comparePrice, detectCurrency(product) as Currency)}
                  </span>
                )}
              </div>
            </div>

            <Divider />

            {/* ── About / description ──────────────────────────────────────── */}
            {intro && (
              <section className="space-y-2">
                <SectionLabel>{t('about')}</SectionLabel>
                <p className="text-[13px] text-gray-600 leading-relaxed">{displayIntro}</p>
                {introCapped && (
                  <button
                    onClick={() => setExpanded(e => !e)}
                    className="text-[11px] font-semibold text-[#402970] underline underline-offset-2 cursor-pointer"
                  >
                    {expanded ? t('readless') : t('readmore')}
                  </button>
                )}
              </section>
            )}

            {/* ── Parsed spec key:value pairs from description ─────────────── */}
            {specs.length > 0 && (
              <section className="space-y-2">
                <SectionLabel>{t('specs')}</SectionLabel>
                <div className="rounded-2xl overflow-hidden border border-gray-100 divide-y divide-gray-100">
                  {specs.map(({ key, value }) => (
                    <div key={key} className="flex gap-3 px-3.5 py-2.5 bg-gray-50/70">
                      <span className="text-[9px] font-bold font-mono uppercase tracking-[0.13em] text-gray-400 pt-0.5 w-24 flex-shrink-0">
                        {key}
                      </span>
                      <span className="text-[12px] text-gray-700 leading-snug flex-1">{value}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Variant picker — only for multiple real options ───────────── */}
            {meaningfulVariants.length > 1 && (
              <section className="space-y-2">
                <SectionLabel>{t('options')}</SectionLabel>
                <div className="flex flex-wrap gap-2">
                  {meaningfulVariants.map(v => {
                    const sel  = variant?.id === v.id;
                    const vOut = v.in_stock === false;
                    return (
                      <button
                        key={v.id}
                        onClick={() => !vOut && setVariant(v)}
                        disabled={vOut}
                        className="flex flex-col items-start px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs font-semibold cursor-pointer transition-all border"
                        style={{
                          background:  sel ? '#2D1B69' : vOut ? '#F9FAFB' : '#F7FAF9',
                          color:       sel ? '#fff'    : vOut ? '#9CA3AF' : '#374151',
                          borderColor: sel ? '#2D1B69' : vOut ? '#E5E7EB' : 'rgba(64,41,112,0.2)',
                          textDecoration: vOut ? 'line-through' : 'none',
                          cursor: vOut ? 'not-allowed' : 'pointer',
                        }}
                      >
                        <span>{v.name}</span>
                        {v.price_lkr !== product.price_lkr && (
                          <span className="text-[10px] opacity-70">
                            {formatPrice(v.price_lkr, detectCurrency(product) as Currency)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ── Product Info: all MCP attribute fields ───────────────────── */}
            {(weightKg !== null || vendor || catName || sku) && (
              <section className="space-y-2">
                <SectionLabel>{t('productinfo')}</SectionLabel>
                <div className="rounded-2xl overflow-hidden border border-gray-100 divide-y divide-gray-100">
                  {weightKg !== null && (
                    <InfoRow icon={<Scale className="w-3.5 h-3.5" />} label={t('weight')}>
                      {weightKg.toFixed(2)} kg&nbsp;
                      <span className="text-gray-400 text-[11px]">({weightLbs} lbs)</span>
                    </InfoRow>
                  )}
                  {vendor && (
                    <InfoRow icon={<Building2 className="w-3.5 h-3.5" />} label={t('vendor')}>
                      {vendor}
                    </InfoRow>
                  )}
                  {catName && (
                    <InfoRow icon={<Tag className="w-3.5 h-3.5" />} label={t('category')}>
                      {catName}
                    </InfoRow>
                  )}
                  {sku && (
                    <InfoRow icon={<Hash className="w-3.5 h-3.5" />} label={t('sku')}>
                      <span className="font-mono text-gray-500 text-[11px]">{sku}</span>
                    </InfoRow>
                  )}
                </div>
              </section>
            )}

            {/* ── Delivery / shipping ───────────────────────────────────────── */}
            {(shipsFrom || shipsIntl || restrictedCountries.length > 0) && (
              <section className="space-y-2">
                <SectionLabel>{t('delivery')}</SectionLabel>
                <div className="rounded-2xl overflow-hidden border border-gray-100 divide-y divide-gray-100">
                  {shipsFrom && (
                    <InfoRow icon={<Truck className="w-3.5 h-3.5" />} label={t('origin')}>
                      {countryName(shipsFrom)}
                    </InfoRow>
                  )}
                  {shipsIntl && (
                    <InfoRow icon={<Globe className="w-3.5 h-3.5" />} label={t('worldwide')}>
                      <span className="text-[#402970] font-semibold inline-flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Yes
                      </span>
                    </InfoRow>
                  )}
                  {restrictedCountries.length > 0 && (
                    <InfoRow
                      icon={<AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                      label={t('restricted')}
                    >
                      {restrictedCountries.map(c => countryName(c)).join(', ')}
                    </InfoRow>
                  )}
                </div>
              </section>
            )}

            <div className="h-1" />
          </div>
        </div>

        {/* Sticky CTA footer */}
        <div
          className="flex-shrink-0 border-t border-gray-100 px-4 sm:px-5 py-3"
          style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(8px)' }}
        >
          <div className="flex items-center gap-3">
            {product.url && (
              <a
                href={product.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold font-mono text-violet/55 hover:text-violet transition-colors flex-shrink-0"
              >
                <ExternalLink className="w-3 h-3" />
                {t('kapruka')}
              </a>
            )}
            <div className="flex-1" />
            <button
              onClick={() => onAddToBundle(product, variant ?? undefined)}
              disabled={isAdded || outOfStock}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[48px] w-full sm:w-auto rounded-xl sm:rounded-2xl text-sm font-bold cursor-pointer transition-all active:scale-[0.97] disabled:cursor-not-allowed"
              style={
                isAdded
                  ? { background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0' }
                  : outOfStock
                  ? { background: '#F5F5F5', color: '#9CA3AF' }
                  : {
                      background: 'linear-gradient(135deg, #402970 0%, #2D1B69 100%)',
                      color: '#fff',
                      boxShadow: '0 4px 18px rgba(64,41,112,0.35)',
                    }
              }
            >
              {isAdded
                ? <><Check  className="w-4 h-4" strokeWidth={2.5} />{t('added')}</>
                : outOfStock
                ? t('out')
                : <><Plus   className="w-4 h-4" strokeWidth={2.5} />{t('add')}</>
              }
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Tiny shared sub-components ──────────────────────────────────────────────

function Divider() {
  return (
    <div className="h-px" style={{ background: 'linear-gradient(to right, rgba(64,41,112,0.2), transparent)' }} />
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-3 h-px bg-[#402970] flex-shrink-0" />
      <h3 className="text-[9px] font-bold font-mono uppercase tracking-[0.22em] text-[#402970]">
        {children}
      </h3>
    </div>
  );
}

function InfoRow({
  icon, label, children,
}: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-3.5 py-2.5 bg-gray-50/60">
      <span className="text-[#402970]/45 flex-shrink-0">{icon}</span>
      <span className="text-[9px] font-bold font-mono uppercase tracking-[0.13em] text-gray-400 w-20 flex-shrink-0">
        {label}
      </span>
      <span className="text-[12px] text-gray-700 flex-1 flex items-center gap-1">{children}</span>
    </div>
  );
}
