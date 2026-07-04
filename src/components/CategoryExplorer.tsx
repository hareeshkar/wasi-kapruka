import React, { useState, useMemo } from 'react';
import { Category } from '../types';

interface CategoryExplorerProps {
  categories: Category[];
  onCategoryClick: (query: string) => void;
  lang?: 'en' | 'si' | 'ta';
  parentCategory?: string;
}

const LOCALE = {
  en: {
    browse: 'Browse Kapruka',
    categories: 'categories',
    clickToExplore: 'Tap any category to explore',
    back: '← Back',
    subcategories: 'subcategories',
    tapToSearch: 'Tap to search',
    filter: 'Filter…',
  },
  si: {
    browse: 'Kapruka බලන්න',
    categories: 'කාණ්ඩ',
    clickToExplore: 'බැලීමට කාණ්ඩයක් තෝරන්න',
    back: '← ආපසු',
    subcategories: 'උප කාණ්ඩ',
    tapToSearch: 'සෙවීමට තට්ටු කරන්න',
    filter: 'සෙවීම…',
  },
  ta: {
    browse: 'Kapruka பாருங்க',
    categories: 'வகைகள்',
    clickToExplore: 'பார்க்க ஒரு வகையை தேர்ந்தெடுங்க',
    back: '← பின்',
    subcategories: 'உப வகைகள்',
    tapToSearch: 'தேட தட்டவும்',
    filter: 'தேடு…',
  },
};

const CATEGORY_EMOJI: Record<string, string> = {
  cakes: '🎂', flowers: '💐', chocolates: '🍫', hampers: '🎁', combopack: '📦',
  grocery: '🛒', electronic: '📱', fashion: '👗', jewellery: '💍', cosmetics: '💄',
  books: '📚', kidstoys: '🧸', softtoy: '🧸', sports: '⚽', bicycle: '🚲',
  automobile: '🚗', babyitems: '🍼', greetingcards: '💌', giftcert: '🎫',
  liquor: '🍷', perfume: '🧴', pet: '🐾', pharmacy: '💊',
  party: '🎈', vegetables: '🥬', fruits: '🍎', household: '🏠', curd: '🥛',
  ayurvedic: '🌿', schoolpride: '🎓', services: '🔧', pirikara: '🙏',
  personalizedgifts: '🎨', food: '🍽️', clothing: '👕', rice: '🍚',
  seafood: '🦐', frozenfood: '🧊', beverages: '🥤', dairyproducts: '🧀',
  spicesandseasoning: '🌶️', snacksandsweets: '🍪', pastaandnoodles: '🍝',
  bakery: '🥐', confectioneryandbiscuits: '🍫', babyfoodandnutrition: '🍼',
  cutvegetables: '🥬', dehydratedvegetables: '🥬', exoticvegetables: '🥬',
  freshvegetables: '🥬', herbs: '🌿', leafyvegetables: '🥬', organicvegetables: '🥬',
  packagedvegetables: '🥬', cannedfood: '🥫', cleansers: '🧹', condiments: '🧂',
  dessert: '🍮', eggsandoil: '🥚', flour: '🌾',
  juice: '🧃', nonalcoholicwine: '🍷',
  organic: '🌿', pestcontrol: '🐛',
  specialoffers: '🏷️', specialtyfoods: '🍽️',
  tobacco: '🚬', wellness: '💊',
};

function getEmoji(name: string): string {
  const key = name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z]/g, '');
  return CATEGORY_EMOJI[key] || '📦';
}

export default function CategoryExplorer({
  categories,
  onCategoryClick,
  lang = 'en',
  parentCategory,
}: CategoryExplorerProps) {
  const t = LOCALE[lang] || LOCALE.en;
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [filter, setFilter] = useState('');

  const sorted = useMemo(() => {
    return [...categories].sort((a, b) => {
      const aHas = (a.children?.length ?? 0) > 0 ? 0 : 1;
      const bHas = (b.children?.length ?? 0) > 0 ? 0 : 1;
      if (aHas !== bHas) return aHas - bHas;
      return a.name.localeCompare(b.name);
    });
  }, [categories]);

  // ── Subcategory list view (when parentCategory is set) ──────────────────
  if (parentCategory) {
    const filtered = filter
      ? categories.filter(c => c.name.toLowerCase().includes(filter.toLowerCase()))
      : categories;

    return (
      <div className="w-full">
        {/* Header — amber accent to distinguish from main grid */}
        <div className="px-4 py-3 border-b border-amber-200/40" style={{ background: 'linear-gradient(135deg, rgba(255,251,235,0.9) 0%, rgba(255,237,213,0.6) 100%)' }}>
          <div className="flex items-center gap-2.5">
            <span className="text-xl flex-shrink-0">{getEmoji(parentCategory)}</span>
            <div className="flex-1 min-w-0">
              <h3 className="text-[12px] font-bold text-ink truncate">{parentCategory}</h3>
              <p className="text-[9px] text-ink-faint">
                {categories.length} {t.subcategories} · {t.tapToSearch}
              </p>
            </div>
          </div>
          {/* Search filter for large lists */}
          {categories.length > 6 && (
            <input
              type="text"
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder={t.filter}
              className="mt-2 w-full text-[11px] px-3 py-1.5 rounded-lg bg-white/70 border border-amber-200/50 outline-none placeholder:text-ink-faint text-ink focus:border-amber-300 transition-colors"
            />
          )}
        </div>

        {/* Subcategory list */}
        <div className="p-2 max-h-[50vh] sm:max-h-[300px] overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-center text-[11px] text-ink-faint py-4">No match</p>
          ) : (
            filtered.map((sub, i) => (
              <button
                key={sub.name}
                onClick={() => onCategoryClick(`show me ${sub.name}`)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-amber-50 border border-transparent hover:border-amber-200/50 transition-all cursor-pointer active:scale-[0.98] group"
                style={{ animationDelay: `${i * 25}ms` }}
              >
                <span className="text-sm flex-shrink-0 w-6 text-center">{getEmoji(sub.name)}</span>
                <span className="text-[11px] font-medium text-ink-muted group-hover:text-amber-700 text-left flex-1 leading-tight">
                  {sub.name}
                </span>
                <svg className="w-3.5 h-3.5 text-ink-faint group-hover:text-amber-500 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  // ── Drill-down view: subcategories from grid click ──────────────────────
  if (selectedCategory) {
    return (
      <div className="w-full max-w-lg glass-bubble rounded-xl overflow-hidden animate-fade-in">
        {/* Back header */}
        <div className="px-4 py-2.5 border-b border-ink/5 flex items-center gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className="text-[11px] text-ink-muted hover:text-violet transition-colors cursor-pointer font-medium"
          >
            {t.back}
          </button>
          <span className="text-ink-faint text-[11px]">/</span>
          <span className="text-[11px] font-semibold text-ink">{selectedCategory.name}</span>
        </div>
        <CategoryExplorer
          categories={selectedCategory.children || []}
          onCategoryClick={onCategoryClick}
          lang={lang}
          parentCategory={selectedCategory.name}
        />
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

      <div className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-1.5 max-h-[50vh] sm:max-h-[320px] overflow-y-auto">
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
              className="flex flex-col items-center gap-1 p-2.5 min-h-[60px] rounded-lg bg-white hover:bg-violet-tint border border-ink/5 hover:border-violet/20 transition-all cursor-pointer active:scale-95 group"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
            >
              <span className="text-xl leading-none" role="img" aria-label={cat.name}>
                {getEmoji(cat.name)}
              </span>
              <span className="text-[9px] font-medium text-ink-muted group-hover:text-violet text-center leading-tight line-clamp-2 w-full">
                {cat.name}
              </span>
              {childCount > 0 && (
                <span className="text-[7px] font-mono text-violet/60 bg-violet-tint px-1.5 py-0.5 rounded-full leading-none">
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
