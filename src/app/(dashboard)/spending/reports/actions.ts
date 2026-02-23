"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";
import { resolveCategory } from "@/lib/transfer-filter";
import { monthsRangeSchema } from "@/lib/validation";

export async function generateCategoryReport(months: number = 12) {
  const validatedMonths = monthsRangeSchema.safeParse(months);
  if (!validatedMonths.success) throw new Error("Invalid months parameter");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) redirect("/auth/login");

  const endDate = endOfMonth(new Date());
  const startDate = startOfMonth(subMonths(endDate, months - 1));

  const { data: transactions, error } = await supabase
    .from("transactions")
    .select(`
      id,
      amount,
      date,
      category_id,
      categories!inner (
        id,
        name,
        icon,
        color,
        type
      )
    `)
    .eq("user_id", user.id)
    .gte("date", startDate.toISOString())
    .lte("date", endDate.toISOString())
    .order("date", { ascending: false });

  if (error) throw error;

  const monthlyData = new Map<string, Map<string, number>>();
  
  transactions?.forEach(tx => {
    const cat = resolveCategory(tx.categories as unknown as { type: string; name: string }[] | null);
    if (cat?.type === "transfer") return;

    const monthKey = format(new Date(tx.date), "yyyy-MM");
    const categoryName = cat?.name || "Uncategorized";
    
    if (!monthlyData.has(monthKey)) {
      monthlyData.set(monthKey, new Map());
    }
    
    const monthMap = monthlyData.get(monthKey)!;
    monthMap.set(categoryName, (monthMap.get(categoryName) || 0) + Math.abs(tx.amount));
  });

  const reportData = Array.from(monthlyData.entries()).map(([month, categories]) => ({
    month,
    categories: Array.from(categories.entries()).map(([name, amount]) => ({
      name,
      amount
    })).sort((a, b) => b.amount - a.amount)
  })).reverse();

  return reportData;
}

export async function generateIncomeExpenseReport(months: number = 12) {
  const validatedMonths = monthsRangeSchema.safeParse(months);
  if (!validatedMonths.success) throw new Error("Invalid months parameter");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) redirect("/auth/login");

  const endDate = endOfMonth(new Date());
  const startDate = startOfMonth(subMonths(endDate, months - 1));

  const { data: transactions, error } = await supabase
    .from("transactions")
    .select("amount, date, categories ( type ), accounts!account_id!inner ( user_id )")
    .eq("accounts.user_id", user.id)
    .gte("date", startDate.toISOString())
    .lte("date", endDate.toISOString());

  if (error) throw error;

  const monthlyData = new Map<string, { income: number; expenses: number }>();
  
  transactions?.forEach(tx => {
    const cat = resolveCategory(tx.categories as unknown as { type: string } | { type: string }[] | null);
    if (cat?.type === "transfer") return;

    const monthKey = format(new Date(tx.date), "yyyy-MM");
    
    if (!monthlyData.has(monthKey)) {
      monthlyData.set(monthKey, { income: 0, expenses: 0 });
    }
    
    const monthStats = monthlyData.get(monthKey)!;
    if (tx.amount > 0) {
      monthStats.income += tx.amount;
    } else {
      monthStats.expenses += Math.abs(tx.amount);
    }
  });

  const reportData = Array.from(monthlyData.entries()).map(([month, stats]) => ({
    month,
    ...stats,
    net: stats.income - stats.expenses
  })).reverse();

  return reportData;
}

export async function generateAccountBalanceReport() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) redirect("/auth/login");

  const { data: accounts, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", user.id)
    .order("balance", { ascending: false });

  if (error) throw error;

  const summary = {
    totalAssets: 0,
    totalLiabilities: 0,
    netWorth: 0,
    byType: new Map<string, number>()
  };

  accounts?.forEach(account => {
    if (account.balance >= 0 && ["checking", "savings", "investment"].includes(account.account_type)) {
      summary.totalAssets += account.balance;
    } else if (account.balance < 0 || ["credit", "loan"].includes(account.account_type)) {
      summary.totalLiabilities += Math.abs(account.balance);
    }

    const currentTypeTotal = summary.byType.get(account.account_type) || 0;
    summary.byType.set(account.account_type, currentTypeTotal + account.balance);
  });

  summary.netWorth = summary.totalAssets - summary.totalLiabilities;

  return {
    summary: {
      ...summary,
      byType: Array.from(summary.byType.entries()).map(([type, balance]) => ({
        type,
        balance
      }))
    },
    accounts
  };
}