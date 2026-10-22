import assert from 'node:assert/strict';
import { calculateCycleSummary } from '../src/lib/calculations';
import { AppSettings, MonthlyCycle, Transaction } from '../src/types';

console.log('=== Keihi Pocket: 繰越金と当月入金の合算配分検証テスト ===\n');

const testSettings: AppSettings = {
  baseMonthlyIncome: 0,
  cycleStartDay: 25,
  creditCardClosingDay: 10,
  retentionMonths: 12,
  archivedSavingsTotal: 0,
  categories: [
    { id: 'food', name: '食材費', defaultBudget: 0, isCredit: false, isSavings: false },
    { id: 'consumables', name: '消耗品費', defaultBudget: 0, isCredit: false, isSavings: false },
    { id: 'net_payment', name: 'ネット決済費', defaultBudget: 0, isCredit: true, isSavings: false },
    { id: 'savings', name: '貯金', defaultBudget: 0, isCredit: false, isSavings: true },
  ],
};

// Scenario: 繰越金 15,000円、当月入金 50,000円（合算総予算 65,000円）
const income = 50000;
const carryoverTotal = 15000;
const totalPool = income + carryoverTotal;
assert.equal(totalPool, 65000);

// 合算配分ターゲット:
// 食材費: 30,000円
// 消耗品費: 15,000円
// ネット決済費: 10,000円
// 貯金: 10,000円
// 合計 = 65,000円
const combinedTargets: Record<string, number> = {
  food: 30000,
  consumables: 15000,
  net_payment: 10000,
  savings: 10000,
};

const totalComb = Object.values(combinedTargets).reduce((a, b) => a + b, 0);
assert.equal(totalComb, 65000);

// 合算配分の自動内訳算出ロジックをシミュレーション
const resolvedAllocations: Record<string, { base: number; carryover: number }> = {};
let runningCarry = 0;
const catIds = Object.keys(combinedTargets);

catIds.forEach((catId, idx) => {
  const cTarget = combinedTargets[catId];
  let cShare: number;
  if (idx === catIds.length - 1) {
    cShare = Math.min(cTarget, Math.max(0, carryoverTotal - runningCarry));
  } else {
    cShare = Math.min(cTarget, Math.round((carryoverTotal * cTarget) / totalComb));
    runningCarry += cShare;
  }
  const bShare = Math.max(0, cTarget - cShare);
  resolvedAllocations[catId] = {
    base: bShare,
    carryover: cShare,
  };
});

// 検証1: 各科目の base + carryover が指定した合算ターゲットと完全に一致すること
for (const catId of catIds) {
  const alloc = resolvedAllocations[catId];
  assert.equal(
    alloc.base + alloc.carryover,
    combinedTargets[catId],
    `科目 ${catId} の合算枠が一致すること`
  );
}

// 検証2: 繰越合計と基本入金合計が元の原資と完全に一致すること
const totalCarry = Object.values(resolvedAllocations).reduce((sum, a) => sum + a.carryover, 0);
const totalBase = Object.values(resolvedAllocations).reduce((sum, a) => sum + a.base, 0);
assert.equal(totalCarry, carryoverTotal, '繰越金総額が一致すること');
assert.equal(totalBase, income, '当月入金額が一致すること');
assert.equal(totalCarry + totalBase, totalPool, '合算総額が一致すること');

// 検証3: calculateCycleSummary で計算した各科目の effectiveLimit および totalBudget
const cycle: MonthlyCycle = {
  cycleId: '2026-10',
  startDate: '2026-10-25',
  endDate: '2026-11-24',
  income,
  carryoverTotal,
  allocations: resolvedAllocations,
  isClosed: false,
};

const txs: Transaction[] = [
  {
    id: 'tx1',
    cycleId: '2026-10',
    date: '2026-10-26',
    categoryId: 'food',
    amount: 12000,
    memo: 'スーパー買い物',
    createdAt: new Date().toISOString(),
  },
];

const summary = calculateCycleSummary(cycle, testSettings, txs);
assert.equal(summary.totalBudget, 65000);
const foodSummary = summary.categorySummaries.find(c => c.category.id === 'food')!;
assert.equal(foodSummary.effectiveLimit, 30000);
assert.equal(foodSummary.spent, 12000);
assert.equal(foodSummary.remaining, 18000);

console.log('[Test 1] 繰越金(15,000円) + 当月入金(50,000円)の合算総予算(65,000円)の一括配分テスト... OK');
console.log('[Test 2] 各科目の合算上限 (effectiveLimit) と残高計算の検証... OK');
console.log('\n=== すべての合算配分テストに合格しました！ ===');
