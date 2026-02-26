"use client"

import { useState } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { HomeNetWorthChart, PERIODS, type PeriodType } from "../../home-chart"

type Snapshot = {
  date: string
  net_worth: number
  total_assets: number | null
  total_liabilities: number | null
}

type NetWorthCardProps = {
  netWorth: number
  assets: number
  liabilities: number
  netWorthPctChange: number | null
  netWorthDollarChange: number | null
  snapshots: Snapshot[]
}

const compactCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

export function NetWorthCard({
  netWorth,
  assets,
  liabilities,
  netWorthPctChange,
  netWorthDollarChange,
  snapshots,
}: NetWorthCardProps) {
  const [period, setPeriod] = useState<PeriodType>("3M")

  const today = new Date().toISOString().split("T")[0]
  const hasToday = snapshots.some((s) => s.date === today)
  const chartSnapshots = hasToday
    ? snapshots
    : [...snapshots, { date: today, net_worth: netWorth, total_assets: assets, total_liabilities: liabilities }]

  return (
    <Card className="p-4 sm:p-5 min-w-0">
      <div className="flex items-start justify-between mb-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          NET WORTH
        </span>
        <Link
          href="/accounts"
          className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors rounded-full border px-3 py-1"
        >
          Accounts &rsaquo;
        </Link>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div className="flex items-baseline gap-3">
          <span className="font-bold tabular-nums tracking-tight" style={{ fontSize: 16 }}>
            {compactCurrency(netWorth)}
          </span>
          {netWorthDollarChange !== null && netWorthPctChange !== null && (
            <span
              className={cn(
                "font-medium tabular-nums",
                netWorthPctChange >= 0 ? "text-emerald-600" : "text-orange-500"
              )}
              style={{ fontSize: 13 }}
            >
              {netWorthDollarChange >= 0 ? "+" : ""}
              {compactCurrency(netWorthDollarChange)}{" "}
              ({netWorthPctChange >= 0 ? "+" : ""}
              {netWorthPctChange.toFixed(1)}%)
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={
                period === p
                  ? "rounded-full bg-foreground text-background px-2 py-0.5 text-[11px] font-medium"
                  : "rounded-full px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
              }
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      <HomeNetWorthChart
        snapshots={chartSnapshots}
        height={160}
        activePeriod={period}
        onPeriodChange={setPeriod}
        hideButtons
      />
      <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
        <div>
          <p className="uppercase tracking-wider text-muted-foreground" style={{ fontSize: 10 }}>Assets</p>
          <p className="font-semibold tabular-nums text-emerald-600 mt-0.5" style={{ fontSize: 13 }}>
            {compactCurrency(assets)}
          </p>
        </div>
        <div>
          <p className="uppercase tracking-wider text-muted-foreground" style={{ fontSize: 10 }}>Liabilities</p>
          <p className="font-semibold tabular-nums text-orange-500 mt-0.5" style={{ fontSize: 13 }}>
            {compactCurrency(liabilities)}
          </p>
        </div>
      </div>
    </Card>
  )
}
