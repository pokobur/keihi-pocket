export type CategoryId = string;

export type CategoryColorKey =
  | 'peach'
  | 'mint'
  | 'lavender'
  | 'sky'
  | 'honey'
  | 'rose'
  | 'sage'
  | 'lilac';

export type CategoryIconKey =
  | 'utensils'
  | 'shopping_bag'
  | 'credit_card'
  | 'book_open'
  | 'piggy_bank'
  | 'coffee'
  | 'home'
  | 'car'
  | 'heart'
  | 'gift'
  | 'smartphone'
  | 'shirt'
  | 'music'
  | 'sparkles'
  | 'folder';

export interface CategoryConfig {
  id: CategoryId;
  name: string;
  defaultBudget: number;
  isCredit: boolean;
  isSavings: boolean;
  colorKey?: CategoryColorKey;
  iconKey?: CategoryIconKey;
}

export interface AppSettings {
  baseMonthlyIncome: number;
  cycleStartDay: number;
  creditCardClosingDay: number;
  retentionMonths?: number; // データ保持期間（月数・デフォルト12ヶ月）
  archivedSavingsTotal?: number; // 自動削除された過去サイクルの累計貯金アーカイブ額
  categories: CategoryConfig[];
}

export interface CategoryAllocation {
  base: number;
  carryover: number;
}

export type CycleAllocations = Record<CategoryId, CategoryAllocation>;

export interface BudgetTransferLog {
  id: string;
  fromCategoryId: CategoryId;
  toCategoryId: CategoryId;
  amount: number;
  targetField: 'base' | 'carryover';
  memo: string;
  createdAt: string;
}

export interface MonthlyCycle {
  cycleId: string; // e.g., "2026-10"
  startDate: string; // e.g., "2026-10-25"
  endDate: string; // e.g., "2026-11-24"
  income: number; // Default 60000
  incomeMemo?: string;
  carryoverTotal: number;
  allocations: CycleAllocations;
  isClosed: boolean;
  transfers?: BudgetTransferLog[];
}

export interface Transaction {
  id: string;
  cycleId: string;
  date: string; // YYYY-MM-DD
  categoryId: CategoryId;
  amount: number;
  memo: string;
  billingMonth?: string | null;
  savingsType?: 'withdrawal' | 'deposit';
  createdAt: string;
}

export interface KeihiPocketData {
  settings: AppSettings;
  monthlyCycles: MonthlyCycle[];
  transactions: Transaction[];
}

export interface CategorySummary {
  category: CategoryConfig;
  baseBudget: number;
  carryoverBudget: number;
  effectiveLimit: number;
  spent: number;
  extraDeposit: number;
  remaining: number;
  usageRate: number;
  statusColor: 'safe' | 'warning' | 'danger';
}

export interface NetPaymentBillingSummary {
  currentClosingDate: string;
  currentClosingPeriodStart: string;
  currentClosingPeriodEnd: string;
  currentClosingLabel: string;
  confirmedAmount: number;
  confirmedFromPrevCycle: number;
  confirmedFromCurrentCycle: number;

  nextClosingDate: string;
  nextClosingPeriodStart: string;
  nextClosingPeriodEnd: string;
  nextClosingLabel: string;
  unconfirmedAmount: number;

  prevClosingDate: string;
  prevClosingPeriodStart: string;
  prevClosingPeriodEnd: string;
  prevClosingAmount: number;
}
