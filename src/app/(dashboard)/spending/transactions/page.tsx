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

  const { data: accounts } = await supabase.from("accounts").select("id").eq("user_id", user.id)
  const accountIds = (accounts ?? []).map((a) => a.id)

  if (accountIds.length === 0) {
    return {
      totalCount: 0,
      startDate: null,
      endDate: null,
      totalExpenses: 0,
      totalIncome: 0,
    }
  }

  const { count } = await supabase
    .from("transactions")
    .select("*", { count: "exact", head: true })
    .in("account_id", accountIds)

  const { data: earliestDate } = await supabase
    .from("transactions")
    .select("date")
    .in("account_id", accountIds)
    .order("date", { ascending: true })
    .limit(1)

  const { data: latestDate } = await supabase
    .from("transactions")
    .select("date")
    .in("account_id", accountIds)
    .order("date", { ascending: false })
    .limit(1)

  const { data: expenses } = await supabase
    .from("transactions")
    .select("amount")
    .in("account_id", accountIds)
    .lt("amount", 0)

  const { data: income } = await supabase
    .from("transactions")
    .select("amount")
    .in("account_id", accountIds)
    .gt("amount", 0)

  const totalExpenses = (expenses ?? []).reduce((sum, t) => sum + Math.abs(t.amount), 0)
  const totalIncome = (income ?? []).reduce((sum, t) => sum + t.amount, 0)

  return {
    totalCount: count ?? 0,
    startDate: earliestDate?.[0]?.date ?? null,
    endDate: latestDate?.[0]?.date ?? null,
    totalExpenses,
    totalIncome,
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