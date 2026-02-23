"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const PERIODS = ["1W", "1M", "3M", "6M", "1Y"] as const
type PeriodType = (typeof PERIODS)[number]

type InvestmentAccount = {
  name: string
  institution: string | null
  balance: number
}

type Snapshot = {
  date: string
  net_worth: number
  total_assets: number | null
  total_liabilities: number | null
}

type Props = {
  accounts: InvestmentAccount[]
  total: number
  snapshots: Snapshot[]
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

const PERIOD_DAYS: Record<PeriodType, number> = {
  "1W": 7,
  "1M": 30,
  "3M": 90,
  "6M": 180,
  "1Y": 365,
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-card px-3 py-2 shadow-md">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold tabular-nums">
        {formatCurrency(payload[0].value)}
      </p>
    </div>
  )
}

export function HomeInvestments({ accounts, total, snapshots }: Props) {
  const [activePeriod, setActivePeriod] = useState<PeriodType>("6M")

  const allData = useMemo(() => {
    return snapshots
      .filter((s) => s.total_assets != null)
      .map((s) => {
        const d = new Date(s.date + "T00:00:00")
        return {
          date: s.date,
          month: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          value: s.total_assets as number,
        }
      })
  }, [snapshots])

  const filteredData = useMemo(() => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - PERIOD_DAYS[activePeriod])
    const cutoffStr = cutoff.toISOString().slice(0, 10)

    const filtered = allData.filter((s) => s.date >= cutoffStr)

    if (filtered.length === 0 && allData.length >= 1) {
      return [allData[allData.length - 1]]
    }

    if (filtered.length < allData.length) {
      const cutoffIdx = allData.findIndex((s) => s.date >= cutoffStr)
      const anchorIdx = Math.max(0, cutoffIdx - 1)
      const anchor = allData[anchorIdx]
      if (anchor && !filtered.some((d) => d.date === anchor.date)) {
        return [anchor, ...filtered]
      }
    }

    return filtered
  }, [allData, activePeriod])

  const changePct = useMemo(() => {
    if (filteredData.length < 2) return null
    const first = filteredData[0].value
    const last = filteredData[filteredData.length - 1].value
    if (first === 0) return null
    return ((last - first) / Math.abs(first)) * 100
  }, [filteredData])

  if (accounts.length === 0) {
    return (
      <Card className="p-5">
        <p className="text-xs tracking-wider text-muted-foreground uppercase">INVESTMENTS</p>
        <p className="text-sm text-muted-foreground mt-3">No investment accounts</p>
        <Link
          href="/accounts/connect"
          className="inline-block mt-2 text-sm font-medium text-primary hover:underline"
        >
          Connect an account &rsaquo;
        </Link>
      </Card>
    )
  }

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <Link
            href="/accounts"
            className="text-xs tracking-wider text-muted-foreground uppercase hover:text-foreground transition-colors"
          >
            INVESTMENTS &rsaquo;
          </Link>
          <p className="text-2xl font-semibold mt-1 tabular-nums">{formatCurrency(total)}</p>
        </div>
        {changePct !== null && (
          <span
            className={cn(
              "text-sm font-medium tabular-nums",
              changePct >= 0 ? "text-emerald-600" : "text-rose-500"
            )}
          >
            {changePct >= 0 ? "+" : ""}
            {changePct.toFixed(1)}%
          </span>
        )}
      </div>

      {filteredData.length > 0 ? (
        <div className="h-[140px] w-full -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={filteredData}
              margin={{ top: 4, right: 8, left: 8, bottom: 0 }}
            >
              <defs>
                <linearGradient id="investGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.6 0.15 145)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="oklch(0.6 0.15 145)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "oklch(0.55 0 0)" }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                dy={6}
              />
              <YAxis
                orientation="right"
                tick={{ fontSize: 10, fill: "oklch(0.55 0 0)" }}
                axisLine={false}
                tickLine={false}
                width={45}
                dx={4}
                tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                content={<ChartTooltip />}
                cursor={{ stroke: "oklch(0.7 0 0)", strokeDasharray: "3 3" }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="oklch(0.6 0.15 145)"
                strokeWidth={2}
                fill="url(#investGrad)"
                dot={filteredData.length === 1}
                activeDot={{
                  r: 4,
                  fill: "oklch(0.6 0.15 145)",
                  stroke: "white",
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground py-6 text-center">
          No investment data yet
        </p>
      )}

      <div className="flex items-center justify-center gap-1 mt-3 mb-5">
        {PERIODS.map((p) => (
          <button
            key={p}
            onClick={() => setActivePeriod(p)}
            className={cn(
              activePeriod === p
                ? "rounded-full bg-foreground text-background px-3 py-1 text-xs font-medium"
                : "rounded-full px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            )}
          >
            {p}
          </button>
        ))}
      </div>

      <div>
        <p className="text-xs tracking-wider text-muted-foreground uppercase mb-3">ACCOUNTS</p>
        <div className="space-y-2">
          {accounts.map((account) => (
            <div
              key={account.name}
              className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{account.name}</p>
                {account.institution && (
                  <p className="text-xs text-muted-foreground truncate">{account.institution}</p>
                )}
              </div>
              <span className="text-sm font-medium tabular-nums shrink-0 ml-4">
                {formatCurrency(account.balance)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
