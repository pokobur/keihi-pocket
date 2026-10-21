'use client';

import React from 'react';
import {
  Wallet,
  ChevronLeft,
  ChevronRight,
  CalendarClock,
  CreditCard,
  ArrowRightLeft,
  Settings,
  Database,
  Sparkles,
  PiggyBank,
  PlusCircle,
  AlertCircle,
  FolderPlus,
} from 'lucide-react';
import {
  calculateCountdowns,
  formatYen,
  getAdjacentCycleId,
  getCycleDateRange,
  getCycleIdFromDate,
} from '@/lib/calculations';
import { MonthlyCycle, NetPaymentBillingSummary } from '@/types';

interface CycleHeaderProps {
  cycle: MonthlyCycle;
  onSelectCycle: (cycleId: string) => void;
  nonSavingsCount: number;
  fourCategoriesBudget: number;
  fourCategoriesSpent: number;
  fourCategoriesRemaining: number;
  fourCategoriesUsageRate: number;
  savingsConfirmed: number;
  cumulativeSavings: number;
  unallocatedCarryover: number;
  netBilling: NetPaymentBillingSummary;
  onOpenBudgetModal: (
    initialTab: 'carryover' | 'transfer' | 'base' | 'categories'
  ) => void;
  onOpenDataModal: () => void;
  onOpenQuickExpenseModal: () => void;
}

export function CycleHeader({
  cycle,
  onSelectCycle,
  nonSavingsCount,
  fourCategoriesBudget,
  fourCategoriesSpent,
  fourCategoriesRemaining,
  fourCategoriesUsageRate,
  savingsConfirmed,
  cumulativeSavings,
  unallocatedCarryover,
  netBilling,
  onOpenBudgetModal,
  onOpenDataModal,
  onOpenQuickExpenseModal,
}: CycleHeaderProps) {
  const { titleLabel, rangeLabel } = getCycleDateRange(cycle.cycleId);
  const countdowns = calculateCountdowns();
  const todayCycleId = getCycleIdFromDate(countdowns.todayStr);

  const prevCycleId = getAdjacentCycleId(cycle.cycleId, -1);
  const nextCycleId = getAdjacentCycleId(cycle.cycleId, 1);

  const clampedUsage = Math.min(100, Math.max(0, fourCategoriesUsageRate));
  const isOverBudget = fourCategoriesRemaining < 0;
  const isWarning = !isOverBudget && fourCategoriesUsageRate >= 80;

  return (
    <header className="space-y-4">
      {/* Top Navbar - Soft & Gentle Tone */}
      <div className="bg-white/90 backdrop-blur-xs rounded-2xl shadow-xs px-4 py-3.5 sm:px-6 sm:py-4 flex flex-wrap items-center justify-between gap-3 border border-stone-200/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-100 to-emerald-100 border border-teal-200/60 flex items-center justify-center shadow-2xs">
            <Wallet className="w-5 h-5 text-teal-600" />
          </div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-700">
            経費ポケット
          </h1>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onOpenBudgetModal('carryover')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-teal-50 hover:bg-teal-100/80 text-teal-800 border border-teal-200/80 transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span>繰越金振り分け</span>
            {unallocatedCarryover !== 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold">
                未振分 {formatYen(unallocatedCarryover)}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onOpenBudgetModal('transfer')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-sky-50/70 hover:bg-sky-100/70 text-sky-800 border border-sky-200/70 transition"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-sky-500" />
            <span>期中予算振替</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenBudgetModal('categories')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-orange-50/70 hover:bg-orange-100/70 text-orange-800 border border-orange-200/70 transition"
          >
            <FolderPlus className="w-3.5 h-3.5 text-orange-500" />
            <span>科目の編集・追加</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenBudgetModal('base')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-stone-100/80 hover:bg-stone-200/70 text-slate-700 border border-stone-200/80 transition"
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden md:inline">基本予算設定</span>
            <span className="md:hidden">予算</span>
          </button>

          <button
            type="button"
            onClick={onOpenDataModal}
            className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-medium bg-stone-100/60 hover:bg-stone-200/60 text-slate-600 border border-stone-200/70 transition"
            title="JSONデータの入出力・バックアップ"
          >
            <Database className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden lg:inline">データ管理</span>
          </button>
        </div>
      </div>

      {/* Unallocated Carryover Alert Banner */}
      {unallocatedCarryover !== 0 && (
        <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-amber-800">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-medium">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              前月からの繰越金に
              <strong className=" mx-1">
                未振分け残高（{formatYen(unallocatedCarryover)}）
              </strong>
              があります。各科目へ振り分けましょう。
            </span>
          </div>
          <button
            type="button"
            onClick={() => onOpenBudgetModal('carryover')}
            className="px-3.5 py-1.5 rounded-xl bg-amber-200/80 hover:bg-amber-300/80 text-amber-900 text-xs font-bold transition"
          >
            振り分け画面を開く
          </button>
        </div>
      )}

      {/* Main Summary Card */}
      <div className="bg-white/95 rounded-2xl shadow-xs border border-stone-200/80 overflow-hidden">
        {/* Cycle Selector Bar */}
        <div className="bg-[#f7f5f0] border-b border-stone-200/70 px-4 py-3 sm:px-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onSelectCycle(prevCycleId)}
              className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-stone-50 text-slate-600 border border-stone-200/80 shadow-2xs transition flex items-center gap-1 text-xs font-medium"
              title="前のサイクルへ"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">前月</span>
            </button>

            <div className="px-3.5 py-1.5 rounded-xl bg-white border border-stone-200/80 shadow-2xs flex items-center gap-2">
              <span className="text-sm sm:text-base font-bold text-slate-700">
                {titleLabel}
              </span>
              <span className="text-xs sm:text-sm font-semibold text-teal-700 bg-teal-50/80 px-2.5 py-0.5 rounded-lg border border-teal-200/60">
                {rangeLabel}
              </span>
            </div>

            <button
              type="button"
              onClick={() => onSelectCycle(nextCycleId)}
              className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-stone-50 text-slate-600 border border-stone-200/80 shadow-2xs transition flex items-center gap-1 text-xs font-medium"
              title="次のサイクルへ"
            >
              <span className="hidden sm:inline">翌月</span>
              <ChevronRight className="w-4 h-4" />
            </button>

            {cycle.cycleId !== '2026-10' && (
              <button
                type="button"
                onClick={() => onSelectCycle('2026-10')}
                className="text-xs font-semibold text-teal-700 hover:text-teal-900 px-2.5 py-1 rounded-lg hover:bg-teal-50/70 transition"
              >
                2026年10月度へ
              </button>
            )}
            {cycle.cycleId !== todayCycleId && todayCycleId !== '2026-10' && (
              <button
                type="button"
                onClick={() => onSelectCycle(todayCycleId)}
                className="text-xs font-medium text-slate-500 hover:text-slate-700 px-2.5 py-1 rounded-lg hover:bg-stone-200/50 transition"
              >
                現在日サイクル ({todayCycleId})
              </button>
            )}
          </div>

          {/* Countdowns (10th closing & 25th payday) */}
          <div className="flex items-center flex-wrap gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-50/70 border border-indigo-200/60 text-indigo-800 text-xs font-medium">
              <CreditCard className="w-3.5 h-3.5 text-indigo-400" />
              <span>10日締めまで</span>
              <span className="font-bold text-indigo-700 text-sm">
                {countdowns.daysUntilClosing10 === 0
                  ? '本日締め日'
                  : `あと${countdowns.daysUntilClosing10}日`}
              </span>
              <span className="text-[10px] text-indigo-400">
                ({countdowns.nextClosingLabel})
              </span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-teal-50/70 border border-teal-200/60 text-teal-800 text-xs font-medium">
              <CalendarClock className="w-3.5 h-3.5 text-teal-500" />
              <span>次回入金(25日)まで</span>
              <span className="font-bold text-teal-700 text-sm">
                {countdowns.daysUntilPayday25 === 0
                  ? '本日入金日'
                  : `あと${countdowns.daysUntilPayday25}日`}
              </span>
              <span className="text-[10px] text-teal-500">
                ({countdowns.nextPaydayLabel})
              </span>
            </div>
          </div>
        </div>

        {/* Hero KPI Grid - Pale Pastel Tone */}
        <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Primary Focus: 現在の使えるお金 */}
          <div className="lg:col-span-6 bg-gradient-to-br from-emerald-50/90 via-teal-50/60 to-amber-50/40 rounded-2xl p-5 flex flex-col justify-between border border-teal-200/60 shadow-2xs">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-800 bg-white/80 border border-teal-200/70 px-3 py-0.5 rounded-full">
                  現在の使えるお金（{nonSavingsCount}科目残高合計）
                </span>
                <div className="mt-2.5 flex items-baseline gap-3 flex-wrap">
                  <span
                    className={`text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight ${
                      isOverBudget
                        ? 'text-rose-500'
                        : isWarning
                        ? 'text-amber-600'
                        : 'text-teal-900'
                    }`}
                  >
                    {formatYen(fourCategoriesRemaining)}
                  </span>
                  <span className="text-xs sm:text-sm text-slate-500 font-medium">
                    / 予算枠 {formatYen(fourCategoriesBudget)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenQuickExpenseModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600/90 hover:bg-teal-600 text-white font-bold text-xs shadow-2xs transition shrink-0"
              >
                <PlusCircle className="w-4 h-4" />
                <span>支出を記録</span>
              </button>
            </div>

            {/* Progress Bar */}
            <div className="mt-5 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">
                  消化済み合計:{' '}
                  <strong className="text-slate-800 font-bold">
                    {formatYen(fourCategoriesSpent)}
                  </strong>
                </span>
                <span
                  className={`font-bold ${
                    isOverBudget
                      ? 'text-rose-500'
                      : isWarning
                      ? 'text-amber-600'
                      : 'text-teal-700'
                  }`}
                >
                  消化率 {fourCategoriesUsageRate.toFixed(1)}%
                </span>
              </div>
              <div className="w-full h-2.5 bg-white/90 rounded-full overflow-hidden border border-teal-200/60">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isOverBudget
                      ? 'bg-rose-400'
                      : isWarning
                      ? 'bg-amber-400'
                      : 'bg-teal-400'
                  }`}
                  style={{ width: `${clampedUsage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Secondary Info: 当月総予算 & クレカ10日締め確定額 & 貯金 */}
          <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* 当月総予算カード */}
            <div className="bg-[#faf8f5] rounded-2xl p-4 border border-stone-200/80 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">
                    当月総予算（原資合計）
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpenBudgetModal('carryover')}
                    className="text-[11px] font-semibold text-teal-700 hover:underline"
                  >
                    内訳・繰越設定 →
                  </button>
                </div>
                <div className="mt-1.5 text-2xl font-extrabold text-slate-700">
                  {formatYen(cycle.income + cycle.carryoverTotal)}
                </div>
                <div className="mt-1 inline-flex items-center flex-wrap gap-1 text-xs font-medium text-slate-600 bg-white px-2.5 py-1 rounded-xl border border-stone-200/70">
                  <span>定額 {formatYen(cycle.income)}</span>
                  <span className="text-slate-400">+</span>
                  <span className="text-teal-700 font-bold">
                    繰越 {formatYen(cycle.carryoverTotal)}
                  </span>
                </div>
                {cycle.incomeMemo && (
                  <p className="mt-1 text-[11px] text-slate-500 truncate">
                    ※ {cycle.incomeMemo}
                  </p>
                )}
              </div>

              <div className="mt-3 pt-2.5 border-t border-stone-200/70 flex items-center justify-between text-xs">
                <span className="text-slate-600 flex items-center gap-1 font-medium">
                  <PiggyBank className="w-3.5 h-3.5 text-amber-500" />
                  今月の貯金枠:
                </span>
                <div className="text-right">
                  <span className="font-bold text-amber-700">
                    {formatYen(savingsConfirmed)}
                  </span>
                  <span className="text-[11px] text-slate-400 ml-1">
                    (累計 {formatYen(cumulativeSavings)})
                  </span>
                </div>
              </div>
            </div>

            {/* ネット決済費（10日締め）サマリーカード */}
            <div className="bg-indigo-50/40 rounded-2xl p-4 border border-indigo-200/60 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-800 flex items-center gap-1">
                    <CreditCard className="w-3.5 h-3.5 text-indigo-400" />
                    カード請求確定額（10日締め）
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100/80 text-indigo-700">
                    毎月10日締
                  </span>
                </div>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold text-indigo-900">
                    {formatYen(netBilling.confirmedAmount)}
                  </span>
                  <span className="text-[11px] font-semibold text-indigo-600">
                    ({netBilling.currentClosingDate.slice(5).replace('-', '/')}締確定)
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-indigo-600/80">
                  対象: {netBilling.currentClosingPeriodStart.slice(5).replace('-', '/')} 〜{' '}
                  {netBilling.currentClosingPeriodEnd.slice(5).replace('-', '/')} 利用分
                </p>
                <div className="mt-1 text-[11px] text-slate-500 flex items-center gap-2">
                  <span>
                    前月後半: <strong>{formatYen(netBilling.confirmedFromPrevCycle)}</strong>
                  </span>
                  <span>+</span>
                  <span>
                    当月10日迄: <strong>{formatYen(netBilling.confirmedFromCurrentCycle)}</strong>
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-indigo-200/50 flex items-center justify-between text-xs">
                <span className="text-indigo-800 font-medium">
                  11日以降利用分 (翌月締予定):
                </span>
                <span className="font-bold text-indigo-700 bg-white/90 px-2 py-0.5 rounded-lg border border-indigo-200/60">
                  {formatYen(netBilling.unconfirmedAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
