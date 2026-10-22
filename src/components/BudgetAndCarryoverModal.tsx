'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  PiggyBank,
  RotateCcw,
  ArrowRightLeft,
  Settings,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Calculator,
  Coins,
  FolderPlus,
  Trash2,
  Plus,
  Calendar,
} from 'lucide-react';
import {
  AppSettings,
  CategoryColorKey,
  CategoryConfig,
  CategoryIconKey,
  CategoryId,
  CycleAllocations,
  MonthlyCycle,
  Transaction,
} from '@/types';
import {
  calculateCycleSummary,
  calculateEndDateFromStartDate,
  calculatePreviousCycleCarryoverInfo,
  formatYen,
  getCycleDateRange,
  pad2,
} from '@/lib/calculations';
import {
  CategoryIcon,
  COLOR_PALETTE_MAP,
  getCategoryIconKey,
  getCategoryStyle,
  ICON_OPTIONS,
  IconPickerGrid,
} from '@/components/CategoryIcon';

interface BudgetAndCarryoverModalProps {
  isOpen: boolean;
  initialTab: 'carryover' | 'transfer' | 'base' | 'categories';
  onClose: () => void;
  currentCycle: MonthlyCycle;
  settings: AppSettings;
  monthlyCycles: MonthlyCycle[];
  transactions: Transaction[];
  initialTransferFromCategory?: CategoryId;
  onUpdateCycleAllocations: (
    cycleId: string,
    carryoverTotal: number,
    allocations: CycleAllocations,
    income?: number,
    incomeMemo?: string,
    customDates?: { startDate?: string; endDate?: string }
  ) => void;
  onTransferBudget: (
    cycleId: string,
    fromCategoryId: CategoryId,
    toCategoryId: CategoryId,
    amount: number,
    targetField: 'base' | 'carryover',
    memo?: string
  ) => void;
  onUpdateBaseBudgets: (
    newBudgets: Record<CategoryId, number>,
    newBaseIncome: number,
    applyToCurrentCycle: boolean,
    updatedCategoryNames?: Record<CategoryId, string>
  ) => void;
  onAddCategory: (input: {
    name: string;
    defaultBudget: number;
    isCredit: boolean;
    isSavings: boolean;
    colorKey?: CategoryColorKey;
    iconKey?: CategoryIconKey;
  }) => CategoryConfig;
  onUpdateCategory: (
    id: CategoryId,
    updates: Partial<Omit<CategoryConfig, 'id'>>
  ) => void;
  onDeleteCategory: (id: CategoryId) => void;
}

export function BudgetAndCarryoverModal({
  isOpen,
  initialTab,
  onClose,
  currentCycle,
  settings,
  monthlyCycles,
  transactions,
  initialTransferFromCategory,
  onUpdateCycleAllocations,
  onTransferBudget,
  onUpdateBaseBudgets,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
}: BudgetAndCarryoverModalProps) {
  const [activeTab, setActiveTab] = useState<
    'carryover' | 'transfer' | 'base' | 'categories'
  >(initialTab);

  // --- Tab 1: Carryover Allocation State ---
  const prevCarryoverInfo = calculatePreviousCycleCarryoverInfo(
    currentCycle.cycleId,
    monthlyCycles,
    settings,
    transactions
  );

  const [carryoverPool, setCarryoverPool] = useState<number>(
    currentCycle.carryoverTotal
  );
  const [carryoverInputs, setCarryoverInputs] = useState<
    Record<CategoryId, number>
  >({});

  // --- Tab 2: In-Cycle Transfer & Income Adjustment State ---
  const [fromCat, setFromCat] = useState<CategoryId>(
    initialTransferFromCategory || settings.categories[0]?.id || 'food'
  );
  const [toCat, setToCat] = useState<CategoryId>(
    settings.categories[1]?.id || 'consumables'
  );
  const [transferField, setTransferField] = useState<'carryover' | 'base'>(
    'base'
  );
  const [transferAmount, setTransferAmount] = useState<string>('1000');
  const [transferMemo, setTransferMemo] = useState<string>('');
  const [cycleIncomeInput, setCycleIncomeInput] = useState<number>(
    currentCycle.income
  );
  const [cycleIncomeMemo, setCycleIncomeMemo] = useState<string>(
    currentCycle.incomeMemo || ''
  );
  const [cycleStartDateInput, setCycleStartDateInput] = useState<string>(
    currentCycle.startDate
  );
  const [cycleEndDateInput, setCycleEndDateInput] = useState<string>(
    currentCycle.endDate
  );
  const [cycleBaseInputs, setCycleBaseInputs] = useState<
    Record<CategoryId, number>
  >({});

  // --- Tab 3: Default Base Budget Settings State ---
  const [baseIncomeSetting, setBaseIncomeSetting] = useState<number>(
    settings.baseMonthlyIncome
  );
  const [defaultBudgets, setDefaultBudgets] = useState<
    Record<CategoryId, number>
  >({});
  const [categoryNames, setCategoryNames] = useState<
    Record<CategoryId, string>
  >({});
  const [applyBaseToCurrent, setApplyBaseToCurrent] = useState<boolean>(true);

  // --- Tab 4: Add Category State ---
  const [newCatName, setNewCatName] = useState('');
  const [newCatBudget, setNewCatBudget] = useState('0');
  const [newCatType, setNewCatType] = useState<'regular' | 'credit' | 'savings'>(
    'regular'
  );
  const [newCatColor, setNewCatColor] = useState<CategoryColorKey>('sage');
  const [newCatIcon, setNewCatIcon] = useState<CategoryIconKey>('coffee');
  const [openIconPickerCatId, setOpenIconPickerCatId] =
    useState<CategoryId | null>(null);

  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, isOpen]);

  useEffect(() => {
    if (initialTransferFromCategory) {
      setFromCat(initialTransferFromCategory);
      if (initialTransferFromCategory === toCat) {
        const other = settings.categories.find(
          (c) => c.id !== initialTransferFromCategory
        );
        if (other) setToCat(other.id);
      }
    }
  }, [initialTransferFromCategory, toCat, settings.categories]);

  useEffect(() => {
    setCarryoverPool(currentCycle.carryoverTotal);
    const nextCarry: Record<CategoryId, number> = {};
    const nextCycleBase: Record<CategoryId, number> = {};
    const nextDefaultBudgets: Record<CategoryId, number> = {};
    const nextCatNames: Record<CategoryId, string> = {};

    for (const cat of settings.categories) {
      nextCarry[cat.id] = currentCycle.allocations[cat.id]?.carryover ?? 0;
      nextCycleBase[cat.id] = currentCycle.allocations[cat.id]?.base ?? 0;
      nextDefaultBudgets[cat.id] = cat.defaultBudget;
      nextCatNames[cat.id] = cat.name;
    }

    setCarryoverInputs(nextCarry);
    setCycleBaseInputs(nextCycleBase);
    setDefaultBudgets(nextDefaultBudgets);
    setCategoryNames(nextCatNames);
    setCycleIncomeInput(currentCycle.income);
    setCycleIncomeMemo(currentCycle.incomeMemo || '');
    setCycleStartDateInput(currentCycle.startDate);
    setCycleEndDateInput(currentCycle.endDate);
    setBaseIncomeSetting(settings.baseMonthlyIncome);
  }, [currentCycle, settings, isOpen]);

  if (!isOpen) return null;

  const { titleLabel, rangeLabel } = getCycleDateRange(
    currentCycle.cycleId,
    { startDate: cycleStartDateInput, endDate: cycleEndDateInput },
    settings.cycleStartDay
  );
  const cycleSummary = calculateCycleSummary(
    currentCycle,
    settings,
    transactions
  );

  // Calculations for Tab 1 (Carryover)
  const allocatedCarryoverSum = settings.categories.reduce(
    (sum, cat) => sum + (Number(carryoverInputs[cat.id]) || 0),
    0
  );
  const unallocatedPool = carryoverPool - allocatedCarryoverSum;

  // Shortcut 1: 余った科目にそのまま据え置き（科目別自動繰越）
  const handleKeepInRemainingCategories = () => {
    if (prevCarryoverInfo.hasPrevCycle) {
      const targetPool = prevCarryoverInfo.calculatedCarryoverTotal;
      setCarryoverPool(targetPool);
      const next: Record<CategoryId, number> = {};
      for (const cat of settings.categories) {
        next[cat.id] = prevCarryoverInfo.categoryRemainders[cat.id] || 0;
      }
      setCarryoverInputs(next);
    } else {
      const nonSavings = settings.categories.filter((c) => !c.isSavings);
      const nonSavingsBaseTotal = nonSavings.reduce(
        (s, c) => s + (cycleBaseInputs[c.id] || 0),
        0
      );
      const next: Record<CategoryId, number> = {};
      for (const cat of settings.categories) {
        next[cat.id] = 0;
      }
      if (nonSavingsBaseTotal > 0 && nonSavings.length > 0) {
        let running = 0;
        nonSavings.forEach((cat, idx) => {
          if (idx === nonSavings.length - 1) {
            next[cat.id] = carryoverPool - running;
          } else {
            const share = Math.round(
              (carryoverPool * (cycleBaseInputs[cat.id] || 0)) /
                nonSavingsBaseTotal
            );
            next[cat.id] = share;
            running += share;
          }
        });
      }
      setCarryoverInputs(next);
    }
  };

  // Shortcut 2: 全額を『貯金』に振り分け
  const handleAllocateAllToSavings = () => {
    const savingsCat =
      settings.categories.find((c) => c.isSavings) ||
      settings.categories[settings.categories.length - 1];
    const next: Record<CategoryId, number> = {};
    for (const cat of settings.categories) {
      next[cat.id] = cat.id === savingsCat?.id ? carryoverPool : 0;
    }
    setCarryoverInputs(next);
  };

  // Shortcut 3: すべてリセット（0円）
  const handleResetCarryoverInputs = () => {
    const next: Record<CategoryId, number> = {};
    for (const cat of settings.categories) {
      next[cat.id] = 0;
    }
    setCarryoverInputs(next);
  };

  // Save Tab 1 (Carryover)
  const handleSaveCarryover = () => {
    const nextAllocations: CycleAllocations = {};
    for (const cat of settings.categories) {
      nextAllocations[cat.id] = {
        base: currentCycle.allocations[cat.id]?.base ?? cat.defaultBudget,
        carryover: carryoverInputs[cat.id] ?? 0,
      };
    }
    onUpdateCycleAllocations(
      currentCycle.cycleId,
      carryoverPool,
      nextAllocations
    );
    setSavedNotice('繰越金の振り分けを保存しました');
    setTimeout(() => setSavedNotice(null), 2500);
  };

  // Execute Tab 2 Transfer
  const handleExecuteTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseInt(transferAmount, 10);
    if (!amt || amt <= 0 || fromCat === toCat) return;
    onTransferBudget(
      currentCycle.cycleId,
      fromCat,
      toCat,
      amt,
      transferField,
      transferMemo.trim() || '期中予算振替'
    );
    setTransferMemo('');
    setSavedNotice(
      `${
        settings.categories.find((c) => c.id === fromCat)?.name
      } から ${
        settings.categories.find((c) => c.id === toCat)?.name
      } へ ${formatYen(amt)} を振り替えました`
    );
    setTimeout(() => setSavedNotice(null), 2500);
  };

  // Save Tab 2 Cycle Income & Base Adjustment
  const handleSaveCycleIncomeAndBase = () => {
    const nextAllocations: CycleAllocations = {};
    for (const cat of settings.categories) {
      nextAllocations[cat.id] = {
        base: cycleBaseInputs[cat.id] ?? 0,
        carryover: currentCycle.allocations[cat.id]?.carryover ?? 0,
      };
      // 科目名が変更されていたら反映
      const editedName = categoryNames[cat.id]?.trim();
      if (editedName && editedName !== cat.name) {
        onUpdateCategory(cat.id, { name: editedName });
      }
    }
    onUpdateCycleAllocations(
      currentCycle.cycleId,
      currentCycle.carryoverTotal,
      nextAllocations,
      cycleIncomeInput,
      cycleIncomeMemo,
      {
        startDate: cycleStartDateInput,
        endDate: cycleEndDateInput,
      }
    );
    setSavedNotice(
      `${titleLabel}の入金日（${cycleStartDateInput}）と予算配分を保存しました`
    );
    setTimeout(() => setSavedNotice(null), 2500);
  };

  // Calculations for Tab 3 (Default Base Budgets)
  const defaultBudgetSum = settings.categories.reduce(
    (sum, cat) => sum + (Number(defaultBudgets[cat.id]) || 0),
    0
  );
  const defaultBudgetDiff = baseIncomeSetting - defaultBudgetSum;

  const handleSaveDefaultBudgets = () => {
    onUpdateBaseBudgets(
      defaultBudgets,
      baseIncomeSetting,
      applyBaseToCurrent,
      categoryNames
    );
    setSavedNotice('基本予算と科目名を保存しました');
    setTimeout(() => setSavedNotice(null), 2500);
  };

  // Add Category Handler (Tab 4)
  const handleAddCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const added = onAddCategory({
      name: newCatName.trim(),
      defaultBudget: parseInt(newCatBudget || '0', 10) || 0,
      isCredit: newCatType === 'credit',
      isSavings: newCatType === 'savings',
      colorKey: newCatColor,
      iconKey: newCatIcon,
    });
    setNewCatName('');
    setNewCatBudget('0');
    setSavedNotice(`新しい科目「${added.name}」を追加しました`);
    setTimeout(() => setSavedNotice(null), 2500);
  };

  const cycleBaseSum = settings.categories.reduce(
    (sum, cat) => sum + (Number(cycleBaseInputs[cat.id]) || 0),
    0
  );
  const cycleBaseDiff = cycleIncomeInput - cycleBaseSum;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#faf8f5] rounded-2xl shadow-xl border border-stone-200/90 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header - Soft Pastel */}
        <div className="bg-gradient-to-r from-teal-50/90 via-emerald-50/60 to-amber-50/50 border-b border-stone-200/80 px-5 py-4 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-700 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-teal-600" />
              <span>手動入金・予算配分・繰越管理</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              対象サイクル: {titleLabel} ({rangeLabel})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-white/80 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="bg-stone-100/80 px-4 pt-2.5 border-b border-stone-200/80 flex gap-1.5 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('base')}
            className={`px-3.5 py-2 rounded-t-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 border-b-2 transition whitespace-nowrap ${
              activeTab === 'base'
                ? 'bg-[#faf8f5] text-teal-800 border-teal-500 shadow-2xs'
                : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-white/50'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>1. 入金・予算配分（手動）</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('carryover')}
            className={`px-3.5 py-2 rounded-t-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 border-b-2 transition whitespace-nowrap ${
              activeTab === 'carryover'
                ? 'bg-[#faf8f5] text-teal-800 border-teal-500 shadow-2xs'
                : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-white/50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>2. 繰越金の振り分け</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('transfer')}
            className={`px-3.5 py-2 rounded-t-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 border-b-2 transition whitespace-nowrap ${
              activeTab === 'transfer'
                ? 'bg-[#faf8f5] text-sky-800 border-sky-400 shadow-2xs'
                : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-white/50'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>3. 期中の科目間振替</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('categories')}
            className={`px-3.5 py-2 rounded-t-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 border-b-2 transition whitespace-nowrap ${
              activeTab === 'categories'
                ? 'bg-[#faf8f5] text-orange-800 border-orange-400 shadow-2xs'
                : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-white/50'
            }`}
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>4. 科目の追加・編集・削除</span>
          </button>
        </div>

        {/* Saved Feedback Banner */}
        {savedNotice && (
          <div className="bg-teal-100/90 text-teal-900 border-b border-teal-200 px-4 py-2 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shrink-0">
            <CheckCircle2 className="w-4 h-4 text-teal-600" />
            <span>{savedNotice}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* ==========================================
              TAB 1: 繰越金の振り分け設定
          ========================================== */}
          {activeTab === 'carryover' && (
            <div className="space-y-5">
              {/* Previous Cycle Formula Breakdown Box */}
              <div className="bg-white rounded-2xl p-4 border border-stone-200/80 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-700">
                    <Calculator className="w-4 h-4 text-teal-500" />
                    <span>
                      前月残金の算出ロジック（前月: {prevCarryoverInfo.prevCycleId}月度）
                    </span>
                  </div>
                  {prevCarryoverInfo.hasPrevCycle &&
                    carryoverPool !==
                      prevCarryoverInfo.calculatedCarryoverTotal && (
                      <button
                        type="button"
                        onClick={() =>
                          setCarryoverPool(
                            prevCarryoverInfo.calculatedCarryoverTotal
                          )
                        }
                        className="text-xs font-bold text-teal-700 hover:underline"
                      >
                        前月実績の算出値 (
                        {formatYen(prevCarryoverInfo.calculatedCarryoverTotal)})
                        をセット
                      </button>
                    )}
                </div>

                {prevCarryoverInfo.hasPrevCycle ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-[#faf8f5] p-3 rounded-xl border border-stone-200/70">
                    <div>
                      <span className="text-slate-400 block text-[11px]">
                        前月総予算
                      </span>
                      <span className="font-bold text-slate-700">
                        {formatYen(prevCarryoverInfo.prevTotalBudget)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">
                        − 前月支出合計
                      </span>
                      <span className="font-bold text-rose-500">
                        {formatYen(prevCarryoverInfo.prevFourSpent)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">
                        − 前月貯金確定額
                      </span>
                      <span className="font-bold text-amber-600">
                        {formatYen(prevCarryoverInfo.prevSavingsConfirmed)}
                      </span>
                    </div>
                    <div className="bg-teal-50/80 px-2.5 py-1 rounded-lg border border-teal-200/70">
                      <span className="text-teal-700 block text-[11px] font-semibold">
                        ＝ 前月総残金
                      </span>
                      <span className="font-extrabold text-teal-800 text-sm">
                        {formatYen(prevCarryoverInfo.calculatedCarryoverTotal)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    ※ 前月サイクル ({prevCarryoverInfo.prevCycleId})
                    の記録がないため、繰越原資総額を自由に入力して各科目へ配分できます。
                  </p>
                )}

                {/* Carryover Pool Input & Unallocated Pool Counter */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="bg-[#faf8f5] p-3.5 rounded-xl border border-stone-200/80">
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      前月からの繰越金総額（原資）
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                        ¥
                      </span>
                      <input
                        type="number"
                        min={0}
                        step={100}
                        value={carryoverPool}
                        onChange={(e) =>
                          setCarryoverPool(
                            Math.max(0, parseInt(e.target.value || '0', 10))
                          )
                        }
                        className="w-full pl-7 pr-3 py-1.5 rounded-xl border border-stone-200 bg-white font-extrabold text-base text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-300"
                      />
                    </div>
                  </div>

                  <div
                    className={`p-3.5 rounded-xl border flex flex-col justify-center ${
                      unallocatedPool === 0
                        ? 'bg-teal-50/80 border-teal-200/80 text-teal-900'
                        : unallocatedPool > 0
                        ? 'bg-amber-50/80 border-amber-200/80 text-amber-900'
                        : 'bg-rose-50/80 border-rose-200/80 text-rose-900'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">
                        未振分けプール金（残り配分可能額）
                      </span>
                      {unallocatedPool === 0 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-600/90 text-white">
                          <CheckCircle2 className="w-3 h-3" />
                          配分完了
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-400 text-amber-950">
                          <AlertTriangle className="w-3 h-3" />
                          {unallocatedPool > 0 ? '未振分けあり' : '配分超過'}
                        </span>
                      )}
                    </div>
                    <div className="text-2xl font-extrabold mt-1">
                      {formatYen(unallocatedPool)}
                    </div>
                  </div>
                </div>
              </div>

              {/* One-Click Shortcut Buttons */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-600">
                  ワンクリック自動配分ショートカット（ここから手動で微調整できます）
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleKeepInRemainingCategories}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100/80 text-teal-800 border border-teal-200/80 text-xs font-bold transition"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                    <span>余った科目にそのまま据え置き（科目別自動繰越）</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAllocateAllToSavings}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100/80 text-amber-800 border border-amber-200/80 text-xs font-bold transition"
                  >
                    <PiggyBank className="w-3.5 h-3.5 text-amber-500" />
                    <span>全額を『貯金』に振り分け</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetCarryoverInputs}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-stone-100 text-slate-600 border border-stone-200/80 text-xs font-semibold transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>配分を0円にリセット</span>
                  </button>
                </div>
              </div>

              {/* Categories Allocation Rows */}
              <div className="space-y-2.5">
                {settings.categories.map((cat) => {
                  const meta = getCategoryStyle(cat);
                  const baseVal =
                    currentCycle.allocations[cat.id]?.base ?? cat.defaultBudget;
                  const carryVal = carryoverInputs[cat.id] ?? 0;
                  const effectiveTotal = baseVal + carryVal;
                  const prevRemainder =
                    prevCarryoverInfo.categoryRemainders[cat.id] ?? 0;

                  return (
                    <div
                      key={cat.id}
                      className="p-3.5 rounded-xl bg-white border border-stone-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl ${meta.iconBg} ${meta.iconColor} flex items-center justify-center shrink-0`}
                        >
                          <CategoryIcon
                            categoryId={cat.id}
                            category={cat}
                            className="w-5 h-5"
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-700">
                              {cat.name}
                            </span>
                            {prevCarryoverInfo.hasPrevCycle &&
                              !cat.isSavings &&
                              prevRemainder > 0 && (
                                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-stone-100 text-slate-500">
                                  前月余り: {formatYen(prevRemainder)}
                                </span>
                              )}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            基本予算: <strong>{formatYen(baseVal)}</strong> →
                            当月実質上限:{' '}
                            <strong className="text-teal-700 font-bold">
                              {formatYen(effectiveTotal)}
                            </strong>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center flex-wrap gap-2">
                        <div className="relative w-32">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">
                            +¥
                          </span>
                          <input
                            type="number"
                            step={100}
                            value={carryVal}
                            onChange={(e) => {
                              const val =
                                parseInt(e.target.value || '0', 10) || 0;
                              setCarryoverInputs((prev) => ({
                                ...prev,
                                [cat.id]: val,
                              }));
                            }}
                            className="w-full pl-8 pr-2.5 py-1.5 rounded-xl border border-stone-200 bg-[#faf8f5] focus:bg-white text-sm font-bold text-right text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-300"
                          />
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setCarryoverInputs((prev) => ({
                                ...prev,
                                [cat.id]: (prev[cat.id] || 0) + 500,
                              }))
                            }
                            className="px-2 py-1 rounded-lg bg-[#faf8f5] hover:bg-stone-100 border border-stone-200/80 text-slate-600 text-xs font-semibold"
                          >
                            +500
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setCarryoverInputs((prev) => ({
                                ...prev,
                                [cat.id]: (prev[cat.id] || 0) + 1000,
                              }))
                            }
                            className="px-2 py-1 rounded-lg bg-[#faf8f5] hover:bg-stone-100 border border-stone-200/80 text-slate-600 text-xs font-semibold"
                          >
                            +1,000
                          </button>
                          {unallocatedPool !== 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                setCarryoverInputs((prev) => ({
                                  ...prev,
                                  [cat.id]: Math.max(
                                    0,
                                    (prev[cat.id] || 0) + unallocatedPool
                                  ),
                                }))
                              }
                              className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200/80 text-xs font-bold"
                            >
                              残り全額 ({formatYen(unallocatedPool, true)})
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Save Button */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-stone-200/80">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-stone-200 bg-white text-slate-600 text-xs sm:text-sm font-semibold hover:bg-stone-50"
                >
                  閉じる
                </button>
                <button
                  type="button"
                  onClick={handleSaveCarryover}
                  className="px-6 py-2.5 rounded-xl bg-teal-600/90 hover:bg-teal-600 text-white text-xs sm:text-sm font-bold shadow-2xs transition"
                >
                  繰越金の振り分けを保存する
                </button>
              </div>
            </div>
          )}

          {/* ==========================================
              TAB 2: 期中の科目間振替 ＆ 当月入金調整
          ========================================== */}
          {activeTab === 'transfer' && (
            <div className="space-y-6">
              {/* Section A: 科目間の予算振替 */}
              <div className="bg-sky-50/40 rounded-2xl p-4 sm:p-5 border border-sky-200/70 space-y-4">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-700 flex items-center gap-2">
                    <ArrowRightLeft className="w-4 h-4 text-sky-500" />
                    <span>期中の科目間予算振替（予算枠の移動）</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    サイクルの途中（25日〜翌24日）でも、余りそうな科目から不足しそうな科目へ予算枠を移動できます。
                  </p>
                </div>

                <form onSubmit={handleExecuteTransfer} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-11 gap-3 items-center">
                    <div className="sm:col-span-5 bg-white p-3 rounded-xl border border-stone-200/80">
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        振替元（減らす科目）
                      </label>
                      <select
                        value={fromCat}
                        onChange={(e) => setFromCat(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm font-bold text-slate-700 bg-[#faf8f5]"
                      >
                        {cycleSummary.categorySummaries.map((cs) => (
                          <option key={cs.category.id} value={cs.category.id}>
                            {cs.category.name}（残高: {formatYen(cs.remaining)}）
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-1 flex justify-center">
                      <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-600 border border-sky-200 flex items-center justify-center">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>

                    <div className="sm:col-span-5 bg-white p-3 rounded-xl border border-stone-200/80">
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        振替先（増やす科目）
                      </label>
                      <select
                        value={toCat}
                        onChange={(e) => setToCat(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm font-bold text-slate-700 bg-[#faf8f5]"
                      >
                        {cycleSummary.categorySummaries.map((cs) => (
                          <option key={cs.category.id} value={cs.category.id}>
                            {cs.category.name}（残高: {formatYen(cs.remaining)}）
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">
                        移動する予算区分
                      </label>
                      <select
                        value={transferField}
                        onChange={(e) =>
                          setTransferField(
                            e.target.value as 'base' | 'carryover'
                          )
                        }
                        className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white text-xs sm:text-sm font-semibold text-slate-700"
                      >
                        <option value="base">基本予算枠（当月分）を移動</option>
                        <option value="carryover">繰越枠を移動</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">
                        振替金額（円）
                      </label>
                      <input
                        type="number"
                        min={100}
                        step={100}
                        value={transferAmount}
                        onChange={(e) => setTransferAmount(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white text-sm font-bold text-slate-700"
                      />
                      <div className="mt-1 flex gap-1">
                        {[500, 1000, 2000, 5000].map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setTransferAmount(String(v))}
                            className="px-2 py-0.5 rounded-md bg-white border border-stone-200 text-[11px] font-semibold text-slate-600 hover:bg-stone-50"
                          >
                            ¥{v.toLocaleString()}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">
                        振替メモ（任意）
                      </label>
                      <input
                        type="text"
                        placeholder="例: 食材費の補填のため"
                        value={transferMemo}
                        onChange={(e) => setTransferMemo(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white text-sm text-slate-700"
                      />
                    </div>
                  </div>

                  {fromCat === toCat && (
                    <p className="text-xs text-rose-500 font-semibold">
                      ※ 振替元と振替先には異なる科目を選択してください。
                    </p>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={fromCat === toCat || !transferAmount}
                      className="px-5 py-2 rounded-xl bg-sky-600/90 hover:bg-sky-600 disabled:bg-stone-200 text-white text-xs sm:text-sm font-bold shadow-2xs transition"
                    >
                      この内容で予算を振り替える
                    </button>
                  </div>
                </form>

                {currentCycle.transfers && currentCycle.transfers.length > 0 && (
                  <div className="pt-3 border-t border-sky-200/60 space-y-1.5">
                    <div className="text-xs font-bold text-slate-600">
                      当月の振替履歴
                    </div>
                    <div className="max-h-28 overflow-y-auto space-y-1">
                      {currentCycle.transfers.map((tr) => {
                        const fromName =
                          settings.categories.find(
                            (c) => c.id === tr.fromCategoryId
                          )?.name || tr.fromCategoryId;
                        const toName =
                          settings.categories.find(
                            (c) => c.id === tr.toCategoryId
                          )?.name || tr.toCategoryId;
                        return (
                          <div
                            key={tr.id}
                            className="text-xs bg-white px-3 py-1.5 rounded-lg border border-stone-200/80 flex items-center justify-between"
                          >
                            <span>
                              <strong>{fromName}</strong> →{' '}
                              <strong>{toName}</strong> ({tr.memo})
                            </span>
                            <span className="font-bold text-sky-700">
                              {formatYen(tr.amount)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==========================================
              TAB 1 (base): 当月の手動入金 ＆ 各科目への予算配分
          ========================================== */}
          {activeTab === 'base' && (
            <div className="space-y-5">
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200/80 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-700 flex items-center gap-2">
                      <Coins className="w-4 h-4 text-teal-600" />
                      <span>
                        {titleLabel} の手動入金 ＆ 各科目の予算配分
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      自動入金は行われません。当月分の入金日・入金額・各科目への予算配分を任意に指定できます。
                    </p>
                  </div>
                </div>

                {/* 経費の入金日（サイクル期間）の任意指定 */}
                <div className="bg-gradient-to-r from-teal-50/90 via-emerald-50/70 to-teal-50/80 border border-teal-200/80 rounded-xl p-3.5 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-xs sm:text-sm font-bold text-teal-900 flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-teal-600" />
                        当月の入金日（サイクル開始日）
                      </span>
                      <p className="text-[11px] text-teal-700 mt-0.5">
                        毎月入金日が変動する場合でも、ここで任意の日付を指定できます。
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={cycleStartDateInput}
                        onChange={(e) => {
                          const newStart = e.target.value;
                          setCycleStartDateInput(newStart);
                          if (newStart) {
                            setCycleEndDateInput(
                              calculateEndDateFromStartDate(newStart)
                            );
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl border border-stone-200 bg-white font-bold text-xs sm:text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-400"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const now = new Date();
                          const today = `${now.getFullYear()}-${pad2(
                            now.getMonth() + 1
                          )}-${pad2(now.getDate())}`;
                          setCycleStartDateInput(today);
                          setCycleEndDateInput(
                            calculateEndDateFromStartDate(today)
                          );
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-white border border-teal-200 text-[11px] font-bold text-teal-700 hover:bg-teal-50 transition"
                      >
                        今日
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between text-xs text-teal-800 pt-1 border-t border-teal-200/60">
                    <span>
                      適用されるサイクル期間:{' '}
                      <strong>{rangeLabel}</strong>（{cycleStartDateInput} 〜{' '}
                      {cycleEndDateInput}）
                    </span>
                    <span className="text-[11px] text-teal-600 font-semibold">
                      ※ 終了日は翌月入金日の前日へ自動連動します
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="bg-[#faf8f5] p-3.5 rounded-xl border border-stone-200/80 space-y-2">
                    <label className="block text-xs font-bold text-slate-600">
                      当月の入金額（原資・手動入力）
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                        ¥
                      </span>
                      <input
                        type="number"
                        min={0}
                        step={1000}
                        value={cycleIncomeInput}
                        onChange={(e) =>
                          setCycleIncomeInput(
                            Math.max(0, parseInt(e.target.value || '0', 10) || 0)
                          )
                        }
                        className="w-full pl-7 pr-3 py-1.5 rounded-xl border border-stone-200 bg-white font-extrabold text-base text-slate-700"
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[10000, 30000, 50000, 60000].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() =>
                            setCycleIncomeInput((prev) => prev + v)
                          }
                          className="px-2 py-0.5 rounded-lg bg-white hover:bg-teal-50 text-slate-600 hover:text-teal-800 border border-stone-200 text-[11px] font-semibold transition"
                        >
                          +{v.toLocaleString()}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setCycleIncomeInput(0)}
                        className="px-2 py-0.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-slate-500 text-[11px] font-semibold transition"
                      >
                        ¥0クリア
                      </button>
                    </div>
                    <div className="pt-1">
                      <input
                        type="text"
                        placeholder="入金メモ（任意 / 例: 10月度入金、臨時収入など）"
                        value={cycleIncomeMemo}
                        onChange={(e) => setCycleIncomeMemo(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-xs text-slate-700"
                      />
                    </div>
                  </div>

                  <div
                    className={`p-3.5 rounded-xl border flex flex-col justify-center ${
                      cycleBaseDiff === 0
                        ? 'bg-teal-50/80 border-teal-200/80 text-teal-900'
                        : 'bg-amber-50/80 border-amber-200/80 text-amber-900'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">
                        当月配分合計: {formatYen(cycleBaseSum)} / 当月入金:{' '}
                        {formatYen(cycleIncomeInput)}
                      </span>
                      {cycleBaseDiff === 0 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-600/90 text-white">
                          <CheckCircle2 className="w-3 h-3" />
                          一致
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-400 text-amber-950">
                          <AlertTriangle className="w-3 h-3" />
                          {cycleBaseDiff > 0 ? '未配分あり' : '配分超過'}
                        </span>
                      )}
                    </div>
                    <div className="text-lg font-extrabold mt-1">
                      {cycleBaseDiff === 0
                        ? `未配分 ¥0（入金額 ${formatYen(cycleIncomeInput)} に一致）`
                        : cycleBaseDiff > 0
                        ? `あと ${formatYen(cycleBaseDiff)} を各科目へ配分できます`
                        : `入金額より ${formatYen(Math.abs(cycleBaseDiff))} 超過しています`}
                    </div>
                  </div>
                </div>
              </div>

              {/* Categories Manual Base Budget & Name Inputs */}
              <div className="space-y-2.5">
                {settings.categories.map((cat) => {
                  const meta = getCategoryStyle(cat);
                  const val = cycleBaseInputs[cat.id] ?? 0;
                  const carryVal =
                    currentCycle.allocations[cat.id]?.carryover ?? 0;
                  const nameVal = categoryNames[cat.id] ?? cat.name;
                  return (
                    <div
                      key={cat.id}
                      className="p-3.5 rounded-xl bg-white border border-stone-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div
                          className={`w-9 h-9 rounded-xl ${meta.iconBg} ${meta.iconColor} flex items-center justify-center shrink-0`}
                        >
                          <CategoryIcon
                            categoryId={cat.id}
                            category={cat}
                            className="w-5 h-5"
                          />
                        </div>
                        <div className="flex-1">
                          <input
                            type="text"
                            value={nameVal}
                            onChange={(e) =>
                              setCategoryNames((prev) => ({
                                ...prev,
                                [cat.id]: e.target.value,
                              }))
                            }
                            className="w-full sm:w-52 px-2.5 py-1 rounded-lg border border-stone-200 bg-[#faf8f5] focus:bg-white text-sm font-bold text-slate-700"
                            placeholder="科目名"
                          />
                          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                            <span>{meta.description}</span>
                            {carryVal > 0 && (
                              <span className="text-teal-700 font-semibold">
                                (+繰越 {formatYen(carryVal)})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <div className="relative w-32">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                            ¥
                          </span>
                          <input
                            type="number"
                            min={0}
                            step={500}
                            value={val}
                            onChange={(e) =>
                              setCycleBaseInputs((prev) => ({
                                ...prev,
                                [cat.id]: Math.max(
                                  0,
                                  parseInt(e.target.value || '0', 10) || 0
                                ),
                              }))
                            }
                            className="w-full pl-7 pr-2.5 py-1.5 rounded-xl border border-stone-200 bg-[#faf8f5] focus:bg-white text-sm font-bold text-right text-slate-700"
                          />
                        </div>

                        <div className="flex items-center gap-1">
                          {[1000, 5000, 10000].map((stepVal) => (
                            <button
                              key={stepVal}
                              type="button"
                              onClick={() =>
                                setCycleBaseInputs((prev) => ({
                                  ...prev,
                                  [cat.id]: (prev[cat.id] || 0) + stepVal,
                                }))
                              }
                              className="px-2 py-1 rounded-lg bg-[#faf8f5] hover:bg-teal-50 text-slate-600 hover:text-teal-800 border border-stone-200 text-[11px] font-semibold transition"
                            >
                              +{(stepVal / 1000).toFixed(0)}k
                            </button>
                          ))}
                          {cycleBaseDiff > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                setCycleBaseInputs((prev) => ({
                                  ...prev,
                                  [cat.id]: (prev[cat.id] || 0) + cycleBaseDiff,
                                }))
                              }
                              className="px-2 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-[11px] font-bold transition"
                            >
                              残り全額 ({formatYen(cycleBaseDiff)})
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              setCycleBaseInputs((prev) => ({
                                ...prev,
                                [cat.id]: 0,
                              }))
                            }
                            className="px-2 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-slate-500 text-[11px] font-semibold transition"
                          >
                            0
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-stone-200/80">
                <button
                  type="button"
                  onClick={() => setActiveTab('categories')}
                  className="px-3.5 py-2 rounded-xl bg-orange-50 hover:bg-orange-100/80 text-orange-800 border border-orange-200/70 text-xs font-bold"
                >
                  科目の追加・削除はこちら →
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl border border-stone-200 bg-white text-slate-600 text-xs sm:text-sm font-semibold hover:bg-stone-50"
                  >
                    閉じる
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveCycleIncomeAndBase}
                    className="px-6 py-2.5 rounded-xl bg-teal-600/90 hover:bg-teal-600 text-white text-xs sm:text-sm font-bold shadow-2xs transition"
                  >
                    当月の入金と予算配分を保存する
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ==========================================
              TAB 4: 科目の追加・編集・削除
          ========================================== */}
          {activeTab === 'categories' && (
            <div className="space-y-6">
              {/* Add New Category Card */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200/80 space-y-4">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-700 flex items-center gap-2">
                    <FolderPlus className="w-4 h-4 text-orange-400" />
                    <span>新しい科目を追加する</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    科目名・毎月の基本予算・決済タイプ・カラーを選んで自由に追加できます。
                  </p>
                </div>

                <form
                  onSubmit={handleAddCategorySubmit}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
                >
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      科目名
                    </label>
                    <input
                      type="text"
                      placeholder="例: 交際費・カフェ代"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-[#faf8f5] focus:bg-white text-sm font-semibold text-slate-700"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      基本予算（月額）
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      value={newCatBudget}
                      onChange={(e) => setNewCatBudget(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-[#faf8f5] focus:bg-white text-sm font-bold text-slate-700"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      決済・管理タイプ
                    </label>
                    <select
                      value={newCatType}
                      onChange={(e) =>
                        setNewCatType(
                          e.target.value as 'regular' | 'credit' | 'savings'
                        )
                      }
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-[#faf8f5] text-xs sm:text-sm font-semibold text-slate-700"
                    >
                      <option value="regular">通常決済</option>
                      <option value="credit">クレカ払い (10日締め)</option>
                      <option value="savings">貯金・積立枠</option>
                    </select>
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      テーマカラー
                    </label>
                    <select
                      value={newCatColor}
                      onChange={(e) =>
                        setNewCatColor(e.target.value as CategoryColorKey)
                      }
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-[#faf8f5] text-xs sm:text-sm font-semibold text-slate-700"
                    >
                      {(
                        Object.keys(COLOR_PALETTE_MAP) as CategoryColorKey[]
                      ).map((ck) => (
                        <option key={ck} value={ck}>
                          {COLOR_PALETTE_MAP[ck].label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-12 space-y-1.5 pt-1">
                    <label className="block text-xs font-bold text-slate-600">
                      アイコンを選択
                    </label>
                    <IconPickerGrid
                      selectedIconKey={newCatIcon}
                      onSelectIcon={setNewCatIcon}
                      colorKey={newCatColor}
                    />
                  </div>

                  <div className="sm:col-span-12 flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={!newCatName.trim()}
                      className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-teal-600/90 hover:bg-teal-600 disabled:bg-stone-200 text-white text-xs sm:text-sm font-bold shadow-2xs transition"
                    >
                      <Plus className="w-4 h-4" />
                      <span>科目を追加する</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Existing Categories List (Edit Name, Icon, Type, Color, Delete) */}
              <div className="space-y-2.5">
                <div className="text-xs font-bold text-slate-600">
                  登録済みの科目一覧（アイコン・名前・決済タイプ・カラーの変更や削除が可能です）
                </div>

                {settings.categories.map((cat) => {
                  const meta = getCategoryStyle(cat);
                  const currentIconKey = getCategoryIconKey(cat);
                  const isIconGridOpen = openIconPickerCatId === cat.id;
                  const currentType = cat.isCredit
                    ? 'credit'
                    : cat.isSavings
                    ? 'savings'
                    : 'regular';

                  return (
                    <div
                      key={cat.id}
                      className="p-3.5 rounded-2xl bg-white border border-stone-200/80 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1">
                          <button
                            type="button"
                            onClick={() =>
                              setOpenIconPickerCatId(
                                isIconGridOpen ? null : cat.id
                              )
                            }
                            className={`w-10 h-10 rounded-xl ${meta.iconBg} ${meta.iconColor} flex items-center justify-center shrink-0 hover:ring-2 hover:ring-teal-300 transition`}
                            title="クリックでアイコン一覧を表示"
                          >
                            <CategoryIcon
                              categoryId={cat.id}
                              category={cat}
                              className="w-5 h-5"
                            />
                          </button>

                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2">
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-400">
                                科目名
                              </label>
                              <input
                                type="text"
                                value={cat.name}
                                onChange={(e) =>
                                  onUpdateCategory(cat.id, {
                                    name: e.target.value,
                                  })
                                }
                                className="w-full px-2.5 py-1 rounded-lg border border-stone-200 bg-[#faf8f5] focus:bg-white text-xs sm:text-sm font-bold text-slate-700"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-semibold text-slate-400">
                                アイコン
                              </label>
                              <select
                                value={currentIconKey}
                                onChange={(e) =>
                                  onUpdateCategory(cat.id, {
                                    iconKey: e.target.value as CategoryIconKey,
                                  })
                                }
                                className="w-full px-2.5 py-1 rounded-lg border border-stone-200 bg-[#faf8f5] text-xs font-semibold text-slate-700"
                              >
                                {ICON_OPTIONS.map((opt) => (
                                  <option key={opt.key} value={opt.key}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] font-semibold text-slate-400">
                                決済・管理タイプ
                              </label>
                              <select
                                value={currentType}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  onUpdateCategory(cat.id, {
                                    isCredit: val === 'credit',
                                    isSavings: val === 'savings',
                                  });
                                }}
                                className="w-full px-2.5 py-1 rounded-lg border border-stone-200 bg-[#faf8f5] text-xs font-semibold text-slate-700"
                              >
                                <option value="regular">通常決済</option>
                                <option value="credit">
                                  クレカ払い (10日締め)
                                </option>
                                <option value="savings">貯金・積立枠</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] font-semibold text-slate-400">
                                カラー
                              </label>
                              <select
                                value={cat.colorKey || 'sage'}
                                onChange={(e) =>
                                  onUpdateCategory(cat.id, {
                                    colorKey:
                                      e.target.value as CategoryColorKey,
                                  })
                                }
                                className="w-full px-2.5 py-1 rounded-lg border border-stone-200 bg-[#faf8f5] text-xs font-semibold text-slate-700"
                              >
                                {(
                                  Object.keys(
                                    COLOR_PALETTE_MAP
                                  ) as CategoryColorKey[]
                                ).map((ck) => (
                                  <option key={ck} value={ck}>
                                    {COLOR_PALETTE_MAP[ck].label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled={settings.categories.length <= 1}
                            onClick={() => onDeleteCategory(cat.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100/80 disabled:opacity-40 text-rose-600 border border-rose-200/70 text-xs font-semibold transition"
                            title="この科目を削除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>削除</span>
                          </button>
                        </div>
                      </div>

                      {isIconGridOpen && (
                        <div className="pt-2 border-t border-stone-100 space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                            <span>「{cat.name}」のアイコンを選択</span>
                            <button
                              type="button"
                              onClick={() => setOpenIconPickerCatId(null)}
                              className="text-slate-400 hover:text-slate-600"
                            >
                              閉じる
                            </button>
                          </div>
                          <IconPickerGrid
                            selectedIconKey={currentIconKey}
                            onSelectIcon={(iconKey) => {
                              onUpdateCategory(cat.id, { iconKey });
                              setOpenIconPickerCatId(null);
                            }}
                            colorKey={cat.colorKey || 'sage'}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
