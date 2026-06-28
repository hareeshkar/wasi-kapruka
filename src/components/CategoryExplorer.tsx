import React, { useState } from 'react';
import { Category } from '../types';

interface CategoryExplorerProps {
  categories: Category[];
  onCategoryClick: (query: string) => void;
  lang?: 'en' | 'si' | 'ta';
}

const LOCALE = {
  en: { browse: 'Browse Kapruka', categories: 'categories', clickToExplore: 'Tap any category to explore', back: '← Back', subcategories: 'subcategories' },
  si: { browse: 'Kapruka බලන්න', categories: 'කාණ්ඩ', clickToExplore: 'බැලීමට කාණ්ඩයක් තෝරන්න', back: '← ආපසු', subcategories: 'උප කාණ්ඩ' },
  ta: { browse: 'Kapruka பாருங்க', categories: 'வகைகள்', clickToExplore: 'பார்க்க ஒரு வகையை தேர்ந்தெடுங்க', back: '← பின்', subcategories: 'உப வகைகள்' },
};

const CATEGORY_EMOJI: Record<string, string> = {
  cakes: '🎂', flowers: '💐', chocolates: '🍫', hampers: '🎁', combopack: '📦',
  grocery: '🛒', electronic: '📱', fashion: '👗', jewellery: '💍', cosmetics: '💄',
  books: '📚', kidstoys: '🧸', softtoy: '🧸', sports: '⚽', bicycle: '🚲',
  automobile: '🚗', babyitems: '🍼', greetingcards: '💌', giftcert: '🎫',
  liquor: '🍷', wine: '🍷', perfume: '🧴', pet: '🐾', pharmacy: '💊',
  party: '🎈', vegetables: '🥬', fruits: '🍎', household: '🏠', curd: '🥛',
  ayurvedic: '🌿', schoolpride: '🎓', services: '🔧', pirikara: '🙏',
  personalizedgifts: '🎨', food: '🍽️', clothing: '👕',
};

function getEmoji(name: string): string {
  const key = name.toLowerCase().replace(/\s+/g, '');
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

  // Drill-down view: show subcategories
  if (selectedCategory) {
    const subcategories = selectedCategory.children || [];
    return (
      <div className="w-full max-w-lg glass-bubble rounded-xl overflow-hidden animate-fade-in">
        <div className="px-4 py-2.5 border-b border-ink/5 flex items-center gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className="text-[11px] font-semibold text-violet hover:text-violet/80 cursor-pointer"
          >
            {t.back}
          </button>
          <div>
            <h3 className="text-[11px] font-semibold text-ink font-mono uppercase tracking-wider">
              {getEmoji(selectedCategory.name)} {selectedCategory.name}
            </h3>
            <p className="text-[9px] text-ink-faint mt-0.5">
              {subcategories.length} {t.subcategories}
            </p>
          </div>
        </div>

        <div className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-[320px] overflow-y-auto">
          {subcategories.map((sub) => (
            <button
              key={sub.name}
              onClick={() => onCategoryClick(`show me ${sub.name}`)}
              className="flex items-center gap-2 p-2.5 min-h-[44px] rounded-lg bg-white hover:bg-violet-tint border border-ink/5 hover:border-violet/20 transition-all cursor-pointer active:scale-95 group"
            >
              <span className="text-sm" role="img" aria-label={sub.name}>
                {getEmoji(sub.name)}
              </span>
              <span className="text-[10px] font-medium text-ink-muted group-hover:text-violet text-left leading-tight line-clamp-2">
                {sub.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Top-level category grid
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
                  onCategoryClick(cat.name);
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
