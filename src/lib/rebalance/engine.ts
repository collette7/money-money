export interface CategorySpending {
  categoryId: string;
  categoryName: string;
  totalSpent: number;
}

export interface BudgetItem {
  categoryId: string;
  categoryName: string;
  limitAmount: number;
  parentCategoryId?: string | null;
  isOverride?: boolean;
}

export interface TargetWeight {
  categoryId: string;
  categoryName: string;
  weight: number;
  suggestedAmount: number;
  parentCategoryId?: string | null;
}

export interface DriftResult {
  categoryId: string;
  categoryName: string;
  currentAmount: number;
  targetAmount: number;
  driftRatio: number;
  driftDollars: number;
  parentCategoryId?: string | null;
}

export interface RebalanceSuggestion {
  categoryId: string;
  categoryName: string;
  currentBudget: number;
  suggestedBudget: number;
  driftPercent: number;
  changeDollars: number;
  offsetExplanation: string;
}

export interface DriftAlert {
  categoryId: string;
  categoryName: string;
  budgetLimit: number;
  spentSoFar: number;
  projectedMonthEnd: number;
  severity: "warning" | "critical";
}

export interface SlackInfo {
  parentCategoryId: string;
  slackAmount: number;
}

export interface RebalanceResult {
  suggestions: RebalanceSuggestion[];
  avgMonthlyIncome: number;
  totalCurrentBudget: number;
  totalSuggestedBudget: number;
  incomeCV: number;
  usingFallback: boolean;
  goalPressure: number;
  networthSensitivity: number;
  driftAlerts: DriftAlert[];
  slackByParent: SlackInfo[];
}

const FALLBACK_TEMPLATE: Record<string, number> = {
  needs: 0.5,
  wants: 0.3,
  savings: 0.2,
};

const NEEDS_PATTERNS = [
  "housing",
  "rent",
  "mortgage",
  "groceries",
  "grocery",
  "utilities",
  "insurance",
  "transport",
  "gas",
  "fuel",
  "medical",
  "health",
  "pharmacy",
  "childcare",
  "education",
  "phone",
  "internet",
];

const WANTS_PATTERNS = [
  "dining",
  "restaurant",
  "entertainment",
  "shopping",
  "clothing",
  "subscription",
  "travel",
  "vacation",
  "hobby",
  "fitness",
  "gym",
  "personal",
  "beauty",
  "coffee",
  "alcohol",
  "bar",
];

function classifyCategory(name: string): "needs" | "wants" | "savings" {
  const lower = name.toLowerCase();
  if (NEEDS_PATTERNS.some((p) => lower.includes(p))) return "needs";
  if (WANTS_PATTERNS.some((p) => lower.includes(p))) return "wants";
  return "wants";
}

export function computeTargetWeights(
  monthlySpending: CategorySpending[][],
  avgMonthlyIncome: number,
  goalPressure: number = 0,
  categoryParents?: Map<string, string | null>
): { weights: TargetWeight[]; usingFallback: boolean } {
  if (avgMonthlyIncome <= 0) {
    return { weights: [], usingFallback: true };
  }

  const useFallback = monthlySpending.length < 3;

  const categoryTotals = new Map<
    string,
    { categoryName: string; totalSpent: number; monthCount: number }
  >();

  for (const month of monthlySpending) {
    for (const cat of month) {
      const existing = categoryTotals.get(cat.categoryId);
      if (existing) {
        existing.totalSpent += cat.totalSpent;
        existing.monthCount += 1;
      } else {
        categoryTotals.set(cat.categoryId, {
          categoryName: cat.categoryName,
          totalSpent: cat.totalSpent,
          monthCount: 1,
        });
      }
    }
  }

  const numMonths = Math.max(1, monthlySpending.length);
  const wantsSqueeze = 1 - goalPressure * 0.5;

  if (useFallback) {
    const buckets = new Map<string, { categoryId: string; categoryName: string; avgSpent: number }[]>();
    buckets.set("needs", []);
    buckets.set("wants", []);
    buckets.set("savings", []);

    for (const [catId, data] of categoryTotals) {
      const bucket = classifyCategory(data.categoryName);
      const avgSpent = data.totalSpent / numMonths;
      buckets.get(bucket)!.push({ categoryId: catId, categoryName: data.categoryName, avgSpent });
    }

    const weights: TargetWeight[] = [];

    for (const [bucket, cats] of buckets) {
      let bucketAllocation = FALLBACK_TEMPLATE[bucket] * avgMonthlyIncome;
      if (bucket === "wants") bucketAllocation *= wantsSqueeze;
      const totalBucketSpending = cats.reduce((s, c) => s + c.avgSpent, 0);

      for (const cat of cats) {
        const proportion =
          totalBucketSpending > 0 ? cat.avgSpent / totalBucketSpending : 1 / Math.max(1, cats.length);
        const suggestedAmount = Math.round(bucketAllocation * proportion);
        const weight = suggestedAmount / avgMonthlyIncome;

        weights.push({
          categoryId: cat.categoryId,
          categoryName: cat.categoryName,
          weight,
          suggestedAmount,
          parentCategoryId: categoryParents?.get(cat.categoryId) ?? null,
        });
      }
    }

    return { weights, usingFallback: true };
  }

  const weights: TargetWeight[] = [];
  let totalWeight = 0;

  for (const [catId, data] of categoryTotals) {
    const avgMonthlySpend = data.totalSpent / numMonths;
    let weight = avgMonthlySpend / avgMonthlyIncome;

    const bucket = classifyCategory(data.categoryName);
    if (bucket === "wants") weight *= wantsSqueeze;

    weight = Math.min(weight, 0.6);
    totalWeight += weight;

    weights.push({
      categoryId: catId,
      categoryName: data.categoryName,
      weight,
      suggestedAmount: Math.round(weight * avgMonthlyIncome),
      parentCategoryId: categoryParents?.get(catId) ?? null,
    });
  }

  if (totalWeight > 1) {
    const scale = 1 / totalWeight;
    for (const w of weights) {
      w.weight *= scale;
      w.suggestedAmount = Math.round(w.weight * avgMonthlyIncome);
    }
  }

  return { weights, usingFallback: false };
}

export function detectDrift(
  currentBudget: BudgetItem[],
  targetWeights: TargetWeight[],
  threshold: number = 0.15
): DriftResult[] {
  const targetMap = new Map(targetWeights.map((tw) => [tw.categoryId, tw]));
  const drifted: DriftResult[] = [];

  for (const item of currentBudget) {
    if (item.isOverride) continue;
    const target = targetMap.get(item.categoryId);
    if (!target || target.suggestedAmount === 0) continue;

    const driftRatio =
      (item.limitAmount - target.suggestedAmount) / target.suggestedAmount;

    if (Math.abs(driftRatio) > threshold) {
      drifted.push({
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        currentAmount: item.limitAmount,
        targetAmount: target.suggestedAmount,
        driftRatio,
        driftDollars: item.limitAmount - target.suggestedAmount,
        parentCategoryId: item.parentCategoryId ?? null,
      });
    }
  }

  for (const tw of targetWeights) {
    const hasBudget = currentBudget.some((b) => b.categoryId === tw.categoryId);
    if (!hasBudget && tw.suggestedAmount > 0) {
      drifted.push({
        categoryId: tw.categoryId,
        categoryName: tw.categoryName,
        currentAmount: 0,
        targetAmount: tw.suggestedAmount,
        driftRatio: -1,
        driftDollars: -tw.suggestedAmount,
        parentCategoryId: tw.parentCategoryId ?? null,
      });
    }
  }

  drifted.sort((a, b) => Math.abs(b.driftRatio) - Math.abs(a.driftRatio));

  return drifted;
}

function resolveWithinParent(
  over: DriftResult[],
  under: DriftResult[]
): { suggestion: RebalanceSuggestion; pairedId: string | null }[] {
  const results: { suggestion: RebalanceSuggestion; pairedId: string | null }[] = [];
  const usedUnder = new Set<string>();

  for (const o of over) {
    let paired: DriftResult | null = null;

    if (o.parentCategoryId) {
      paired = under.find(
        (u) => u.parentCategoryId === o.parentCategoryId && !usedUnder.has(u.categoryId)
      ) ?? null;
    }

    if (!paired) {
      paired = under.find((u) => !usedUnder.has(u.categoryId)) ?? null;
    }

    if (paired) usedUnder.add(paired.categoryId);

    const offsetExplanation = paired
      ? `Offset by increasing ${paired.categoryName}`
      : "Reduce to match historical spending pattern";

    results.push({
      suggestion: {
        categoryId: o.categoryId,
        categoryName: o.categoryName,
        currentBudget: o.currentAmount,
        suggestedBudget: o.targetAmount,
        driftPercent: Math.round(o.driftRatio * 100),
        changeDollars: o.currentAmount - o.targetAmount,
        offsetExplanation,
      },
      pairedId: paired?.categoryId ?? null,
    });
  }

  return results;
}

export function generateSuggestions(
  driftResults: DriftResult[],
  currentBudget: BudgetItem[],
  _targetWeights: TargetWeight[],
  avgMonthlyIncome: number,
  monthlyIncomes: number[],
  usingFallback: boolean,
  goalPressure: number = 0,
  networthSensitivity: number = 0
): RebalanceResult {
  const budgetMap = new Map(currentBudget.map((b) => [b.categoryId, b]));

  const over = driftResults.filter((d) => d.driftDollars > 0);
  const under = driftResults.filter((d) => d.driftDollars < 0);

  const suggestions: RebalanceSuggestion[] = [];

  const overResults = resolveWithinParent(over, under);
  const pairedUnderIds = new Set(overResults.map((r) => r.pairedId).filter(Boolean));

  for (const r of overResults) {
    suggestions.push(r.suggestion);
  }

  for (const u of under) {
    if (pairedUnderIds.has(u.categoryId)) continue;

    const current = budgetMap.get(u.categoryId);
    const currentAmount = current?.limitAmount ?? 0;

    const pairedOver = over.length > 0 ? over[0] : null;
    const offsetExplanation = pairedOver
      ? `Funded by reducing ${pairedOver.categoryName}`
      : "Increase to match historical spending pattern";

    suggestions.push({
      categoryId: u.categoryId,
      categoryName: u.categoryName,
      currentBudget: currentAmount,
      suggestedBudget: u.targetAmount,
      driftPercent: Math.round(u.driftRatio * 100),
      changeDollars: currentAmount - u.targetAmount,
      offsetExplanation,
    });
  }

  const incomeCV = computeCV(monthlyIncomes);

  const totalCurrentBudget = currentBudget.reduce(
    (s, b) => s + b.limitAmount,
    0
  );
  const totalSuggestedBudget = suggestions.reduce(
    (s, sg) => s + sg.suggestedBudget,
    0
  );
  const changedIds = new Set(suggestions.map((s) => s.categoryId));
  const unchangedTotal = currentBudget
    .filter((b) => !changedIds.has(b.categoryId))
    .reduce((s, b) => s + b.limitAmount, 0);

  return {
    suggestions,
    avgMonthlyIncome,
    totalCurrentBudget,
    totalSuggestedBudget: totalSuggestedBudget + unchangedTotal,
    incomeCV,
    usingFallback,
    goalPressure,
    networthSensitivity,
    driftAlerts: [],
    slackByParent: [],
  };
}

function computeCV(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  if (mean === 0) return 0;
  const variance =
    values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance) / mean;
}

export function computeDriftAlerts(
  currentBudget: BudgetItem[],
  midMonthSpending: CategorySpending[],
  dayOfMonth: number
): DriftAlert[] {
  if (dayOfMonth < 15) return [];

  const daysInMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth() + 1,
    0
  ).getDate();
  const projectionFactor = daysInMonth / dayOfMonth;
  const alerts: DriftAlert[] = [];

  const spendingMap = new Map(
    midMonthSpending.map((s) => [s.categoryId, s.totalSpent])
  );

  for (const item of currentBudget) {
    if (item.isOverride || item.limitAmount <= 0) continue;
    const spent = spendingMap.get(item.categoryId) ?? 0;
    const projected = spent * projectionFactor;
    const overageRatio = projected / item.limitAmount;

    if (overageRatio > 1.2) {
      alerts.push({
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        budgetLimit: item.limitAmount,
        spentSoFar: spent,
        projectedMonthEnd: Math.round(projected),
        severity: overageRatio > 1.5 ? "critical" : "warning",
      });
    }
  }

  alerts.sort((a, b) => {
    if (a.severity === "critical" && b.severity !== "critical") return -1;
    if (b.severity === "critical" && a.severity !== "critical") return 1;
    return b.projectedMonthEnd / b.budgetLimit - a.projectedMonthEnd / a.budgetLimit;
  });

  return alerts;
}

export interface RebalanceInput {
  monthlySpending: CategorySpending[][];
  monthlyIncomes: number[];
  avgMonthlyIncome: number;
  currentBudget: BudgetItem[];
  driftThreshold?: number;
  goalPressure?: number;
  networthSensitivity?: number;
  categoryParents?: Map<string, string | null>;
  midMonthSpending?: CategorySpending[];
  dayOfMonth?: number;
  slackByParent?: SlackInfo[];
}

export function computeRebalance(input: RebalanceInput): RebalanceResult {
  const {
    monthlySpending,
    monthlyIncomes,
    avgMonthlyIncome,
    currentBudget,
    driftThreshold = 0.15,
    goalPressure = 0,
    networthSensitivity = 0,
    categoryParents,
    midMonthSpending,
    dayOfMonth,
    slackByParent = [],
  } = input;

  const sensitivityAdjustment = networthSensitivity < -0.05
    ? -0.03
    : networthSensitivity > 0.1
      ? 0.02
      : 0;
  const adjustedThreshold = Math.max(0.05, driftThreshold + sensitivityAdjustment);

  const { weights, usingFallback } = computeTargetWeights(
    monthlySpending,
    avgMonthlyIncome,
    goalPressure,
    categoryParents
  );

  const driftAlerts = (midMonthSpending && dayOfMonth)
    ? computeDriftAlerts(currentBudget, midMonthSpending, dayOfMonth)
    : [];

  if (currentBudget.length === 0) {
    const suggestions: RebalanceSuggestion[] = weights
      .filter((w) => w.suggestedAmount > 0)
      .map((w) => ({
        categoryId: w.categoryId,
        categoryName: w.categoryName,
        currentBudget: 0,
        suggestedBudget: w.suggestedAmount,
        driftPercent: -100,
        changeDollars: -w.suggestedAmount,
        offsetExplanation: "New budget based on spending history",
      }));

    return {
      suggestions,
      avgMonthlyIncome,
      totalCurrentBudget: 0,
      totalSuggestedBudget: suggestions.reduce(
        (s, sg) => s + sg.suggestedBudget,
        0
      ),
      incomeCV: computeCV(monthlyIncomes),
      usingFallback,
      goalPressure,
      networthSensitivity,
      driftAlerts,
      slackByParent,
    };
  }

  const drift = detectDrift(currentBudget, weights, adjustedThreshold);

  if (drift.length === 0) {
    return {
      suggestions: [],
      avgMonthlyIncome,
      totalCurrentBudget: currentBudget.reduce(
        (s, b) => s + b.limitAmount,
        0
      ),
      totalSuggestedBudget: currentBudget.reduce(
        (s, b) => s + b.limitAmount,
        0
      ),
      incomeCV: computeCV(monthlyIncomes),
      usingFallback,
      goalPressure,
      networthSensitivity,
      driftAlerts,
      slackByParent,
    };
  }

  const result = generateSuggestions(
    drift,
    currentBudget,
    weights,
    avgMonthlyIncome,
    monthlyIncomes,
    usingFallback,
    goalPressure,
    networthSensitivity
  );

  result.driftAlerts = driftAlerts;
  result.slackByParent = slackByParent;
  return result;
}
