'use client';

import React, { useState, useEffect } from 'react';
import {
  PlusCircle,
  CreditCard,
  PiggyBank,
  Calendar,
  Tag,
  Check,
  X,
} from 'lucide-react';
import { CategoryConfig, CategoryId, MonthlyCycle } from '@/types';
import {
  calculateCountdowns,
  formatYen,
  getBillingMonthForDate,
  getCycleIdFromDate,
} from '@/lib/calculations';
import { CategoryIcon, getCategoryStyle } from '@/components/CategoryIcon';

interface QuickExpenseFormProps {
  categories: CategoryConfig[];
  currentCycle: MonthlyCycle;
  selectedCategoryId?: CategoryId;
  onAddTransaction: (input: {
    date: string;
    categoryId: CategoryId;
    amount: number;
    memo: string;
    savingsType?: 'withdrawal' | 'deposit';
  }) => void;
  isModal?: boolean;
  onCloseModal?: () => void;
}

const DEFAULT_MEMO_SUGGESTIONS: Record<string, string[]> = {
  food: ['スーパー買い出し', '生鮮食品・野菜', 'お米・調味料', 'コンビニ・軽食'],
  consumables: ['ドラッグストア日用品', '洗剤・ティッシュ', 'キッチン消耗品', '衛生用品'],
  net_payment: ['Amazon', '楽天市場', 'サブスク定期決済', 'ネットスーパー・EC'],
  books: ['技術書・専門書', 'ビジネス書', 'Kindle電子書籍', '雑誌・参考書'],
  savings: ['予備費からの補填取崩', '臨時出費の取崩', 'ボーナス・臨時積立', '余剰金の追加貯金'],
};

export function QuickExpenseForm({
  categories,
  currentCycle,
  selectedCategoryId,
  onAddTransaction,
  isModal = false,
  onCloseModal,
}: QuickExpenseFormProps) {
  const { todayStr } = calculateCountdowns();

  const getInitialDate = () => {
    if (todayStr >= currentCycle.startDate && todayStr <= currentCycle.endDate) {
      return todayStr;
    }
    return currentCycle.startDate;
  };

  const [date, setDate] = useState<string>(getInitialDate);
  const [categoryId, setCategoryId] = useState<CategoryId>(
    selectedCategoryId || categories[0]?.id || 'food'
  );
  const [savingsType, setSavingsType] = useState<'withdrawal' | 'deposit'>(
    'withdrawal'
  );
  const [amountStr, setAmountStr] = useState<string>('');
  const [memo, setMemo] = useState<string>('');
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (
      selectedCategoryId &&
      categories.some((c) => c.id === selectedCategoryId)
    ) {
      setCategoryId(selectedCategoryId);
    } else if (
      categories.length > 0 &&
      !categories.some((c) => c.id === categoryId)
    ) {
      setCategoryId(categories[0].id);
    }
  }, [selectedCategoryId, categories, categoryId]);

  useEffect(() => {
    if (todayStr >= currentCycle.startDate && todayStr <= currentCycle.endDate) {
      setDate(todayStr);
    } else if (date < currentCycle.startDate || date > currentCycle.endDate) {
      setDate(currentCycle.startDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCycle.cycleId]);

  const currentCatObj =
    categories.find((c) => c.id === categoryId) || categories[0];
  const isCreditCat = currentCatObj?.isCredit ?? categoryId === 'net_payment';
  const isSavingsCat = currentCatObj?.isSavings ?? categoryId === 'savings';

  const targetCycleId = getCycleIdFromDate(date);
  const isDifferentCycle = targetCycleId !== currentCycle.cycleId;
  const billingMonth = isCreditCat ? getBillingMonthForDate(date) : null;

  const suggestions =
    DEFAULT_MEMO_SUGGESTIONS[categoryId] ||
    (isCreditCat
      ? DEFAULT_MEMO_SUGGESTIONS.net_payment
      : isSavingsCat
      ? DEFAULT_MEMO_SUGGESTIONS.savings
      : ['日用品・買い物', '店舗決済', '雑費']);

  const handleQuickAmountAdd = (addVal: number) => {
    const current = parseInt(amountStr || '0', 10) || 0;
    setAmountStr(String(current + addVal));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseInt(amountStr, 10);
    if (!date || !numericAmount || numericAmount <= 0 || !memo.trim()) return;

    onAddTransaction({
      date,
      categoryId,
      amount: numericAmount,
      memo: memo.trim(),
      savingsType: isSavingsCat ? savingsType : undefined,
    });

    setAmountStr('');
    setMemo('');
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);

    if (isModal && onCloseModal) {
      onCloseModal();
    }
  };

  return (
    <div
      className={`bg-white/95 rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden ${
        isModal ? 'w-full max-w-lg mx-auto shadow-xl border-stone-300/80' : ''
      }`}
    >
      {/* Header - Soft Pastel Mint */}
      <div className="bg-gradient-to-r from-teal-50/90 to-emerald-50/70 border-b border-teal-200/60 px-5 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PlusCircle className="w-5 h-5 text-teal-600" />
          <h2 className="font-bold text-sm sm:text-base text-slate-700">
            支出クイック登録
          </h2>
        </div>

        {isModal && onCloseModal && (
          <button
            type="button"
            onClick={onCloseModal}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-white/70 transition"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
        {/* Category Selector Pills */}
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-2">
            1. 科目を選択
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {categories.map((cat) => {
              const active = categoryId === cat.id;
              const meta = getCategoryStyle(cat);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryId(cat.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition text-left ${
                    active
                      ? 'bg-teal-50/90 text-teal-900 border-teal-300 shadow-2xs ring-2 ring-teal-200/70'
                      : 'bg-[#faf8f5] hover:bg-stone-100/80 text-slate-600 border-stone-200/80'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${meta.iconBg} ${meta.iconColor}`}
                  >
                    <CategoryIcon
                      categoryId={cat.id}
                      category={cat}
                      className="w-3.5 h-3.5"
                    />
                  </span>
                  <span className="truncate">{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Special Option when Savings is selected: 取り崩し vs 直接積立 */}
        {isSavingsCat && (
          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/70 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
              <PiggyBank className="w-4 h-4 text-amber-500" />
              <span>{currentCatObj?.name || '貯金'}の操作タイプを選択</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSavingsType('withdrawal')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                  savingsType === 'withdrawal'
                    ? 'bg-rose-100/90 text-rose-800 border-rose-300 shadow-2xs'
                    : 'bg-white text-slate-600 border-amber-200/70 hover:bg-amber-50'
                }`}
              >
                取り崩し（支出）
              </button>
              <button
                type="button"
                onClick={() => setSavingsType('deposit')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                  savingsType === 'deposit'
                    ? 'bg-teal-100/90 text-teal-800 border-teal-300 shadow-2xs'
                    : 'bg-white text-slate-600 border-amber-200/70 hover:bg-amber-50'
                }`}
              >
                直接積立（＋加算）
              </button>
            </div>
          </div>
        )}

        {/* Special Preview when Credit Category is selected */}
        {isCreditCat && billingMonth && (
          <div className="px-3.5 py-2.5 rounded-xl bg-indigo-50/60 border border-indigo-200/60 flex flex-wrap items-center justify-between gap-2 text-xs text-indigo-900">
            <div className="flex items-center gap-1.5 font-medium">
              <CreditCard className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>
                利用日 <strong>{date}</strong> のカード請求区分:
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold text-xs">
              {billingMonth.replace('-', '年').replace('-', '月')}日締め対象
            </span>
          </div>
        )}

        {/* Date & Amount Row */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Date Input */}
          <div className="sm:col-span-5">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>2. 日付</span>
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setDate(todayStr)}
                  className="text-[11px] font-semibold text-teal-700 hover:underline"
                >
                  今日({todayStr.slice(5)})
                </button>
                {currentCycle.startDate !== todayStr && (
                  <button
                    type="button"
                    onClick={() => setDate(currentCycle.startDate)}
                    className="text-[11px] font-semibold text-slate-400 hover:underline"
                  >
                    開始日({currentCycle.startDate.slice(5)})
                  </button>
                )}
              </div>
            </div>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-[#faf8f5] focus:bg-white text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-300"
            />
            {isDifferentCycle && (
              <p className="mt-1 text-[11px] text-amber-600 font-medium">
                ※ この日付は <strong>{targetCycleId}月度サイクル</strong> に計上されます
              </p>
            )}
          </div>

          {/* Amount Input */}
          <div className="sm:col-span-7">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                <span>3. 金額（円）</span>
                <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                  必須
                </span>
              </label>
              {amountStr && (
                <button
                  type="button"
                  onClick={() => setAmountStr('')}
                  className="text-[11px] text-slate-400 hover:text-slate-600"
                >
                  クリア
                </button>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base">
                ¥
              </span>
              <input
                type="number"
                min={1}
                step={1}
                placeholder="例: 3200"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                required
                className="w-full pl-8 pr-4 py-2 rounded-xl border border-stone-200 bg-[#faf8f5] focus:bg-white text-base font-extrabold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-300"
              />
            </div>

            {/* Quick Amount Buttons */}
            <div className="mt-1.5 flex items-center flex-wrap gap-1.5">
              {[100, 500, 1000, 3000, 5000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleQuickAmountAdd(val)}
                  className="px-2 py-0.5 rounded-lg bg-[#faf8f5] hover:bg-teal-50 text-slate-600 hover:text-teal-800 border border-stone-200/80 text-[11px] font-semibold transition"
                >
                  +{val.toLocaleString()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Memo Input */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-slate-400" />
              <span>4. メモ（品名・購入先など）</span>
              <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                必須
              </span>
            </label>
          </div>
          <input
            type="text"
            required
            placeholder="例: スーパー買い出し / Amazon 日用品・書籍など"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl border border-stone-200 bg-[#faf8f5] focus:bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-300"
          />
          <div className="mt-1.5 flex items-center flex-wrap gap-1.5">
            <span className="text-[11px] text-slate-400">候補から選択:</span>
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setMemo(suggestion)}
                className="px-2 py-0.5 rounded-lg bg-[#faf8f5] hover:bg-teal-50 hover:text-teal-800 text-slate-500 border border-stone-200/70 text-[11px] transition"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-1 flex items-center justify-end gap-3">
          {justSaved && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-teal-600">
              <Check className="w-4 h-4" />
              トランザクション一覧に反映しました！
            </span>
          )}
          <button
            type="submit"
            disabled={
              !amountStr ||
              parseInt(amountStr, 10) <= 0 ||
              !memo.trim()
            }
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-teal-600/90 hover:bg-teal-600 disabled:bg-stone-200 disabled:text-slate-400 text-white font-bold text-sm shadow-2xs transition flex items-center justify-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>
              {isSavingsCat && savingsType === 'deposit'
                ? '積立を記録する'
                : '支出を記録する'}
              {amountStr && parseInt(amountStr, 10) > 0
                ? ` (${formatYen(parseInt(amountStr, 10))})`
                : ''}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}
