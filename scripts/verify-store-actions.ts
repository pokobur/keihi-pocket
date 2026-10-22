import assert from 'node:assert/strict';
import {
  calculateCycleSummary,
  calculateNetPaymentBilling,
  getBillingMonthForDate,
  getCycleIdFromDate,
  getCycleDateRange,
  MAX_RETENTION_MONTHS,
} from '../src/lib/calculations';
import {
  AppSettings,
  CycleAllocations,
  KeihiPocketData,
  MonthlyCycle,
  Transaction,
} from '../src/types';

console.log('=== Keihi Pocket: アプリ操作フロー・全機能シミュレーションテスト ===\n');

// 初期設定・データ（ユーザー指定：基本支給0円、各カテゴリ0円、25日自動入金なし）
const testSettings: AppSettings = {
  baseMonthlyIncome: 0,
  cycleStartDay: 25,
  creditCardClosingDay: 10,
  retentionMonths: MAX_RETENTION_MONTHS,
  archivedSavingsTotal: 0,
  categories: [
    { id: 'food', name: '食材費', defaultBudget: 0, isCredit: false, isSavings: false, colorKey: 'peach', iconKey: 'utensils' },
    { id: 'consumables', name: '消耗品費', defaultBudget: 0, isCredit: false, isSavings: false, colorKey: 'mint', iconKey: 'shopping_bag' },
    { id: 'net_payment', name: 'ネット決済費', defaultBudget: 0, isCredit: true, isSavings: false, colorKey: 'lavender', iconKey: 'credit_card' },
    { id: 'books', name: '図書費', defaultBudget: 0, isCredit: false, isSavings: false, colorKey: 'sky', iconKey: 'book_open' },
    { id: 'savings', name: '貯金', defaultBudget: 0, isCredit: false, isSavings: true, colorKey: 'honey', iconKey: 'piggy_bank' },
  ],
};

let storeData: KeihiPocketData = {
  settings: testSettings,
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
      transfers: [],
    },
  ],
  transactions: [],
};

// store.tsx と同様のアクション関数を定義して実行
function addTransaction(input: {
  date: string;
  type?: 'expense' | 'income';
  categoryId: string;
  amount: number;
  memo: string;
  savingsType?: 'withdrawal' | 'deposit';
}): Transaction {
  const computedCycleId = getCycleIdFromDate(input.date, storeData.settings.cycleStartDay);
  const txType = input.type || 'expense';
  const catObj = storeData.settings.categories.find(c => c.id === input.categoryId);
  const isCredit = catObj ? catObj.isCredit : input.categoryId === 'net_payment';
  const isSavings = catObj ? catObj.isSavings : input.categoryId === 'savings';

  const billingMonth =
    txType === 'expense' && isCredit
      ? getBillingMonthForDate(input.date, storeData.settings.creditCardClosingDay)
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

  let updatedCycles = storeData.monthlyCycles.map(c => {
    if (c.cycleId !== computedCycleId) return c;
    if (txType === 'income') {
      const prevCatAlloc = c.allocations[newTx.categoryId] || { base: 0, carryover: 0 };
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
    }
    return c;
  });

  storeData = {
    ...storeData,
    monthlyCycles: updatedCycles,
    transactions: [newTx, ...storeData.transactions],
  };

  return newTx;
}

function updateTransaction(
  id: string,
  updates: {
    date?: string;
    type?: 'expense' | 'income';
    categoryId?: string;
    amount?: number;
    memo?: string;
    savingsType?: 'withdrawal' | 'deposit';
  }
) {
  const oldTx = storeData.transactions.find(t => t.id === id);
  if (!oldTx) return;

  const nextDate = updates.date ?? oldTx.date;
  const nextCategory = updates.categoryId ?? oldTx.categoryId;
  const nextType = updates.type ?? oldTx.type ?? 'expense';
  const nextAmount = updates.amount !== undefined ? Math.round(Number(updates.amount) || 0) : oldTx.amount;
  const catObj = storeData.settings.categories.find(c => c.id === nextCategory);
  const isCredit = catObj ? catObj.isCredit : nextCategory === 'net_payment';
  const isSavings = catObj ? catObj.isSavings : nextCategory === 'savings';

  const nextCycleId = getCycleIdFromDate(nextDate, storeData.settings.cycleStartDay);
  const nextBillingMonth =
    nextType === 'expense' && isCredit
      ? getBillingMonthForDate(nextDate, storeData.settings.creditCardClosingDay)
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

  let updatedCycles = [...storeData.monthlyCycles];

  // 旧トランザクションが入金だった場合差し引き
  if (oldTx.type === 'income') {
    updatedCycles = updatedCycles.map(c => {
      if (c.cycleId !== oldTx.cycleId) return c;
      const prevAlloc = c.allocations[oldTx.categoryId] || { base: 0, carryover: 0 };
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

  // 新トランザクションが入金の場合加算
  if (updatedTx.type === 'income') {
    updatedCycles = updatedCycles.map(c => {
      if (c.cycleId !== updatedTx.cycleId) return c;
      const prevAlloc = c.allocations[updatedTx.categoryId] || { base: 0, carryover: 0 };
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

  storeData = {
    ...storeData,
    monthlyCycles: updatedCycles,
    transactions: storeData.transactions.map(t => (t.id === id ? updatedTx : t)),
  };
}

function deleteTransaction(id: string) {
  const targetTx = storeData.transactions.find(t => t.id === id);
  if (!targetTx) return;

  let updatedCycles = storeData.monthlyCycles;
  if (targetTx.type === 'income') {
    updatedCycles = updatedCycles.map(c => {
      if (c.cycleId !== targetTx.cycleId) return c;
      const prevAlloc = c.allocations[targetTx.categoryId] || { base: 0, carryover: 0 };
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

  storeData = {
    ...storeData,
    monthlyCycles: updatedCycles,
    transactions: storeData.transactions.filter(t => t.id !== id),
  };
}

// -----------------------------------------------------------------------------
// [Scenario A] 初期状態の確認
// -----------------------------------------------------------------------------
console.log('[Scenario A] 初期状態の確認...');
{
  assert.equal(storeData.transactions.length, 0);
  assert.equal(storeData.monthlyCycles[0].income, 0);
  assert.equal(storeData.monthlyCycles[0].allocations.food.base, 0);
  console.log('  -> OK: トランザクション0件、基本入金0円、科目枠0円');
}

// -----------------------------------------------------------------------------
// [Scenario B] 追加入金（食材費に10,000円入金）
// -----------------------------------------------------------------------------
console.log('[Scenario B] 経費の追加入金（食材費へ¥10,000）...');
let incomeTx: Transaction;
{
  incomeTx = addTransaction({
    date: '2026-10-25',
    type: 'income',
    categoryId: 'food',
    amount: 10000,
    memo: '10月度経費の追加入金',
  });

  assert.equal(incomeTx.type, 'income');
  assert.equal(storeData.transactions.length, 1);
  assert.equal(storeData.monthlyCycles[0].income, 10000, 'cycle.incomeが10,000円になること');
  assert.equal(storeData.monthlyCycles[0].allocations.food.base, 10000, '食材費のbase枠が10,000円になること');

  const summary = calculateCycleSummary(storeData.monthlyCycles[0], storeData.settings, storeData.transactions);
  const food = summary.categorySummaries.find(c => c.category.id === 'food')!;
  assert.equal(food.effectiveLimit, 10000);
  assert.equal(food.spent, 0, '入金は支出ではないのでspentは0円');
  assert.equal(food.remaining, 10000);
  console.log('  -> OK: 追加入金により枠が¥10,000加算され、支出は0円');
}

// -----------------------------------------------------------------------------
// [Scenario C] 支出登録（食材費で¥3,200支出）
// -----------------------------------------------------------------------------
console.log('[Scenario C] 支出クイック登録（食材費で¥3,200支出）...');
let expenseTx: Transaction;
{
  expenseTx = addTransaction({
    date: '2026-10-26',
    type: 'expense',
    categoryId: 'food',
    amount: 3200,
    memo: 'スーパー買い出し',
  });

  assert.equal(expenseTx.type, 'expense');
  assert.equal(storeData.transactions.length, 2);
  assert.equal(storeData.monthlyCycles[0].income, 10000, '支出ではcycle.incomeは変動しない');
  assert.equal(storeData.monthlyCycles[0].allocations.food.base, 10000, '支出ではbase枠は変動しない');

  const summary = calculateCycleSummary(storeData.monthlyCycles[0], storeData.settings, storeData.transactions);
  const food = summary.categorySummaries.find(c => c.category.id === 'food')!;
  assert.equal(food.effectiveLimit, 10000);
  assert.equal(food.spent, 3200);
  assert.equal(food.remaining, 6800, '残高 10,000 - 3,200 = 6,800円');
  console.log('  -> OK: 食材費残高 ¥6,800 が正確に計算された');
}

// -----------------------------------------------------------------------------
// [Scenario D] クレジットカード決済費への追加入金と支出
// -----------------------------------------------------------------------------
console.log('[Scenario D] クレジットカード決済費への追加入金(¥8,000)と利用(¥5,000)...');
{
  // ネット決済費へ追加入金 8,000円
  addTransaction({
    date: '2026-10-27',
    type: 'income',
    categoryId: 'net_payment',
    amount: 8000,
    memo: 'ネット決済枠追加入金',
  });

  // ネット決済費で支出 5,000円
  addTransaction({
    date: '2026-10-28',
    type: 'expense',
    categoryId: 'net_payment',
    amount: 5000,
    memo: 'Amazon定期便',
  });

  const billing = calculateNetPaymentBilling('2026-10', storeData.transactions, storeData.settings.categories);
  assert.equal(billing.confirmedFromCurrentCycle, 5000, 'クレカ請求確定額は支出の5,000円のみであること');
  assert.equal(billing.confirmedAmount, 5000, '追加入金8,000円がクレカ請求額に混入していないこと');

  const summary = calculateCycleSummary(storeData.monthlyCycles[0], storeData.settings, storeData.transactions);
  const net = summary.categorySummaries.find(c => c.category.id === 'net_payment')!;
  assert.equal(net.effectiveLimit, 8000);
  assert.equal(net.spent, 5000);
  assert.equal(net.remaining, 3000);
  console.log('  -> OK: クレカ請求額に追加入金は混入せず、予算枠と残高が正確に連動');
}

// -----------------------------------------------------------------------------
// [Scenario E] 入金明細の編集（金額変更）
// -----------------------------------------------------------------------------
console.log('[Scenario E] 入金明細の編集（金額を¥10,000 -> ¥15,000へ変更）...');
{
  updateTransaction(incomeTx.id, {
    amount: 15000,
    memo: '食材費の追加入金（増額）',
  });

  // 食材費のbase枠が10,000から15,000になり、総incomeも+5,000 (10000+8000+5000=23000)
  assert.equal(storeData.monthlyCycles[0].allocations.food.base, 15000);
  assert.equal(storeData.monthlyCycles[0].income, 23000);

  const summary = calculateCycleSummary(storeData.monthlyCycles[0], storeData.settings, storeData.transactions);
  const food = summary.categorySummaries.find(c => c.category.id === 'food')!;
  assert.equal(food.effectiveLimit, 15000);
  assert.equal(food.spent, 3200);
  assert.equal(food.remaining, 11800, '15,000 - 3,200 = 11,800円');
  console.log('  -> OK: 入金額の編集に伴い、予算枠と残高が自動更新された');
}

// -----------------------------------------------------------------------------
// [Scenario F] 入金明細の削除
// -----------------------------------------------------------------------------
console.log('[Scenario F] 入金明細の削除...');
{
  deleteTransaction(incomeTx.id);

  // 食材費のbase枠が15,000から0に戻り、総incomeも23,000から8,000に戻る
  assert.equal(storeData.monthlyCycles[0].allocations.food.base, 0);
  assert.equal(storeData.monthlyCycles[0].income, 8000);

  const summary = calculateCycleSummary(storeData.monthlyCycles[0], storeData.settings, storeData.transactions);
  const food = summary.categorySummaries.find(c => c.category.id === 'food')!;
  assert.equal(food.effectiveLimit, 0);
  assert.equal(food.spent, 3200);
  assert.equal(food.remaining, -3200, '枠0円に対して支出3,200円なので -3,200円 (赤字)');
  console.log('  -> OK: 入金の削除に伴い、予算枠と総入金額が正しく減算・復元された');
}

// -----------------------------------------------------------------------------
// [Scenario G] 収支履歴の絞り込みフィルター判定
// -----------------------------------------------------------------------------
console.log('[Scenario G] 収支履歴の絞り込みフィルター...');
{
  // 現在の transactions:
  // - ネット決済 追加入金 8,000 (type: income)
  // - ネット決済 支出 5,000 (type: expense)
  // - 食材費 支出 3,200 (type: expense)
  const allTxs = storeData.transactions;

  const incomeOnly = allTxs.filter(t => t.type === 'income');
  assert.equal(incomeOnly.length, 1);
  assert.equal(incomeOnly[0].amount, 8000);

  let incSum = 0;
  let expSum = 0;
  for (const t of allTxs) {
    if (t.type === 'income') incSum += t.amount;
    else expSum += t.amount;
  }
  assert.equal(incSum, 8000);
  assert.equal(expSum, 5000 + 3200);
  console.log('  -> OK: 入金履歴のみフィルターおよび入金・支出の集計ピルが正確');
}

console.log('\n=== 全シナリオのシミュレーションテストに合格しました！ ===');
