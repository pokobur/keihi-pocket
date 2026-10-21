'use client';

import React from 'react';
import {
  Utensils,
  ShoppingBag,
  CreditCard,
  BookOpen,
  PiggyBank,
  Coffee,
  Sparkles,
  Heart,
  Home,
  Car,
  Gift,
  Smartphone,
  Shirt,
  Music,
  Folder,
} from 'lucide-react';
import {
  CategoryColorKey,
  CategoryConfig,
  CategoryIconKey,
  CategoryId,
} from '@/types';

export interface CategoryStyleMeta {
  badgeBg: string;
  badgeText: string;
  iconBg: string;
  iconColor: string;
  accentBorder: string;
  softCardBg: string;
  label: string;
}

export const COLOR_PALETTE_MAP: Record<CategoryColorKey, CategoryStyleMeta> = {
  peach: {
    label: 'ピーチ（淡いオレンジ）',
    badgeBg: 'bg-orange-50/90 border-orange-200/70',
    badgeText: 'text-orange-700',
    iconBg: 'bg-orange-100/80',
    iconColor: 'text-orange-500',
    accentBorder: 'border-l-orange-300',
    softCardBg: 'bg-orange-50/30',
  },
  mint: {
    label: 'ミント（淡いグリーン）',
    badgeBg: 'bg-teal-50/90 border-teal-200/70',
    badgeText: 'text-teal-700',
    iconBg: 'bg-teal-100/80',
    iconColor: 'text-teal-600',
    accentBorder: 'border-l-teal-300',
    softCardBg: 'bg-teal-50/30',
  },
  lavender: {
    label: 'ラベンダー（淡いパープル）',
    badgeBg: 'bg-indigo-50/90 border-indigo-200/70',
    badgeText: 'text-indigo-700',
    iconBg: 'bg-indigo-100/80',
    iconColor: 'text-indigo-500',
    accentBorder: 'border-l-indigo-300',
    softCardBg: 'bg-indigo-50/30',
  },
  sky: {
    label: 'スカイ（淡いブルー）',
    badgeBg: 'bg-sky-50/90 border-sky-200/70',
    badgeText: 'text-sky-700',
    iconBg: 'bg-sky-100/80',
    iconColor: 'text-sky-500',
    accentBorder: 'border-l-sky-300',
    softCardBg: 'bg-sky-50/30',
  },
  honey: {
    label: 'ハニー（淡いイエロー）',
    badgeBg: 'bg-amber-50/90 border-amber-200/70',
    badgeText: 'text-amber-700',
    iconBg: 'bg-amber-100/80',
    iconColor: 'text-amber-600',
    accentBorder: 'border-l-amber-300',
    softCardBg: 'bg-amber-50/30',
  },
  rose: {
    label: 'ローズ（淡いピンク）',
    badgeBg: 'bg-rose-50/90 border-rose-200/70',
    badgeText: 'text-rose-700',
    iconBg: 'bg-rose-100/80',
    iconColor: 'text-rose-500',
    accentBorder: 'border-l-rose-300',
    softCardBg: 'bg-rose-50/30',
  },
  sage: {
    label: 'セージ（優しいリーフ）',
    badgeBg: 'bg-emerald-50/90 border-emerald-200/70',
    badgeText: 'text-emerald-700',
    iconBg: 'bg-emerald-100/80',
    iconColor: 'text-emerald-600',
    accentBorder: 'border-l-emerald-300',
    softCardBg: 'bg-emerald-50/30',
  },
  lilac: {
    label: 'ライラック（淡いすみれ色）',
    badgeBg: 'bg-purple-50/90 border-purple-200/70',
    badgeText: 'text-purple-700',
    iconBg: 'bg-purple-100/80',
    iconColor: 'text-purple-500',
    accentBorder: 'border-l-purple-300',
    softCardBg: 'bg-purple-50/30',
  },
};

export const ICON_MAP: Record<
  CategoryIconKey,
  React.ComponentType<{ className?: string }>
> = {
  utensils: Utensils,
  shopping_bag: ShoppingBag,
  credit_card: CreditCard,
  book_open: BookOpen,
  piggy_bank: PiggyBank,
  coffee: Coffee,
  home: Home,
  car: Car,
  heart: Heart,
  gift: Gift,
  smartphone: Smartphone,
  shirt: Shirt,
  music: Music,
  sparkles: Sparkles,
  folder: Folder,
};

export const ICON_OPTIONS: { key: CategoryIconKey; label: string }[] = [
  { key: 'utensils', label: '食事・食材' },
  { key: 'shopping_bag', label: '日用品・買物' },
  { key: 'credit_card', label: 'カード・ネット' },
  { key: 'book_open', label: '図書・学習' },
  { key: 'piggy_bank', label: '貯金・積立' },
  { key: 'coffee', label: 'カフェ・外食' },
  { key: 'home', label: '住まい・生活' },
  { key: 'car', label: '交通・移動' },
  { key: 'heart', label: '医療・美容' },
  { key: 'gift', label: '交際・ギフト' },
  { key: 'smartphone', label: '通信・デジタル' },
  { key: 'shirt', label: '衣服・ファッション' },
  { key: 'music', label: '趣味・エンタメ' },
  { key: 'sparkles', label: '特別・ご褒美' },
  { key: 'folder', label: 'その他・一般' },
];

export function getCategoryStyle(
  categoryOrId: CategoryConfig | CategoryId,
  categories?: CategoryConfig[]
): CategoryStyleMeta & { description: string } {
  const cat: CategoryConfig | undefined =
    typeof categoryOrId === 'string'
      ? categories?.find((c) => c.id === categoryOrId)
      : categoryOrId;

  const id = typeof categoryOrId === 'string' ? categoryOrId : categoryOrId.id;

  const defaultColorById: Record<string, CategoryColorKey> = {
    food: 'peach',
    consumables: 'mint',
    net_payment: 'lavender',
    books: 'sky',
    savings: 'honey',
  };

  const colorKey: CategoryColorKey =
    cat?.colorKey || defaultColorById[id] || 'sage';
  const style = COLOR_PALETTE_MAP[colorKey] || COLOR_PALETTE_MAP.sage;

  let description = '通常決済';
  if (cat?.isCredit || id === 'net_payment') {
    description = 'クレジットカード払い（毎月10日締め）';
  } else if (cat?.isSavings || id === 'savings') {
    description = '積立・予備費枠（累計貯金へ加算）';
  }

  return {
    ...style,
    description,
  };
}

export function getCategoryIconKey(
  categoryOrId: CategoryConfig | CategoryId,
  categories?: CategoryConfig[]
): CategoryIconKey {
  const cat: CategoryConfig | undefined =
    typeof categoryOrId === 'string'
      ? categories?.find((c) => c.id === categoryOrId)
      : categoryOrId;
  const id = typeof categoryOrId === 'string' ? categoryOrId : categoryOrId.id;

  if (cat?.iconKey && ICON_MAP[cat.iconKey]) {
    return cat.iconKey;
  }
  if (id === 'food') return 'utensils';
  if (id === 'consumables') return 'shopping_bag';
  if (id === 'net_payment' || cat?.isCredit) return 'credit_card';
  if (id === 'books') return 'book_open';
  if (id === 'savings' || cat?.isSavings) return 'piggy_bank';
  return 'folder';
}

export function CategoryIcon({
  categoryId,
  category,
  categories,
  className = 'w-5 h-5',
}: {
  categoryId: CategoryId;
  category?: CategoryConfig;
  categories?: CategoryConfig[];
  className?: string;
}) {
  const iconKey = getCategoryIconKey(category || categoryId, categories);
  const IconComponent = ICON_MAP[iconKey] || Folder;
  return <IconComponent className={className} />;
}

export function IconPickerGrid({
  selectedIconKey,
  onSelectIcon,
  colorKey = 'sage',
}: {
  selectedIconKey: CategoryIconKey;
  onSelectIcon: (iconKey: CategoryIconKey) => void;
  colorKey?: CategoryColorKey;
}) {
  const palette = COLOR_PALETTE_MAP[colorKey] || COLOR_PALETTE_MAP.sage;

  return (
    <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
      {ICON_OPTIONS.map((opt) => {
        const IconComp = ICON_MAP[opt.key];
        const isSelected = selectedIconKey === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onSelectIcon(opt.key)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-left text-[11px] font-semibold transition ${
              isSelected
                ? `${palette.badgeBg} ${palette.badgeText} ring-2 ring-teal-300/80 font-bold shadow-2xs`
                : 'bg-[#faf8f5] hover:bg-stone-100/80 text-slate-600 border-stone-200/80'
            }`}
          >
            <span
              className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                isSelected
                  ? `${palette.iconBg} ${palette.iconColor}`
                  : 'bg-white text-slate-500'
              }`}
            >
              <IconComp className="w-3.5 h-3.5" />
            </span>
            <span className="truncate">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
