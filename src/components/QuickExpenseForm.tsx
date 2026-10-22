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
  Coins,
  ArrowDownCircle,
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
  onSelectCategoryId?: (id: CategoryId) => void;
  initialTxType?: 'expense' | 'income';
  onAddTransaction: (input: {
    date: string;
    type?: 'expense' | 'income';
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

const INCOME_MEMO_SUGGESTIONS: string[] = [
  '月の途中の追加入金',
  '当月分の経費入金',
  '臨時経費の追加補充',
  '予算不足分の追加補填',
];

export function QuickExpenseForm({
  categories,
  currentCycle,
  selectedCategoryId,
  onSelectCategoryId,
  initialTxType = 'expense',
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

  const [txType, setTxType] = useState<'expense' | 'income'>(initialTxType);
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
    setTxType(initialTxType);
  }, [initialTxType]);

  // 親から渡された selectedCategoryId が変化した時のみ同期
  useEffect(() => {
    if (
      selectedCategoryId &&
      categories.some((c) => c.id === selectedCategoryId)
    ) {
      setCategoryId(selectedCategoryId);
    }
  }, [selectedCategoryId, categories]);

  // 選択中の科目がリストから削除された場合の安全策フォールバック
  useEffect(() => {
    if (
      categories.length > 0 &&
      !categories.some((c) => c.id === categoryId)
    ) {
      const fallback = categories[0].id;
      setCategoryId(fallback);
      onSelectCategoryId?.(fallback);
    }
  }, [categories, categoryId, onSelectCategoryId]);

  const handleSelectCategory = (newCatId: CategoryId) => {
    setCategoryId(newCatId);
    onSelectCategoryId?.(newCatId);
  };

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

  const targetCycleId = getCycleIdFromDate(date, 25, [currentCycle]);
  const isDifferentCycle = targetCycleId !== currentCycle.cycleId;
  const billingMonth =
    txType === 'expense' && isCreditCat ? getBillingMonthForDate(date) : null;

  const suggestions =
    txType === 'income'
      ? INCOME_MEMO_SUGGESTIONS
      : DEFAULT_MEMO_SUGGESTIONS[categoryId] ||
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
      type: txType,
      categoryId,
      amount: numericAmount,
      memo: memo.trim(),
      savingsType:
        txType === 'expense' && isSavingsCat ? savingsType : undefined,
    });

    setAmountStr('');
    setMemo('');
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);

    if (isModal && onCloseModal) {
      onCloseModal();
    }
  };

  const quickAmounts =
    txType === 'income'
      ? [1000, 3000, 5000, 10000, 20000]
      : [100, 500, 1000, 3000, 5000];

  return (
    <div
      className={`bg-white/95 rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden ${
        isModal ? 'w-full max-w-lg mx-auto shadow-xl border-stone-300/80' : ''
      }`}
    >
      {/* Header - Soft Pastel Mint / Emerald */}
      <div
        className={`border-b px-5 py-3.5 flex items-center justify-between transition-colors ${
          txType === 'income'
            ? 'bg-gradient-to-r from-emerald-50/95 to-teal-50/80 border-emerald-200/70'
            : 'bg-gradient-to-r from-teal-50/90 to-emerald-50/70 border-teal-200/60'
        }`}
      >
        <div className="flex items-center gap-2">
          {txType === 'income' ? (
            <Coins className="w-5 h-5 text-emerald-600" />
          ) : (
            <PlusCircle className="w-5 h-5 text-teal-600" />
          )}
          <h2 className="font-bold text-sm sm:text-base text-slate-700">
            {txType === 'income'
              ? '経費の入金・追加補充（クイック入金）'
              : '支出・入金のクイック登録'}
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
        {/* Mode Switcher: 支出を記録 vs 経費を入金（追加） */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#f5f2ec] border border-stone-200/80">
          <button
            type="button"
            onClick={() => setTxType('expense')}
            className={`py-2 px-3 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition ${
              txType === 'expense'
                ? 'bg-white text-slate-800 shadow-2xs border border-stone-200/70'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <PlusCircle className="w-4 h-4 text-teal-600" />
            <span>支出を記録</span>
          </button>
          <button
            type="button"
            onClick={() => setTxType('income')}
            className={`py-2 px-3 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition ${
              txType === 'income'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-emerald-700 hover:bg-emerald-50/70'
            }`}
          >
            <ArrowDownCircle className="w-4 h-4" />
            <span>経費を入金（追加）</span>
          </button>
        </div>

        {txType === 'income' && (
          <div className="px-3.5 py-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200/70 text-xs text-emerald-900 font-medium leading-relaxed">
            月の途中の追加入金や月初の入金を記録します。選択した科目の予算枠と当月総予算に自動加算され、<strong>収支履歴にも入金履歴として反映</strong>されます。
          </div>
        )}

        {/* Category Selector Pills */}
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-2">
            {txType === 'income'
              ? '1. 入金先の科目を選択（予算を追加する科目）'
              : '1. 科目を選択'}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {categories.map((cat) => {
              const active = categoryId === cat.id;
              const meta = getCategoryStyle(cat);
              const currentAlloc =
                (currentCycle.allocations[cat.id]?.base || 0) +
                (currentCycle.allocations[cat.id]?.carryover || 0);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleSelectCategory(cat.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition text-left ${
                    active
                      ? txType === 'income'
                        ? 'bg-emerald-50/90 text-emerald-950 border-emerald-400 shadow-2xs ring-2 ring-emerald-200/70'
                        : 'bg-teal-50/90 text-teal-900 border-teal-300 shadow-2xs ring-2 ring-teal-200/70'
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
                  <div className="min-w-0 flex-1">
                    <div className="truncate">{cat.name}</div>
                    {txType === 'income' && (
                      <div className="text-[10px] font-medium text-slate-400 truncate">
                        枠: {formatYen(currentAlloc)}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Special Option when Savings is selected (Expense mode only): 取り崩し vs 直接積立 */}
        {txType === 'expense' && isSavingsCat && (
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
                <span>{txType === 'income' ? '2. 入金日' : '2. 日付'}</span>
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
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
                    className="text-[11px] font-semibold text-emerald-700 hover:underline"
                  >
                    {txType === 'income' ? '入金日' : '開始日'}
                    ({currentCycle.startDate.slice(5).replace('-', '/')})
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
                <span>
                  {txType === 'income' ? '3. 入金額（円）' : '3. 金額（円）'}
                </span>
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
                placeholder={txType === 'income' ? '例: 10000' : '例: 3200'}
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                required
                className="w-full pl-8 pr-4 py-2 rounded-xl border border-stone-200 bg-[#faf8f5] focus:bg-white text-base font-extrabold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-300"
              />
            </div>

            {/* Quick Amount Buttons */}
            <div className="mt-1.5 flex items-center flex-wrap gap-1.5">
              {quickAmounts.map((val) => (
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
              <span>
                {txType === 'income'
                  ? '4. 入金メモ（理由・内訳など）'
                  : '4. メモ（品名・購入先など）'}
              </span>
              <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                必須
              </span>
            </label>
          </div>
          <input
            type="text"
            required
            placeholder={
              txType === 'income'
                ? '例: 月の途中の追加入金 / 食材費の追加補充'
                : '例: スーパー買い出し / Amazon 日用品・書籍など'
            }
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
              収支履歴に反映しました！
            </span>
          )}
          <button
            type="submit"
            disabled={
              !amountStr ||
              parseInt(amountStr, 10) <= 0 ||
              !memo.trim()
            }
            className={`w-full sm:w-auto px-6 py-2.5 rounded-xl disabled:bg-stone-200 disabled:text-slate-400 text-white font-bold text-sm shadow-2xs transition flex items-center justify-center gap-2 ${
              txType === 'income'
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-teal-600/90 hover:bg-teal-600'
            }`}
          >
            {txType === 'income' ? (
              <ArrowDownCircle className="w-4 h-4" />
            ) : (
              <PlusCircle className="w-4 h-4" />
            )}
            <span>
              {txType === 'income'
                ? `${currentCatObj?.name || '科目'}へ追加入金する`
                : isSavingsCat && savingsType === 'deposit'
                ? '積立を記録する'
                : '支出を記録する'}
              {amountStr && parseInt(amountStr, 10) > 0
                ? ` (${txType === 'income' ? '+' : ''}${formatYen(
                    parseInt(amountStr, 10)
                  )})`
                : ''}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}
