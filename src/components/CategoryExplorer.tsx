import React, { useState } from 'react';
import { Category } from '../types';

interface CategoryExplorerProps {
  categories: Category[];
  onCategoryClick: (query: string) => void;
  lang?: 'en' | 'si' | 'ta';
}

const LOCALE = {
  en: {
    browse: 'Browse Kapruka',
    categories: 'categories',
    clickToExplore: 'Tap any category to explore',
    back: '← Back to categories',
    subcategories: 'subcategories',
    tapToSearch: 'Tap to search',
  },
  si: {
    browse: 'Kapruka බලන්න',
    categories: 'කාණ්ඩ',
    clickToExplore: 'බැලීමට කාණ්ඩයක් තෝරන්න',
    back: '← කාණ්ඩ වෙත',
    subcategories: 'උප කාණ්ඩ',
    tapToSearch: 'සෙවීමට තට්ටු කරන්න',
  },
  ta: {
    browse: 'Kapruka பாருங்க',
    categories: 'வகைகள்',
    clickToExplore: 'பார்க்க ஒரு வகையை தேர்ந்தெடுங்க',
    back: '← வகைகளுக்கு',
    subcategories: 'உப வகைகள்',
    tapToSearch: 'தேட தட்டவும்',
  },
};

const CATEGORY_EMOJI: Record<string, string> = {
  cakes: '🎂', flowers: '💐', chocolates: '🍫', hampers: '🎁', combopack: '📦',
  grocery: '🛒', electronic: '📱', fashion: '👗', jewellery: '💍', cosmetics: '💄',
  books: '📚', kidstoys: '🧸', softtoy: '🧸', sports: '⚽', bicycle: '🚲',
  automobile: '🚗', babyitems: '🍼', greetingcards: '💌', giftcert: '🎫',
  liquor: '🍷', wine: '🍷', perfume: '🧴', pet: '🐾', pharmacy: '💊',
  party: '🎈', vegetables: '🥬', fruits: '🍎', household: '🏠', curd: '🥛',
  ayurvedic: '🌿', schoolpride: '🎓', services: '🔧', pirikara: '🙏',
  personalizedgifts: '🎨', food: '🍽️', clothing: '👕', rice: '🍚',
  seafood: '🦐', frozenfood: '🧊', beverages: '🥤', dairyproducts: '🧀',
  spicesandseasoning: '🌶️', snacksandsweets: '🍪', pastaandnoodles: '🍝',
  bakery: '🥐', confectioneryandbiscuits: '🍫', babyfoodandnutrition: '🍼',
};

function getEmoji(name: string): string {
  const key = name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z]/g, '');
  return CATEGORY_EMOJI[key] || '📦';
}

export default function CategoryExplorer({
  categories,
  onCategoryClick,
  lang = 'en',
}: CategoryExplorerProps) {
  const t = LOCALE[lang] || LOCALE.en;
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  const sorted = [...categories].sort((a, b) => {
    const aHas = (a.children?.length ?? 0) > 0 ? 0 : 1;
    const bHas = (b.children?.length ?? 0) > 0 ? 0 : 1;
    if (aHas !== bHas) return aHas - bHas;
    return a.name.localeCompare(b.name);
  });

  // ── Drill-down view: subcategories ──────────────────────────────────────
  if (selectedCategory) {
    const subcategories = selectedCategory.children || [];
    return (
      <div className="w-full max-w-lg glass-bubble rounded-xl overflow-hidden animate-fade-in">
        {/* Header with back button */}
        <div className="px-4 py-3 border-b border-ink/5 bg-gradient-to-r from-violet/5 to-transparent">
          <button
            onClick={() => setSelectedCategory(null)}
            className="flex items-center gap-1.5 text-[10px] font-medium text-violet hover:text-violet/80 cursor-pointer mb-1.5"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t.back}
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xl">{getEmoji(selectedCategory.name)}</span>
            <div>
              <h3 className="text-[12px] font-bold text-ink">
                {selectedCategory.name}
              </h3>
              <p className="text-[9px] text-ink-faint">
                {subcategories.length} {t.subcategories} · {t.tapToSearch}
              </p>
            </div>
          </div>
        </div>

        {/* Subcategory list — distinct from main grid */}
        <div className="p-2 max-h-[320px] overflow-y-auto">
          {subcategories.map((sub, i) => (
            <button
              key={sub.name}
              onClick={() => onCategoryClick(`show me ${sub.name}`)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-violet/5 border border-transparent hover:border-violet/10 transition-all cursor-pointer active:scale-[0.98] group"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <span className="text-sm flex-shrink-0">{getEmoji(sub.name)}</span>
              <span className="text-[11px] font-medium text-ink-muted group-hover:text-violet text-left flex-1">
                {sub.name}
              </span>
              <svg className="w-3.5 h-3.5 text-ink-faint group-hover:text-violet transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Top-level category grid ─────────────────────────────────────────────
  return (
    <div className="w-full max-w-lg glass-bubble rounded-xl overflow-hidden animate-fade-in">
      <div className="px-4 py-2.5 border-b border-ink/5">
        <h3 className="text-[11px] font-semibold text-ink font-mono uppercase tracking-wider">
          {t.browse}
        </h3>
        <p className="text-[9px] text-ink-faint mt-0.5">
          {categories.length} {t.categories} · {t.clickToExplore}
        </p>
      </div>

      <div className="p-3 grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-[320px] overflow-y-auto">
        {sorted.map((cat) => {
          const childCount = cat.children?.length ?? 0;
          return (
            <button
              key={cat.name}
              onClick={() => {
                if (childCount > 0) {
                  setSelectedCategory(cat);
                } else {
                  onCategoryClick(`show me ${cat.name}`);
                }
              }}
              className="flex flex-col items-center gap-1 p-2.5 min-h-[44px] rounded-lg bg-white hover:bg-violet-tint border border-ink/5 hover:border-violet/20 transition-all cursor-pointer active:scale-95 group"
            >
              <span className="text-lg" role="img" aria-label={cat.name}>
                {getEmoji(cat.name)}
              </span>
              <span className="text-[9px] font-medium text-ink-muted group-hover:text-violet text-center leading-tight line-clamp-2">
                {cat.name}
              </span>
              {childCount > 0 && (
                <span className="text-[7px] font-mono text-ink-faint bg-surface-warm px-1.5 py-0.5 rounded-full">
                  {childCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
