import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { TransactionList } from "@/app/(dashboard)/transactions/transaction-list"

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Math.abs(value))

const formatDate = (date: string | null) =>
  date
    ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(date))
    : "—"

async function getTransactionStats() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const oneYearAgo = new Date()
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
  const defaultStartDate = oneYearAgo.toISOString().split("T")[0]

  // Use SQL RPC for accurate aggregation (avoids Supabase 1000-row default limit)
  const { data, error } = await supabase.rpc("get_transaction_stats", {
    p_user_id: user.id,
    p_start_date: defaultStartDate,
  })

  if (error || !data || (Array.isArray(data) && data.length === 0)) {
    return { totalCount: 0, startDate: null, endDate: null, totalExpenses: 0, totalIncome: 0 }
  }

  const row = Array.isArray(data) ? data[0] : data
  return {
    totalCount: Number(row.total_count) || 0,
    startDate: row.earliest_date ?? null,
    endDate: row.latest_date ?? null,
    totalExpenses: Number(row.total_expenses) || 0,
    totalIncome: Number(row.total_income) || 0,
  }
}

export default async function TransactionsPage() {
  const stats = await getTransactionStats()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
          Transactions
        </h1>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-lg border px-4 py-2.5 text-[13px]">
        <span className="text-muted-foreground">Total transactions <span className="font-semibold text-foreground">{stats.totalCount.toLocaleString()}</span></span>
        <span className="text-muted-foreground">Date range{" "}
          <span className="font-semibold text-foreground">
            {stats.startDate && stats.endDate
              ? `${formatDate(stats.startDate)} – ${formatDate(stats.endDate)}`
              : "—"}
          </span>
        </span>
        <span className="ml-auto text-muted-foreground">Total expenses{" "}
          <span className="font-semibold text-rose-600 dark:text-rose-400">
            −{formatCurrency(stats.totalExpenses)}
          </span>
        </span>
        <span className="text-muted-foreground">Total income{" "}
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            {stats.totalIncome > 0 ? "+" : ""}{formatCurrency(stats.totalIncome)}
          </span>
        </span>
      </div>

      {/* Transaction List */}
      <TransactionList />
    </div>
  )
}