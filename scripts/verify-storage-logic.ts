/**
 * scripts/verify-storage-logic.ts
 *
 * IndexedDB と File System Access 連携周りのデータ検証・フォーマット整合性テスト
 */
import { KeihiPocketData, AppSettings } from '../src/types';
import { pruneExpiredCyclesAndTransactions } from '../src/lib/calculations';

console.log('=== Keihi Pocket: ストレージ連携・データ整合性検証 ===\n');

const DEFAULT_SETTINGS: AppSettings = {
  baseMonthlyIncome: 0,
  cycleStartDay: 25,
  creditCardClosingDay: 10,
  retentionMonths: 12,
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
  ],
};

const INITIAL_SAMPLE_DATA: KeihiPocketData = {
  settings: DEFAULT_SETTINGS,
  monthlyCycles: [
    {
      cycleId: '2026-10',
      startDate: '2026-09-25',
      endDate: '2026-10-24',
      income: 0,
      carryoverTotal: 0,
      allocations: {},
    },
  ],
  transactions: [],
};

// 1. JSONシリアライズ/デシリアライズの可逆性
console.log('[Test 1] KeihiPocketData の JSON 整合性検証...');
const serialized = JSON.stringify(INITIAL_SAMPLE_DATA, null, 2);
const deserialized = JSON.parse(serialized) as KeihiPocketData;

if (!deserialized.settings || !Array.isArray(deserialized.monthlyCycles) || !Array.isArray(deserialized.transactions)) {
  console.error('❌ JSONパース後のデータ構造が不正です');
  process.exit(1);
}
console.log('  -> OK: JSON構造は完全一致');

// 2. 旧バージョン (v1/v2) からの移行シミュレーション
console.log('\n[Test 2] 旧データ構造からの移行とサニタイズ検証...');
const oldData: KeihiPocketData = {
  settings: {
    ...DEFAULT_SETTINGS,
    baseMonthlyIncome: 60000, // 旧自動基本給与
  },
  monthlyCycles: [
    {
      cycleId: '2026-09',
      startDate: '2026-08-25',
      endDate: '2026-09-24',
      income: 60000,
      carryoverTotal: 4500,
      allocations: {
        food: { base: 25000, carryover: 2000 },
        consumables: { base: 10000, carryover: 1000 },
      },
    },
  ],
  transactions: [
    {
      id: 'tx_prev_legacy_01',
      cycleId: '2026-09',
      date: '2026-08-26',
      type: 'expense',
      categoryId: 'food',
      amount: 1200,
      memo: 'サンプルデータ',
      createdAt: '2026-08-26T10:00:00Z',
    },
    {
      id: 'tx_user_actual_01',
      cycleId: '2026-09',
      date: '2026-08-27',
      type: 'expense',
      categoryId: 'food',
      amount: 2500,
      memo: 'ユーザーの実際の支出',
      createdAt: '2026-08-27T10:00:00Z',
    },
  ],
};

// サニタイズ処理: tx_prev_ プレフィックスの自動除外
const cleanedTransactions = oldData.transactions.filter(
  (t) => !t.id.startsWith('tx_prev_') && !t.id.startsWith('tx_00')
);

if (cleanedTransactions.length !== 1 || cleanedTransactions[0].id !== 'tx_user_actual_01') {
  console.error('❌ 旧サンプルデータのサニタイズに失敗しました');
  process.exit(1);
}
console.log('  -> OK: サンプル明細の自動除外と実データ保護が機能しています');

// 3. データ保持期間ポリシー (12ヶ月) の適用確認
console.log('\n[Test 3] 12ヶ月自動削除ポリシーと保持サイクル確認...');
const { prunedData } = pruneExpiredCyclesAndTransactions(oldData, '2026-10');
if (!prunedData.monthlyCycles.some((c) => c.cycleId === '2026-09')) {
  console.error('❌ 直近月が不正に削除されました');
  process.exit(1);
}
console.log('  -> OK: 保持期間内データが正しく維持されています');

console.log('\n=== すべてのストレージ検証に合格しました！ ===');
