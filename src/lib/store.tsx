'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  AppSettings,
  BudgetTransferLog,
  CategoryColorKey,
  CategoryConfig,
  CategoryIconKey,
  CategoryId,
  CycleAllocations,
  KeihiPocketData,
  MonthlyCycle,
  Transaction,
} from '@/types';
import {
  calculatePreviousCycleCarryoverInfo,
  getBillingMonthForDate,
  getCycleDateRange,
  getCycleIdFromDate,
  MAX_RETENTION_MONTHS,
  pruneExpiredCyclesAndTransactions,
} from '@/lib/calculations';

const STORAGE_KEY = 'keihi_pocket_data_v3';

export const DEFAULT_SETTINGS: AppSettings = {
  baseMonthlyIncome: 0,
  cycleStartDay: 25,
  creditCardClosingDay: 10,
  retentionMonths: MAX_RETENTION_MONTHS,
  archivedSavingsTotal: 0,
  categories: [
    {
      id: 'food',
      name: '食材費',
      defaultBudget: 0,
      isCredit: false,
      isSavings: false,
      colorKey: 'peach',
      iconKey: 'utensils',
    },
    {
      id: 'consumables',
      name: '消耗品費',
      defaultBudget: 0,
      isCredit: false,
      isSavings: false,
      colorKey: 'mint',
      iconKey: 'shopping_bag',
    },
    {
      id: 'net_payment',
      name: 'ネット決済費',
      defaultBudget: 0,
      isCredit: true,
      isSavings: false,
      colorKey: 'lavender',
      iconKey: 'credit_card',
    },
    {
      id: 'books',
      name: '図書費',
      defaultBudget: 0,
      isCredit: false,
      isSavings: false,
      colorKey: 'sky',
      iconKey: 'book_open',
    },
    {
      id: 'savings',
      name: '貯金',
      defaultBudget: 0,
      isCredit: false,
      isSavings: true,
      colorKey: 'honey',
      iconKey: 'piggy_bank',
    },
  ],
};

export const INITIAL_SAMPLE_DATA: KeihiPocketData = {
  settings: DEFAULT_SETTINGS,
  monthlyCycles: [
    {
      cycleId: '2026-10',
      startDate: '2026-10-25',
      endDate: '2026-11-24',
      income: 0,
      carryoverTotal: 0,
      allocations: {
        food: { base: 0, carryover: 0 },
        consumables: { base: 0, carryover: 0 },
        net_payment: { base: 0, carryover: 0 },
        books: { base: 0, carryover: 0 },
        savings: { base: 0, carryover: 0 },
      },
      isClosed: false,
    },
  ],
  transactions: [],
};

function createCycleObject(
  cycleId: string,
  settings: AppSettings,
  existingCycles: MonthlyCycle[],
  transactions: Transaction[]
): MonthlyCycle {
  const { startDate, endDate } = getCycleDateRange(cycleId);
  const prevInfo = calculatePreviousCycleCarryoverInfo(
    cycleId,
    existingCycles,
    settings,
    transactions
  );

  const defaultAllocations: CycleAllocations = {};

  for (const cat of settings.categories) {
    // 毎月25日に自動入金は行わず、当月基本枠(base)は0円で開始し、前月繰越のみ引き継ぐ
    defaultAllocations[cat.id] = {
      base: 0,
      carryover: prevInfo.hasPrevCycle
        ? prevInfo.categoryRemainders[cat.id] || 0
        : 0,
    };
  }

  return {
    cycleId,
    startDate,
    endDate,
    income: 0,
    carryoverTotal: prevInfo.hasPrevCycle
      ? prevInfo.calculatedCarryoverTotal
      : 0,
    allocations: defaultAllocations,
    isClosed: false,
    transfers: [],
  };
}

interface StoreContextValue {
  data: KeihiPocketData;
  isLoaded: boolean;
  activeCycleId: string;
  minRetainedCycleId: string;
  autoPrunedNotice: string | null;
  setActiveCycleId: (cycleId: string) => void;
  currentCycle: MonthlyCycle;
  addTransaction: (input: {
    date: string;
    type?: 'expense' | 'income';
    categoryId: CategoryId;
    amount: number;
    memo: string;
    savingsType?: 'withdrawal' | 'deposit';
    forceCycleId?: string;
  }) => Transaction;
  updateTransaction: (
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
  deleteTransaction: (id: string) => void;
  updateBaseBudgets: (
    newBudgets: Record<CategoryId, number>,
    newBaseIncome: number,
    applyToCurrentCycle: boolean,
    updatedCategoryNames?: Record<CategoryId, string>
  ) => void;
  addCategory: (input: {
    name: string;
    defaultBudget: number;
    isCredit: boolean;
    isSavings: boolean;
    colorKey?: CategoryColorKey;
    iconKey?: CategoryIconKey;
  }) => CategoryConfig;
  updateCategory: (
    id: CategoryId,
    updates: Partial<Omit<CategoryConfig, 'id'>>
  ) => void;
  deleteCategory: (id: CategoryId) => void;
  updateCycleAllocations: (
    cycleId: string,
    carryoverTotal: number,
    allocations: CycleAllocations,
    income?: number,
    incomeMemo?: string
  ) => void;
  transferBudgetInCycle: (
    cycleId: string,
    fromCategoryId: CategoryId,
    toCategoryId: CategoryId,
    amount: number,
    targetField: 'base' | 'carryover',
    memo?: string
  ) => void;
  exportJson: () => string;
  importJson: (jsonStr: string) => { success: boolean; error?: string };
  clearAllTransactions: () => void;
  restoreSampleData: () => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<KeihiPocketData>(INITIAL_SAMPLE_DATA);
  const [activeCycleId, setActiveCycleIdState] = useState<string>('2026-10');
  const [autoPrunedNotice, setAutoPrunedNotice] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      let saved = localStorage.getItem(STORAGE_KEY);
      let isMigratingFromOlderVersion = false;
      if (!saved) {
        const oldV2 = localStorage.getItem('keihi_pocket_data_v2');
        const oldV1 = localStorage.getItem('keihi_pocket_data_v1');
        if (oldV2 || oldV1) {
          saved = oldV2 || oldV1;
          isMigratingFromOlderVersion = true;
        }
      }

      if (saved) {
        const parsed = JSON.parse(saved) as KeihiPocketData;
        if (parsed && parsed.settings && Array.isArray(parsed.monthlyCycles)) {
          // サンプル・仮作成データの自動削除（tx_prev_ や tx_00 で始まる仮明細を排除）
          parsed.transactions = (parsed.transactions || []).filter(
            (t) => !t.id.startsWith('tx_prev_') && !t.id.startsWith('tx_00')
          );

          // 旧バージョンからの移行時は、基本支給額・デフォルト予算を0円にリセット（手動入金仕様へ統一）
          if (isMigratingFromOlderVersion) {
            parsed.settings.baseMonthlyIncome = 0;
            parsed.settings.categories = (parsed.settings.categories || []).map(
              (cat) => ({
                ...cat,
                defaultBudget: 0,
              })
            );
            parsed.monthlyCycles = parsed.monthlyCycles.map((c) => {
              const cleanedAllocations: CycleAllocations = {};
              for (const [catId, alloc] of Object.entries(c.allocations)) {
                cleanedAllocations[catId] = {
                  base: c.income === 60000 && !c.incomeMemo ? 0 : alloc.base,
                  carryover: c.carryoverTotal === 4500 ? 0 : alloc.carryover,
                };
              }
              return {
                ...c,
                income: c.income === 60000 && !c.incomeMemo ? 0 : c.income,
                carryoverTotal: c.carryoverTotal === 4500 ? 0 : c.carryoverTotal,
                allocations: cleanedAllocations,
              };
            });
          }

          const { prunedData, removedCycleIds } =
            pruneExpiredCyclesAndTransactions(parsed);
          setData(prunedData);
          if (removedCycleIds.length > 0) {
            setAutoPrunedNotice(
              `保持期間（${MAX_RETENTION_MONTHS}ヶ月）を過ぎた過去データ（${removedCycleIds.join(
                ', '
              )}月度）を自動削除しました（貯金累計は保護済み）`
            );
            setTimeout(() => setAutoPrunedNotice(null), 5000);
          }
          if (prunedData.monthlyCycles.length > 0) {
            const latestId =
              prunedData.monthlyCycles[prunedData.monthlyCycles.length - 1]
                .cycleId;
            if (activeCycleId < prunedData.monthlyCycles[0].cycleId) {
              setActiveCycleIdState(latestId);
            }
          }
        }
      }
    } catch (e) {
      console.error('Failed to load KeihiPocketData from LocalStorage:', e);
    } finally {
      setIsLoaded(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save KeihiPocketData to LocalStorage:', e);
    }
  }, [data, isLoaded]);

  const retentionInfo = useMemo(
    () => pruneExpiredCyclesAndTransactions(data, activeCycleId),
    [data, activeCycleId]
  );

  const currentCycle = useMemo(() => {
    const found = data.monthlyCycles.find((c) => c.cycleId === activeCycleId);
    if (found) return found;
    return createCycleObject(
      activeCycleId,
      data.settings,
      data.monthlyCycles,
      data.transactions
    );
  }, [data, activeCycleId]);

  const setActiveCycleId = (cycleId: string) => {
    setData((prev) => {
      const { minRetainedCycleId } = pruneExpiredCyclesAndTransactions(prev);
      // 12ヶ月保持期間より過去へは遡らない（古いデータの再生成による肥大化を防止）
      if (cycleId < minRetainedCycleId && !prev.monthlyCycles.some((c) => c.cycleId === cycleId)) {
        setAutoPrunedNotice(
          `データ保持期間は直近${MAX_RETENTION_MONTHS}ヶ月分（${minRetainedCycleId}月度以降）までのため、それ以前の月データは保持されません`
        );
        setTimeout(() => setAutoPrunedNotice(null), 4000);
        return prev;
      }

      setActiveCycleIdState(cycleId);
      const exists = prev.monthlyCycles.some((c) => c.cycleId === cycleId);
      let nextData = prev;
      if (!exists) {
        const newCycle = createCycleObject(
          cycleId,
          prev.settings,
          prev.monthlyCycles,
          prev.transactions
        );
        nextData = {
          ...prev,
          monthlyCycles: [...prev.monthlyCycles, newCycle].sort((a, b) =>
            a.cycleId.localeCompare(b.cycleId)
          ),
        };
      }

      const { prunedData, removedCycleIds } =
        pruneExpiredCyclesAndTransactions(nextData, cycleId);
      if (removedCycleIds.length > 0) {
        setAutoPrunedNotice(
          `${MAX_RETENTION_MONTHS}ヶ月経過した過去データ（${removedCycleIds.join(
            ', '
          )}月度）を自動削除しました（貯金累計は保護済み）`
        );
        setTimeout(() => setAutoPrunedNotice(null), 5000);
      }
      return prunedData;
    });
  };

  const addTransaction: StoreContextValue['addTransaction'] = (input) => {
    const computedCycleId =
      input.forceCycleId ||
      getCycleIdFromDate(input.date, data.settings.cycleStartDay);
    const txType = input.type || 'expense';
    const catObj = data.settings.categories.find(
      (c) => c.id === input.categoryId
    );
    const isCredit = catObj ? catObj.isCredit : input.categoryId === 'net_payment';
    const isSavings = catObj ? catObj.isSavings : input.categoryId === 'savings';

    const billingMonth =
      txType === 'expense' && isCredit
        ? getBillingMonthForDate(input.date, data.settings.creditCardClosingDay)
        : null;

    const newTx: Transaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      cycleId: computedCycleId,
      date: input.date,
      type: txType,
      categoryId: input.categoryId,
      amount: Math.round(Number(input.amount) || 0),
      memo: input.memo.trim(),
      billingMonth,
      savingsType:
        txType === 'expense' && isSavings
          ? input.savingsType || 'withdrawal'
          : undefined,
      createdAt: new Date().toISOString(),
    };

    setData((prev) => {
      let updatedCycles = prev.monthlyCycles;
      if (!updatedCycles.some((c) => c.cycleId === computedCycleId)) {
        const newCycle = createCycleObject(
          computedCycleId,
          prev.settings,
          prev.monthlyCycles,
          prev.transactions
        );
        updatedCycles = [...updatedCycles, newCycle].sort((a, b) =>
          a.cycleId.localeCompare(b.cycleId)
        );
      }

      // 入金トランザクションの場合は該当サイクルの総入金額および対象科目の当月基本予算枠に自動加算
      if (txType === 'income') {
        updatedCycles = updatedCycles.map((c) => {
          if (c.cycleId !== computedCycleId) return c;
          const prevCatAlloc = c.allocations[newTx.categoryId] || {
            base: 0,
            carryover: 0,
          };
          return {
            ...c,
            income: (c.income || 0) + newTx.amount,
            allocations: {
              ...c.allocations,
              [newTx.categoryId]: {
                ...prevCatAlloc,
                base: (prevCatAlloc.base || 0) + newTx.amount,
              },
            },
          };
        });
      }

      const nextData: KeihiPocketData = {
        ...prev,
        monthlyCycles: updatedCycles,
        transactions: [newTx, ...prev.transactions],
      };
      const { prunedData, removedCycleIds } =
        pruneExpiredCyclesAndTransactions(nextData);
      if (removedCycleIds.length > 0) {
        setAutoPrunedNotice(
          `${MAX_RETENTION_MONTHS}ヶ月経過した過去データ（${removedCycleIds.join(
            ', '
          )}月度）を自動削除しました`
        );
        setTimeout(() => setAutoPrunedNotice(null), 4500);
      }
      return prunedData;
    });

    return newTx;
  };

  const updateTransaction: StoreContextValue['updateTransaction'] = (
    id,
    updates
  ) => {
    setData((prev) => {
      const oldTx = prev.transactions.find((t) => t.id === id);
      if (!oldTx) return prev;

      const nextDate = updates.date ?? oldTx.date;
      const nextCategory = updates.categoryId ?? oldTx.categoryId;
      const nextType = updates.type ?? oldTx.type ?? 'expense';
      const nextAmount =
        updates.amount !== undefined
          ? Math.round(Number(updates.amount) || 0)
          : oldTx.amount;
      const catObj = prev.settings.categories.find(
        (c) => c.id === nextCategory
      );
      const isCredit = catObj ? catObj.isCredit : nextCategory === 'net_payment';
      const isSavings = catObj ? catObj.isSavings : nextCategory === 'savings';

      const nextCycleId = getCycleIdFromDate(
        nextDate,
        prev.settings.cycleStartDay
      );
      const nextBillingMonth =
        nextType === 'expense' && isCredit
          ? getBillingMonthForDate(
              nextDate,
              prev.settings.creditCardClosingDay
            )
          : null;

      const updatedTx: Transaction = {
        ...oldTx,
        ...updates,
        type: nextType,
        amount: nextAmount,
        date: nextDate,
        categoryId: nextCategory,
        cycleId: nextCycleId,
        billingMonth: nextBillingMonth,
        savingsType:
          nextType === 'expense' && isSavings
            ? updates.savingsType ?? oldTx.savingsType ?? 'withdrawal'
            : undefined,
      };

      const updatedTxs = prev.transactions.map((tx) =>
        tx.id === id ? updatedTx : tx
      );

      let updatedCycles = [...prev.monthlyCycles];

      // 旧トランザクションが入金だった場合、まず旧加算分を差し引く
      if (oldTx.type === 'income') {
        updatedCycles = updatedCycles.map((c) => {
          if (c.cycleId !== oldTx.cycleId) return c;
          const prevAlloc = c.allocations[oldTx.categoryId] || {
            base: 0,
            carryover: 0,
          };
          return {
            ...c,
            income: Math.max(0, (c.income || 0) - oldTx.amount),
            allocations: {
              ...c.allocations,
              [oldTx.categoryId]: {
                ...prevAlloc,
                base: Math.max(0, (prevAlloc.base || 0) - oldTx.amount),
              },
            },
          };
        });
      }

      // 更新後トランザクションが入金の場合、新加算分を反映する
      if (updatedTx.type === 'income') {
        if (!updatedCycles.some((c) => c.cycleId === updatedTx.cycleId)) {
          const created = createCycleObject(
            updatedTx.cycleId,
            prev.settings,
            updatedCycles,
            updatedTxs
          );
          updatedCycles = [...updatedCycles, created].sort((a, b) =>
            a.cycleId.localeCompare(b.cycleId)
          );
        }
        updatedCycles = updatedCycles.map((c) => {
          if (c.cycleId !== updatedTx.cycleId) return c;
          const prevAlloc = c.allocations[updatedTx.categoryId] || {
            base: 0,
            carryover: 0,
          };
          return {
            ...c,
            income: (c.income || 0) + updatedTx.amount,
            allocations: {
              ...c.allocations,
              [updatedTx.categoryId]: {
                ...prevAlloc,
                base: (prevAlloc.base || 0) + updatedTx.amount,
              },
            },
          };
        });
      }

      const nextData: KeihiPocketData = {
        ...prev,
        monthlyCycles: updatedCycles,
        transactions: updatedTxs,
      };
      return pruneExpiredCyclesAndTransactions(nextData).prunedData;
    });
  };

  const deleteTransaction = (id: string) => {
    setData((prev) => {
      const targetTx = prev.transactions.find((t) => t.id === id);
      if (!targetTx) return prev;

      let updatedCycles = prev.monthlyCycles;
      if (targetTx.type === 'income') {
        updatedCycles = updatedCycles.map((c) => {
          if (c.cycleId !== targetTx.cycleId) return c;
          const prevAlloc = c.allocations[targetTx.categoryId] || {
            base: 0,
            carryover: 0,
          };
          return {
            ...c,
            income: Math.max(0, (c.income || 0) - targetTx.amount),
            allocations: {
              ...c.allocations,
              [targetTx.categoryId]: {
                ...prevAlloc,
                base: Math.max(0, (prevAlloc.base || 0) - targetTx.amount),
              },
            },
          };
        });
      }

      return {
        ...prev,
        monthlyCycles: updatedCycles,
        transactions: prev.transactions.filter((t) => t.id !== id),
      };
    });
  };

  const updateBaseBudgets: StoreContextValue['updateBaseBudgets'] = (
    newBudgets,
    newBaseIncome,
    applyToCurrentCycle,
    updatedCategoryNames
  ) => {
    setData((prev) => {
      const updatedCategories = prev.settings.categories.map((cat) => ({
        ...cat,
        name:
          updatedCategoryNames && updatedCategoryNames[cat.id]?.trim()
            ? updatedCategoryNames[cat.id].trim()
            : cat.name,
        defaultBudget: newBudgets[cat.id] ?? cat.defaultBudget,
      }));

      let updatedCycles = prev.monthlyCycles;
      if (applyToCurrentCycle) {
        const exists = updatedCycles.some((c) => c.cycleId === activeCycleId);
        if (!exists) {
          const created = createCycleObject(
            activeCycleId,
            {
              ...prev.settings,
              baseMonthlyIncome: newBaseIncome,
              categories: updatedCategories,
            },
            updatedCycles,
            prev.transactions
          );
          updatedCycles = [...updatedCycles, created];
        } else {
          updatedCycles = updatedCycles.map((c) => {
            if (c.cycleId !== activeCycleId) return c;
            const nextAlloc = { ...c.allocations };
            for (const cat of updatedCategories) {
              nextAlloc[cat.id] = {
                base: newBudgets[cat.id] ?? cat.defaultBudget,
                carryover: nextAlloc[cat.id]?.carryover ?? 0,
              };
            }
            return {
              ...c,
              income: newBaseIncome,
              allocations: nextAlloc,
            };
          });
        }
      }

      return {
        ...prev,
        settings: {
          ...prev.settings,
          baseMonthlyIncome: newBaseIncome,
          categories: updatedCategories,
        },
        monthlyCycles: updatedCycles,
      };
    });
  };

  const addCategory: StoreContextValue['addCategory'] = (input) => {
    const newCat: CategoryConfig = {
      id: `cat_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      name: input.name.trim() || '新規科目',
      defaultBudget: Math.max(0, Math.round(input.defaultBudget || 0)),
      isCredit: input.isCredit,
      isSavings: input.isSavings,
      colorKey: input.colorKey || 'sage',
      iconKey:
        input.iconKey ||
        (input.isCredit
          ? 'credit_card'
          : input.isSavings
          ? 'piggy_bank'
          : 'sparkles'),
    };

    setData((prev) => {
      const updatedCategories = [...prev.settings.categories, newCat];
      const updatedCycles = prev.monthlyCycles.map((c) => ({
        ...c,
        allocations: {
          ...c.allocations,
          [newCat.id]: {
            base: c.cycleId === activeCycleId ? newCat.defaultBudget : 0,
            carryover: 0,
          },
        },
      }));

      return {
        ...prev,
        settings: {
          ...prev.settings,
          categories: updatedCategories,
        },
        monthlyCycles: updatedCycles,
      };
    });

    return newCat;
  };

  const updateCategory: StoreContextValue['updateCategory'] = (id, updates) => {
    setData((prev) => {
      const updatedCategories = prev.settings.categories.map((cat) =>
        cat.id === id ? { ...cat, ...updates } : cat
      );
      return {
        ...prev,
        settings: {
          ...prev.settings,
          categories: updatedCategories,
        },
      };
    });
  };

  const deleteCategory: StoreContextValue['deleteCategory'] = (id) => {
    setData((prev) => {
      if (prev.settings.categories.length <= 1) {
        return prev; // Keep at least 1 category
      }
      const remainingCategories = prev.settings.categories.filter(
        (c) => c.id !== id
      );
      const fallbackCategoryId = remainingCategories[0].id;

      const updatedCycles = prev.monthlyCycles.map((c) => {
        const nextAlloc = { ...c.allocations };
        delete nextAlloc[id];
        return {
          ...c,
          allocations: nextAlloc,
        };
      });

      const updatedTransactions = prev.transactions.map((t) =>
        t.categoryId === id ? { ...t, categoryId: fallbackCategoryId } : t
      );

      return {
        ...prev,
        settings: {
          ...prev.settings,
          categories: remainingCategories,
        },
        monthlyCycles: updatedCycles,
        transactions: updatedTransactions,
      };
    });
  };

  const updateCycleAllocations: StoreContextValue['updateCycleAllocations'] = (
    cycleId,
    carryoverTotal,
    allocations,
    income,
    incomeMemo
  ) => {
    setData((prev) => {
      const existingCycle = prev.monthlyCycles.find(
        (c) => c.cycleId === cycleId
      );
      const { startDate, endDate } = getCycleDateRange(cycleId);

      // モーダルから当月入金・基本予算枠が追加された場合、増額分を入金履歴トランザクションとして記録
      const addedIncomeTxs: Transaction[] = [];
      if (income !== undefined) {
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(
          now.getMonth() + 1
        ).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const txDate =
          todayStr >= startDate && todayStr <= endDate ? todayStr : startDate;

        for (const cat of prev.settings.categories) {
          const oldBase = existingCycle?.allocations[cat.id]?.base || 0;
          const newBase = allocations[cat.id]?.base || 0;
          const diff = newBase - oldBase;
          if (diff > 0) {
            addedIncomeTxs.push({
              id: `tx_${Date.now()}_${cat.id}_${Math.random()
                .toString(36)
                .slice(2, 5)}`,
              cycleId,
              date: txDate,
              type: 'income',
              categoryId: cat.id,
              amount: diff,
              memo: incomeMemo?.trim()
                ? `${incomeMemo.trim()}（${cat.name}へ入金配分）`
                : `${cat.name}への入金・予算配分`,
              billingMonth: null,
              createdAt: new Date().toISOString(),
            });
          }
        }
      }

      let updatedCycles: MonthlyCycle[];
      if (existingCycle) {
        updatedCycles = prev.monthlyCycles.map((c) => {
          if (c.cycleId !== cycleId) return c;
          return {
            ...c,
            carryoverTotal,
            allocations,
            income: income !== undefined ? income : c.income,
            incomeMemo: incomeMemo !== undefined ? incomeMemo : c.incomeMemo,
          };
        });
      } else {
        const newCycle: MonthlyCycle = {
          cycleId,
          startDate,
          endDate,
          income: income ?? 0,
          incomeMemo,
          carryoverTotal,
          allocations,
          isClosed: false,
          transfers: [],
        };
        updatedCycles = [...prev.monthlyCycles, newCycle].sort((a, b) =>
          a.cycleId.localeCompare(b.cycleId)
        );
      }
      return {
        ...prev,
        monthlyCycles: updatedCycles,
        transactions:
          addedIncomeTxs.length > 0
            ? [...addedIncomeTxs, ...prev.transactions]
            : prev.transactions,
      };
    });
  };

  const transferBudgetInCycle: StoreContextValue['transferBudgetInCycle'] = (
    cycleId,
    fromCategoryId,
    toCategoryId,
    amount,
    targetField,
    memo = ''
  ) => {
    if (fromCategoryId === toCategoryId || amount <= 0) return;
    setData((prev) => {
      const targetCycle =
        prev.monthlyCycles.find((c) => c.cycleId === cycleId) ||
        createCycleObject(
          cycleId,
          prev.settings,
          prev.monthlyCycles,
          prev.transactions
        );

      const fromCatDef = prev.settings.categories.find(
        (c) => c.id === fromCategoryId
      );
      const toCatDef = prev.settings.categories.find(
        (c) => c.id === toCategoryId
      );

      const fromAlloc = {
        base:
          targetCycle.allocations[fromCategoryId]?.base ??
          fromCatDef?.defaultBudget ??
          0,
        carryover: targetCycle.allocations[fromCategoryId]?.carryover ?? 0,
      };
      const toAlloc = {
        base:
          targetCycle.allocations[toCategoryId]?.base ??
          toCatDef?.defaultBudget ??
          0,
        carryover: targetCycle.allocations[toCategoryId]?.carryover ?? 0,
      };

      fromAlloc[targetField] = fromAlloc[targetField] - amount;
      toAlloc[targetField] = toAlloc[targetField] + amount;

      const transferLog: BudgetTransferLog = {
        id: `tr_${Date.now()}`,
        fromCategoryId,
        toCategoryId,
        amount,
        targetField,
        memo,
        createdAt: new Date().toISOString(),
      };

      const updatedCycle: MonthlyCycle = {
        ...targetCycle,
        allocations: {
          ...targetCycle.allocations,
          [fromCategoryId]: fromAlloc,
          [toCategoryId]: toAlloc,
        },
        transfers: [transferLog, ...(targetCycle.transfers || [])],
      };

      const exists = prev.monthlyCycles.some((c) => c.cycleId === cycleId);
      const updatedCycles = exists
        ? prev.monthlyCycles.map((c) =>
            c.cycleId === cycleId ? updatedCycle : c
          )
        : [...prev.monthlyCycles, updatedCycle].sort((a, b) =>
            a.cycleId.localeCompare(b.cycleId)
          );

      return {
        ...prev,
        monthlyCycles: updatedCycles,
      };
    });
  };

  const exportJson = () => {
    return JSON.stringify(data, null, 2);
  };

  const importJson = (jsonStr: string): { success: boolean; error?: string } => {
    try {
      const parsed = JSON.parse(jsonStr) as KeihiPocketData;
      if (
        !parsed ||
        !parsed.settings ||
        !Array.isArray(parsed.monthlyCycles) ||
        !Array.isArray(parsed.transactions)
      ) {
        return {
          success: false,
          error:
            'JSONデータ構造が不正です（settings, monthlyCycles, transactionsが必要です）。',
        };
      }
      setData(parsed);
      if (parsed.monthlyCycles.length > 0) {
        const latest =
          parsed.monthlyCycles[parsed.monthlyCycles.length - 1].cycleId;
        setActiveCycleIdState(latest);
      }
      return { success: true };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : 'JSONの解析に失敗しました。',
      };
    }
  };

  const clearAllTransactions = () => {
    const cleanAllocations: CycleAllocations = {};
    for (const cat of data.settings.categories) {
      cleanAllocations[cat.id] = { base: 0, carryover: 0 };
    }
    const cleanCycle: MonthlyCycle = {
      cycleId: activeCycleId,
      ...getCycleDateRange(activeCycleId),
      income: 0,
      carryoverTotal: 0,
      allocations: cleanAllocations,
      isClosed: false,
      transfers: [],
    };
    setData({
      settings: data.settings,
      monthlyCycles: [cleanCycle],
      transactions: [],
    });
  };

  const restoreSampleData = () => {
    setData(INITIAL_SAMPLE_DATA);
    setActiveCycleIdState('2026-10');
  };

  return (
    <StoreContext.Provider
      value={{
        data,
        isLoaded,
        activeCycleId,
        minRetainedCycleId: retentionInfo.minRetainedCycleId,
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
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return ctx;
}
