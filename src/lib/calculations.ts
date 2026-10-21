import {
  AppSettings,
  CategoryConfig,
  CategoryId,
  CategorySummary,
  KeihiPocketData,
  MonthlyCycle,
  NetPaymentBillingSummary,
  Transaction,
} from '@/types';

export const MAX_RETENTION_MONTHS = 12;

/**
 * 2桁ゼロ埋め
 */
export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * YYYY-MM を年と月に分解
 */
export function parseCycleId(cycleId: string): { year: number; month: number } {
  const [y, m] = cycleId.split('-').map(Number);
  return { year: y, month: m };
}

/**
 * 年・月から正規化された YYYY-MM を返す（月の繰り上がり・繰り下がり対応）
 */
export function formatYearMonth(year: number, month: number): string {
  const d = new Date(year, month - 1, 1);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

/**
 * 前後のサイクルIDを取得 (offset = -1 で前月, +1 で翌月)
 */
export function getAdjacentCycleId(cycleId: string, offset: number): string {
  const { year, month } = parseCycleId(cycleId);
  return formatYearMonth(year, month + offset);
}

/**
 * 任意の日付 (YYYY-MM-DD) が属する月次サイクルID (YYYY-MM) を返す
 * 毎月25日〜翌月24日を1サイクルとする
 */
export function getCycleIdFromDate(dateStr: string, cycleStartDay = 25): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return '2026-10';
  if (d >= cycleStartDay) {
    return formatYearMonth(y, m);
  } else {
    return formatYearMonth(y, m - 1);
  }
}

/**
 * サイクルID (例: "2026-10") から期間 (startDate, endDate) と表示ラベルを算出
 */
export function getCycleDateRange(cycleId: string): {
  startDate: string;
  endDate: string;
  titleLabel: string;
  rangeLabel: string;
  fullLabel: string;
} {
  const { year, month } = parseCycleId(cycleId);
  const startDate = `${year}-${pad2(month)}-25`;
  const nextYM = formatYearMonth(year, month + 1);
  const { year: nextYear, month: nextMonth } = parseCycleId(nextYM);
  const endDate = `${nextYear}-${pad2(nextMonth)}-24`;

  return {
    startDate,
    endDate,
    titleLabel: `${year}年${month}月度`,
    rangeLabel: `${month}/25 - ${nextMonth}/24`,
    fullLabel: `${year}年${month}月度: ${month}/25 - ${nextMonth}/24`,
  };
}

/**
 * ネット決済費（毎月10日締め）の取引日 (YYYY-MM-DD) から請求確定日 (YYYY-MM-10) を算出
 */
export function getBillingMonthForDate(dateStr: string, closingDay = 10): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return '';
  if (d <= closingDay) {
    return `${y}-${pad2(m)}-${pad2(closingDay)}`;
  } else {
    const nextYM = formatYearMonth(y, m + 1);
    return `${nextYM}-${pad2(closingDay)}`;
  }
}

/**
 * 対象サイクルに対するネット決済費（クレジットカード10日締め）の集計
 */
export function calculateNetPaymentBilling(
  cycleId: string,
  transactions: Transaction[],
  categories?: CategoryConfig[]
): NetPaymentBillingSummary {
  const { year, month } = parseCycleId(cycleId);
  const nextYM = formatYearMonth(year, month + 1);
  const { year: nextYear, month: nextMonth } = parseCycleId(nextYM);
  const afterNextYM = formatYearMonth(year, month + 2);
  const prevYM = formatYearMonth(year, month - 1);
  const { year: prevYear, month: prevMonth } = parseCycleId(prevYM);

  const currentClosingDate = `${nextYear}-${pad2(nextMonth)}-10`;
  const currentClosingPeriodStart = `${year}-${pad2(month)}-11`;
  const currentClosingPeriodEnd = `${nextYear}-${pad2(nextMonth)}-10`;

  const prevCyclePartEnd = `${year}-${pad2(month)}-24`;
  const currentCyclePartStart = `${year}-${pad2(month)}-25`;

  const nextClosingDate = `${afterNextYM}-10`;
  const nextClosingPeriodStart = `${nextYear}-${pad2(nextMonth)}-11`;
  const nextClosingPeriodEnd = `${nextYear}-${pad2(nextMonth)}-24`;

  const prevClosingDate = `${year}-${pad2(month)}-10`;
  const prevClosingPeriodStart = `${prevYear}-${pad2(prevMonth)}-11`;
  const prevClosingPeriodEnd = `${year}-${pad2(month)}-10`;

  const creditIds = new Set<string>(
    categories
      ? categories.filter((c) => c.isCredit).map((c) => c.id)
      : ['net_payment']
  );
  if (creditIds.size === 0) creditIds.add('net_payment');

  const netTxs = transactions.filter((t) => creditIds.has(t.categoryId));

  let confirmedFromPrevCycle = 0;
  let confirmedFromCurrentCycle = 0;
  let unconfirmedAmount = 0;
  let prevClosingAmount = 0;

  for (const tx of netTxs) {
    if (tx.date >= currentClosingPeriodStart && tx.date <= prevCyclePartEnd) {
      confirmedFromPrevCycle += tx.amount;
    } else if (tx.date >= currentCyclePartStart && tx.date <= currentClosingPeriodEnd) {
      confirmedFromCurrentCycle += tx.amount;
    } else if (tx.date >= nextClosingPeriodStart && tx.date <= nextClosingPeriodEnd) {
      unconfirmedAmount += tx.amount;
    }

    if (tx.date >= prevClosingPeriodStart && tx.date <= prevClosingPeriodEnd) {
      prevClosingAmount += tx.amount;
    }
  }

  const confirmedAmount = confirmedFromPrevCycle + confirmedFromCurrentCycle;

  return {
    currentClosingDate,
    currentClosingPeriodStart,
    currentClosingPeriodEnd,
    currentClosingLabel: `${nextMonth}月10日締め確定額 (${month}/11〜${nextMonth}/10)`,
    confirmedAmount,
    confirmedFromPrevCycle,
    confirmedFromCurrentCycle,
    nextClosingDate,
    nextClosingPeriodStart,
    nextClosingPeriodEnd,
    nextClosingLabel: `${nextMonth}月11日以降利用分 (${nextMonth}/11〜${nextMonth}/24)`,
    unconfirmedAmount,
    prevClosingDate,
    prevClosingPeriodStart,
    prevClosingPeriodEnd,
    prevClosingAmount,
  };
}

/**
 * 消化率に応じたステータス色判定
 */
export function getUsageStatusColor(
  usageRate: number,
  remaining: number
): 'safe' | 'warning' | 'danger' {
  if (usageRate >= 100 || remaining < 0) return 'danger';
  if (usageRate >= 80) return 'warning';
  return 'safe';
}

/**
 * 当月サイクルの各科目サマリーと全体集計を計算
 */
export function calculateCycleSummary(
  cycle: MonthlyCycle,
  settings: AppSettings,
  transactions: Transaction[]
) {
  const cycleTxs = transactions.filter((t) => t.cycleId === cycle.cycleId);

  const categorySummaries: CategorySummary[] = settings.categories.map((cat) => {
    const alloc = cycle.allocations[cat.id] || {
      base: cat.defaultBudget,
      carryover: 0,
    };
    const baseBudget = alloc.base;
    const carryoverBudget = alloc.carryover;
    const effectiveLimit = baseBudget + carryoverBudget;

    const catTxs = cycleTxs.filter((t) => t.categoryId === cat.id);

    if (cat.isSavings) {
      const withdrawal = catTxs
        .filter((t) => t.savingsType !== 'deposit')
        .reduce((sum, t) => sum + t.amount, 0);
      const extraDeposit = catTxs
        .filter((t) => t.savingsType === 'deposit')
        .reduce((sum, t) => sum + t.amount, 0);

      const totalPool = effectiveLimit + extraDeposit;
      const remaining = totalPool - withdrawal;
      const usageRate =
        totalPool > 0 ? (withdrawal / totalPool) * 100 : withdrawal > 0 ? 100 : 0;

      return {
        category: cat,
        baseBudget,
        carryoverBudget,
        effectiveLimit,
        spent: withdrawal,
        extraDeposit,
        remaining,
        usageRate,
        statusColor: getUsageStatusColor(usageRate, remaining),
      };
    } else {
      const spent = catTxs.reduce((sum, t) => sum + t.amount, 0);
      const remaining = effectiveLimit - spent;
      const usageRate =
        effectiveLimit > 0 ? (spent / effectiveLimit) * 100 : spent > 0 ? 100 : 0;

      return {
        category: cat,
        baseBudget,
        carryoverBudget,
        effectiveLimit,
        spent,
        extraDeposit: 0,
        remaining,
        usageRate,
        statusColor: getUsageStatusColor(usageRate, remaining),
      };
    }
  });

  // 通常・クレジット科目（貯金以外）の集計
  const nonSavingsCategories = categorySummaries.filter(
    (c) => !c.category.isSavings
  );
  const savingsCategories = categorySummaries.filter(
    (c) => c.category.isSavings
  );

  const fourCategoriesBudget = nonSavingsCategories.reduce(
    (sum, c) => sum + c.effectiveLimit,
    0
  );
  const fourCategoriesSpent = nonSavingsCategories.reduce(
    (sum, c) => sum + c.spent,
    0
  );
  const fourCategoriesRemaining = fourCategoriesBudget - fourCategoriesSpent;
  const fourCategoriesUsageRate =
    fourCategoriesBudget > 0
      ? (fourCategoriesSpent / fourCategoriesBudget) * 100
      : 0;

  const totalBudget = cycle.income + cycle.carryoverTotal;

  const totalBaseAllocated = categorySummaries.reduce(
    (sum, c) => sum + c.baseBudget,
    0
  );
  const totalCarryoverAllocated = categorySummaries.reduce(
    (sum, c) => sum + c.carryoverBudget,
    0
  );
  const unallocatedCarryover = cycle.carryoverTotal - totalCarryoverAllocated;
  const unallocatedBase = cycle.income - totalBaseAllocated;

  const savingsConfirmed = savingsCategories.reduce(
    (sum, c) => sum + c.remaining,
    0
  );

  const savingsFromBudgetConfirmed = savingsCategories.reduce(
    (sum, c) => sum + (c.effectiveLimit - c.spent),
    0
  );

  const cycleSurplusForNextMonth =
    totalBudget - fourCategoriesSpent - savingsFromBudgetConfirmed;

  return {
    categorySummaries,
    nonSavingsCount: nonSavingsCategories.length,
    fourCategoriesBudget,
    fourCategoriesSpent,
    fourCategoriesRemaining,
    fourCategoriesUsageRate,
    savingsConfirmed,
    savingsFromBudgetConfirmed,
    totalBudget,
    totalBaseAllocated,
    totalCarryoverAllocated,
    unallocatedCarryover,
    unallocatedBase,
    cycleSurplusForNextMonth,
  };
}

/**
 * 全サイクルの累計貯金総額を算出
 */
export function calculateCumulativeSavings(
  monthlyCycles: MonthlyCycle[],
  settings: AppSettings,
  transactions: Transaction[],
  upToCycleId?: string
): number {
  const sorted = [...monthlyCycles].sort((a, b) =>
    a.cycleId.localeCompare(b.cycleId)
  );
  let total = settings.archivedSavingsTotal || 0;
  for (const cycle of sorted) {
    if (upToCycleId && cycle.cycleId > upToCycleId) continue;
    const summary = calculateCycleSummary(cycle, settings, transactions);
    total += summary.savingsConfirmed;
  }
  return total;
}

/**
 * データ保持ポリシー（最大12ヶ月保持・12ヶ月経過データの自動削除）
 *
 * - 最新サイクル（または基準サイクル）から遡って直近12ヶ月分（12サイクル）のみを保持し、
 *   それより古いサイクルとトランザクションを自動削除する。
 * - 削除されるサイクルの貯金確定額は `settings.archivedSavingsTotal` に合算し、
 *   累計貯金総額が失われないように保護する。
 */
export function pruneExpiredCyclesAndTransactions(
  data: KeihiPocketData,
  referenceCycleId?: string
): {
  prunedData: KeihiPocketData;
  removedCycleIds: string[];
  minRetainedCycleId: string;
  maxRetainedCycleId: string;
} {
  const retentionMonths = MAX_RETENTION_MONTHS;

  const sortedCycles = [...data.monthlyCycles].sort((a, b) =>
    a.cycleId.localeCompare(b.cycleId)
  );

  const { todayStr } = calculateCountdowns();
  const todayCycleId = getCycleIdFromDate(
    todayStr,
    data.settings.cycleStartDay
  );

  // 最新サイクルIDを特定
  const candidateIds = [
    todayCycleId,
    ...(referenceCycleId ? [referenceCycleId] : []),
    ...sortedCycles.map((c) => c.cycleId),
    ...data.transactions.map((t) => t.cycleId),
  ].filter(Boolean);

  candidateIds.sort((a, b) => a.localeCompare(b));
  const maxCycleId =
    candidateIds[candidateIds.length - 1] || todayCycleId || '2026-10';

  // 最新サイクルを含めて直近 retentionMonths (12ヶ月) 分の下限サイクルID
  // 例: maxCycleId = "2026-10", retentionMonths = 12 -> "2025-11" ("2025-11" 〜 "2026-10" の12ヶ月保持)
  let minRetainedCycleId = getAdjacentCycleId(
    maxCycleId,
    -(retentionMonths - 1)
  );

  // もし月次サイクル数が12件を超える場合は、上位12件の下限とも比較してより新しい方を下限とする
  if (sortedCycles.length > retentionMonths) {
    const oldestAllowedInCount =
      sortedCycles[sortedCycles.length - retentionMonths].cycleId;
    if (oldestAllowedInCount > minRetainedCycleId) {
      minRetainedCycleId = oldestAllowedInCount;
    }
  }

  const expiredCycles = sortedCycles.filter(
    (c) => c.cycleId < minRetainedCycleId
  );
  const keptCycles = sortedCycles.filter(
    (c) => c.cycleId >= minRetainedCycleId
  );

  // 期限切れトランザクションのチェック
  const hasExpiredTransactions = data.transactions.some(
    (t) => t.cycleId < minRetainedCycleId
  );

  if (expiredCycles.length === 0 && !hasExpiredTransactions) {
    return {
      prunedData: data,
      removedCycleIds: [],
      minRetainedCycleId,
      maxRetainedCycleId: maxCycleId,
    };
  }

  // 削除されるサイクルの貯金確定額をアーカイブに加算
  let addedArchivedSavings = 0;
  const removedCycleIds: string[] = [];
  for (const oldCycle of expiredCycles) {
    const summary = calculateCycleSummary(
      oldCycle,
      data.settings,
      data.transactions
    );
    addedArchivedSavings += summary.savingsConfirmed;
    removedCycleIds.push(oldCycle.cycleId);
  }

  const keptTransactions = data.transactions.filter(
    (t) => t.cycleId >= minRetainedCycleId
  );

  const prunedData: KeihiPocketData = {
    settings: {
      ...data.settings,
      retentionMonths,
      archivedSavingsTotal:
        (data.settings.archivedSavingsTotal || 0) + addedArchivedSavings,
    },
    monthlyCycles: keptCycles,
    transactions: keptTransactions,
  };

  return {
    prunedData,
    removedCycleIds,
    minRetainedCycleId,
    maxRetainedCycleId: maxCycleId,
  };
}

/**
 * 前月サイクルの実績から「前月総残金」および「各科目の余り金額」を算出
 */
export function calculatePreviousCycleCarryoverInfo(
  currentCycleId: string,
  monthlyCycles: MonthlyCycle[],
  settings: AppSettings,
  transactions: Transaction[]
): {
  prevCycleId: string;
  hasPrevCycle: boolean;
  prevTotalBudget: number;
  prevFourSpent: number;
  prevSavingsConfirmed: number;
  calculatedCarryoverTotal: number;
  categoryRemainders: Record<CategoryId, number>;
} {
  const prevCycleId = getAdjacentCycleId(currentCycleId, -1);
  const prevCycle = monthlyCycles.find((c) => c.cycleId === prevCycleId);

  const emptyRemainders: Record<CategoryId, number> = {};
  for (const cat of settings.categories) {
    emptyRemainders[cat.id] = 0;
  }

  if (!prevCycle) {
    return {
      prevCycleId,
      hasPrevCycle: false,
      prevTotalBudget: 0,
      prevFourSpent: 0,
      prevSavingsConfirmed: 0,
      calculatedCarryoverTotal: 0,
      categoryRemainders: emptyRemainders,
    };
  }

  const prevSummary = calculateCycleSummary(prevCycle, settings, transactions);
  const rawRemainders: Record<CategoryId, number> = { ...emptyRemainders };

  const nonSavings = prevSummary.categorySummaries.filter(
    (c) => !c.category.isSavings
  );
  let positiveSum = 0;
  for (const c of nonSavings) {
    if (c.remaining > 0) {
      rawRemainders[c.category.id] = c.remaining;
      positiveSum += c.remaining;
    }
  }

  const netSurplus = Math.max(0, prevSummary.cycleSurplusForNextMonth);

  if (positiveSum > 0 && positiveSum !== netSurplus) {
    let diff = positiveSum - netSurplus;
    const reversedNonSavings = [...nonSavings].reverse();
    for (const c of reversedNonSavings) {
      const catId = c.category.id;
      if (diff > 0 && rawRemainders[catId] > 0) {
        const deduct = Math.min(rawRemainders[catId], diff);
        rawRemainders[catId] -= deduct;
        diff -= deduct;
      }
    }
    if (diff < 0) {
      const savingsCat = settings.categories.find((c) => c.isSavings);
      const fallbackCatId =
        savingsCat?.id || settings.categories[0]?.id || 'food';
      rawRemainders[fallbackCatId] =
        (rawRemainders[fallbackCatId] || 0) + Math.abs(diff);
    }
  }

  return {
    prevCycleId,
    hasPrevCycle: true,
    prevTotalBudget: prevSummary.totalBudget,
    prevFourSpent: prevSummary.fourCategoriesSpent,
    prevSavingsConfirmed: prevSummary.savingsFromBudgetConfirmed,
    calculatedCarryoverTotal: netSurplus,
    categoryRemainders: rawRemainders,
  };
}

/**
 * 次の区切り（10日締め・25日入金）までのカウントダウンを算出
 */
export function calculateCountdowns(now: Date = new Date()): {
  daysUntilClosing10: number;
  nextClosingLabel: string;
  daysUntilPayday25: number;
  nextPaydayLabel: string;
  todayStr: string;
} {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const y = today.getFullYear();
  const m = today.getMonth();
  const d = today.getDate();

  let nextClosing: Date;
  if (d <= 10) {
    nextClosing = new Date(y, m, 10);
  } else {
    nextClosing = new Date(y, m + 1, 10);
  }
  const daysUntilClosing10 = Math.round(
    (nextClosing.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  let nextPayday: Date;
  if (d <= 25) {
    nextPayday = new Date(y, m, 25);
  } else {
    nextPayday = new Date(y, m + 1, 25);
  }
  const daysUntilPayday25 = Math.round(
    (nextPayday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    daysUntilClosing10,
    nextClosingLabel: `${nextClosing.getMonth() + 1}月10日`,
    daysUntilPayday25,
    nextPaydayLabel: `${nextPayday.getMonth() + 1}月25日`,
    todayStr: `${y}-${pad2(m + 1)}-${pad2(d)}`,
  };
}

/**
 * 金額を日本円フォーマット（例: ¥12,345）に整形
 */
export function formatYen(amount: number, showSign = false): string {
  const abs = Math.abs(Math.round(amount));
  const formatted = abs.toLocaleString('ja-JP');
  if (amount < 0) return `-¥${formatted}`;
  if (showSign && amount > 0) return `+¥${formatted}`;
  return `¥${formatted}`;
}
