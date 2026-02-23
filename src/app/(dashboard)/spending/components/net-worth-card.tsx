"use client"

import Link from "next/link"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { HomeNetWorthChart } from "../../home-chart"

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
  return (
    <Card className="p-5 min-w-0">
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
      <div className="flex items-baseline gap-3 mb-4">
        <span className="text-3xl font-bold tabular-nums tracking-tight">
          {compactCurrency(netWorth)}
        </span>
        {netWorthDollarChange !== null && netWorthPctChange !== null && (
          <span
            className={cn(
              "text-sm font-medium tabular-nums",
              netWorthPctChange >= 0 ? "text-emerald-600" : "text-rose-500"
            )}
          >
            {netWorthDollarChange >= 0 ? "+" : ""}
            {compactCurrency(netWorthDollarChange)}{" "}
            ({netWorthPctChange >= 0 ? "+" : ""}
            {netWorthPctChange.toFixed(1)}%)
          </span>
        )}
      </div>
      <HomeNetWorthChart snapshots={snapshots} height={160} />
      <div className="grid grid-cols-2 gap-4 mt-5 pt-5 border-t">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Assets</p>
          <p className="text-xl font-semibold tabular-nums text-emerald-600 mt-1">
            {compactCurrency(assets)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Liabilities</p>
          <p className="text-xl font-semibold tabular-nums text-rose-500 mt-1">
            {compactCurrency(liabilities)}
          </p>
        </div>
      </div>
    </Card>
  )
}
