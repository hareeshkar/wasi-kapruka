import React from 'react';
import { Category } from '../types';

interface CategoryExplorerProps {
  categories: Category[];
  onCategoryClick: (query: string) => void;
  lang?: 'en' | 'si' | 'ta';
}

const LOCALE = {
  en: { browse: 'Browse Kapruka', categories: 'categories', clickToExplore: 'Tap any category to explore' },
  si: { browse: 'Kapruka බලන්න', categories: 'කාණ්ඩ', clickToExplore: 'බැලීමට කාණ්ඩයක් තෝරන්න' },
  ta: { browse: 'Kapruka பாருங்க', categories: 'வகைகள்', clickToExplore: 'பார்க்க ஒரு வகையை தேர்ந்தெடுங்க' },
};

const CATEGORY_EMOJI: Record<string, string> = {
  cakes: '🎂', flowers: '💐', chocolates: '🍫', hampers: '🎁', combopack: '📦',
  grocery: '🛒', electronic: '📱', fashion: '👗', jewellery: '💍', cosmetics: '💄',
  books: '📚', kidstoys: '🧸', softtoy: '🧸', sports: '⚽', bicycle: '🚲',
  automobile: '🚗', babyitems: '🍼', greetingcards: '💌', giftcert: '🎫',
  liquor: '🍷', wine: '🍷', perfume: '🧴', pet: '🐾', pharmacy: '💊',
  party: '🎈', vegetables: '🥬', fruits: '🍎', household: '🏠', curd: '🥛',
  ayurvedic: '🌿', schoolpride: '🎓', services: '🔧', pirikara: '🙏',
  personalizedgifts: '🎨',
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

  const sorted = [...categories].sort((a, b) => {
    const aHas = (a.children?.length ?? 0) > 0 ? 0 : 1;
    const bHas = (b.children?.length ?? 0) > 0 ? 0 : 1;
    if (aHas !== bHas) return aHas - bHas;
    return a.name.localeCompare(b.name);
  });

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
              onClick={() => onCategoryClick(cat.name)}
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
