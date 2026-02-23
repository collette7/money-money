import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { TransactionList } from "@/app/(dashboard)/transactions/transaction-list"
import { Card } from "@/components/ui/card"
import {
  TrendingDown,
  TrendingUp,
  CalendarRange,
  Hash,
} from "lucide-react"

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

      <Card className="p-0 overflow-hidden">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-border/50">
          <div className="p-3 sm:p-4 flex items-center gap-2.5 group hover:bg-muted/30 transition-colors">
            <div className="size-7 rounded-md bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center shrink-0">
              <Hash className="size-3.5 text-slate-600 dark:text-slate-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                Total
              </p>
              <p className="text-[13px] font-semibold tracking-tight mt-0.5">
                {stats.totalCount.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="p-3 sm:p-4 flex items-center gap-2.5 group hover:bg-muted/30 transition-colors">
            <div className="size-7 rounded-md bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center shrink-0">
              <CalendarRange className="size-3.5 text-slate-600 dark:text-slate-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                Date Range
              </p>
              <p className="text-[13px] font-medium mt-0.5 truncate">
                {stats.startDate && stats.endDate ? (
                  <>
                    {formatDate(stats.startDate)} — {formatDate(stats.endDate)}
                  </>
                ) : (
                  "—"
                )}
              </p>
            </div>
          </div>

          <div className="p-3 sm:p-4 flex items-center gap-2.5 group hover:bg-rose-50/50 dark:hover:bg-rose-950/20 transition-colors">
            <div className="size-7 rounded-md bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center shrink-0">
              <TrendingDown className="size-3.5 text-rose-600 dark:text-rose-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                Expenses
              </p>
              <p className="text-[13px] font-semibold tracking-tight mt-0.5 text-rose-600 dark:text-rose-400">
                −{formatCurrency(stats.totalExpenses)}
              </p>
            </div>
          </div>

          <div className="p-3 sm:p-4 flex items-center gap-2.5 group hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-colors">
            <div className="size-7 rounded-md bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
              <TrendingUp className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                Income
              </p>
              <p className="text-[13px] font-semibold tracking-tight mt-0.5 text-emerald-600 dark:text-emerald-400">
                +{formatCurrency(stats.totalIncome)}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Transaction List */}
      <TransactionList />
    </div>
  )
}