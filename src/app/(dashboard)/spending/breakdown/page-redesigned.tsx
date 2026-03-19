import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Suspense } from "react"
import { SpendingSummaryHero } from "./spending-summary-hero"
import { QuickStatsGrid } from "./quick-stats-grid"
import { SpendingInsights } from "./spending-insights"
import { getMonthlySpending, getBudgetStatus, getSpendingTrends } from "../actions-redesign"

export default async function SpendingBreakdownPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const currentDate = new Date()
  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
  
  const [monthlySpending, budgetStatus, spendingTrends] = await Promise.all([
    getMonthlySpending(user.id, startOfMonth, endOfMonth),
    getBudgetStatus(user.id, currentDate),
    getSpendingTrends(user.id, 6),
  ])

  const daysInMonth = endOfMonth.getDate()
  const currentDay = currentDate.getDate()
  const daysLeft = daysInMonth - currentDay
  const dailyAverage = monthlySpending.totalExpenses / currentDay
  const projectedTotal = dailyAverage * daysInMonth

  const budgetComparison = budgetStatus.totalBudget 
    ? {
        amount: budgetStatus.totalBudget,
        spent: monthlySpending.totalExpenses,
        remaining: budgetStatus.totalBudget - monthlySpending.totalExpenses,
        percentUsed: (monthlySpending.totalExpenses / budgetStatus.totalBudget) * 100,
        status: (monthlySpending.totalExpenses > budgetStatus.totalBudget * 0.9 
          ? 'over' 
          : monthlySpending.totalExpenses > budgetStatus.totalBudget * 0.75 
            ? 'warning' 
            : 'safe') as 'safe' | 'warning' | 'over'
      }
    : null

  return (
    <div className="spending-breakdown">
      <Suspense fallback={<HeroSkeleton />}>
        <SpendingSummaryHero
          totalSpent={monthlySpending.totalExpenses}
          budgetComparison={budgetComparison}
          daysLeft={daysLeft}
          projectedTotal={projectedTotal}
          monthName={currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        />
      </Suspense>

      <Suspense fallback={<StatsSkeleton />}>
        <QuickStatsGrid
          dailyAverage={dailyAverage}
          totalIncome={monthlySpending.totalIncome}
          netCashFlow={monthlySpending.totalIncome - monthlySpending.totalExpenses}
          transactionCount={monthlySpending.transactionCount}
          lastMonthComparison={spendingTrends[1]?.totalExpenses || 0}
          currentMonthExpenses={monthlySpending.totalExpenses}
        />
      </Suspense>

      <Suspense fallback={<InsightsSkeleton />}>
        <SpendingInsights
          categoryBreakdown={monthlySpending.categoryBreakdown}
          budgetsByCategory={budgetStatus.budgetsByCategory}
          recurringBills={budgetStatus.recurringBills}
          spendingTrends={spendingTrends}
        />
      </Suspense>
    </div>
  )
}

function HeroSkeleton() {
  return (
    <div className="spending-summary__hero">
      <div className="h-16 w-48 bg-muted animate-pulse rounded mx-auto mb-2" />
      <div className="h-8 w-32 bg-muted animate-pulse rounded mx-auto" />
    </div>
  )
}

function StatsSkeleton() {
  return (
    <div className="spending-stats grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
      ))}
    </div>
  )
}

function InsightsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-64 bg-muted animate-pulse rounded-lg" />
      <div className="h-48 bg-muted animate-pulse rounded-lg" />
    </div>
  )
}