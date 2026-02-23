"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { ChevronRight } from "lucide-react"

type Props = {
  monthLabel: string
  totalSpent: number
  dailySpending: { date: string; total: number }[]
  recentTransactions: {
    id: string
    merchant_name: string | null
    description: string
    date: string
    amount: number
  }[]
}

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"]

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

const formatDate = (dateStr: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
    new Date(dateStr + "T12:00:00")
  )

const INTENSITY_COLORS = [
  "bg-muted/20 dark:bg-muted/10",
  "bg-emerald-200 dark:bg-emerald-900/60",
  "bg-emerald-400 dark:bg-emerald-700/70",
  "bg-emerald-500 dark:bg-emerald-600",
  "bg-emerald-700 dark:bg-emerald-500",
] as const

function getIntensityIndex(total: number, maxSpend: number): number {
  if (total === 0) return 0
  const ratio = total / maxSpend
  if (ratio < 0.2) return 1
  if (ratio < 0.45) return 2
  if (ratio < 0.7) return 3
  return 4
}

const AVATAR_COLORS = [
  "bg-rose-500", "bg-orange-500", "bg-amber-500", "bg-emerald-500",
  "bg-teal-500", "bg-cyan-500", "bg-sky-500", "bg-blue-500",
  "bg-indigo-500", "bg-violet-500", "bg-purple-500", "bg-fuchsia-500",
  "bg-pink-500",
]

function avatarColorFor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

type CellData = { day: number | null; total: number; dateStr: string | null }

function buildCalendar(monthLabel: string, dailySpending: Props["dailySpending"]) {
  const year = new Date().getFullYear()
  const monthDate = new Date(`${monthLabel} 1, ${year}`)
  const month = monthDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const lookup = new Map(dailySpending.map((d) => [d.date, d.total]))

  const cells: CellData[] = []
  for (let i = 0; i < firstDay; i++) cells.push({ day: null, total: 0, dateStr: null })
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
    cells.push({ day: d, total: lookup.get(dateStr) ?? 0, dateStr })
  }
  while (cells.length % 7 !== 0) cells.push({ day: null, total: 0, dateStr: null })

  const weeks: CellData[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

export function HomeSpendingHeatmap({
  monthLabel,
  totalSpent,
  dailySpending,
  recentTransactions,
}: Props) {
  const [hoveredCell, setHoveredCell] = useState<CellData | null>(null)

  const weeks = buildCalendar(monthLabel, dailySpending)
  const maxSpend = Math.max(...dailySpending.map((d) => d.total), 1)

  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`

  const clearHover = useCallback(() => setHoveredCell(null), [])

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <Link
          href="/spending/breakdown"
          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
        >
          Spent in {monthLabel} &rsaquo;
        </Link>
        <span className="text-lg font-bold tabular-nums">
          {formatCurrency(totalSpent)}
        </span>
      </div>

      <div className="flex gap-6 min-h-[200px]">
        <div className="w-[55%] shrink-0" onMouseLeave={clearHover}>
          <div className="grid grid-cols-7 gap-[3px] mb-1.5">
            {DAY_LABELS.map((label, i) => (
              <div key={i} className="text-[10px] text-muted-foreground text-center font-medium select-none">
                {label}
              </div>
            ))}
          </div>

          <div className="grid gap-[3px]">
            {weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 gap-[3px]">
                {week.map((cell, ci) => {
                  if (cell.day === null) return <div key={ci} />
                  const idx = getIntensityIndex(cell.total, maxSpend)
                  const isToday = cell.dateStr === todayStr
                  return (
                    <div
                      key={ci}
                      onMouseEnter={() => setHoveredCell(cell)}
                      className={cn(
                        "aspect-square rounded-[4px] flex items-center justify-center text-[10px] tabular-nums cursor-default relative transition-all",
                        INTENSITY_COLORS[idx],
                        idx >= 3 ? "text-white" : "text-foreground/70",
                        isToday && "ring-2 ring-foreground/40 ring-offset-1 ring-offset-background",
                        hoveredCell?.day === cell.day && "scale-110 shadow-md z-10"
                      )}
                    >
                      {cell.day}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          {hoveredCell && hoveredCell.total > 0 ? (
            <div className="mt-2 text-xs text-muted-foreground tabular-nums">
              {formatDate(hoveredCell.dateStr!)}: <span className="font-semibold text-foreground">{formatCurrency(hoveredCell.total)}</span>
            </div>
          ) : (
            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span>Less</span>
              {INTENSITY_COLORS.map((color, i) => (
                <div key={i} className={cn("size-2.5 rounded-[2px]", color)} />
              ))}
              <span>More</span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] tracking-wider text-muted-foreground uppercase font-medium">
              Recent Transactions
            </span>
            <Link
              href="/spending/transactions"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight className="size-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {recentTransactions.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">No transactions yet</p>
            )}
            {recentTransactions.slice(0, 4).map((tx) => {
              const name = tx.merchant_name || tx.description
              const initial = name.charAt(0).toUpperCase()
              return (
                <div key={tx.id} className="flex items-center gap-2.5">
                  <div
                    className={cn(
                      "size-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0",
                      avatarColorFor(name)
                    )}
                  >
                    {initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{name}</p>
                    <p className="text-[11px] text-muted-foreground">{formatDate(tx.date)}</p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums shrink-0 text-rose-500">
                    -{formatCurrency(Math.abs(tx.amount))}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </Card>
  )
}
