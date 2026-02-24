"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveCategory } from "@/lib/transfer-filter";
import { monthsRangeSchema, limitSchema } from "@/lib/validation";
import { z } from "zod";

export type MonthlyTrend = {
  month: string;
  income: number;
  expenses: number;
};

export type CategoryTotal = {
  name: string;
  color: string | null;
  icon: string | null;
  total: number;
};

export type MerchantTotal = {
  merchant_name: string;
  total: number;
  count: number;
};

export type DailySpend = {
  date: string;
  total: number;
};

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export async function getMonthlyTrends(months: number = 6): Promise<MonthlyTrend[]> {
  const validatedMonths = monthsRangeSchema.safeParse(months);
  if (!validatedMonths.success) throw new Error("Invalid months parameter");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const now = new Date();
  const rangeStart = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  const startDate = `${rangeStart.getFullYear()}-${String(rangeStart.getMonth() + 1).padStart(2, "0")}-01`;
  const endM = now.getMonth() === 11 ? 1 : now.getMonth() + 2;
  const endY = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
  const endDate = `${endY}-${String(endM).padStart(2, "0")}-01`;

  const { data: transactions } = await supabase
    .from("transactions")
    .select("amount, date, categories ( type ), accounts!account_id!inner ( user_id )")
    .eq("accounts.user_id", user.id)
    .gte("date", startDate)
    .lt("date", endDate)
    .eq("ignored", false)
    .eq("status", "cleared");

  const byMonth = new Map<string, { income: number; expenses: number }>();

  for (const tx of transactions ?? []) {
    const catType = (tx.categories as unknown as { type: string } | null)?.type;
    if (catType === "transfer") continue;

    const monthKey = (tx.date as string).substring(0, 7);
    const entry = byMonth.get(monthKey) ?? { income: 0, expenses: 0 };

    if (tx.amount > 0) entry.income += tx.amount;
    else entry.expenses += Math.abs(tx.amount);

    byMonth.set(monthKey, entry);
  }

  const results: MonthlyTrend[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const entry = byMonth.get(key) ?? { income: 0, expenses: 0 };
    const label = new Intl.DateTimeFormat("en-US", { month: "short", year: "2-digit" }).format(d);
    results.push({ month: label, ...entry });
  }

  return results;
}

export async function getCategoryBreakdown(
  startDate: string,
  endDate: string
): Promise<CategoryTotal[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: transactions } = await supabase
    .from("transactions")
    .select(
      "amount, categories ( name, color, icon, type ), accounts!account_id!inner ( user_id )"
    )
    .eq("accounts.user_id", user.id)
    .gte("date", startDate)
    .lt("date", endDate)
    .eq("ignored", false)
    .eq("status", "cleared");

  const byCategory = new Map<
    string,
    { name: string; color: string | null; icon: string | null; total: number }
  >();

  for (const tx of transactions ?? []) {
    if (tx.amount >= 0) continue;
    const cat = resolveCategory(tx.categories as unknown as { name: string; color: string | null; icon: string | null; type: string } | { name: string; color: string | null; icon: string | null; type: string }[] | null);
    if (cat?.type === "transfer") continue;
    const key = cat?.name ?? "Uncategorized";
    const existing = byCategory.get(key) ?? {
      name: key,
      color: cat?.color ?? null,
      icon: cat?.icon ?? null,
      total: 0,
    };
    existing.total += Math.abs(tx.amount);
    byCategory.set(key, existing);
  }

  return Array.from(byCategory.values()).sort((a, b) => b.total - a.total);
}

export async function getTopMerchants(
  startDate: string,
  endDate: string,
  limit: number = 10
): Promise<MerchantTotal[]> {
  const validatedLimit = limitSchema.safeParse(limit);
  if (!validatedLimit.success) throw new Error("Invalid limit");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: transactions } = await supabase
    .from("transactions")
    .select("amount, merchant_name, accounts!account_id!inner ( user_id )")
    .eq("accounts.user_id", user.id)
    .gte("date", startDate)
    .lt("date", endDate)
    .lt("amount", 0)
    .eq("ignored", false)
    .eq("status", "cleared");

  const byMerchant = new Map<string, { total: number; count: number }>();

  for (const tx of transactions ?? []) {
    const name = (tx.merchant_name as string | null) ?? "Unknown";
    const existing = byMerchant.get(name) ?? { total: 0, count: 0 };
    existing.total += Math.abs(tx.amount);
    existing.count += 1;
    byMerchant.set(name, existing);
  }

  return Array.from(byMerchant.entries())
    .map(([merchant_name, data]) => ({ merchant_name, ...data }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

export async function getDailySpending(
  startDate: string,
  endDate: string
): Promise<DailySpend[]> {
  if (!dateStringSchema.safeParse(startDate).success || !dateStringSchema.safeParse(endDate).success) {
    throw new Error("Invalid date format");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: transactions } = await supabase
    .from("transactions")
    .select("amount, date, accounts!account_id!inner ( user_id )")
    .eq("accounts.user_id", user.id)
    .gte("date", startDate)
    .lt("date", endDate)
    .lt("amount", 0)
    .eq("ignored", false)
    .eq("status", "cleared")
    .order("date", { ascending: true });

  const byDate = new Map<string, number>();

  for (const tx of transactions ?? []) {
    const date = tx.date as string;
    byDate.set(date, (byDate.get(date) ?? 0) + Math.abs(tx.amount));
  }

  return Array.from(byDate.entries())
    .map(([date, total]) => ({ date, total }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export type DetectedRecurringPattern = {
  id: string;
  merchant_name: string | null;
  description: string;
  amount: number;
  date: string;
  accounts: {
    id: string;
    name: string;
    account_type: string;
    institution_name: string;
  } | null;
  pattern: {
    avg_amount: number;
    occurrences: number;
    avg_interval_days: number;
    estimated_frequency: string;
  };
};

export async function getDetectedRecurringPatterns(
  userId: string
): Promise<DetectedRecurringPattern[]> {
  const supabase = await createClient();

  const [{ data: patterns }, { data: existingRules }] = await Promise.all([
    supabase.rpc("detect_recurring_transactions", {
      p_user_id: userId,
      p_min_occurrences: 2,
    }),
    supabase
      .from("recurring_rules")
      .select("merchant_pattern, confirmed")
      .eq("user_id", userId)
      .not("confirmed", "is", null),
  ]);

  if (!patterns || patterns.length === 0) return [];

  const reviewedPatterns = new Set(
    (existingRules ?? []).map((r) => r.merchant_pattern.toLowerCase())
  );

  const unreviewedPatterns = patterns.filter(
    (p: { merchant_name: string }) =>
      !reviewedPatterns.has(p.merchant_name.toLowerCase())
  );

  if (unreviewedPatterns.length === 0) return [];

  const merchantNames = unreviewedPatterns.map(
    (p: { merchant_name: string }) => p.merchant_name
  );

  const { data: accounts } = await supabase
    .from("accounts")
    .select("id")
    .eq("user_id", userId);

  if (!accounts || accounts.length === 0) return [];

  const accountIds = accounts.map((a) => a.id);

  const { data: transactions } = await supabase
    .from("transactions")
    .select(
      "id, merchant_name, description, amount, date, category_id, account_id, accounts!account_id(id, name, account_type, institution_name), categories(type)"
    )
    .in("account_id", accountIds)
    .in("merchant_name", merchantNames)
    .eq("is_recurring", false)
    .order("date", { ascending: false });

  if (!transactions || transactions.length === 0) return [];

  const latestByMerchant = new Map<
    string,
    (typeof transactions)[number]
  >();
  for (const tx of transactions) {
    const name = tx.merchant_name as string;
    const catType = (tx.categories as unknown as { type: string } | null)?.type;
    if (catType === "transfer") continue;
    if (!latestByMerchant.has(name)) {
      latestByMerchant.set(name, tx);
    }
  }

  const results: DetectedRecurringPattern[] = [];
  for (const p of unreviewedPatterns) {
    const tx = latestByMerchant.get(p.merchant_name as string);
    if (!tx) continue;

    const acct = tx.accounts as
      | { id: string; name: string; account_type: string; institution_name: string }
      | { id: string; name: string; account_type: string; institution_name: string }[]
      | null;
    const resolvedAccount = Array.isArray(acct) ? acct[0] ?? null : acct;

    results.push({
      id: tx.id as string,
      merchant_name: tx.merchant_name as string | null,
      description: tx.description as string,
      amount: tx.amount as number,
      date: tx.date as string,
      accounts: resolvedAccount,
      pattern: {
        avg_amount: Number(p.avg_amount),
        occurrences: Number(p.occurrences),
        avg_interval_days: Number(p.avg_interval_days),
        estimated_frequency: p.estimated_frequency as string,
      },
    });
  }

  return results.slice(0, 5);
}
