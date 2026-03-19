"use server"

import { createClient } from "@/lib/supabase/server"

export async function getMonthlySpending(userId: string, startDate: Date, endDate: Date) {
  const supabase = await createClient()
  
  const { data: transactions } = await supabase
    .from("transactions")
    .select(`
      id,
      amount,
      date,
      categories (
        id,
        name,
        icon,
        color,
        type
      ),
      accounts!inner (
        user_id
      )
    `)
    .eq("accounts.user_id", userId)
    .gte("date", startDate.toISOString())
    .lte("date", endDate.toISOString())

  const totalExpenses = transactions
    ?.filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0

  const totalIncome = transactions
    ?.filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0) || 0

  const categoryMap = new Map<string, {
    id: string
    name: string
    amount: number
    icon: string | null
    color: string | null
  }>()

  transactions
    ?.filter(t => t.amount < 0 && t.categories)
    .forEach(t => {
      const category = t.categories as any
      const existing = categoryMap.get(category.id) || {
        id: category.id,
        name: category.name,
        amount: 0,
        icon: category.icon,
        color: category.color,
      }
      existing.amount += Math.abs(t.amount)
      categoryMap.set(category.id, existing)
    })

  const categoryBreakdown = Array.from(categoryMap.values())
    .sort((a, b) => b.amount - a.amount)

  return {
    totalExpenses,
    totalIncome,
    transactionCount: transactions?.length || 0,
    categoryBreakdown,
  }
}

export async function getBudgetStatus(userId: string, date: Date) {
  const supabase = await createClient()
  
  const { data: budgets } = await supabase
    .from("budgets")
    .select(`
      id,
      amount,
      period,
      category_id
    `)
    .eq("user_id", userId)
    .eq("enabled", true)

  const totalBudget = budgets?.reduce((sum, b) => sum + (b.amount || 0), 0) || 0
  
  const budgetsByCategory = budgets?.map(b => ({
    categoryId: b.category_id,
    amount: b.amount || 0,
  })) || []

  const { data: recurringRules } = await supabase
    .from("recurring_transaction_rules")
    .select(`
      id,
      merchant_name,
      expected_amount,
      frequency,
      next_expected
    `)
    .eq("user_id", userId)
    .eq("enabled", true)
    .gte("next_expected", date.toISOString())
    .order("next_expected")
    .limit(10)

  const recurringBills = recurringRules?.map(r => ({
    id: r.id,
    merchantName: r.merchant_name || "",
    expectedAmount: r.expected_amount || 0,
    nextDate: r.next_expected || "",
    frequency: r.frequency,
  })) || []

  return {
    totalBudget,
    budgetsByCategory,
    recurringBills,
  }
}

export async function getSpendingTrends(userId: string, months: number) {
  const supabase = await createClient()
  const trends = []
  
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date()
    date.setMonth(date.getMonth() - i)
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1)
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0)
    
    const { data: transactions } = await supabase
      .from("transactions")
      .select(`
        amount,
        accounts!inner (
          user_id
        )
      `)
      .eq("accounts.user_id", userId)
      .gte("date", startOfMonth.toISOString())
      .lte("date", endOfMonth.toISOString())

    const totalExpenses = transactions
      ?.filter(t => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0

    const totalIncome = transactions
      ?.filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0) || 0

    trends.push({
      month: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      totalExpenses,
      totalIncome,
    })
  }
  
  return trends
}