'use client';

import React, { useState } from 'react';
import {
  Plus,
  Filter,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  CreditCard,
  PiggyBank,
  ArrowRightLeft,
  Edit2,
  Check,
  X,
  FolderPlus,
} from 'lucide-react';
import {
  CategoryIconKey,
  CategoryId,
  CategorySummary,
  NetPaymentBillingSummary,
} from '@/types';
import { formatYen } from '@/lib/calculations';
import {
  CategoryIcon,
  getCategoryIconKey,
  getCategoryStyle,
  ICON_MAP,
  ICON_OPTIONS,
} from '@/components/CategoryIcon';

interface CategoryCardsProps {
  summaries: CategorySummary[];
  netBilling: NetPaymentBillingSummary;
  cumulativeSavings: number;
  selectedFilterCategory:
    | CategoryId
    | 'all'
    | 'net_closing_confirmed'
    | 'net_closing_unconfirmed';
  onSelectFilter: (
    filter:
      | CategoryId
      | 'all'
      | 'net_closing_confirmed'
      | 'net_closing_unconfirmed'
  ) => void;
  onQuickAddForCategory: (categoryId: CategoryId) => void;
  onOpenTransferModal: (fromCategoryId?: CategoryId) => void;
  onOpenManageCategories: () => void;
  onRenameCategory: (id: CategoryId, newName: string) => void;
  onChangeCategoryIcon: (id: CategoryId, iconKey: CategoryIconKey) => void;
}

export function CategoryCards({
  summaries,
  netBilling,
  cumulativeSavings,
  selectedFilterCategory,
  onSelectFilter,
  onQuickAddForCategory,
  onOpenTransferModal,
  onOpenManageCategories,
  onRenameCategory,
  onChangeCategoryIcon,
}: CategoryCardsProps) {
  const [editingId, setEditingId] = useState<CategoryId | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const [iconPickerForId, setIconPickerForId] = useState<CategoryId | null>(
    null
  );

  const handleStartRename = (id: CategoryId, currentName: string) => {
    setEditingId(id);
    setEditingName(currentName);
  };

  const handleSaveRename = (id: CategoryId) => {
    if (editingName.trim()) {
      onRenameCategory(id, editingName.trim());
    }
    setEditingId(null);
  };

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-700 flex items-center gap-2">
            <span>科目別ステータス（{summaries.length}科目）</span>
          </h2>
          <button
            type="button"
            onClick={onOpenManageCategories}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white hover:bg-orange-50/70 text-slate-600 hover:text-orange-800 border border-stone-200/80 text-xs font-semibold shadow-2xs transition"
          >
            <FolderPlus className="w-3.5 h-3.5 text-orange-400" />
            <span>科目の追加・編集・削除</span>
          </button>
        </div>

        {/* Color Legend - Soft Tone */}
        <div className="flex items-center gap-3 text-xs text-slate-500 bg-white/90 px-3 py-1.5 rounded-xl border border-stone-200/80 shadow-2xs">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-400 inline-block" />
            <span>0〜79%: 安全</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
            <span>80〜99%: 注意</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block" />
            <span>100%〜: 超過</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        {summaries.map((item) => {
          const {
            category,
            baseBudget,
            carryoverBudget,
            effectiveLimit,
            spent,
            extraDeposit,
            remaining,
            usageRate,
            statusColor,
          } = item;

          const meta = getCategoryStyle(category);
          const currentIconKey = getCategoryIconKey(category);
          const isSelected = selectedFilterCategory === category.id;
          const clampedBarWidth = Math.min(100, Math.max(0, usageRate));
          const isIconPickerOpen = iconPickerForId === category.id;

          let progressBarClass = 'bg-teal-400';
          let statusBadgeClass =
            'bg-teal-50/90 text-teal-700 border-teal-200/70';
          let statusLabel = '安全';
          let StatusIcon = CheckCircle2;
          let remainingTextClass = 'text-slate-700';

          if (category.isSavings) {
            if (spent === 0) {
              progressBarClass = 'bg-amber-300';
              statusBadgeClass =
                'bg-amber-50/90 text-amber-700 border-amber-200/70';
              statusLabel = '積立確保中';
            } else if (statusColor === 'danger') {
              progressBarClass = 'bg-rose-400';
              statusBadgeClass =
                'bg-rose-50/90 text-rose-600 border-rose-200/70';
              statusLabel = '枠超過';
              StatusIcon = ShieldAlert;
              remainingTextClass = 'text-rose-500';
            } else {
              progressBarClass = 'bg-sky-300';
              statusBadgeClass = 'bg-sky-50/90 text-sky-700 border-sky-200/70';
              statusLabel = '一部取崩';
            }
          } else {
            if (statusColor === 'danger') {
              progressBarClass = 'bg-rose-400';
              statusBadgeClass =
                'bg-rose-50/90 text-rose-600 border-rose-200/70';
              statusLabel = '予算超過';
              StatusIcon = ShieldAlert;
              remainingTextClass = 'text-rose-500';
            } else if (statusColor === 'warning') {
              progressBarClass = 'bg-amber-400';
              statusBadgeClass =
                'bg-amber-50/90 text-amber-700 border-amber-200/80';
              statusLabel = '注意 (80%+)';
              StatusIcon = AlertTriangle;
              remainingTextClass = 'text-amber-600';
            } else {
              progressBarClass = 'bg-teal-400';
              statusBadgeClass =
                'bg-teal-50/90 text-teal-700 border-teal-200/70';
              statusLabel = '安全';
              StatusIcon = CheckCircle2;
            }
          }

          return (
            <div
              key={category.id}
              className={`bg-white/95 rounded-2xl border transition-all duration-200 flex flex-col justify-between shadow-2xs hover:shadow-sm border-l-4 ${
                meta.accentBorder
              } ${
                isSelected
                  ? 'ring-2 ring-teal-400/70 border-teal-300'
                  : statusColor === 'danger'
                  ? 'border-rose-200/80 bg-rose-50/15'
                  : 'border-stone-200/80'
              }`}
            >
              <div className="p-4 space-y-3">
                {/* Card Top: Clickable Icon + Name + Inline Rename + Status Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() =>
                        setIconPickerForId(
                          isIconPickerOpen ? null : category.id
                        )
                      }
                      className={`w-9 h-9 rounded-xl ${meta.iconBg} ${meta.iconColor} flex items-center justify-center shrink-0 hover:ring-2 hover:ring-teal-300 transition`}
                      title="クリックでアイコンを変更"
                    >
                      <CategoryIcon
                        categoryId={category.id}
                        category={category}
                        className="w-5 h-5"
                      />
                    </button>
                    <div className="min-w-0 flex-1">
                      {editingId === category.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter')
                                handleSaveRename(category.id);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            autoFocus
                            className="w-full px-2 py-0.5 rounded-lg border border-teal-300 text-xs font-bold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-300"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveRename(category.id)}
                            className="p-1 rounded-md bg-teal-100 text-teal-700 hover:bg-teal-200"
                            title="保存"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="p-1 rounded-md bg-stone-100 text-slate-500 hover:bg-stone-200"
                            title="キャンセル"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 group">
                          <h3 className="font-bold text-slate-700 text-sm sm:text-base truncate">
                            {category.name}
                          </h3>
                          <button
                            type="button"
                            onClick={() =>
                              handleStartRename(category.id, category.name)
                            }
                            className="opacity-60 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-stone-100 transition"
                            title="科目名を編集"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                      <span className="text-[11px] text-slate-400 block truncate">
                        {category.isCredit
                          ? 'クレカ (毎月10日締)'
                          : category.isSavings
                          ? '積立・予備費枠'
                          : '通常決済'}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border shrink-0 ${statusBadgeClass}`}
                  >
                    <StatusIcon className="w-3 h-3" />
                    <span>{statusLabel}</span>
                  </span>
                </div>

                {/* Inline Icon Picker Popover when Icon is Clicked */}
                {isIconPickerOpen && (
                  <div className="p-2.5 rounded-xl bg-[#faf8f5] border border-stone-200/90 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                      <span>アイコンを選択</span>
                      <button
                        type="button"
                        onClick={() => setIconPickerForId(null)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {ICON_OPTIONS.map((opt) => {
                        const IconComp = ICON_MAP[opt.key];
                        const active = currentIconKey === opt.key;
                        return (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => {
                              onChangeCategoryIcon(category.id, opt.key);
                              setIconPickerForId(null);
                            }}
                            title={opt.label}
                            className={`p-2 rounded-lg border flex items-center justify-center transition ${
                              active
                                ? `${meta.iconBg} ${meta.iconColor} border-teal-300 ring-1 ring-teal-300`
                                : 'bg-white hover:bg-stone-100 text-slate-500 border-stone-200/70'
                            }`}
                          >
                            <IconComp className="w-4 h-4" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Remaining Amount & Effective Limit Breakdown */}
                <div className="pt-1">
                  <div className="text-[11px] font-semibold text-slate-400">
                    {category.isSavings ? '今月の確保残高' : '残り予算額'}
                  </div>
                  <div className="flex items-baseline justify-between gap-1 mt-0.5">
                    <span
                      className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${remainingTextClass}`}
                    >
                      {formatYen(remaining)}
                    </span>
                    <span className="text-xs font-medium text-slate-400">
                      / 上限 {formatYen(effectiveLimit)}
                    </span>
                  </div>

                  {/* Breakdown: 基本 ¥XX,XXX + 繰越 ¥X,XXX */}
                  <div className="mt-1.5 flex items-center flex-wrap gap-1 text-[11px] text-slate-500 bg-[#faf8f5] px-2.5 py-1 rounded-xl border border-stone-200/60">
                    <span>基本 {formatYen(baseBudget)}</span>
                    <span>+</span>
                    <span
                      className={
                        carryoverBudget > 0
                          ? 'font-bold text-teal-700'
                          : carryoverBudget < 0
                          ? 'font-bold text-rose-500'
                          : 'text-slate-400'
                      }
                    >
                      繰越 {formatYen(carryoverBudget)}
                    </span>
                    {category.isSavings && extraDeposit > 0 && (
                      <>
                        <span>+</span>
                        <span className="font-bold text-amber-600">
                          追積 {formatYen(extraDeposit)}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Usage Progress Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">
                      {category.isSavings ? '取崩額:' : '消化額:'}{' '}
                      <strong className="text-slate-600">
                        {formatYen(spent)}
                      </strong>
                    </span>
                    <span
                      className={`font-bold ${
                        statusColor === 'danger'
                          ? 'text-rose-500'
                          : statusColor === 'warning'
                          ? 'text-amber-600'
                          : 'text-slate-600'
                      }`}
                    >
                      {usageRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden border border-stone-200/60">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${progressBarClass}`}
                      style={{ width: `${clampedBarWidth}%` }}
                    />
                  </div>
                </div>

                {/* Special Section for Credit Categories */}
                {category.isCredit && (
                  <div className="mt-2 pt-2.5 border-t border-indigo-100/80 space-y-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        onSelectFilter(
                          selectedFilterCategory === 'net_closing_confirmed'
                            ? 'all'
                            : 'net_closing_confirmed'
                        )
                      }
                      className={`w-full text-left px-2.5 py-1.5 rounded-xl border text-[11px] transition flex items-center justify-between ${
                        selectedFilterCategory === 'net_closing_confirmed'
                          ? 'bg-indigo-100 text-indigo-900 border-indigo-300 font-bold'
                          : 'bg-indigo-50/50 hover:bg-indigo-50 text-indigo-800 border-indigo-200/60'
                      }`}
                      title="クリックで10日締め対象明細（前月11日〜当月10日）を絞り込み表示"
                    >
                      <span className="flex items-center gap-1">
                        <CreditCard className="w-3 h-3 text-indigo-400 shrink-0" />
                        <span>
                          10日締め確定額 (
                          {netBilling.currentClosingPeriodStart
                            .slice(5)
                            .replace('-', '/')}
                          〜
                          {netBilling.currentClosingPeriodEnd
                            .slice(5)
                            .replace('-', '/')}
                          )
                        </span>
                      </span>
                      <span className="font-bold">
                        {formatYen(netBilling.confirmedAmount)}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        onSelectFilter(
                          selectedFilterCategory === 'net_closing_unconfirmed'
                            ? 'all'
                            : 'net_closing_unconfirmed'
                        )
                      }
                      className={`w-full text-left px-2.5 py-1.5 rounded-xl border text-[11px] transition flex items-center justify-between ${
                        selectedFilterCategory === 'net_closing_unconfirmed'
                          ? 'bg-indigo-100 text-indigo-900 border-indigo-300 font-bold'
                          : 'bg-[#faf8f5] hover:bg-stone-100/70 text-slate-600 border-stone-200/70'
                      }`}
                      title="クリックで11日以降利用分（翌月10日締め予定）を絞り込み表示"
                    >
                      <span>11日以降利用分 (翌月10日締予定)</span>
                      <span className="font-bold">
                        {formatYen(netBilling.unconfirmedAmount)}
                      </span>
                    </button>
                  </div>
                )}

                {/* Special Section for Savings Categories */}
                {category.isSavings && (
                  <div className="mt-2 pt-2.5 border-t border-amber-100/80 space-y-1.5">
                    <div className="px-2.5 py-1.5 rounded-xl bg-amber-50/60 border border-amber-200/60 flex items-center justify-between text-[11px] text-amber-800">
                      <span className="font-medium">
                        今月の確保枠 (基本+繰越)
                      </span>
                      <span className="font-bold text-amber-700">
                        {formatYen(effectiveLimit)}
                      </span>
                    </div>
                    <div className="px-2.5 py-1.5 rounded-xl bg-amber-50/90 border border-amber-200/80 flex items-center justify-between text-xs text-amber-900">
                      <span className="font-bold flex items-center gap-1">
                        <PiggyBank className="w-3.5 h-3.5 text-amber-500" />
                        <span>累計貯金総額</span>
                      </span>
                      <span className="font-extrabold text-amber-800 text-sm">
                        {formatYen(cumulativeSavings)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="px-3 py-2.5 bg-[#faf8f5]/80 border-t border-stone-200/60 rounded-b-2xl flex items-center justify-between gap-1.5">
                <button
                  type="button"
                  onClick={() => onQuickAddForCategory(category.id)}
                  className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100/80 text-teal-800 border border-teal-200/80 text-xs font-bold transition"
                >
                  <Plus className="w-3.5 h-3.5 text-teal-600" />
                  <span>{category.isSavings ? '取崩/積立' : '支出記録'}</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onSelectFilter(isSelected ? 'all' : category.id)
                  }
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition inline-flex items-center gap-1 ${
                    isSelected
                      ? 'bg-teal-600/90 text-white border-teal-600'
                      : 'bg-white hover:bg-stone-100/70 text-slate-600 border-stone-200/80'
                  }`}
                  title="この科目の履歴をフィルター"
                >
                  <Filter className="w-3 h-3" />
                  <span>履歴</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenTransferModal(category.id)}
                  className="p-1.5 rounded-xl bg-white hover:bg-stone-100/70 text-slate-500 border border-stone-200/80 transition"
                  title="他の科目と予算を振替"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
