import React, { useState } from 'react';
import { Product, ProductVariant } from '../types';
import { Check, Plus, Eye, Weight, Store, Package, ChevronDown, ChevronUp } from 'lucide-react';
import { formatPrice, detectCurrency, type Currency } from '../lib/currency';

interface ProductComparisonCardProps {
  products: Product[];
  onAddToBundle: (product: Product, variant?: ProductVariant) => void;
  onViewDetails?: (productCode: string) => void;
  lang?: 'en' | 'si' | 'ta';
  cartItems?: { product_code: string; quantity: number }[];
}

const LOCALE = {
  en: { compare: 'Compare', add: 'Add', added: 'Added', details: 'Details', weight: 'Weight', vendor: 'Seller', lowStock: 'Low stock', inStock: 'In stock', showTable: 'Show comparison table', hideTable: 'Hide table', bestValue: 'Best Value', cheapest: 'Cheapest', premium: 'Premium', inStockLabel: 'Stock' },
  si: { compare: 'සංසන්දනය', add: 'එකතු කරන්න', added: 'දැම්මා', details: 'විස්තර', weight: 'බර', vendor: 'විකුණන්නා', lowStock: 'ස්වල්පයයි', inStock: 'ඇත', showTable: 'සංසන්දන වගුව පෙන්වන්න', hideTable: 'වගුව සඟවන්න', bestValue: 'හොඳම වටිනාකම', cheapest: 'අඩුම', premium: 'ඉහළම', inStockLabel: 'ඉතිරි' },
  ta: { compare: 'ஒப்பிடு', add: 'சேர்', added: 'சேர்த்தாச்சு', details: 'விவரங்கள்', weight: 'எடை', vendor: 'விற்பவர்', lowStock: 'குறைவு', inStock: 'கிடைக்கிறது', showTable: 'ஒப்பிடல் அட்டவணையைக் காட்டு', hideTable: 'அட்டவணையை மறை', bestValue: 'சிறந்த மதிப்பு', cheapest: 'மலிவானது', premium: 'பிரீமியம்', inStockLabel: 'இருப்பு' },
};

export default function ProductComparisonCard({
  products,
  onAddToBundle,
  onViewDetails,
  lang = 'en',
  cartItems = [],
}: ProductComparisonCardProps) {
  const t = LOCALE[lang] || LOCALE.en;
  const [addedSet, setAddedSet] = useState<Set<string>>(new Set());
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());
  const [showTable, setShowTable] = useState(false);

  const isAdded = (code: string) => addedSet.has(code) || cartItems.some(ci => ci.product_code === code);

  const handleAdd = (prod: Product) => {
    if (addedSet.has(prod.product_code)) return;
    onAddToBundle(prod);
    setAddedSet(prev => new Set(prev).add(prod.product_code));
  };

  // Compute comparison insights
  const prices = products.map(p => p.price_lkr).filter(p => p > 0);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const cheapestId = products.find(p => p.price_lkr === minPrice)?.product_code;
  const premiumId = products.find(p => p.price_lkr === maxPrice)?.product_code;

  // Build comparison rows
  const comparisonRows = [
    { label: 'Price', values: products.map(p => formatPrice(p.price_lkr, detectCurrency(p) as Currency)) },
    { label: 'Category', values: products.map(p => p.category || '—') },
    { label: 'Stock', values: products.map(p => p.stock_level === 'low' ? '⚠ Low' : p.stock_level === 'medium' ? 'Medium' : '✓ Available') },
    ...(products.some(p => p.attributes?.weight) ? [
      { label: 'Weight', values: products.map(p => p.attributes?.weight ? `${p.attributes.weight} kg` : '—') },
    ] : []),
    ...(products.some(p => p.attributes?.vendor) ? [
      { label: 'Seller', values: products.map(p => p.attributes?.vendor || '—') },
    ] : []),
    ...(products.some(p => p.shipping?.ships_from) ? [
      { label: 'Ships from', values: products.map(p => p.shipping?.ships_from || '—') },
    ] : []),
    ...(products.some(p => p.variants && p.variants.length > 0) ? [
      { label: 'Variants', values: products.map(p => p.variants ? `${p.variants.length} options` : '—') },
    ] : []),
  ];

  return (
    <div className="w-full max-w-lg glass-bubble rounded-xl overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-ink/5 flex items-center gap-2">
        <div className="w-5 h-5 rounded-full bg-violet-tint flex items-center justify-center">
          <span className="text-[9px] font-bold text-violet">{products.length}</span>
        </div>
        <span className="text-[11px] font-semibold text-ink font-mono uppercase tracking-wider">
          {t.compare}
        </span>
      </div>

      {/* Comparison grid */}
      <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none">
        {products.map((prod) => {
          const added = isAdded(prod.product_code);
          const isCheapest = prod.product_code === cheapestId;
          const isPremium = prod.product_code === premiumId && maxPrice !== minPrice;
          return (
            <div
              key={prod.product_code}
              className="flex-shrink-0 snap-start border-r border-ink/5 last:border-r-0 flex flex-col"
              style={{ width: 'min(200px, 78vw)' }}
            >
              {/* Image */}
              <div className="relative aspect-[4/3] bg-gray-50 overflow-hidden">
                {!imgErrors.has(prod.product_code) ? (
                  <img
                    src={prod.image_url}
                    alt={prod.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={() => setImgErrors(prev => new Set(prev).add(prod.product_code))}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <Package className="w-6 h-6" />
                  </div>
                )}
                <div className="absolute bottom-2 right-2 bg-white rounded-md px-2 py-0.5" style={{ boxShadow: '0 2px 6px rgba(64,41,112,0.12)' }}>
                  <span className="text-[11px] font-bold font-mono text-ink">
                    {formatPrice(prod.price_lkr, detectCurrency(prod) as Currency)}
                  </span>
                </div>
                {/* Badges */}
                {isCheapest && (
                  <span className="absolute top-2 left-2 px-1.5 py-0.5 text-[8px] font-bold text-white bg-emerald-500 rounded-full">
                    {t.cheapest}
                  </span>
                )}
                {isPremium && (
                  <span className="absolute top-2 left-2 px-1.5 py-0.5 text-[8px] font-bold text-white bg-violet rounded-full">
                    {t.premium}
                  </span>
                )}
              </div>

              {/* Details */}
              <div className="p-2.5 flex-1 flex flex-col space-y-1.5">
                <h3 className="text-[11px] font-semibold text-ink leading-snug line-clamp-2">
                  {prod.name}
                </h3>

                {prod.description && (
                  <p className="text-[9px] text-ink-muted line-clamp-2 leading-relaxed">
                    {prod.description}
                  </p>
                )}

                <div className="flex flex-wrap gap-1">
                  {prod.attributes?.weight && (
                    <span className="inline-flex items-center gap-0.5 text-[8px] font-mono text-ink-faint bg-surface-warm px-1.5 py-0.5 rounded-full">
                      <Weight className="w-2 h-2" />
                      {prod.attributes.weight} kg
                    </span>
                  )}
                  {prod.attributes?.vendor && (
                    <span className="inline-flex items-center gap-0.5 text-[8px] font-mono text-ink-faint bg-surface-warm px-1.5 py-0.5 rounded-full">
                      <Store className="w-2 h-2" />
                      {prod.attributes.vendor}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    prod.stock_level === 'low' ? 'bg-rose-400' :
                    prod.stock_level === 'medium' ? 'bg-amber-400' : 'bg-emerald-400'
                  }`} />
                  <span className="text-[8px] font-mono text-ink-faint uppercase">
                    {prod.stock_level === 'low' ? t.lowStock : t.inStock}
                  </span>
                </div>

                <div className="flex-1" />

                <div className="space-y-1">
                  <button
                    onClick={() => handleAdd(prod)}
                    disabled={added}
                    className={`w-full py-2 min-h-[36px] px-2 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 ${
                      added
                        ? 'bg-violet-tint text-violet border border-violet/15'
                        : 'bg-violet hover:bg-violet-deep text-white'
                    }`}
                  >
                    {added ? (
                      <><Check className="w-2.5 h-2.5 stroke-[2.5]" /> {t.added}</>
                    ) : (
                      <><Plus className="w-2.5 h-2.5 stroke-[2.5]" /> {t.add}</>
                    )}
                  </button>
                  {onViewDetails && (
                    <button
                      onClick={() => onViewDetails(prod.product_code)}
                      className="w-full py-1.5 min-h-[32px] px-2 rounded-lg text-[9px] font-medium flex items-center justify-center gap-1 cursor-pointer transition-all border border-violet/10 text-violet hover:bg-violet-tint"
                    >
                      <Eye className="w-2 h-2" /> {t.details}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparison table toggle */}
      <button
        onClick={() => setShowTable(!showTable)}
        className="w-full px-4 py-2.5 border-t border-ink/5 flex items-center justify-center gap-1.5 text-[11px] font-medium text-violet hover:bg-violet/5 transition-colors"
      >
        {showTable ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {showTable ? t.hideTable : t.showTable}
      </button>

      {/* Comparison table */}
      {showTable && (
        <div className="border-t border-ink/5 overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="border-b border-ink/5">
                <th className="text-left px-3 py-2 font-semibold text-ink-muted bg-surface-warm w-[80px]"></th>
                {products.map((prod) => (
                  <th key={prod.product_code} className="text-left px-3 py-2 font-semibold text-ink bg-surface-warm">
                    {prod.name.length > 18 ? prod.name.slice(0, 18) + '…' : prod.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row, i) => (
                <tr key={i} className="border-b border-ink/5 last:border-b-0">
                  <td className="px-3 py-1.5 font-medium text-ink-muted whitespace-nowrap">{row.label}</td>
                  {row.values.map((val, j) => (
                    <td key={j} className="px-3 py-1.5 text-ink">{val}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
