'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useStore } from '@/lib/store';
import {
  calculateCumulativeSavings,
  calculateCycleSummary,
  calculateNetPaymentBilling,
} from '@/lib/calculations';
import { CategoryId } from '@/types';
import { CycleHeader } from '@/components/CycleHeader';
import { CategoryCards } from '@/components/CategoryCards';
import { QuickExpenseForm } from '@/components/QuickExpenseForm';
import {
  TransactionFilterType,
  TransactionHistory,
} from '@/components/TransactionHistory';
import { BudgetAndCarryoverModal } from '@/components/BudgetAndCarryoverModal';
import { DataManagementModal } from '@/components/DataManagementModal';

export default function KeihiPocketDashboard() {
  const {
    data,
    isLoaded,
    minRetainedCycleId,
    autoPrunedNotice,
    setActiveCycleId,
    currentCycle,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    updateBaseBudgets,
    addCategory,
    updateCategory,
    deleteCategory,
    updateCycleAllocations,
    transferBudgetInCycle,
    exportJson,
    importJson,
    clearAllTransactions,
    restoreSampleData,
  } = useStore();

  const [selectedFilter, setSelectedFilter] =
    useState<TransactionFilterType>('all');
  const [quickFormCategory, setQuickFormCategory] =
    useState<CategoryId>('food');
  const [isQuickExpenseModalOpen, setIsQuickExpenseModalOpen] = useState(false);
  const [quickModalInitialType, setQuickModalInitialType] = useState<
    'expense' | 'income'
  >('expense');
  const [newlyAddedTxId, setNewlyAddedTxId] = useState<string | null>(null);

  const [budgetModalState, setBudgetModalState] = useState<{
    isOpen: boolean;
    tab: 'carryover' | 'transfer' | 'base' | 'categories';
    transferFrom?: CategoryId;
  }>({
    isOpen: false,
    tab: 'carryover',
  });

  const [isDataModalOpen, setIsDataModalOpen] = useState(false);

  const historySectionRef = useRef<HTMLDivElement>(null);

  const handleAddTransaction = (
    input: Parameters<typeof addTransaction>[0]
  ) => {
    const newTx = addTransaction(input);
    if (newTx) {
      if (newTx.cycleId !== currentCycle.cycleId) {
        setActiveCycleId(newTx.cycleId);
      }
      if (selectedFilter !== 'all' && selectedFilter !== newTx.categoryId) {
        setSelectedFilter('all');
      }
      setNewlyAddedTxId(newTx.id);
      setTimeout(() => {
        setNewlyAddedTxId(null);
      }, 4500);

      if (historySectionRef.current) {
        historySectionRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }
    }
    return newTx;
  };

  const cycleSummary = useMemo(
    () =>
      calculateCycleSummary(currentCycle, data.settings, data.transactions),
    [currentCycle, data.settings, data.transactions]
  );

  const netBilling = useMemo(
    () =>
      calculateNetPaymentBilling(
        currentCycle.cycleId,
        data.transactions,
        data.settings.categories
      ),
    [currentCycle.cycleId, data.transactions, data.settings.categories]
  );

  const cumulativeSavings = useMemo(
    () =>
      calculateCumulativeSavings(
        data.monthlyCycles,
        data.settings,
        data.transactions,
        currentCycle.cycleId
      ),
    [data.monthlyCycles, data.settings, data.transactions, currentCycle.cycleId]
  );

  const handleSelectFilter = (filter: TransactionFilterType) => {
    setSelectedFilter(filter);
    if (filter !== 'all' && historySectionRef.current) {
      historySectionRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  };

  const handleQuickAddForCategory = (categoryId: CategoryId) => {
    setQuickFormCategory(categoryId);
    setQuickModalInitialType('expense');
    setIsQuickExpenseModalOpen(true);
  };

  const handleOpenBudgetModal = (
    tab: 'carryover' | 'transfer' | 'base' | 'categories',
    transferFrom?: CategoryId
  ) => {
    setBudgetModalState({
      isOpen: true,
      tab,
      transferFrom,
    });
  };

  const [forceShow, setForceShow] = useState(false);

  useEffect(() => {
    // セーフティタイマー: 万一読み込みフラグが遅延した場合でも自動的に画面を表示
    const timer = setTimeout(() => {
      setForceShow(true);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  if (!isLoaded && !forceShow) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf8f5]">
        <div className="text-center space-y-3 p-6 max-w-sm">
          <div className="w-10 h-10 rounded-full border-4 border-teal-300 border-t-transparent animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-500">
            経費ポケットを読み込み中...
          </p>
          <button
            type="button"
            onClick={() => setForceShow(true)}
            className="text-xs text-teal-600 hover:text-teal-800 underline font-semibold transition"
          >
            画面を今すぐ表示する
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 sm:pb-12 bg-[#faf8f5]">
      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-6">
        {autoPrunedNotice && (
          <div className="bg-teal-50/90 border border-teal-200/80 text-teal-900 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-semibold shadow-2xs">
            {autoPrunedNotice}
          </div>
        )}

        {/* 1. サイクル＆全体サマリーヘッダー */}
        <CycleHeader
          cycle={currentCycle}
          onSelectCycle={setActiveCycleId}
          nonSavingsCount={cycleSummary.nonSavingsCount}
          fourCategoriesBudget={cycleSummary.fourCategoriesBudget}
          fourCategoriesSpent={cycleSummary.fourCategoriesSpent}
          fourCategoriesRemaining={cycleSummary.fourCategoriesRemaining}
          fourCategoriesUsageRate={cycleSummary.fourCategoriesUsageRate}
          savingsConfirmed={cycleSummary.savingsConfirmed}
          cumulativeSavings={cumulativeSavings}
          unallocatedCarryover={cycleSummary.unallocatedCarryover}
          netBilling={netBilling}
          onOpenBudgetModal={(tab) => handleOpenBudgetModal(tab)}
          onOpenDataModal={() => setIsDataModalOpen(true)}
          onOpenQuickExpenseModal={() => {
            setQuickModalInitialType('expense');
            setIsQuickExpenseModalOpen(true);
          }}
          onOpenQuickIncomeModal={() => {
            setQuickModalInitialType('income');
            setIsQuickExpenseModalOpen(true);
          }}
        />

        {/* 2. 科目別ステータスカード */}
        <CategoryCards
          summaries={cycleSummary.categorySummaries}
          netBilling={netBilling}
          cumulativeSavings={cumulativeSavings}
          selectedFilterCategory={selectedFilter}
          onSelectFilter={handleSelectFilter}
          onQuickAddForCategory={handleQuickAddForCategory}
          onOpenTransferModal={(catId) =>
            handleOpenBudgetModal('transfer', catId)
          }
          onOpenManageCategories={() => handleOpenBudgetModal('categories')}
          onRenameCategory={(id, newName) =>
            updateCategory(id, { name: newName })
          }
          onChangeCategoryIcon={(id, iconKey) =>
            updateCategory(id, { iconKey })
          }
        />

        {/* 3. 支出クイック登録フォーム ＆ 5. 収支履歴 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Inline Quick Registration Form */}
          <div className="lg:col-span-5 lg:sticky lg:top-6">
            <QuickExpenseForm
              categories={data.settings.categories}
              currentCycle={currentCycle}
              selectedCategoryId={quickFormCategory}
              onSelectCategoryId={setQuickFormCategory}
              onAddTransaction={handleAddTransaction}
            />
          </div>

          {/* Transaction History Area */}
          <div ref={historySectionRef} className="lg:col-span-7">
            <TransactionHistory
              currentCycle={currentCycle}
              allTransactions={data.transactions}
              categories={data.settings.categories}
              netBilling={netBilling}
              selectedFilter={selectedFilter}
              newlyAddedTxId={newlyAddedTxId}
              onSelectFilter={setSelectedFilter}
              onSelectCycle={setActiveCycleId}
              onUpdateTransaction={updateTransaction}
              onDeleteTransaction={deleteTransaction}
            />
          </div>
        </div>
      </main>

      {/* Mobile Floating Action Button (FAB) */}
      <button
        type="button"
        onClick={() => setIsQuickExpenseModalOpen(true)}
        className="fixed bottom-5 right-5 z-40 sm:hidden inline-flex items-center gap-2 px-4 py-3.5 rounded-full bg-teal-600/95 hover:bg-teal-600 text-white font-bold text-sm shadow-lg border border-teal-200/50"
      >
        <Plus className="w-5 h-5" />
        <span>支出を記録</span>
      </button>

      {/* Quick Expense / Income Modal */}
      {isQuickExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <QuickExpenseForm
            categories={data.settings.categories}
            currentCycle={currentCycle}
            selectedCategoryId={quickFormCategory}
            onSelectCategoryId={setQuickFormCategory}
            initialTxType={quickModalInitialType}
            onAddTransaction={handleAddTransaction}
            isModal
            onCloseModal={() => setIsQuickExpenseModalOpen(false)}
          />
        </div>
      )}

      {/* 4. 予算設定・繰越金振り分け・科目管理モーダル */}
      <BudgetAndCarryoverModal
        isOpen={budgetModalState.isOpen}
        initialTab={budgetModalState.tab}
        initialTransferFromCategory={budgetModalState.transferFrom}
        onClose={() =>
          setBudgetModalState((prev) => ({ ...prev, isOpen: false }))
        }
        currentCycle={currentCycle}
        settings={data.settings}
        monthlyCycles={data.monthlyCycles}
        transactions={data.transactions}
        onUpdateCycleAllocations={updateCycleAllocations}
        onTransferBudget={transferBudgetInCycle}
        onUpdateBaseBudgets={updateBaseBudgets}
        onAddCategory={addCategory}
        onUpdateCategory={updateCategory}
        onDeleteCategory={deleteCategory}
      />

      {/* データ管理モーダル */}
      <DataManagementModal
        isOpen={isDataModalOpen}
        onClose={() => setIsDataModalOpen(false)}
        data={data}
        minRetainedCycleId={minRetainedCycleId}
        exportJson={exportJson}
        importJson={importJson}
        onClearAllTransactions={clearAllTransactions}
        onRestoreSampleData={restoreSampleData}
      />
    </div>
  );
}
