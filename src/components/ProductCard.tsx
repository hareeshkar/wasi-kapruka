import React, { useState } from 'react';
import { Product, ProductVariant } from '../types';
import { Plus, Check, Flame } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onAddToBundle: (product: Product, variant?: ProductVariant) => void;
  lang?: 'en' | 'si' | 'ta';
}

// Category accent colors — give each gift type a warm identity
const CATEGORY_ACCENTS: Record<string, { bg: string; text: string; badge: string }> = {
  'Cakes':       { bg: 'from-amber-50 to-orange-50',  text: 'text-orange-700',  badge: 'bg-orange-100 text-orange-700' },
  'Flowers':     { bg: 'from-pink-50 to-rose-50',     text: 'text-rose-700',    badge: 'bg-rose-100 text-rose-700' },
  'Chocolates':  { bg: 'from-amber-50 to-yellow-50',  text: 'text-amber-800',   badge: 'bg-amber-100 text-amber-800' },
  'Hampers':     { bg: 'from-emerald-50 to-teal-50',  text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700' },
  'General':     { bg: 'from-slate-50 to-gray-50',    text: 'text-slate-700',   badge: 'bg-slate-100 text-slate-600' },
};

const getAccent = (category: string) =>
  CATEGORY_ACCENTS[category] ?? CATEGORY_ACCENTS['General'];

export default function ProductCard({ product, onAddToBundle, lang = 'en' }: ProductCardProps) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>(
    product.variants && product.variants.length > 0 ? product.variants[0] : undefined
  );
  const [isAdded, setIsAdded] = useState(false);

  const handleAdd = () => {
    onAddToBundle(product, selectedVariant);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2200);
  };

  const getPrice = () => selectedVariant ? selectedVariant.price_lkr : product.price_lkr;

  const L: Record<string, Record<string, string>> = {
    add:     { en: '+ Add to Bundle',      si: 'තෑග්ගට එකතු කරන්න', ta: 'தொகுப்பில் சேர்க்க' },
    added:   { en: '✓ Added!',             si: '✓ එකතු වන ලදී!',   ta: '✓ சேர்க்கப்பட்டது!' },
    size:    { en: 'Size',                 si: 'ප්‍රමාණය',         ta: 'அளவு' },
  };
  const t = (k: string) => L[k]?.[lang] ?? L[k]?.['en'];

  const accent = getAccent(product.category);
  const stockDot = product.stock_level === 'high'   ? 'bg-emerald-400'
                 : product.stock_level === 'medium'  ? 'bg-amber-400'
                 : product.stock_level === 'low'     ? 'bg-rose-400'
                 : '';

  return (
    <div className="card-spring flex flex-col bg-white rounded-2xl overflow-hidden w-60 sm:w-64 flex-shrink-0 animate-fade-in select-none"
         style={{ boxShadow: 'var(--shadow-card)' }}>

      {/* Image area */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-50">
        <img
          src={product.image_url}
          alt={product.name}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600&auto=format&fit=crop&q=60';
          }}
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />

        {/* Category badge */}
        <div className="absolute top-2.5 left-2.5">
          <span className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded-full uppercase tracking-wider ${accent.badge}`}>
            {product.category}
          </span>
        </div>

        {/* Stock dot */}
        {stockDot && (
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-black/30 backdrop-blur-sm rounded-full px-1.5 py-0.5">
            <span className={`w-1.5 h-1.5 rounded-full ${stockDot}`} />
            <span className="text-[8px] text-white font-mono font-bold uppercase">
              {product.stock_level}
            </span>
          </div>
        )}

        {/* Price pill on image */}
        <div className="absolute bottom-2.5 right-2.5">
          <div className="bg-white/95 backdrop-blur-sm rounded-lg px-2.5 py-1 shadow-sm">
            <span className="text-sm font-bold font-mono text-[#0A5C45]">
              Rs. {getPrice().toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className={`flex-1 flex flex-col p-3.5 bg-gradient-to-b ${accent.bg}`}>
        <h3 className="text-sm font-semibold text-[#1A1A1A] line-clamp-2 leading-snug mb-1.5 font-sans">
          {product.name}
        </h3>

        {product.description && (
          <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed mb-3">
            {product.description}
          </p>
        )}

        {/* Variant picker */}
        {product.variants && product.variants.length > 0 && (
          <div className="mb-3">
            <p className="text-[9px] font-mono font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              {t('size')}
            </p>
            <div className="flex gap-1 flex-wrap">
              {product.variants.slice(0, 4).map((v) => (
                <button
                  key={v.id}
                  onClick={() => setSelectedVariant(v)}
                  className={`px-2 py-0.5 text-[10px] font-mono font-semibold rounded-md border cursor-pointer transition-all ${
                    selectedVariant?.id === v.id
                      ? 'bg-[#0F6E56] text-white border-[#0F6E56] shadow-sm'
                      : 'bg-white/70 border-black/10 text-gray-600 hover:bg-white hover:border-[#0F6E56]/40'
                  }`}
                >
                  {v.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Add to bundle CTA */}
        <button
          onClick={handleAdd}
          disabled={isAdded}
          className={`mt-auto w-full py-2 px-3 rounded-xl text-xs font-semibold font-sans flex items-center justify-center gap-1.5 cursor-pointer transition-all duration-300 btn-shimmer ${
            isAdded
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-[#0F6E56] hover:bg-[#0A5C45] text-white shadow-sm active:scale-95'
          }`}
        >
          {isAdded ? (
            <>
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{t('added')}</span>
            </>
          ) : (
            <>
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{t('add')}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
