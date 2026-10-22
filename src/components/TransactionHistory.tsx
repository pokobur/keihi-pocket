'use client';

import React, { useState, useMemo } from 'react';
import {
  Receipt,
  CreditCard,
  Search,
  Edit3,
  Trash2,
  Check,
  X,
  Filter,
  Calendar,
  Wallet,
} from 'lucide-react';
import {
  CategoryConfig,
  CategoryId,
  MonthlyCycle,
  NetPaymentBillingSummary,
  Transaction,
} from '@/types';
import { formatYen, getCycleDateRange } from '@/lib/calculations';
import { CategoryIcon, getCategoryStyle } from '@/components/CategoryIcon';

export type TransactionFilterType =
  | 'all'
  | 'income_only'
  | CategoryId
  | 'net_closing_confirmed'
  | 'net_closing_unconfirmed';

interface TransactionHistoryProps {
  currentCycle: MonthlyCycle;
  allTransactions: Transaction[];
  categories: CategoryConfig[];
  netBilling: NetPaymentBillingSummary;
  selectedFilter: TransactionFilterType;
  newlyAddedTxId?: string | null;
  onSelectFilter: (filter: TransactionFilterType) => void;
  onSelectCycle?: (cycleId: string) => void;
  onUpdateTransaction: (
    id: string,
    updates: {
      date?: string;
      type?: 'expense' | 'income';
      categoryId?: CategoryId;
      amount?: number;
      memo?: string;
      savingsType?: 'withdrawal' | 'deposit';
    }
  ) => void;
  onDeleteTransaction: (id: string) => void;
}

export function TransactionHistory({
  currentCycle,
  allTransactions,
  categories,
  netBilling,
  selectedFilter,
  newlyAddedTxId,
  onSelectFilter,
  onSelectCycle,
  onUpdateTransaction,
  onDeleteTransaction,
}: TransactionHistoryProps) {
  const [scope, setScope] = useState<'cycle' | 'all_cycles'>('cycle');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editCategory, setEditCategory] = useState<CategoryId>('food');
  const [editSavingsType, setEditSavingsType] = useState<
    'withdrawal' | 'deposit'
  >('withdrawal');
  const [editAmount, setEditAmount] = useState('');
  const [editMemo, setEditMemo] = useState('');

  const { titleLabel, rangeLabel } = getCycleDateRange(
    currentCycle.cycleId,
    currentCycle
  );

  const creditIds = useMemo(() => {
    const set = new Set(
      categories.filter((c) => c.isCredit).map((c) => c.id)
    );
    if (set.size === 0) set.add('net_payment');
    return set;
  }, [categories]);

  const filteredTransactions = useMemo(() => {
    let list: Transaction[] = [];

    if (selectedFilter === 'net_closing_confirmed') {
      list = allTransactions.filter(
        (t) =>
          t.type !== 'income' &&
          creditIds.has(t.categoryId) &&
          t.date >= netBilling.currentClosingPeriodStart &&
          t.date <= netBilling.currentClosingPeriodEnd
      );
    } else if (selectedFilter === 'net_closing_unconfirmed') {
      list = allTransactions.filter(
        (t) =>
          t.type !== 'income' &&
          creditIds.has(t.categoryId) &&
          t.date >= netBilling.nextClosingPeriodStart &&
          t.date <= netBilling.nextClosingPeriodEnd
      );
    } else if (selectedFilter === 'income_only') {
      list =
        scope === 'cycle'
          ? allTransactions.filter(
              (t) => t.cycleId === currentCycle.cycleId && t.type === 'income'
            )
          : allTransactions.filter((t) => t.type === 'income');
    } else if (selectedFilter === 'all') {
      list =
        scope === 'cycle'
          ? allTransactions.filter((t) => t.cycleId === currentCycle.cycleId)
          : allTransactions;
    } else {
      list =
        scope === 'cycle'
          ? allTransactions.filter(
              (t) =>
                t.cycleId === currentCycle.cycleId &&
                t.categoryId === selectedFilter
            )
          : allTransactions.filter((t) => t.categoryId === selectedFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (t) =>
          t.memo.toLowerCase().includes(q) ||
          String(t.amount).includes(q) ||
          t.date.includes(q)
      );
    }

    return [...list].sort((a, b) => {
      const cmp = b.date.localeCompare(a.date);
      if (cmp !== 0) return cmp;
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [
    allTransactions,
    currentCycle.cycleId,
    selectedFilter,
    netBilling,
    searchQuery,
    creditIds,
    scope,
  ]);

  const { filteredIncomeTotal, filteredExpenseTotal } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    for (const t of filteredTransactions) {
      if (t.type === 'income') {
        inc += t.amount;
      } else {
        exp += t.amount;
      }
    }
    return { filteredIncomeTotal: inc, filteredExpenseTotal: exp };
  }, [filteredTransactions]);

  const startEdit = (tx: Transaction) => {
    setEditingId(tx.id);
    setEditDate(tx.date);
    setEditCategory(tx.categoryId);
    setEditSavingsType(tx.savingsType || 'withdrawal');
    setEditAmount(tx.amount === 0 ? '' : String(tx.amount));
    setEditMemo(tx.memo);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = (id: string) => {
    const amt = parseInt(editAmount, 10);
    if (!editDate || !amt || amt <= 0) return;
    const catObj = categories.find((c) => c.id === editCategory);
    const targetTx = allTransactions.find((t) => t.id === id);
    onUpdateTransaction(id, {
      date: editDate,
      type: targetTx?.type || 'expense',
      categoryId: editCategory,
      amount: amt,
      memo: editMemo.trim(),
      savingsType:
        targetTx?.type !== 'income' && catObj?.isSavings
          ? editSavingsType
          : undefined,
    });
    setEditingId(null);
  };

  const editCatObj = categories.find((c) => c.id === editCategory);

  return (
    <section className="bg-white/95 rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
      {/* Header - Soft Tone */}
      <div className="p-4 sm:p-5 border-b border-stone-200/70 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200/60 text-teal-600 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-700">
                収支履歴（トランザクション一覧）
              </h2>
              <p className="text-xs text-slate-400">
                {selectedFilter === 'net_closing_confirmed'
                  ? `カード10日締め確定対象期間: ${netBilling.currentClosingPeriodStart} 〜 ${netBilling.currentClosingPeriodEnd}`
                  : selectedFilter === 'net_closing_unconfirmed'
                  ? `カード11日以降利用分（翌月10日締め予定）: ${netBilling.nextClosingPeriodStart} 〜 ${netBilling.nextClosingPeriodEnd}`
                  : `${titleLabel} (${rangeLabel}) の明細を日付降順で表示`}
              </p>
            </div>
          </div>

          {/* Scope Selector & Summary Pill */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center p-1 rounded-xl bg-stone-100 border border-stone-200/80 text-xs font-bold">
              <button
                type="button"
                onClick={() => setScope('cycle')}
                className={`px-3 py-1 rounded-lg transition ${
                  scope === 'cycle'
                    ? 'bg-white text-teal-800 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                当月 ({titleLabel})
              </button>
              <button
                type="button"
                onClick={() => setScope('all_cycles')}
                className={`px-3 py-1 rounded-lg transition ${
                  scope === 'all_cycles'
                    ? 'bg-white text-teal-800 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                全期間 ({allTransactions.length}件)
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 bg-[#faf8f5] px-3.5 py-1.5 rounded-xl border border-stone-200/80">
              <span className="text-xs font-semibold text-slate-500">
                表示 {filteredTransactions.length} 件
              </span>
              {filteredIncomeTotal > 0 && (
                <span className="text-xs sm:text-sm font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200/80">
                  入金 +{formatYen(filteredIncomeTotal)}
                </span>
              )}
              {(filteredExpenseTotal > 0 || filteredIncomeTotal === 0) && (
                <span className="text-xs sm:text-sm font-extrabold text-slate-700">
                  支出 {formatYen(filteredExpenseTotal)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center flex-wrap gap-1.5">
            <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              絞り込み:
            </span>

            <button
              type="button"
              onClick={() => onSelectFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                selectedFilter === 'all'
                  ? 'bg-teal-600/90 text-white border-teal-600 shadow-2xs'
                  : 'bg-[#faf8f5] hover:bg-stone-100 text-slate-600 border-stone-200/80'
              }`}
            >
              すべて
            </button>

            <button
              type="button"
              onClick={() =>
                onSelectFilter(
                  selectedFilter === 'income_only' ? 'all' : 'income_only'
                )
              }
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                selectedFilter === 'income_only'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                  : 'bg-emerald-50/70 hover:bg-emerald-100/80 text-emerald-800 border-emerald-200/80'
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>入金履歴</span>
            </button>

            {categories.map((cat) => {
              const active = selectedFilter === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onSelectFilter(active ? 'all' : cat.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                    active
                      ? 'bg-teal-600/90 text-white border-teal-600 shadow-2xs'
                      : 'bg-white hover:bg-stone-50 text-slate-600 border-stone-200/80'
                  }`}
                >
                  <CategoryIcon
                    categoryId={cat.id}
                    category={cat}
                    className="w-3.5 h-3.5"
                  />
                  <span>{cat.name}</span>
                </button>
              );
            })}

            {/* Special Credit Card 10th Closing Period Filters */}
            <button
              type="button"
              onClick={() =>
                onSelectFilter(
                  selectedFilter === 'net_closing_confirmed'
                    ? 'all'
                    : 'net_closing_confirmed'
                )
              }
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                selectedFilter === 'net_closing_confirmed'
                  ? 'bg-indigo-200/90 text-indigo-900 border-indigo-300 shadow-2xs'
                  : 'bg-indigo-50/60 hover:bg-indigo-100/70 text-indigo-700 border-indigo-200/60'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>
                10日締め期間 (
                {netBilling.currentClosingPeriodStart
                  .slice(5)
                  .replace('-', '/')}
                〜
                {netBilling.currentClosingPeriodEnd
                  .slice(5)
                  .replace('-', '/')}
                )
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                onSelectFilter(
                  selectedFilter === 'net_closing_unconfirmed'
                    ? 'all'
                    : 'net_closing_unconfirmed'
                )
              }
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                selectedFilter === 'net_closing_unconfirmed'
                  ? 'bg-indigo-200/90 text-indigo-900 border-indigo-300 shadow-2xs'
                  : 'bg-[#faf8f5] hover:bg-stone-100 text-indigo-600 border-stone-200/80'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>11日以降利用分（翌月10日締予定）</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full lg:w-60 shrink-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="メモ・金額・日付で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 rounded-xl border border-stone-200/80 bg-[#faf8f5] focus:bg-white text-xs sm:text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-300"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="divide-y divide-stone-100">
        {filteredTransactions.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-[#faf8f5] border border-stone-200/70 text-slate-400 flex items-center justify-center mx-auto">
              <Receipt className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-600">
              該当する収支明細がありません
            </p>
            <p className="text-xs text-slate-400">
              「支出クイック登録」から日々の支出を記録すると、ここに日付降順で表示されます。
            </p>
          </div>
        ) : (
          filteredTransactions.map((tx) => {
            const cat = categories.find((c) => c.id === tx.categoryId);
            const meta = getCategoryStyle(cat || tx.categoryId, categories);
            const isEditing = editingId === tx.id;
            const isFromPrevCycle = tx.cycleId !== currentCycle.cycleId;

            if (isEditing) {
              const isEditingIncome = tx.type === 'income';
              return (
                <div
                  key={tx.id}
                  className={`p-4 border-l-4 space-y-3 ${
                    isEditingIncome
                      ? 'bg-emerald-50/50 border-l-emerald-500'
                      : 'bg-teal-50/40 border-l-teal-400'
                  }`}
                >
                  <div
                    className={`text-xs font-bold ${
                      isEditingIncome ? 'text-emerald-800' : 'text-teal-800'
                    }`}
                  >
                    {isEditingIncome
                      ? '💰 入金明細を編集中（保存時に科目の予算枠へ自動反映）'
                      : '明細を編集中'}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                    <div className="sm:col-span-3">
                      <input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-xs sm:text-sm font-semibold text-slate-700"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-xs sm:text-sm font-bold text-slate-700"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    {!isEditingIncome && editCatObj?.isSavings && (
                      <div className="sm:col-span-2">
                        <select
                          value={editSavingsType}
                          onChange={(e) =>
                            setEditSavingsType(
                              e.target.value as 'withdrawal' | 'deposit'
                            )
                          }
                          className="w-full px-2 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-xs font-bold text-amber-800"
                        >
                          <option value="withdrawal">取崩し</option>
                          <option value="deposit">直接積立</option>
                        </select>
                      </div>
                    )}
                    <div
                      className={
                        !isEditingIncome && editCatObj?.isSavings
                          ? 'sm:col-span-2'
                          : 'sm:col-span-3'
                      }
                    >
                      <input
                        type="number"
                        min={1}
                        placeholder="0"
                        value={editAmount}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) =>
                          setEditAmount(e.target.value.replace(/^0+(?=\d)/, ''))
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-xs sm:text-sm font-bold text-slate-700"
                      />
                    </div>
                    <div
                      className={
                        !isEditingIncome && editCatObj?.isSavings
                          ? 'sm:col-span-2'
                          : 'sm:col-span-3'
                      }
                    >
                      <input
                        type="text"
                        value={editMemo}
                        onChange={(e) => setEditMemo(e.target.value)}
                        placeholder="メモ"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-xs sm:text-sm text-slate-700"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-stone-200 text-slate-600 text-xs font-semibold hover:bg-stone-50"
                    >
                      <X className="w-3.5 h-3.5" />
                      キャンセル
                    </button>
                    <button
                      type="button"
                      onClick={() => saveEdit(tx.id)}
                      className="inline-flex items-center gap-1 px-4 py-1.5 rounded-lg bg-teal-600/90 text-white text-xs font-bold hover:bg-teal-600"
                    >
                      <Check className="w-3.5 h-3.5" />
                      保存する
                    </button>
                  </div>
                </div>
              );
            }

            const isNew = newlyAddedTxId === tx.id;
            const isIncome = tx.type === 'income';
            const isSavingsDeposit =
              !isIncome && cat?.isSavings && tx.savingsType === 'deposit';
            const isSavingsWithdrawal =
              !isIncome && cat?.isSavings && tx.savingsType !== 'deposit';
            const isCredit =
              !isIncome && (cat?.isCredit || tx.categoryId === 'net_payment');

            return (
              <div
                key={tx.id}
                id={`tx-row-${tx.id}`}
                className={`p-3.5 sm:px-5 transition-all duration-500 flex items-center justify-between gap-3 ${
                  isNew
                    ? 'bg-teal-50/90 ring-2 ring-teal-400/80 shadow-md rounded-xl'
                    : isIncome
                    ? 'bg-emerald-50/25 hover:bg-emerald-50/50'
                    : 'hover:bg-[#faf8f5]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl ${meta.iconBg} ${meta.iconColor} flex items-center justify-center shrink-0 shadow-2xs`}
                  >
                    <CategoryIcon
                      categoryId={tx.categoryId}
                      category={cat}
                      categories={categories}
                      className="w-5 h-5"
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center flex-wrap gap-1.5">
                      <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {tx.date}
                      </span>

                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${meta.badgeBg} ${meta.badgeText}`}
                      >
                        {cat?.name || tx.categoryId}
                      </span>

                      {/* 経費フローバッジ */}
                      {isIncome ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                          <Wallet className="w-2.5 h-2.5" />
                          入金 ＋
                        </span>
                      ) : isSavingsDeposit ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                          積立 ＋
                        </span>
                      ) : isSavingsWithdrawal ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200">
                          取崩 −
                        </span>
                      ) : isCredit ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                          <CreditCard className="w-2.5 h-2.5" />
                          クレカ決済 −
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
                          出金 −
                        </span>
                      )}

                      {tx.billingMonth && !isIncome && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50/70 text-indigo-600 border border-indigo-200/60">
                          {tx.billingMonth.slice(5).replace('-', '/')}締対象
                        </span>
                      )}

                      {isFromPrevCycle && (
                        <button
                          type="button"
                          onClick={() => onSelectCycle?.(tx.cycleId)}
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition"
                          title="このサイクルに移動"
                        >
                          {tx.cycleId}月度 ↗
                        </button>
                      )}

                      {isNew && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-teal-600 text-white shadow-2xs animate-pulse">
                          ✨ 登録完了
                        </span>
                      )}
                    </div>

                    <p className="text-sm font-semibold text-slate-800 truncate mt-1">
                      {tx.memo ||
                        (isIncome
                          ? `${cat?.name || '科目'}への追加入金`
                          : `${cat?.name || '科目'}の支出`)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <span
                      className={`text-base sm:text-lg font-black tracking-tight ${
                        isIncome
                          ? 'text-emerald-600'
                          : isSavingsDeposit
                          ? 'text-teal-600'
                          : isCredit
                          ? 'text-indigo-900'
                          : 'text-slate-700'
                      }`}
                    >
                      {isIncome || isSavingsDeposit
                        ? `+${formatYen(tx.amount)}`
                        : `-${formatYen(tx.amount)}`}
                    </span>
                    <div className="text-[10px] font-semibold text-slate-400">
                      {isIncome
                        ? '予算枠へ追加'
                        : isSavingsDeposit
                        ? '貯金枠へ振替'
                        : isCredit
                        ? '次回口座引落'
                        : '予算消化'}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(tx)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-stone-100 transition"
                      title="編集"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteTransaction(tx.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50/70 transition"
                      title="削除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
