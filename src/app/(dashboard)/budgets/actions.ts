"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveCategory, excludeTransfersByCategory } from "@/lib/transfer-filter";
import { BUDGET_MODES, type BudgetMode, type BudgetPeriod } from "@/types/database";
import { monthYearSchema } from "@/lib/validation";
import { getMonthDateRange, getPeriodDateRange } from "./date-utils";

import type { CategoryWithHierarchy } from "@/app/(dashboard)/spending/breakdown/expandable-categories";

export async function getBudget(month: number, year: number) {
  const validatedMY = monthYearSchema.safeParse({ month, year });
  if (!validatedMY.success) throw new Error("Invalid month/year");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: budget } = await supabase
    .from("budgets")
    .select(
      `
      id, month, year, mode, period, total_budget_limit,
      budget_items (
        id, category_id, limit_amount, spent_amount, rollover_amount, is_override,
        categories ( id, name, icon, color, type )
      )
    `
    )
    .eq("user_id", user.id)
    .eq("month", month)
    .eq("year", year)
    .single();

  if (!budget) return null;

  const budgetPeriod = (budget as { period?: BudgetPeriod }).period ?? "monthly";
  const { startDate, endDate } = getPeriodDateRange(month, year, budgetPeriod);

  const { data: spending } = await supabase.rpc("get_category_spending", {
    p_user_id: user.id,
    p_start_date: startDate,
    p_end_date: endDate,
  });

  const items = (budget.budget_items ?? []).map((item) => {
    const spent =
      spending?.find(
        (s: { category_id: string }) => s.category_id === item.category_id
      )?.total ?? 0;
    const rollover = (item as { rollover_amount?: number }).rollover_amount ?? 0;
    return {
      ...item,
      spent_amount: Math.abs(spent),
      rollover_amount: rollover,
      effective_limit: item.limit_amount + rollover,
    };
  });

  return { ...budget, budget_items: items };
}

export async function createBudget(
  month: number,
  year: number,
  items: { categoryId: string; limitAmount: number }[],
  mode: BudgetMode = "independent"
) {
  const validatedMY = monthYearSchema.safeParse({ month, year });
  if (!validatedMY.success) throw new Error("Invalid month/year");
  const validModes = BUDGET_MODES.map(m => m.value);
  if (!validModes.includes(mode)) {
    throw new Error("Invalid budget mode");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: budget, error } = await supabase
    .from("budgets")
    .upsert(
      { user_id: user.id, month, year, mode },
      { onConflict: "user_id,month,year" }
    )
    .select("id")
    .single();

  if (error || !budget) throw new Error(error?.message ?? "Failed to create budget");

  const { data: rollovers } = await supabase.rpc("calculate_rollover", {
    p_user_id: user.id,
    p_month: month,
    p_year: year,
  });

  const rolloverMap = new Map<string, number>();
  if (rollovers) {
    for (const r of rollovers) {
      rolloverMap.set(r.category_id, Number(r.rollover_amount));
    }
  }

  await supabase.from("budget_items").delete().eq("budget_id", budget.id);

  if (items.length > 0) {
    await supabase.from("budget_items").insert(
      items.map((item) => ({
        budget_id: budget.id,
        category_id: item.categoryId,
        limit_amount: item.limitAmount,
        spent_amount: 0,
        rollover_amount: rolloverMap.get(item.categoryId) ?? 0,
        is_override: true,
      }))
    );
  }

  revalidatePath("/spending/breakdown");
  return budget;
}

export async function updateBudgetItem(
  budgetItemId: string,
  limitAmount: number
) {
  if (!Number.isFinite(limitAmount) || limitAmount < 0 || limitAmount > 1_000_000_000) {
    throw new Error("Invalid limit amount");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: item } = await supabase
    .from("budget_items")
    .select("id, budget_id, budgets!inner(user_id)")
    .eq("id", budgetItemId)
    .single();

  if (!item || (item.budgets as unknown as { user_id: string })?.user_id !== user.id) {
    throw new Error("Budget item not found");
  }

  await supabase
    .from("budget_items")
    .update({ limit_amount: limitAmount, is_override: true })
    .eq("id", budgetItemId);

  revalidatePath("/spending/breakdown");
}

export async function deleteBudget(budgetId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  await supabase.from("budgets").delete().eq("id", budgetId).eq("user_id", user.id);

  revalidatePath("/spending/breakdown");
}

export async function updateBudgetMode(budgetId: string, mode: BudgetMode) {
  const validModes = BUDGET_MODES.map(m => m.value);
  if (!validModes.includes(mode)) {
    throw new Error("Invalid budget mode");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  await supabase
    .from("budgets")
    .update({ mode })
    .eq("id", budgetId)
    .eq("user_id", user.id);

  revalidatePath("/spending/breakdown");
}

export async function updateTotalBudgetLimit(budgetId: string, limit: number | null) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  await supabase
    .from("budgets")
    .update({ total_budget_limit: limit })
    .eq("id", budgetId)
    .eq("user_id", user.id);

  revalidatePath("/spending/breakdown");
}

export async function applyRollover(month: number, year: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: budget } = await supabase
    .from("budgets")
    .select("id")
    .eq("user_id", user.id)
    .eq("month", month)
    .eq("year", year)
    .single();

  if (!budget) return { updated: 0 };

  const { data: rollovers } = await supabase.rpc("calculate_rollover", {
    p_user_id: user.id,
    p_month: month,
    p_year: year,
  });

  if (!rollovers || rollovers.length === 0) return { updated: 0 };

  let updated = 0;
  for (const r of rollovers) {
    const { error } = await supabase
      .from("budget_items")
      .update({ rollover_amount: r.rollover_amount })
      .eq("budget_id", budget.id)
      .eq("category_id", r.category_id);
    if (!error) updated++;
  }

  revalidatePath("/spending/breakdown");
  return { updated };
}

export async function getPooledSlack(month: number, year: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: slack } = await supabase.rpc("get_pooled_slack", {
    p_user_id: user.id,
    p_month: month,
    p_year: year,
  });

  const slackMap = new Map<string, number>();
  if (slack) {
    for (const s of slack) {
      slackMap.set(s.parent_category_id, Number(s.slack_amount));
    }
  }

  return slackMap;
}

export async function getSpendingSummary(month: number, year: number, period: BudgetPeriod = "monthly") {
  const validatedMY = monthYearSchema.safeParse({ month, year });
  if (!validatedMY.success) throw new Error("Invalid month/year");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { startDate, endDate } = getPeriodDateRange(month, year, period);

  const { data: transactions } = await supabase
    .from("transactions")
    .select("amount, category_id, categories ( name, color, icon, type ), accounts!account_id!inner ( user_id )")
    .eq("accounts.user_id", user.id)
    .gte("date", startDate)
    .lt("date", endDate);

  type CatShape = { name: string; color: string | null; icon: string | null; type: string };
  const nonTransferTxns = (transactions ?? []).filter((t) => {
    const cat = resolveCategory(t.categories as unknown as CatShape | CatShape[] | null);
    return cat?.type !== "transfer";
  });

  const income = nonTransferTxns
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  const expenses = nonTransferTxns
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const byCategory = new Map<string, { name: string; color: string | null; icon: string | null; total: number }>();
  for (const tx of nonTransferTxns) {
    if (tx.amount >= 0) continue;
    const cat = resolveCategory(tx.categories as unknown as CatShape | CatShape[] | null);
    const key = cat?.name ?? "Uncategorized";
    const existing = byCategory.get(key) ?? { name: key, color: cat?.color ?? null, icon: cat?.icon ?? null, total: 0 };
    existing.total += Math.abs(tx.amount);
    byCategory.set(key, existing);
  }

  return {
    income,
    expenses,
    net: income - expenses,
    byCategory: Array.from(byCategory.values()).sort((a, b) => b.total - a.total),
  };
}

export async function getMonthlyIncomeEstimate() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const startDate = threeMonthsAgo.toISOString().split("T")[0];

  const { data: transactions } = await supabase
    .from("transactions")
    .select(
      "amount, date, categories ( type ), accounts!account_id!inner ( user_id )"
    )
    .eq("accounts.user_id", user.id)
    .gt("amount", 0)
    .gte("date", startDate);

  type CatShape = { type: string };
  const incomeTxns = (transactions ?? []).filter((t) => {
    const cat = resolveCategory(
      t.categories as unknown as CatShape | CatShape[] | null
    );
    return cat?.type === "income";
  });

  const byMonth = new Map<string, number>();
  for (const t of incomeTxns) {
    const mk = t.date.substring(0, 7);
    byMonth.set(mk, (byMonth.get(mk) ?? 0) + t.amount);
  }

  const values = Array.from(byMonth.values());
  const months = values.length;
  const average =
    months > 0 ? values.reduce((s, v) => s + v, 0) / months : 0;

  return { average, months };
}

export async function getTagsForMonth(month: number, year: number) {
  const validatedMY = monthYearSchema.safeParse({ month, year });
  if (!validatedMY.success) throw new Error("Invalid month/year");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { startDate, endDate } = getMonthDateRange(month, year);

  const { data: transactions } = await supabase
    .from("transactions")
    .select("category_id, tags, accounts!account_id!inner(user_id)")
    .eq("accounts.user_id", user.id)
    .gte("date", startDate)
    .lt("date", endDate)
    .not("tags", "is", null);

  const tagsByCategory: Record<string, string[]> = {};
  const allTagsSet = new Set<string>();

  for (const tx of transactions ?? []) {
    const tags = tx.tags as string[] | null;
    if (!tags || tags.length === 0) continue;
    const catId = tx.category_id as string | null;
    if (!catId) continue;

    if (!tagsByCategory[catId]) {
      tagsByCategory[catId] = [];
    }

    for (const tag of tags) {
      allTagsSet.add(tag);
      if (!tagsByCategory[catId].includes(tag)) {
        tagsByCategory[catId].push(tag);
      }
    }
  }

  return {
    tagsByCategory,
    allTags: Array.from(allTagsSet).sort(),
  };
}

export async function getActiveSavingsGoalsSummary() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: goals } = await supabase
    .from("savings_goals")
    .select("monthly_contribution")
    .eq("user_id", user.id)
    .eq("status", "active");

  const activeGoals = goals ?? [];
  const totalMonthlyContribution = activeGoals.reduce(
    (sum, g) =>
      sum +
      ((g as { monthly_contribution?: number }).monthly_contribution ?? 0),
    0
  );

  return { count: activeGoals.length, totalMonthlyContribution };
}

export async function getHierarchicalBudget(month: number, year: number) {
  const validatedMY = monthYearSchema.safeParse({ month, year });
  if (!validatedMY.success) throw new Error("Invalid month/year");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  let categories: Array<{
    id: string;
    name: string;
    emoji: string | null;
    color: string | null;
    parent_id: string | null;
    excluded_from_budget: boolean;
    enable_rollover: boolean;
    sort_order: number;
    type: string;
  }> | null = null;

  const { data: extendedData, error: extendedError } = await supabase
    .from("categories")
    .select("id, name, emoji, color, parent_id, excluded_from_budget, enable_rollover, sort_order, type")
    .or(`user_id.eq.${user.id},user_id.is.null`)
    .order("sort_order")
    .order("name");

  if (extendedError && extendedError.code === "42703") {
    const { data: baseData } = await supabase
      .from("categories")
      .select("id, name, parent_id, type")
      .or(`user_id.eq.${user.id},user_id.is.null`)
      .order("name");

    categories = (baseData || []).map((cat) => ({
      ...cat,
      emoji: null,
      color: null,
      excluded_from_budget: false,
      enable_rollover: true,
      sort_order: 0,
      type: (cat as { type?: string }).type ?? "expense",
    }));
  } else {
    categories = (extendedData || []).map((cat) => ({
      ...cat,
      enable_rollover: (cat as { enable_rollover?: boolean }).enable_rollover ?? true,
      type: (cat as { type?: string }).type ?? "expense",
    }));
  }

  if (!categories) return [];

  const { data: budget } = await supabase
    .from("budgets")
    .select(`
      id, mode,
      budget_items (
        category_id, limit_amount, rollover_amount
      )
    `)
    .eq("user_id", user.id)
    .eq("month", month)
    .eq("year", year)
    .single();

  const budgetMode: BudgetMode = (budget as { mode?: BudgetMode } | null)?.mode ?? "independent";
  const budgetPeriod: BudgetPeriod = (budget as { period?: BudgetPeriod } | null)?.period ?? "monthly";

  const { startDate, endDate } = getPeriodDateRange(month, year, budgetPeriod);

  const { data: spending } = await supabase.rpc("get_category_spending", {
    p_user_id: user.id,
    p_start_date: startDate,
    p_end_date: endDate,
  });

  const budgetMap = new Map<string, number>();
  const rolloverMap = new Map<string, number>();
  if (budget?.budget_items) {
    for (const item of budget.budget_items) {
      budgetMap.set(item.category_id, item.limit_amount);
      rolloverMap.set(item.category_id, (item as { rollover_amount?: number }).rollover_amount ?? 0);
    }
  }

  const spendingMap = new Map<string, number>();
  if (spending) {
    for (const s of spending) {
      spendingMap.set(s.category_id, Math.abs(s.total));
    }
  }

  let slackMap = new Map<string, number>();
  if (budgetMode === "pooled" || budgetMode === "strict_pooled") {
    slackMap = await getPooledSlack(month, year);
  }

  const categoryMap = new Map<string, CategoryWithHierarchy>();
  const rootCategories: CategoryWithHierarchy[] = [];

  for (const cat of categories) {
    const budgetAmt = budgetMap.get(cat.id) || 0;
    const rolloverAmt = rolloverMap.get(cat.id) || 0;
    const categoryWithData: CategoryWithHierarchy = {
      id: cat.id,
      name: cat.name,
      emoji: cat.emoji,
      color: cat.color,
      parent_id: cat.parent_id,
      excluded_from_budget: cat.excluded_from_budget,
      enable_rollover: cat.enable_rollover,
      sort_order: cat.sort_order ?? 0,
      type: (cat.type as "income" | "expense" | "transfer") ?? "expense",
      spent_amount: spendingMap.get(cat.id) || 0,
      budget_amount: budgetAmt,
      rollover_amount: rolloverAmt,
      effective_limit: budgetAmt + rolloverAmt,
      pooled_slack: 0,
      children: [],
    };
    categoryMap.set(cat.id, categoryWithData);
  }

  for (const cat of categoryMap.values()) {
    if (cat.parent_id && categoryMap.has(cat.parent_id)) {
      const parent = categoryMap.get(cat.parent_id)!;
      parent.children!.push(cat);
    } else if (!cat.parent_id) {
      rootCategories.push(cat);
    }
  }

  if (budgetMode === "pooled" || budgetMode === "strict_pooled") {
    for (const root of rootCategories) {
      const slack = slackMap.get(root.id) ?? 0;
      root.pooled_slack = slack;
      if (root.children) {
        for (const child of root.children) {
          child.pooled_slack = slack;
        }
      }
    }
  }

  function calculateParentTotals(category: CategoryWithHierarchy): void {
    if (category.children && category.children.length > 0) {
      let totalSpent = category.spent_amount;
      let totalBudget = category.budget_amount;
      let totalRollover = category.rollover_amount;

      for (const child of category.children) {
        calculateParentTotals(child);
        totalSpent += child.spent_amount;
        totalBudget += child.budget_amount;
        totalRollover += child.rollover_amount;
      }

      category.spent_amount = totalSpent;
      category.budget_amount = totalBudget;
      category.rollover_amount = totalRollover;
      category.effective_limit = totalBudget + totalRollover;
    }
  }

  for (const root of rootCategories) {
    calculateParentTotals(root);
  }

  return rootCategories;
}

// ---------------------------------------------------------------------------
// Budget Comparison (month-over-month)
// ---------------------------------------------------------------------------

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export type BudgetComparisonData = {
  categories: Array<{
    name: string;
    color: string | null;
    currentMonth: number;
    previousMonth: number;
    change: number;
    changePercent: number | null;
  }>;
  currentMonthLabel: string;
  previousMonthLabel: string;
  currentTotal: number;
  previousTotal: number;
};

export async function getBudgetComparison(
  month: number,
  year: number
): Promise<BudgetComparisonData> {
  const validatedMY = monthYearSchema.safeParse({ month, year });
  if (!validatedMY.success) throw new Error("Invalid month/year");

  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;

  const [currentSummary, previousSummary] = await Promise.all([
    getSpendingSummary(month, year),
    getSpendingSummary(prevMonth, prevYear),
  ]);

  const merged = new Map<
    string,
    { name: string; color: string | null; currentMonth: number; previousMonth: number }
  >();

  for (const cat of currentSummary.byCategory) {
    merged.set(cat.name, {
      name: cat.name,
      color: cat.color,
      currentMonth: cat.total,
      previousMonth: 0,
    });
  }

  for (const cat of previousSummary.byCategory) {
    const existing = merged.get(cat.name);
    if (existing) {
      existing.previousMonth = cat.total;
      if (!existing.color) existing.color = cat.color;
    } else {
      merged.set(cat.name, {
        name: cat.name,
        color: cat.color,
        currentMonth: 0,
        previousMonth: cat.total,
      });
    }
  }

  const categories = Array.from(merged.values())
    .map((cat) => {
      const change = cat.currentMonth - cat.previousMonth;
      const changePercent =
        cat.previousMonth > 0
          ? ((cat.currentMonth - cat.previousMonth) / cat.previousMonth) * 100
          : null;
      return { ...cat, change, changePercent };
    })
    .sort((a, b) => b.currentMonth - a.currentMonth);

  return {
    categories,
    currentMonthLabel: MONTH_LABELS[month - 1],
    previousMonthLabel: MONTH_LABELS[prevMonth - 1],
    currentTotal: currentSummary.expenses,
    previousTotal: previousSummary.expenses,
  };
}

// ---------------------------------------------------------------------------
// Spending Pace
// ---------------------------------------------------------------------------

export type PaceDataPoint = {
  day: number;
  date: string;
  ideal: number;
  actual: number | null;
  projected: number | null;
};

export type BudgetPaceData = {
  points: PaceDataPoint[];
  totalBudget: number;
  totalSpent: number;
  daysInMonth: number;
  currentDay: number;
  projectedMonthEnd: number;
  freeToSpend: number;
  status: "on_track" | "slightly_ahead" | "significantly_ahead" | "over_budget";
};

export async function getDailyBudgetPace(
  month: number,
  year: number
): Promise<BudgetPaceData> {
  const validatedMY = monthYearSchema.safeParse({ month, year });
  if (!validatedMY.success) throw new Error("Invalid month/year");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const budget = await getBudget(month, year);
  const totalBudget =
    budget?.budget_items?.reduce(
      (sum, item) => sum + item.limit_amount,
      0
    ) ?? 0;

  const empty: BudgetPaceData = {
    points: [],
    totalBudget: 0,
    totalSpent: 0,
    daysInMonth: new Date(year, month, 0).getDate(),
    currentDay: 1,
    projectedMonthEnd: 0,
    freeToSpend: 0,
    status: "on_track",
  };

  if (totalBudget === 0) return empty;

  const { startDate, endDate } = getMonthDateRange(month, year);

  const { data: rawTx } = await supabase
    .from("transactions")
    .select(
      "amount, date, categories ( type ), accounts!account_id!inner ( user_id )"
    )
    .eq("accounts.user_id", user.id)
    .gte("date", startDate)
    .lt("date", endDate)
    .lt("amount", 0)
    .eq("ignored", false)
    .eq("status", "cleared")
    .order("date", { ascending: true })
    .limit(10000);

  const transactions = excludeTransfersByCategory(rawTx ?? []);

  const byDate = new Map<string, number>();
  for (const tx of transactions) {
    byDate.set(tx.date, (byDate.get(tx.date) ?? 0) + Math.abs(tx.amount));
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  const now = new Date();
  const isCurrentMonth =
    now.getMonth() + 1 === month && now.getFullYear() === year;
  const currentDay = isCurrentMonth
    ? Math.min(now.getDate(), daysInMonth)
    : daysInMonth;

  let cumulativeActual = 0;
  const cumulativeByDay = new Map<number, number>();
  for (let d = 1; d <= currentDay; d++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cumulativeActual += byDate.get(dateStr) ?? 0;
    cumulativeByDay.set(d, cumulativeActual);
  }

  const totalSpent = cumulativeActual;
  const dailyAverage = currentDay > 0 ? totalSpent / currentDay : 0;
  const projectedMonthEnd = dailyAverage * daysInMonth;
  const freeToSpend = totalBudget - totalSpent;

  const idealAtToday = (currentDay / daysInMonth) * totalBudget;
  const overage = (totalSpent - idealAtToday) / totalBudget;

  let status: BudgetPaceData["status"];
  if (totalSpent > totalBudget) {
    status = "over_budget";
  } else if (overage >= 0.2) {
    status = "significantly_ahead";
  } else if (overage > 0) {
    status = "slightly_ahead";
  } else {
    status = "on_track";
  }

  const points: PaceDataPoint[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const ideal = (d / daysInMonth) * totalBudget;
    const actual = d <= currentDay ? (cumulativeByDay.get(d) ?? 0) : null;

    let projected: number | null = null;
    if (currentDay >= 5 && d >= currentDay) {
      projected = dailyAverage * d;
    }

    points.push({ day: d, date: dateStr, ideal, actual, projected });
  }

  return {
    points,
    totalBudget,
    totalSpent,
    daysInMonth,
    currentDay,
    projectedMonthEnd,
    freeToSpend,
    status,
  };
}

