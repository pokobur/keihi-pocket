import assert from 'node:assert/strict';
import {
  pad2,
  parseCycleId,
  formatYearMonth,
  getAdjacentCycleId,
  getCycleIdFromDate,
  getCycleDateRange,
  getBillingMonthForDate,
  calculateNetPaymentBilling,
  calculateCycleSummary,
  calculateCumulativeSavings,
  calculatePreviousCycleCarryoverInfo,
  calculateCountdowns,
  formatYen,
  pruneExpiredCyclesAndTransactions,
  MAX_RETENTION_MONTHS,
} from '../src/lib/calculations';
import {
  AppSettings,
  CategoryConfig,
  CycleAllocations,
  KeihiPocketData,
  MonthlyCycle,
  Transaction,
} from '../src/types';

console.log('=== Keihi Pocket: 各機能の動作検証スクリプト ===\n');

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

// -----------------------------------------------------------------------------
// 1. 日付・サイクル計算ユーティリティ
// -----------------------------------------------------------------------------
console.log('[Test 1] 日付・サイクル計算ユーティリティのテスト...');
{
  assert.equal(pad2(5), '05');
  assert.equal(pad2(12), '12');

  assert.deepEqual(parseCycleId('2026-10'), { year: 2026, month: 10 });
  assert.equal(formatYearMonth(2026, 10), '2026-10');
  assert.equal(formatYearMonth(2026, 13), '2027-01');
  assert.equal(formatYearMonth(2026, 0), '2025-12');

  assert.equal(getAdjacentCycleId('2026-10', -1), '2026-09');
  assert.equal(getAdjacentCycleId('2026-10', 1), '2026-11');
  assert.equal(getAdjacentCycleId('2026-01', -1), '2025-12');
  assert.equal(getAdjacentCycleId('2026-12', 1), '2027-01');

  // サイクル判定（25日境界）
  assert.equal(getCycleIdFromDate('2026-10-24'), '2026-09');
  assert.equal(getCycleIdFromDate('2026-10-25'), '2026-10');
  assert.equal(getCycleIdFromDate('2026-11-24'), '2026-10');
  assert.equal(getCycleIdFromDate('2026-11-25'), '2026-11');

  // サイクル期間
  const range10 = getCycleDateRange('2026-10');
  assert.equal(range10.startDate, '2026-10-25');
  assert.equal(range10.endDate, '2026-11-24');
  assert.equal(range10.titleLabel, '2026年10月度');

  // クレカ10日締め判定
  assert.equal(getBillingMonthForDate('2026-10-10'), '2026-10-10');
  assert.equal(getBillingMonthForDate('2026-10-11'), '2026-11-10');
  assert.equal(getBillingMonthForDate('2026-12-11'), '2027-01-10');

  // カウントダウン
  const cd = calculateCountdowns(new Date('2026-10-22'));
  assert.equal(cd.todayStr, '2026-10-22');
  assert.equal(cd.daysUntilPayday25, 3); // 10/22 -> 10/25 is 3 days
  assert.equal(cd.daysUntilClosing10, 19); // 10/22 -> 11/10 is 19 days

  // 金額フォーマット
  assert.equal(formatYen(0), '¥0');
  assert.equal(formatYen(15000), '¥15,000');
  assert.equal(formatYen(-500), '-¥500');
  assert.equal(formatYen(15000, true), '+¥15,000');
  console.log('  -> OK');
}

// -----------------------------------------------------------------------------
// 2. 支出・追加入金・残高計算 (calculateCycleSummary)
// -----------------------------------------------------------------------------
console.log('[Test 2] 支出・追加入金・残高計算のテスト...');
{
  const cycle: MonthlyCycle = {
    cycleId: '2026-10',
    startDate: '2026-10-25',
    endDate: '2026-11-24',
    income: 30000,
    carryoverTotal: 5000,
    allocations: {
      food: { base: 20000, carryover: 3000 }, // 枠合計: 23,000
      consumables: { base: 5000, carryover: 2000 }, // 枠合計: 7,000
      net_payment: { base: 5000, carryover: 0 }, // 枠合計: 5,000
      books: { base: 0, carryover: 0 },
      savings: { base: 0, carryover: 0 },
    },
    isClosed: false,
  };

  const transactions: Transaction[] = [
    // 食材費の支出
    {
      id: 'tx_exp_1',
      cycleId: '2026-10',
      date: '2026-10-26',
      type: 'expense',
      categoryId: 'food',
      amount: 4500,
      memo: 'スーパー買い出し',
      createdAt: '2026-10-26T10:00:00Z',
    },
    // 食材費への追加入金 (5,000円)
    {
      id: 'tx_inc_1',
      cycleId: '2026-10',
      date: '2026-10-28',
      type: 'income',
      categoryId: 'food',
      amount: 5000,
      memo: '食材費の追加入金',
      createdAt: '2026-10-28T10:00:00Z',
    },
  ];

  // 追加入金によって cycle.allocations.food.base が +5000 された状態を想定
  const cycleWithIncome: MonthlyCycle = {
    ...cycle,
    income: cycle.income + 5000, // 35,000
    allocations: {
      ...cycle.allocations,
      food: { base: 25000, carryover: 3000 }, // 枠合計: 28,000
    },
  };

  const summary = calculateCycleSummary(cycleWithIncome, testSettings, transactions);

  // 食材費のサマリー
  const foodSummary = summary.categorySummaries.find(c => c.category.id === 'food')!;
  assert.equal(foodSummary.effectiveLimit, 28000, '枠合計が28,000円であること');
  assert.equal(foodSummary.spent, 4500, '支出は4,500円のみ計上され、追加入金5,000円は支出に含まれないこと');
  assert.equal(foodSummary.remaining, 28000 - 4500, '残高が 28,000 - 4,500 = 23,500円であること');

  // 4科目全体のサマリー
  assert.equal(summary.fourCategoriesBudget, 28000 + 7000 + 5000 + 0); // 40,000
  assert.equal(summary.fourCategoriesSpent, 4500);
  assert.equal(summary.fourCategoriesRemaining, 40000 - 4500);
  console.log('  -> OK');
}

// -----------------------------------------------------------------------------
// 3. クレジットカード決済集計 (calculateNetPaymentBilling)
// -----------------------------------------------------------------------------
console.log('[Test 3] クレジットカード10日締め集計のテスト...');
{
  const txs: Transaction[] = [
    // 前月後半利用分 (10/11〜10/24)
    {
      id: 'tx_c_1',
      cycleId: '2026-09',
      date: '2026-10-15',
      type: 'expense',
      categoryId: 'net_payment',
      amount: 3000,
      memo: 'Amazon',
      createdAt: '2026-10-15T10:00:00Z',
    },
    // 当月10日迄利用分 (10/25〜11/10)
    {
      id: 'tx_c_2',
      cycleId: '2026-10',
      date: '2026-11-05',
      type: 'expense',
      categoryId: 'net_payment',
      amount: 4000,
      memo: '楽天',
      createdAt: '2026-11-05T10:00:00Z',
    },
    // ネット決済費への追加入金 (入金なので請求額に加算されてはならない)
    {
      id: 'tx_c_income',
      cycleId: '2026-10',
      date: '2026-11-06',
      type: 'income',
      categoryId: 'net_payment',
      amount: 10000,
      memo: 'ネット決済の枠追加入金',
      createdAt: '2026-11-06T10:00:00Z',
    },
    // 11日以降利用分 (11/11〜11/24: 翌月10日締め予定)
    {
      id: 'tx_c_3',
      cycleId: '2026-10',
      date: '2026-11-15',
      type: 'expense',
      categoryId: 'net_payment',
      amount: 2500,
      memo: 'サブスク',
      createdAt: '2026-11-15T10:00:00Z',
    },
  ];

  const netBilling = calculateNetPaymentBilling('2026-10', txs, testSettings.categories);

  assert.equal(netBilling.confirmedFromPrevCycle, 3000, '前月後半分');
  assert.equal(netBilling.confirmedFromCurrentCycle, 4000, '当月10日迄分');
  assert.equal(netBilling.confirmedAmount, 7000, '10日締め確定額合計が7,000円であること (入金10,000円が除外されていること)');
  assert.equal(netBilling.unconfirmedAmount, 2500, '翌月締め分');
  console.log('  -> OK');
}

// -----------------------------------------------------------------------------
// 4. 貯金科目（積立・取崩・累計貯金額）のテスト
// -----------------------------------------------------------------------------
console.log('[Test 4] 貯金科目（取崩し・直接積立・累計）のテスト...');
{
  const cycle: MonthlyCycle = {
    cycleId: '2026-10',
    startDate: '2026-10-25',
    endDate: '2026-11-24',
    income: 10000,
    carryoverTotal: 0,
    allocations: {
      food: { base: 0, carryover: 0 },
      consumables: { base: 0, carryover: 0 },
      net_payment: { base: 0, carryover: 0 },
      books: { base: 0, carryover: 0 },
      savings: { base: 10000, carryover: 5000 }, // 貯金枠 15,000
    },
    isClosed: false,
  };

  const txs: Transaction[] = [
    // 取崩し 3,000円
    {
      id: 'tx_s_1',
      cycleId: '2026-10',
      date: '2026-10-26',
      type: 'expense',
      categoryId: 'savings',
      savingsType: 'withdrawal',
      amount: 3000,
      memo: '予備費取崩',
      createdAt: '2026-10-26T10:00:00Z',
    },
    // 直接積立 2,000円
    {
      id: 'tx_s_2',
      cycleId: '2026-10',
      date: '2026-10-27',
      type: 'expense',
      categoryId: 'savings',
      savingsType: 'deposit',
      amount: 2000,
      memo: '臨時積立',
      createdAt: '2026-10-27T10:00:00Z',
    },
  ];

  const summary = calculateCycleSummary(cycle, testSettings, txs);
  const savSum = summary.categorySummaries.find(c => c.category.id === 'savings')!;

  assert.equal(savSum.effectiveLimit, 15000);
  assert.equal(savSum.extraDeposit, 2000);
  assert.equal(savSum.spent, 3000); // 取崩し
  // remaining = (15,000 + 2,000) - 3,000 = 14,000
  assert.equal(savSum.remaining, 14000);
  assert.equal(summary.savingsConfirmed, 14000);

  // 累計貯金の計算
  const cumulative = calculateCumulativeSavings([cycle], testSettings, txs, '2026-10');
  assert.equal(cumulative, 14000);
  console.log('  -> OK');
}

// -----------------------------------------------------------------------------
// 5. 繰越金計算 (calculatePreviousCycleCarryoverInfo)
// -----------------------------------------------------------------------------
console.log('[Test 5] 繰越金（前月残金）計算のテスト...');
{
  const prevCycle: MonthlyCycle = {
    cycleId: '2026-09',
    startDate: '2026-09-25',
    endDate: '2026-10-24',
    income: 40000,
    carryoverTotal: 0,
    allocations: {
      food: { base: 25000, carryover: 0 }, // 支出 20,000 -> 余り 5,000
      consumables: { base: 10000, carryover: 0 }, // 支出 7,000 -> 余り 3,000
      net_payment: { base: 5000, carryover: 0 }, // 支出 5,000 -> 余り 0
      books: { base: 0, carryover: 0 },
      savings: { base: 0, carryover: 0 },
    },
    isClosed: false,
  };

  const prevTxs: Transaction[] = [
    {
      id: 'tx_p_1',
      cycleId: '2026-09',
      date: '2026-10-01',
      type: 'expense',
      categoryId: 'food',
      amount: 20000,
      memo: '食料品',
      createdAt: '2026-10-01T10:00:00Z',
    },
    {
      id: 'tx_p_2',
      cycleId: '2026-09',
      date: '2026-10-02',
      type: 'expense',
      categoryId: 'consumables',
      amount: 7000,
      memo: '消耗品',
      createdAt: '2026-10-02T10:00:00Z',
    },
    {
      id: 'tx_p_3',
      cycleId: '2026-09',
      date: '2026-10-03',
      type: 'expense',
      categoryId: 'net_payment',
      amount: 5000,
      memo: 'クレカ',
      createdAt: '2026-10-03T10:00:00Z',
    },
  ];

  const carryoverInfo = calculatePreviousCycleCarryoverInfo('2026-10', [prevCycle], testSettings, prevTxs);

  assert.equal(carryoverInfo.hasPrevCycle, true);
  assert.equal(carryoverInfo.calculatedCarryoverTotal, 8000, '前月の余剰金 5,000 + 3,000 = 8,000円');
  assert.equal(carryoverInfo.categoryRemainders.food, 5000);
  assert.equal(carryoverInfo.categoryRemainders.consumables, 3000);
  assert.equal(carryoverInfo.categoryRemainders.net_payment, 0);
  console.log('  -> OK');
}

// -----------------------------------------------------------------------------
// 6. 12ヶ月保持ポリシー (pruneExpiredCyclesAndTransactions)
// -----------------------------------------------------------------------------
console.log('[Test 6] データ保持期間（12ヶ月）の自動剪定テスト...');
{
  const cycles: MonthlyCycle[] = [];
  // 2025-01 〜 2026-10 の22サイクル
  for (let m = 1; m <= 12; m++) {
    const ym = `2025-${pad2(m)}`;
    cycles.push({
      cycleId: ym,
      ...getCycleDateRange(ym),
      income: 10000,
      carryoverTotal: 0,
      allocations: {
        food: { base: 5000, carryover: 0 },
        consumables: { base: 0, carryover: 0 },
        net_payment: { base: 0, carryover: 0 },
        books: { base: 0, carryover: 0 },
        savings: { base: 5000, carryover: 0 },
      },
      isClosed: true,
    });
  }
  for (let m = 1; m <= 10; m++) {
    const ym = `2026-${pad2(m)}`;
    cycles.push({
      cycleId: ym,
      ...getCycleDateRange(ym),
      income: 10000,
      carryoverTotal: 0,
      allocations: {
        food: { base: 5000, carryover: 0 },
        consumables: { base: 0, carryover: 0 },
        net_payment: { base: 0, carryover: 0 },
        books: { base: 0, carryover: 0 },
        savings: { base: 5000, carryover: 0 },
      },
      isClosed: m < 10,
    });
  }

  const dummyData: KeihiPocketData = {
    settings: { ...testSettings },
    monthlyCycles: cycles,
    transactions: [],
  };

  const { prunedData, removedCycleIds, minRetainedCycleId, maxRetainedCycleId } =
    pruneExpiredCyclesAndTransactions(dummyData, '2026-10');

  assert.equal(maxRetainedCycleId, '2026-10');
  // 直近12ヶ月: 2025-11 〜 2026-10
  assert.equal(minRetainedCycleId, '2025-11');
  assert.equal(prunedData.monthlyCycles.length, 12);
  assert.equal(removedCycleIds.length, 10); // 2025-01 〜 2025-10 の10件が削除
  // 削除されたサイクルの貯金 (各5,000円 * 10 = 50,000円) が archivedSavingsTotal に退避されていること
  assert.equal(prunedData.settings.archivedSavingsTotal, 50000);
  console.log('  -> OK');
}

console.log('\n=== すべての計算・機能ロジック検証に合格しました！ ===');
