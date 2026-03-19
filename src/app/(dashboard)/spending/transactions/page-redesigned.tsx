import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { TransactionList } from "@/app/(dashboard)/transactions/transaction-list"
import { Sensitive } from "@/components/sensitive"
import { ContextualValue } from "@/components/contextual-value"
import { Receipt, TrendingUp, TrendingDown, Calendar } from "lucide-react"

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

  const { data, error } = await supabase.rpc("get_transaction_stats", {
    p_user_id: user.id,
    p_start_date: defaultStartDate,
  })

  if (error && error.message?.includes("does not exist")) {
    const { data: transactions } = await supabase
      .from("transactions")
      .select("id, date, amount, accounts!inner(user_id)")
      .eq("accounts.user_id", user.id)
      .gte("date", defaultStartDate)
      .order("date", { ascending: true })
    
    if (!transactions || transactions.length === 0) {
      return { totalCount: 0, startDate: null, endDate: null, totalExpenses: 0, totalIncome: 0 }
    }
    
    const totalExpenses = transactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)
    
    const totalIncome = transactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0)
    
    return {
      totalCount: transactions.length,
      startDate: transactions[0].date,
      endDate: transactions[transactions.length - 1].date,
      totalExpenses,
      totalIncome,
    }
  }

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
      <div className="transaction-stats-bar">
        <div className="transaction-stats-bar__item">
          <div className="flex items-center gap-2 mb-1">
            <Receipt className="w-4 h-4 text-muted-foreground" />
            <span className="text-label text-muted-foreground">Total Transactions</span>
          </div>
          <span className="text-heading font-bold">{stats.totalCount.toLocaleString()}</span>
        </div>

        <div className="transaction-stats-bar__item">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-label text-muted-foreground">Date Range</span>
          </div>
          <span className="text-body font-medium">
            {stats.startDate && stats.endDate
              ? `${formatDate(stats.startDate)} – ${formatDate(stats.endDate)}`
              : "—"}
          </span>
        </div>

        <div className="transaction-stats-bar__item ml-auto">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-expense" />
            <span className="text-label text-muted-foreground">Total Expenses</span>
          </div>
          <span className="text-heading font-bold text-expense">
            <Sensitive>−{formatCurrency(stats.totalExpenses)}</Sensitive>
          </span>
        </div>

        <div className="transaction-stats-bar__item">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-income" />
            <span className="text-label text-muted-foreground">Total Income</span>
          </div>
          <span className="text-heading font-bold text-income">
            <Sensitive>{stats.totalIncome > 0 ? "+" : ""}{formatCurrency(stats.totalIncome)}</Sensitive>
          </span>
        </div>
      </div>

      <TransactionList />
    </div>
  )
}