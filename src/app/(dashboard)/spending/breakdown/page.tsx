import { Suspense } from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getHierarchicalBudget, getSpendingSummary, getBudget } from "../../budgets/actions"
import { getDailySpending } from "../actions"
import { HomeSpendingHeatmap } from "../../home-spending-heatmap"
import { AssetsDebtCard } from "../components/assets-debt-card"
import { CategoriesSection } from "./categories-section"

const MONTH_NAMES = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
]

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-[280px] rounded-[14px] border border-gray-200 bg-card animate-pulse" />
        <div className="h-[280px] rounded-[14px] border border-gray-200 bg-card animate-pulse" />
      </div>
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-6 w-40 mb-4" />
          <Skeleton className="h-[400px]" />
        </CardContent>
      </Card>
    </div>
  )
}

async function BreakdownContent({ month, year }: { month: number; year: number }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`
  const endDate = month === 12
    ? `${year + 1}-01-01`
    : `${year}-${String(month + 1).padStart(2, "0")}-01`

  const [
    hierarchicalData,
    budget,
    dailySpending,
    accounts,
    netWorthSnapshots,
    recentTxns,
  ] = await Promise.all([
    getHierarchicalBudget(month, year),
    getBudget(month, year),
    getDailySpending(startDate, endDate),
    supabase
      .from("accounts")
      .select("balance, account_type")
      .eq("user_id", user.id),
    supabase
      .from("net_worth_snapshots")
      .select("date, net_worth, total_assets, total_liabilities")
      .eq("user_id", user.id)
      .order("date", { ascending: true }),
    supabase
      .from("transactions")
      .select("id, merchant_name, description, date, amount, accounts!account_id!inner ( user_id )")
      .eq("accounts.user_id", user.id)
      .eq("ignored", false)
      .gte("date", startDate)
      .lt("date", endDate)
      .lt("amount", 0)
      .or("type.eq.expense,type.is.null")
      .order("date", { ascending: false })
      .limit(4),
  ])

  const expenseCategories = hierarchicalData.filter(c => c.type === "expense" && !c.excluded_from_budget)
  const incomeCategories = hierarchicalData.filter(c => c.type === "income" && !c.excluded_from_budget)

  const spent = expenseCategories.reduce((sum, c) => sum + c.spent_amount, 0)
  const monthLabel = MONTH_NAMES[month - 1]

  const recentTransactions = (recentTxns.data ?? []).map((tx: any) => ({
    id: tx.id,
    merchant_name: tx.merchant_name,
    description: tx.description,
    date: tx.date,
    amount: tx.amount,
  }))

  const assetTypes = ["checking", "savings", "investment"]
  const liabilityTypes = ["credit", "loan"]

  const totalAssets = (accounts.data ?? [])
    .filter(a => assetTypes.includes(a.account_type))
    .reduce((sum, a) => sum + (a.balance || 0), 0)

  const totalDebt = (accounts.data ?? [])
    .filter(a => liabilityTypes.includes(a.account_type))
    .reduce((sum, a) => sum + Math.abs(a.balance || 0), 0)

  const snapshots = netWorthSnapshots.data ?? []

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <HomeSpendingHeatmap
          monthLabel={monthLabel}
          totalSpent={spent}
          dailySpending={dailySpending}
          recentTransactions={recentTransactions}
        />
        <AssetsDebtCard
          totalAssets={totalAssets}
          totalDebt={totalDebt}
          snapshots={snapshots.map(s => ({
            date: s.date,
            net_worth: s.net_worth,
            total_assets: s.total_assets ?? 0,
            total_liabilities: s.total_liabilities ?? 0,
          }))}
        />
      </div>

      <CategoriesSection
        expenseCategories={expenseCategories}
        incomeCategories={incomeCategories}
        month={month}
        year={year}
      />
    </div>
  )
}

export default async function BreakdownPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>
}) {
  const params = await searchParams
  const now = new Date()
  const month = params.month ? parseInt(params.month) : now.getMonth() + 1
  const year = params.year ? parseInt(params.year) : now.getFullYear()

  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <BreakdownContent month={month} year={year} />
    </Suspense>
  )
}