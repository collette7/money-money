"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveCategory } from "@/lib/transfer-filter";
import {
  computeRebalance,
  type CategorySpending,
  type BudgetAllocation,
  type RebalanceResult,
  type SlackInfo,
} from "@/lib/rebalance/engine";
import { monthYearSchema, aiBudgetResponseSchema, type AIBudgetResponse } from "@/lib/validation";
import { getAISettings, chatCompletion, type AIMessage } from "@/lib/ai/provider";
import { BUDGET_SYSTEM, buildBudgetPrompt, type BudgetPromptContext } from "@/lib/ai/prompts";
import { getBudget, getPooledSlack } from "./actions";
import { getMonthDateRange } from "./date-utils";

/* ─── Rebalance Suggestions ─── */

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

  const currentBudget: BudgetAllocation[] = (budget?.budget_items ?? []).map(
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

  const totalBudgetCeiling = budget?.total_budget_limit
    ? Number(budget.total_budget_limit)
    : undefined;

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
    totalBudgetCeiling: totalBudgetCeiling && totalBudgetCeiling > 0 ? totalBudgetCeiling : undefined,
  });
}

/* ─── Apply Budget Recommendations ─── */

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

/* ─── AI Budget Recommendation ─── */

async function requireAI(userId: string) {
  const settings = await getAISettings(userId);
  if (!settings) {
    throw new Error("AI not configured. Add your API key in Settings → AI Configuration.");
  }
  return settings;
}

export async function aiBudgetRecommendation(month?: number, year?: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const settings = await requireAI(user.id);
  const now = new Date();
  const targetMonth = month ?? (now.getMonth() + 1);
  const targetYear = year ?? now.getFullYear();

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const startDate = threeMonthsAgo.toISOString().split("T")[0];

  const [
    { data: txns },
    incomeResult,
    { data: categories },
    { data: goals },
    { data: goalPressureData },
    { data: nwSensitivityData },
    { data: accounts },
    existingBudget,
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select("amount, category_id, date, categories ( name, type ), accounts!account_id!inner ( user_id )")
      .eq("accounts.user_id", user.id)
      .gte("date", startDate)
      .lt("amount", 0),
    supabase
      .from("transactions")
      .select("amount, date, categories ( type ), accounts!account_id!inner ( user_id )")
      .eq("accounts.user_id", user.id)
      .gte("date", startDate)
      .gt("amount", 0),
    supabase
      .from("categories")
      .select("id, name, type")
      .or(`user_id.eq.${user.id},user_id.is.null`),
    supabase
      .from("savings_goals")
      .select("name, target_amount, current_amount, deadline, monthly_contribution")
      .eq("user_id", user.id)
      .eq("status", "active"),
    supabase.rpc("get_goal_pressure", { p_user_id: user.id }),
    supabase.rpc("get_networth_sensitivity", { p_user_id: user.id }),
    supabase
      .from("accounts")
      .select("balance, account_type")
      .eq("user_id", user.id),
    getBudget(targetMonth, targetYear),
  ]);

  const nonTransferIncome = (incomeResult.data ?? []).filter((t) => {
    const cat = resolveCategory(t.categories as unknown as { type: string } | { type: string }[] | null);
    return cat?.type !== "transfer";
  });

  const monthlyIncomeByMonth = new Map<string, number>();
  for (const t of nonTransferIncome) {
    const mk = t.date.substring(0, 7);
    monthlyIncomeByMonth.set(mk, (monthlyIncomeByMonth.get(mk) ?? 0) + t.amount);
  }
  const incomeValues = Array.from(monthlyIncomeByMonth.values());
  const monthlyIncome = incomeValues.length > 0
    ? incomeValues.reduce((s, v) => s + v, 0) / incomeValues.length
    : 0;

  const mean = incomeValues.length > 0 ? incomeValues.reduce((s, v) => s + v, 0) / incomeValues.length : 0;
  const incomeVariability = incomeValues.length >= 2 && mean > 0
    ? Math.sqrt(incomeValues.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / incomeValues.length) / mean
    : 0;

  const catSpending = new Map<string, { id: string; name: string; total: number; months: Set<string> }>();
  for (const t of txns ?? []) {
    if (!t.category_id) continue;
    const cat = t.categories as unknown as { name: string; type: string } | null;
    if (!cat || cat.type !== "expense") continue;
    const mk = t.date.substring(0, 7);
    const existing = catSpending.get(t.category_id) ?? { id: t.category_id, name: cat.name, total: 0, months: new Set<string>() };
    existing.total += Math.abs(t.amount);
    existing.months.add(mk);
    catSpending.set(t.category_id, existing);
  }

  const categoryAverages = Array.from(catSpending.values()).map((c) => ({
    categoryId: c.id,
    name: c.name,
    avgMonthly: c.total / Math.max(c.months.size, 1),
    months: c.months.size,
  }));

  const assetTypes = ["checking", "savings", "investment"];
  const liabilityTypes = ["credit", "loan"];
  const totalAssets = (accounts ?? [])
    .filter((a) => assetTypes.includes(a.account_type))
    .reduce((s, a) => s + (a.balance || 0), 0);
  const totalDebt = (accounts ?? [])
    .filter((a) => liabilityTypes.includes(a.account_type))
    .reduce((s, a) => s + Math.abs(a.balance || 0), 0);

  const budgetItems = existingBudget?.budget_items ?? [];
  const existingBudgetData = budgetItems.map((item) => {
    const catData = item.categories as unknown as { id: string; name: string } | null;
    return {
      categoryId: item.category_id,
      categoryName: catData?.name ?? "Unknown",
      limitAmount: item.limit_amount,
    };
  });

  const goalsData = (goals ?? []).map((g) => ({
    name: g.name,
    target: g.target_amount,
    current: g.current_amount,
    monthlyContribution: (g as { monthly_contribution?: number }).monthly_contribution ?? 0,
    deadline: g.deadline,
  }));

  const promptCtx: BudgetPromptContext = {
    monthlyIncome,
    incomeVariability,
    categoryAverages,
    categories: categories ?? [],
    existingBudget: existingBudgetData.length > 0 ? existingBudgetData : undefined,
    goals: goalsData.length > 0 ? goalsData : undefined,
    goalPressure: Number(goalPressureData ?? 0),
    networthSensitivity: Number(nwSensitivityData ?? 0),
    netWorth: totalAssets - totalDebt,
    totalDebt: totalDebt > 0 ? totalDebt : undefined,
  };

  const prompt = buildBudgetPrompt(promptCtx);
  const messages: AIMessage[] = [
    { role: "system", content: BUDGET_SYSTEM },
    { role: "user", content: prompt },
  ];

  let response: string;
  try {
    response = await chatCompletion(settings, messages, { retries: 2, timeoutMs: 45_000 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[AI Budget] Provider error:", msg);
    throw new Error(`Failed to get AI response: ${msg}`);
  }

  try {
    const cleaned = response
      .replace(/```json?\n?/g, "")
      .replace(/```/g, "")
      .replace(/,\s*([}\]])/g, "$1")
      .trim();
    const raw = JSON.parse(cleaned);

    const validCatIds = new Set((categories ?? []).map((c) => c.id));
    if (Array.isArray(raw.items)) {
      raw.items = raw.items.filter(
        (item: Record<string, unknown>) =>
          typeof item.categoryId === "string" && validCatIds.has(item.categoryId)
      );
    }

    const result = aiBudgetResponseSchema.parse(raw);

    if (!result.totalBudget) {
      result.totalBudget = result.items.reduce((s, i) => s + i.recommendedLimit, 0);
    }

    return result satisfies AIBudgetResponse;
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Parse error";
    console.error("[AI Budget] Parse error:", msg, "Raw response:", response.substring(0, 500));
    throw new Error(`AI returned an invalid response. ${msg}`);
  }
}
