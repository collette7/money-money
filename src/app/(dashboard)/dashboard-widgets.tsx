"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronRight, CheckCircle2, CalendarClock } from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { TransactionDetailSheet } from "@/components/transaction-detail-sheet"

// ── Formatters ────────────────────────────────────────────────

const currency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value)

const compactCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

const shortDate = (dateStr: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
    new Date(dateStr)
  )

function relativeDate(dateStr: string): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(dateStr + "T00:00:00")
  const diff = Math.round(
    (today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
  )
  if (diff === 0) return "TODAY"
  if (diff === 1) return "YESTERDAY"
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
  })
    .format(d)
    .toUpperCase()
}

// ── Types ─────────────────────────────────────────────────────

type UncategorizedTransaction = {
  id: string
  description: string | null
  merchant_name: string | null
  amount: number
  date: string
}

type RecentTransaction = {
  id: string
  description: string
  merchant_name: string | null
  amount: number
  date: string
  tags?: string[] | null
  categories: { id: string; name: string; icon: string | null; color: string | null } | null
}

type CategorySpending = {
  name: string
  color: string | null
  icon: string | null
  total: number
}

type CategoryInfo = { id: string; name: string; icon: string | null; color: string | null; type: string | null }

type BudgetItem = {
  id: string
  category_id: string
  limit_amount: number
  spent_amount: number
  categories: CategoryInfo | CategoryInfo[] | null
}

type SubscriptionItem = {
  id: string
  name: string
  amount: number
  frequency: "monthly" | "yearly" | "weekly"
  next_charge_date: string | null
}

// ── Card Header Link ──────────────────────────────────────────

function CardHeaderLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
    >
      {label}
      <ChevronRight className="size-3" />
    </Link>
  )
}

// ── Monthly Spending Card ─────────────────────────────────────

type MonthlySpendingProps = {
  spent: number
  budgetTotal: number
  dailySpending: { date: string; amount: number }[]
  recentTransactions: RecentTransaction[]
  month: number
  year: number
  categories: { id: string; name: string; icon: string | null; color: string | null; type: string }[]
}

const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"]

type CalendarCell = {
  day: number
  date: string
  amount: number
  isToday: boolean
  isFuture: boolean
} | null

function buildCalendarGrid(
  year: number,
  month: number,
  dailySpending: { date: string; amount: number }[]
): CalendarCell[] {
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  const daysInMonth = lastDay.getDate()
  const startWeekday = firstDay.getDay()

  const spendingMap = new Map(dailySpending.map((d) => [d.date, d.amount]))
  const today = new Date().toISOString().split("T")[0]

  const cells: CalendarCell[] = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`
    cells.push({
      day: d,
      date: dateStr,
      amount: spendingMap.get(dateStr) ?? 0,
      isToday: dateStr === today,
      isFuture: dateStr > today,
    })
  }
  return cells
}

function getHeatmapClass(amount: number, maxAmount: number, isFuture: boolean): string {
  if (isFuture || amount === 0) return "bg-muted/30"
  const ratio = maxAmount > 0 ? amount / maxAmount : 0
  if (ratio < 0.2) return "bg-blue-100 dark:bg-blue-950/60"
  if (ratio < 0.4) return "bg-blue-200 dark:bg-blue-900/60"
  if (ratio < 0.6) return "bg-blue-300 dark:bg-blue-800/70"
  if (ratio < 0.8) return "bg-blue-400 dark:bg-blue-700/70"
  return "bg-blue-500 dark:bg-blue-600"
}

export function MonthlySpendingCard({
  spent,
  budgetTotal,
  dailySpending,
  recentTransactions,
  month,
  year,
  categories,
}: MonthlySpendingProps) {
  const [selectedTx, setSelectedTx] = useState<RecentTransaction | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const cells = buildCalendarGrid(year, month, dailySpending)
  const maxDayAmount = Math.max(...dailySpending.map((d) => d.amount), 1)

  return (
    <Card className="py-5">
      <CardContent className="pb-0">
        <div className="grid gap-6 lg:grid-cols-[55%_45%]">
          {/* Left: heatmap */}
          <div>
            <Link
              href={`/transactions?startDate=${year}-${String(month).padStart(2, "0")}-01&endDate=${year}-${String(month).padStart(2, "0")}-${String(new Date(year, month, 0).getDate()).padStart(2, "0")}`}
              className="inline-flex items-center gap-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
            >
              Spent in {MONTH_NAMES[month]}
              <ChevronRight className="size-3" />
            </Link>

            <p className="text-3xl font-bold tabular-nums tracking-tight mt-1">
              {compactCurrency(spent)}
            </p>

            {budgetTotal > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                of {compactCurrency(budgetTotal)} budgeted
              </p>
            )}

            <div className="mt-4">
              <div className="grid grid-cols-7 gap-1 mb-1">
                {DAY_LABELS.map((label, i) => (
                  <div
                    key={i}
                    className="text-center text-[10px] font-medium text-muted-foreground/60"
                  >
                    {label}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {cells.map((cell, i) =>
                  cell === null ? (
                    <div key={`empty-${i}`} />
                  ) : (
                    <Link
                      key={cell.date}
                      href={`/transactions?date=${cell.date}`}
                      className={cn(
                        "relative rounded-md aspect-square flex flex-col justify-between p-0.5 overflow-hidden transition-shadow hover:ring-2 hover:ring-primary/40",
                        getHeatmapClass(cell.amount, maxDayAmount, cell.isFuture),
                        cell.isToday && "ring-1 ring-foreground/30",
                        cell.isFuture && "opacity-40 pointer-events-none"
                      )}
                    >
                      <span className="text-[10px] leading-none font-medium text-foreground/70">
                        {cell.day}
                      </span>
                      {cell.amount > 0 && !cell.isFuture && (
                        <span className="text-[8px] leading-none tabular-nums text-foreground/60 truncate">
                          ${Math.round(cell.amount)}
                        </span>
                      )}
                    </Link>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Right: recent transactions */}
          <div>
            <Link
              href={(() => {
                const end = new Date()
                const start = new Date()
                start.setDate(start.getDate() - 7)
                return `/transactions?startDate=${start.toISOString().split("T")[0]}&endDate=${end.toISOString().split("T")[0]}`
              })()}
              className="inline-flex items-center gap-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors mb-3"
            >
              Recent Transactions
              <ChevronRight className="size-3" />
            </Link>
            {recentTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No recent transactions.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {recentTransactions.map((tx) => {
                  const isUncategorized = !tx.categories
                  const catColor = tx.categories?.color ?? "oklch(0.7 0 0)"
                  const catIcon = tx.categories?.icon

                  return (
                    <button
                      key={tx.id}
                      onClick={() => { setSelectedTx(tx); setSheetOpen(true) }}
                      className="flex items-center gap-3 py-2.5 first:pt-0 -mx-2 px-2 rounded-md hover:bg-muted/50 transition-colors w-full text-left"
                    >
                      <span
                        className="size-7 rounded-full flex items-center justify-center text-xs shrink-0"
                        style={{ backgroundColor: catColor + "22", color: catColor }}
                      >
                        {catIcon ?? "?"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium truncate">
                            {tx.merchant_name ?? tx.description ?? "Transaction"}
                          </p>
                          {isUncategorized && (
                            <span className="size-1.5 rounded-full bg-blue-500 shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {shortDate(tx.date)}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "text-sm font-semibold tabular-nums shrink-0",
                          tx.amount >= 0 ? "text-emerald-600" : "text-foreground"
                        )}
                      >
                        {tx.amount >= 0 ? "+" : ""}
                        {currency(tx.amount)}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </CardContent>

      <TransactionDetailSheet
        transaction={selectedTx ? {
          id: selectedTx.id,
          description: selectedTx.description,
          merchant_name: selectedTx.merchant_name,
          amount: selectedTx.amount,
          date: selectedTx.date,
          tags: selectedTx.tags,
          categories: selectedTx.categories,
        } : null}
        categories={categories}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </Card>
  )
}

// ── Transactions To Review ────────────────────────────────────

type TransactionsToReviewProps = {
  transactions: UncategorizedTransaction[]
}

export function TransactionsToReview({ transactions }: TransactionsToReviewProps) {
  const [selectedTx, setSelectedTx] = useState<UncategorizedTransaction | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const grouped = new Map<string, UncategorizedTransaction[]>()
  for (const tx of transactions) {
    const existing = grouped.get(tx.date) ?? []
    existing.push(tx)
    grouped.set(tx.date, existing)
  }

  return (
    <Card className="py-5">
      <CardHeader className="flex flex-row items-start justify-between pb-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Transactions To Review
        </CardTitle>
        <CardHeaderLink
          href="/transactions?view=review"
          label="View All"
        />
      </CardHeader>
      <CardContent className="pt-3">
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="size-8 text-emerald-500 mb-2" />
            <p className="text-sm font-medium text-foreground">All caught up!</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              No uncategorized transactions.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {Array.from(grouped.entries()).map(([date, txs]) => (
              <div key={date}>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 mt-1">
                  {relativeDate(date)}
                </p>
                <div className="space-y-1">
                  {txs.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between gap-3 py-1.5 cursor-pointer hover:bg-muted/50 transition-colors rounded-md px-2 -mx-2"
                      onClick={() => {
                        setSelectedTx(tx)
                        setSheetOpen(true)
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {tx.merchant_name ?? tx.description ?? "Transaction"}
                        </p>
                        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground mt-0.5">
                          Uncategorized
                        </span>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 text-sm font-semibold tabular-nums",
                          tx.amount >= 0 ? "text-emerald-600" : "text-foreground"
                        )}
                      >
                        {tx.amount >= 0 ? "+" : ""}
                        {currency(tx.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <TransactionDetailSheet
        transaction={selectedTx ? {
          id: selectedTx.id,
          description: selectedTx.description || "",
          merchant_name: selectedTx.merchant_name,
          amount: selectedTx.amount,
          date: selectedTx.date,
          categories: null,
        } : null}
        categories={[]}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </Card>
  )
}

// ── Top Categories Card ───────────────────────────────────────

type TopCategoriesProps = {
  categories: CategorySpending[]
  budgetItems: BudgetItem[]
}

export function TopCategoriesCard({ categories, budgetItems }: TopCategoriesProps) {
  const top5 = categories.slice(0, 5)

  return (
    <Card className="py-5">
      <CardHeader className="flex flex-row items-start justify-between pb-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Top Categories
        </CardTitle>
        <CardHeaderLink href="/spending/breakdown" label="View All" />
      </CardHeader>
      <CardContent className="pt-3">
        {top5.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No spending this month.
          </p>
        ) : (
          <div className="space-y-3">
            {top5.map((cat) => {
              const budgetItem = budgetItems.find((b) => {
                const raw = b.categories
                const budgetCat = Array.isArray(raw) ? raw[0] ?? null : raw
                return budgetCat?.name === cat.name
              })
              const budgetAmt = budgetItem?.limit_amount ?? 0
              const pct = budgetAmt > 0 ? Math.min((cat.total / budgetAmt) * 100, 100) : 0

              return (
                <div key={cat.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      {cat.icon && <span className="text-xs">{cat.icon}</span>}
                      <span className="font-medium truncate">{cat.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums shrink-0 ml-2">
                      {compactCurrency(cat.total)}
                      {budgetAmt > 0 && (
                        <span className="text-muted-foreground/60">
                          {" "}
                          / {compactCurrency(budgetAmt)}
                        </span>
                      )}
                    </span>
                  </div>
                  {budgetAmt > 0 && (
                    <div className="h-1 rounded-full bg-primary/10 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor:
                            pct > 90
                              ? "oklch(0.65 0.22 15)"
                              : pct > 75
                                ? "oklch(0.75 0.17 70)"
                                : cat.color ?? "oklch(0.55 0.15 250)",
                        }}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Upcoming Subscriptions Card ───────────────────────────────

type UpcomingProps = {
  subscriptions: SubscriptionItem[]
}

const freqLabel: Record<string, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
}

export function UpcomingCard({ subscriptions }: UpcomingProps) {
  const upcoming = subscriptions
    .filter((s) => s.next_charge_date)
    .sort((a, b) => (a.next_charge_date ?? "").localeCompare(b.next_charge_date ?? ""))
    .slice(0, 5)

  return (
    <Card className="py-5">
      <CardHeader className="flex flex-row items-start justify-between pb-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Upcoming
        </CardTitle>
        <CardHeaderLink href="/spending/recurring" label="View All" />
      </CardHeader>
      <CardContent className="pt-3">
        {upcoming.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <CalendarClock className="size-7 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">
              No upcoming charges.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {upcoming.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{sub.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                      {freqLabel[sub.frequency] ?? sub.frequency}
                    </span>
                    {sub.next_charge_date && (
                      <span className="text-[10px] text-muted-foreground">
                        {shortDate(sub.next_charge_date)}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-sm font-semibold tabular-nums shrink-0">
                  {currency(sub.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
