"use server";

import { createClient } from "@/lib/supabase/server";
import { ForecastEngine, ForecastScenario, ForecastHorizon } from "@/lib/forecast/engine";
import { TimeSeriesForecastEngine } from "@/lib/forecast/timeseries-engine";
import { subMonths } from "date-fns";

export async function getForecast(
  scenario: ForecastScenario = "realistic",
  horizon: ForecastHorizon = 3
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error("User not authenticated");
    }

  const now = new Date();
  const sixMonthsAgo = subMonths(now, 6);

  const { data: rawTransactions } = await supabase
    .from("transactions")
    .select(`
      date,
      amount,
      category_id,
      is_recurring,
      to_account_id,
      categories ( type ),
      accounts!account_id!inner ( user_id, account_type )
    `)
    .eq("accounts.user_id", user.id)
    .is("to_account_id", null)
    .gte("date", sixMonthsAgo.toISOString().split('T')[0])
    .order("date", { ascending: true });

  const transactions = (rawTransactions || [])
    .filter(tx => {
      const catType = Array.isArray(tx.categories)
        ? tx.categories[0]?.type
        : (tx.categories as any)?.type;
      if (catType === "transfer") return false;

      const acctType = Array.isArray(tx.accounts)
        ? tx.accounts[0]?.account_type
        : (tx.accounts as any)?.account_type;

      if (acctType === "credit" && tx.amount > 0) return false;

      const isUncategorized = !catType;
      const isCheckingSavings = acctType === "checking" || acctType === "savings";
      if (isUncategorized && isCheckingSavings && tx.amount < 0) return false;

      return true;
    })
    .map(tx => {
      const catType = Array.isArray(tx.categories)
        ? tx.categories[0]?.type
        : (tx.categories as any)?.type;
      return {
        date: tx.date,
        amount: tx.amount,
        category_id: tx.category_id,
        is_recurring: tx.is_recurring,
        is_income: catType === "income",
      };
    });

  const { data: recurringData } = await supabase
    .from("transactions")
    .select(`
      description,
      merchant_name,
      amount,
      date,
      accounts!account_id!inner ( user_id )
    `)
    .eq("accounts.user_id", user.id)
    .eq("is_recurring", true)
    .is("to_account_id", null)
    .gte("date", sixMonthsAgo.toISOString().split('T')[0]);

  const recurringTransactions = processRecurringTransactions(recurringData || []);

  const { data: accounts } = await supabase
    .from("accounts")
    .select("balance, account_type")
    .eq("user_id", user.id);

  const assetTypes = ["checking", "savings", "investment"];
  const liabilityTypes = ["credit", "loan"];

  const currentAssets = (accounts || [])
    .filter(a => assetTypes.includes(a.account_type))
    .reduce((sum, a) => sum + (a.balance || 0), 0);

  const currentLiabilities = (accounts || [])
    .filter(a => liabilityTypes.includes(a.account_type))
    .reduce((sum, a) => sum + Math.abs(a.balance || 0), 0);

    const currentNetWorth = currentAssets - currentLiabilities;

    if (!transactions || transactions.length === 0) {
      const points = [];
      const startDate = new Date();

      points.push({
        date: startDate.toISOString().split('T')[0],
        netWorth: currentNetWorth,
        assets: currentAssets,
        liabilities: currentLiabilities,
        confidence: 1,
        confidenceUpper: currentNetWorth,
        confidenceLower: currentNetWorth,
      });
      
      for (let i = 1; i <= horizon; i++) {
        const forecastDate = new Date(startDate);
        forecastDate.setMonth(forecastDate.getMonth() + i);
        
        points.push({
          date: forecastDate.toISOString().split('T')[0],
          netWorth: currentNetWorth,
          assets: currentAssets,
          liabilities: currentLiabilities,
          confidence: 0.5,
          confidenceUpper: currentNetWorth,
          confidenceLower: currentNetWorth,
        });
      }
      
      return {
        scenario,
        horizon,
        points,
        assumptions: {
          avgMonthlyIncome: 0,
          avgMonthlyExpenses: 0,
          recurringIncome: 0,
          recurringExpenses: 0,
          growthRate: 0
        }
      };
    }

    const engine = new ForecastEngine(
      transactions,
      recurringTransactions,
      currentNetWorth,
      currentAssets,
      currentLiabilities
    );

    return engine.calculateForecast(scenario, horizon);
  } catch (error) {
    console.error("Error in getForecast:", error);
    throw error;
  }
}

function processRecurringTransactions(transactions: any[]): any[] {
  const grouped = new Map<string, any[]>();
  
  transactions.forEach(tx => {
    const key = tx.merchant_name || tx.description;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(tx);
  });

  const recurring: any[] = [];
  
  grouped.forEach((txs, name) => {
    if (txs.length >= 2) {
      const avgAmount = txs.reduce((sum, tx) => sum + tx.amount, 0) / txs.length;
      const frequency = detectFrequency(txs.map(tx => new Date(tx.date)));
      
      recurring.push({
        name,
        amount: avgAmount,
        frequency,
        next_date: predictNextDate(txs[txs.length - 1].date, frequency),
      });
    }
  });

  return recurring;
}

function detectFrequency(dates: Date[]): string {
  if (dates.length < 2) return "monthly";
  
  dates.sort((a, b) => a.getTime() - b.getTime());
  const intervals = [];
  
  for (let i = 1; i < dates.length; i++) {
    const daysDiff = Math.round(
      (dates[i].getTime() - dates[i - 1].getTime()) / (1000 * 60 * 60 * 24)
    );
    intervals.push(daysDiff);
  }
  
  const avgInterval = intervals.reduce((sum, int) => sum + int, 0) / intervals.length;
  
  if (avgInterval <= 1.5) return "daily";
  if (avgInterval <= 8) return "weekly";
  if (avgInterval <= 35) return "monthly";
  return "yearly";
}

function predictNextDate(lastDate: string, frequency: string): string {
  const date = new Date(lastDate);
  
  switch (frequency) {
    case "daily":
      date.setDate(date.getDate() + 1);
      break;
    case "weekly":
      date.setDate(date.getDate() + 7);
      break;
    case "monthly":
      date.setMonth(date.getMonth() + 1);
      break;
    case "yearly":
      date.setFullYear(date.getFullYear() + 1);
      break;
  }
  
  return date.toISOString().split('T')[0];
}

export async function getTimeSeriesForecast(horizon: ForecastHorizon = 6) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error("User not authenticated");
    }

    const { data: snapshots } = await supabase
      .from("net_worth_snapshots")
      .select("date, net_worth, total_assets, total_liabilities")
      .eq("user_id", user.id)
      .order("date", { ascending: true });

    if (!snapshots || snapshots.length < 3) {
      const { data: accounts } = await supabase
        .from("accounts")
        .select("balance, account_type")
        .eq("user_id", user.id);

      const assetTypes = ["checking", "savings", "investment"];
      const liabilityTypes = ["credit", "loan"];

      const currentAssets = (accounts || [])
        .filter(a => assetTypes.includes(a.account_type))
        .reduce((sum, a) => sum + (a.balance || 0), 0);

      const currentLiabilities = (accounts || [])
        .filter(a => liabilityTypes.includes(a.account_type))
        .reduce((sum, a) => sum + Math.abs(a.balance || 0), 0);

      const currentNetWorth = currentAssets - currentLiabilities;

      const syntheticSnapshots = [{
        date: new Date().toISOString().split('T')[0],
        net_worth: currentNetWorth,
        total_assets: currentAssets,
        total_liabilities: currentLiabilities
      }];

      const engine = new TimeSeriesForecastEngine(syntheticSnapshots);
      return engine.calculateForecast(horizon);
    }

    const engine = new TimeSeriesForecastEngine(snapshots);
    return engine.calculateForecast(horizon);
  } catch (error) {
    console.error("Error in getTimeSeriesForecast:", error);
    throw error;
  }
}