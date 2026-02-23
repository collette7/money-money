"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveCategory } from "@/lib/transfer-filter";
import {
  computeRebalance,
  type CategorySpending,
  type BudgetItem,
  type RebalanceResult,
  type SlackInfo,
} from "@/lib/rebalance/engine";
import type { BudgetMode, BudgetPeriod } from "@/types/database";
import { monthYearSchema } from "@/lib/validation";

function getMonthDateRange(month: number, year: number): { startDate: string; endDate: string } {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate =
    month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, "0")}-01`;
  return { startDate, endDate };
}

function getPeriodDateRange(
  month: number,
  year: number,
  period: BudgetPeriod = "monthly"
): { startDate: string; endDate: string } {
  if (period === "annual") {
    return { startDate: `${year}-01-01`, endDate: `${year + 1}-01-01` };
  }

  if (period === "weekly") {
    const d = new Date(year, month - 1, 1);
    const dayOfWeek = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((dayOfWeek + 6) % 7));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 7);
    const fmt = (dt: Date) =>
      `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    return { startDate: fmt(monday), endDate: fmt(sunday) };
  }

  return getMonthDateRange(month, year);
}

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
      id, month, year, mode, period,
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
  if (!["independent", "pooled", "strict_pooled"].includes(mode)) {
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
  if (!["independent", "pooled", "strict_pooled"].includes(mode)) {
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

export async function applyBudgetRecommendations(
  items: Array<{ categoryId: string; recommendedLimit: number }>,
  month: number,
  year: number
) {
  const validatedMY = monthYearSchema.safeParse({ month, year });
  if (!validatedMY.success) throw new Error("Invalid month/year");
  for (const item of items) {
    if (!Number.isFinite(item.recommendedLimit) || item.recommendedLimit < 0 || item.recommendedLimit > 1_000_000_000) {
      throw new Error("Invalid recommended limit");
    }
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  let { data: budget } = await supabase
    .from("budgets")
    .select("id")
    .eq("user_id", user.id)
    .eq("month", month)
    .eq("year", year)
    .single();

  if (!budget) {
    const { data: newBudget } = await supabase
      .from("budgets")
      .insert({ user_id: user.id, month, year })
      .select("id")
      .single();
    budget = newBudget;
  }

  if (!budget) throw new Error("Failed to create budget");

  for (const item of items) {
    await supabase.from("budget_items").upsert(
      {
        budget_id: budget.id,
        category_id: item.categoryId,
        limit_amount: item.recommendedLimit,
      },
      { onConflict: "budget_id,category_id" }
    );
  }

  revalidatePath("/spending/breakdown");
  return { applied: items.length };
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
    sort_order: number;
    type: string;
  }> | null = null;

  const { data: extendedData, error: extendedError } = await supabase
    .from("categories")
    .select("id, name, emoji, color, parent_id, excluded_from_budget, sort_order, type")
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
      sort_order: 0,
      type: (cat as { type?: string }).type ?? "expense",
    }));
  } else {
    categories = (extendedData || []).map((cat) => ({
      ...cat,
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

export async function getRebalanceSuggestions(
  month: number,
  year: number
): Promise<RebalanceResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const LOOKBACK_MONTHS = 12;

  let startM = month - (LOOKBACK_MONTHS - 1);
  let startY = year;
  while (startM <= 0) {
    startM += 12;
    startY -= 1;
  }
  const rangeStart = `${startY}-${String(startM).padStart(2, "0")}-01`;

  const { endDate: rangeEnd } = getMonthDateRange(month, year);

  const [{ data: allTransactions }, { data: allSpending }, budget] =
    await Promise.all([
      supabase
        .from("transactions")
        .select(
          "amount, date, category_id, categories ( id, name, type ), accounts!account_id!inner ( user_id )"
        )
        .eq("accounts.user_id", user.id)
        .eq("category_confirmed", true)
        .gte("date", rangeStart)
        .lt("date", rangeEnd),
      supabase.rpc("get_category_spending", {
        p_user_id: user.id,
        p_start_date: rangeStart,
        p_end_date: rangeEnd,
      }),
      getBudget(month, year),
    ]);

  type TxCat = { id: string; name: string; type: string };
  const txns = (allTransactions ?? []).filter((t) => {
    const cat = resolveCategory(
      t.categories as unknown as TxCat | TxCat[] | null
    );
    return cat?.type !== "transfer";
  });

  const categoryNameCache = new Map<string, string>();
  for (const s of allSpending ?? []) {
    if (!categoryNameCache.has(s.category_id)) {
      const tx = txns.find((t) => t.category_id === s.category_id);
      const cat = tx
        ? resolveCategory(
            tx.categories as unknown as TxCat | TxCat[] | null
          )
        : null;
      categoryNameCache.set(s.category_id, cat?.name ?? "Unknown");
    }
  }

  const monthlySpendingMap = new Map<
    string,
    Map<string, { total: number; name: string }>
  >();
  const monthlyIncomeMap = new Map<string, number>();

  for (const tx of txns) {
    const monthKey = tx.date.substring(0, 7);

    const txCat = resolveCategory(
      tx.categories as unknown as TxCat | TxCat[] | null
    );
    if (tx.amount > 0 && txCat?.type === "income") {
      monthlyIncomeMap.set(
        monthKey,
        (monthlyIncomeMap.get(monthKey) ?? 0) + tx.amount
      );
    }

    if (tx.amount < 0 && tx.category_id) {
      if (!monthlySpendingMap.has(monthKey)) {
        monthlySpendingMap.set(monthKey, new Map());
      }
      const catMap = monthlySpendingMap.get(monthKey)!;
      const existing = catMap.get(tx.category_id);
      const catObj = resolveCategory(
        tx.categories as unknown as TxCat | TxCat[] | null
      );
      if (existing) {
        existing.total += Math.abs(tx.amount);
      } else {
        catMap.set(tx.category_id, {
          total: Math.abs(tx.amount),
          name: catObj?.name ?? categoryNameCache.get(tx.category_id) ?? "Unknown",
        });
      }
    }
  }

  const monthlySpending: CategorySpending[][] = [];
  for (const [, catMap] of monthlySpendingMap) {
    monthlySpending.push(
      Array.from(catMap.entries()).map(
        ([catId, data]): CategorySpending => ({
          categoryId: catId,
          categoryName: data.name,
          totalSpent: data.total,
        })
      )
    );
  }

  const monthlyIncomes = Array.from(monthlyIncomeMap.values());

  const { data: categories } = await supabase
    .from("categories")
    .select("id, parent_id")
    .or(`user_id.eq.${user.id},user_id.is.null`);

  const categoryParents = new Map<string, string | null>();
  for (const cat of categories ?? []) {
    categoryParents.set(cat.id, cat.parent_id);
  }

  const currentBudget: BudgetItem[] = (budget?.budget_items ?? []).map(
    (item) => {
      const catData = item.categories as unknown as {
        id: string;
        name: string;
      } | null;
      return {
        categoryId: item.category_id,
        categoryName: catData?.name ?? "Unknown",
        limitAmount: item.limit_amount,
        parentCategoryId: categoryParents.get(item.category_id) ?? null,
        isOverride: (item as { is_override?: boolean }).is_override ?? false,
      };
    }
  );

  const validIncomes = monthlyIncomes.filter((v) => v > 0);
  const avgMonthlyIncome =
    validIncomes.length > 0
      ? validIncomes.reduce((s, v) => s + v, 0) / validIncomes.length
      : 0;

  const [{ data: goalPressureData }, { data: nwSensitivityData }] = await Promise.all([
    supabase.rpc("get_goal_pressure", { p_user_id: user.id }),
    supabase.rpc("get_networth_sensitivity", { p_user_id: user.id }),
  ]);

  const goalPressure = Number(goalPressureData ?? 0);
  const networthSensitivity = Number(nwSensitivityData ?? 0);

  const now = new Date();
  const dayOfMonth = now.getDate();
  const { startDate: currentMonthStart, endDate: currentMonthEnd } = getMonthDateRange(month, year);

  const { data: midMonthSpendingData } = await supabase.rpc("get_category_spending", {
    p_user_id: user.id,
    p_start_date: currentMonthStart,
    p_end_date: currentMonthEnd,
  });

  const midMonthSpending: CategorySpending[] = (midMonthSpendingData ?? []).map(
    (s: { category_id: string; total: number }) => ({
      categoryId: s.category_id,
      categoryName: categoryNameCache.get(s.category_id) ?? "Unknown",
      totalSpent: Math.abs(s.total),
    })
  );

  const slackMap = await getPooledSlack(month, year);
  const slackByParent: SlackInfo[] = Array.from(slackMap.entries()).map(
    ([parentCategoryId, slackAmount]) => ({ parentCategoryId, slackAmount })
  );

  return computeRebalance({
    monthlySpending,
    monthlyIncomes: validIncomes,
    avgMonthlyIncome,
    currentBudget,
    goalPressure,
    networthSensitivity,
    categoryParents,
    midMonthSpending,
    dayOfMonth,
    slackByParent,
  });
}

export async function updateCategories(
  updates: Array<{
    id: string;
    name: string;
    emoji: string | null;
    color: string | null;
    parent_id: string | null;
    excluded_from_budget: boolean;
    sort_order: number;
  }>
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  for (const update of updates) {
    const { error } = await supabase
      .from("categories")
      .update({
        name: update.name,
        emoji: update.emoji,
        color: update.color,
        parent_id: update.parent_id,
        excluded_from_budget: update.excluded_from_budget,
        sort_order: update.sort_order,
      })
      .eq("id", update.id)
      .or(`user_id.eq.${user.id},user_id.is.null`);

    if (error) throw new Error(`Failed to update category ${update.id}: ${error.message}`);
  }

  revalidatePath("/spending/breakdown");
  return { updated: updates.length };
}

export async function deleteCategory(categoryId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  await supabase
    .from("categories")
    .update({ parent_id: null })
    .eq("parent_id", categoryId)
    .or(`user_id.eq.${user.id},user_id.is.null`);

  const { data: userAccounts } = await supabase
    .from("accounts")
    .select("id")
    .eq("user_id", user.id);

  if (userAccounts && userAccounts.length > 0) {
    const accountIds = userAccounts.map((a) => a.id);
    await supabase
      .from("transactions")
      .update({ category_id: null })
      .eq("category_id", categoryId)
      .in("account_id", accountIds);
  }

  await supabase
    .from("budget_items")
    .delete()
    .eq("category_id", categoryId);

   const { error } = await supabase
     .from("categories")
     .delete()
     .eq("id", categoryId)
     .or(`user_id.eq.${user.id},user_id.is.null`);

   if (error) {
     console.error("[deleteCategory]", error.message);
     throw new Error("Failed to delete record");
   }

   revalidatePath("/spending/breakdown");
   return { deleted: true };
}

export async function toggleCategoryExclusion(categoryId: string, excluded: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

   const { error } = await supabase
     .from("categories")
     .update({ excluded_from_budget: excluded })
     .eq("id", categoryId)
     .or(`user_id.eq.${user.id},user_id.is.null`);

   if (error) {
     console.error("[toggleCategoryExclusion]", error.message);
     throw new Error("Failed to update record");
   }

   const { error: childrenError } = await supabase
     .from("categories")
     .update({ excluded_from_budget: excluded })
     .eq("parent_id", categoryId)
     .or(`user_id.eq.${user.id},user_id.is.null`);

   if (childrenError) {
     console.error("[toggleCategoryExclusion]", childrenError.message);
     throw new Error("Failed to update record");
   }

   revalidatePath("/spending/breakdown");
}
