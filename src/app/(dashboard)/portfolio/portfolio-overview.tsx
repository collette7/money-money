"use client"

import { useState, useMemo, useTransition } from "react"
import Link from "next/link"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { RefreshCw, Plus, TrendingUp } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { cn } from "@/lib/utils"
import { refreshPrices } from "./actions"
import type { HoldingRow, PriceCacheRow } from "./actions"
import type { MarketStatus } from "@/lib/finnhub/client"
import type { HoldingType } from "@/types/database"
import { MarketWatchCard, type MarketQuote } from "./market-watch-card"
import type { WatchedSymbol } from "../settings/actions"

type Snapshot = {
  date: string
  total_value: number
  total_cost: number
}

const PERIODS = ["1W", "1M", "3M", "6M", "1Y", "All"] as const
type PeriodType = (typeof PERIODS)[number]

const shortCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
    notation: "compact",
  }).format(value)

const compactCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)

const ASSET_TYPE_COLORS: Record<HoldingType, string> = {
  stock: "oklch(0.55 0.15 250)",
  etf: "oklch(0.55 0.15 275)",
  crypto: "oklch(0.65 0.15 85)",
  option: "oklch(0.55 0.15 300)",
  mutual_fund: "oklch(0.55 0.15 195)",
  real_estate: "oklch(0.55 0.15 160)",
  private_equity: "oklch(0.45 0.1 250)",
  vehicle: "oklch(0.60 0.15 50)",
  alternative: "oklch(0.65 0.15 340)",
  other: "oklch(0.55 0 0)",
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
      <p className="text-[11px] text-muted-foreground">
        {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
          new Date(String(label))
        )}
      </p>
      <p className="text-sm font-semibold tabular-nums">
        {compactCurrency(payload[0].value)}
      </p>
    </div>
  )
}

function PortfolioChart({ snapshots }: { snapshots: Snapshot[] }) {
  const [activePeriod, setActivePeriod] = useState<PeriodType>("3M")

  const chartData = useMemo(() => {
    const points = snapshots.map((s) => ({
      date: s.date,
      value: s.total_value,
    }))

    if (points.length === 1) {
      const d = new Date(points[0].date)
      d.setDate(d.getDate() - 1)
      const syntheticDate = d.toISOString().split("T")[0]
      return [{ date: syntheticDate, value: snapshots[0].total_cost }, ...points]
    }

    return points
  }, [snapshots])

  const filteredData = useMemo(() => {
    if (activePeriod === "All") return chartData

    const now = new Date()
    let cutoff: Date

    switch (activePeriod) {
      case "1W":
        cutoff = new Date(now)
        cutoff.setDate(cutoff.getDate() - 7)
        break
      case "1M":
        cutoff = new Date(now)
        cutoff.setMonth(cutoff.getMonth() - 1)
        break
      case "3M":
        cutoff = new Date(now)
        cutoff.setMonth(cutoff.getMonth() - 3)
        break
      case "6M":
        cutoff = new Date(now)
        cutoff.setMonth(cutoff.getMonth() - 6)
        break
      case "1Y":
        cutoff = new Date(now)
        cutoff.setFullYear(cutoff.getFullYear() - 1)
        break
      default:
        return chartData
    }

    const filtered = chartData.filter((d) => new Date(d.date) >= cutoff)

    if (filtered.length < 2 && chartData.length >= 1) {
      const cutoffIdx = chartData.findIndex((d) => new Date(d.date) >= cutoff)
      const anchorIdx = Math.max(0, cutoffIdx - 1)
      const anchor = chartData[anchorIdx]
      if (anchor && !filtered.some((d) => d.date === anchor.date)) {
        return [anchor, ...filtered]
      }
    }

    return filtered
  }, [chartData, activePeriod])

  return (
    <div>
      {filteredData.length > 0 ? (
        <div className="h-[260px] w-full -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={filteredData}
              margin={{ top: 4, right: 8, left: 8, bottom: 0 }}
            >
              <defs>
                <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.55 0.15 160)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="oklch(0.55 0.15 160)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid
                horizontal
                vertical={false}
                strokeDasharray="4 4"
                stroke="oklch(0.8 0 0 / 0.4)"
              />
              <XAxis
                dataKey="date"
                tickFormatter={(d: string) =>
                  new Intl.DateTimeFormat("en-US", { month: "short" }).format(new Date(d))
                }
                tick={{ fontSize: 11, fill: "oklch(0.55 0 0)" }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                dy={6}
              />
              <YAxis
                orientation="right"
                tickFormatter={(v: number) => shortCurrency(v)}
                tick={{ fontSize: 10, fill: "oklch(0.55 0 0)" }}
                axisLine={false}
                tickLine={false}
                width={50}
                dx={4}
              />
              <Tooltip
                content={<ChartTooltip />}
                cursor={{ stroke: "oklch(0.7 0 0)", strokeDasharray: "3 3" }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="oklch(0.55 0.15 160)"
                strokeWidth={2}
                fill="url(#portfolioGrad)"
                dot={filteredData.length === 1}
                activeDot={{
                  r: 4,
                  fill: "oklch(0.55 0.15 160)",
                  stroke: "white",
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex h-[260px] items-center justify-center">
          <EmptyState
            icon={<TrendingUp className="size-6" />}
            title="No portfolio data yet"
            description="Add holdings to start tracking your investment performance."
            actions={[
              {
                label: "Add Holding",
                asChild: true,
                children: <Link href="/portfolio/holdings?add=true">Add Holding</Link>,
              },
            ]}
          />
        </div>
      )}

      <div className="flex items-center justify-center gap-1 mt-3">
        {PERIODS.map((p) => (
          <button
            key={p}
            onClick={() => setActivePeriod(p)}
            className={
              activePeriod === p
                ? "rounded-full bg-foreground text-background px-3 py-1 text-xs font-medium"
                : "rounded-full px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            }
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  )
}

function AssetAllocation({
  holdings,
  prices,
}: {
  holdings: HoldingRow[]
  prices: Map<string, PriceCacheRow>
}) {
  const openHoldings = holdings.filter((h) => !h.sale_date)

  const allocation = useMemo(() => {
    const byType: Record<string, number> = {}

    for (const h of openHoldings) {
      let value = 0
      if (h.is_manual) {
        value = h.current_value ?? h.purchase_value ?? 0
      } else if (h.symbol && h.shares) {
        const price = prices.get(h.symbol)?.price ?? 0
        value = h.shares * price
      }

      if (value > 0) {
        byType[h.asset_type] = (byType[h.asset_type] ?? 0) + value
      }
    }

    const total = Object.values(byType).reduce((sum, v) => sum + v, 0)

    return Object.entries(byType)
      .map(([type, value]) => ({
        type: type as HoldingType,
        value,
        pct: total > 0 ? (value / total) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value)
  }, [openHoldings, prices])

  if (allocation.length === 0) {
    return null
  }

  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
        Asset Allocation
      </h2>
      <div className="space-y-3">
        {allocation.map(({ type, value, pct }) => (
          <div key={type} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: ASSET_TYPE_COLORS[type] }}
                />
                <span className="font-medium capitalize">{type.replace("_", " ")}</span>
              </div>
              <div className="flex items-center gap-3 tabular-nums">
                <span className="font-medium">{compactCurrency(value)}</span>
                <span className="text-muted-foreground w-12 text-right">
                  {pct.toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${pct}%`,
                  backgroundColor: ASSET_TYPE_COLORS[type],
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

export function PortfolioOverview({
  holdings,
  prices: pricesArray,
  marketStatus,
  totalValue,
  totalCost,
  dayChange,
  dayChangePct,
  snapshots,
  marketData,
  watchedSymbols,
}: {
  holdings: HoldingRow[]
  prices: [string, PriceCacheRow][]
  marketStatus: MarketStatus
  totalValue: number
  totalCost: number
  dayChange: number
  dayChangePct: number
  snapshots: Snapshot[]
  marketData: MarketQuote[] | null
  watchedSymbols: WatchedSymbol[]
}) {
  const [isPending, startTransition] = useTransition()
  const prices = useMemo(() => new Map(pricesArray), [pricesArray])

  const handleRefresh = () => {
    startTransition(async () => {
      await refreshPrices()
    })
  }

  const isOpen = marketStatus.isOpen

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
      <div className="space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "size-2.5 rounded-full",
                isOpen ? "bg-emerald-500" : "bg-gray-400"
              )}
            />
            <span className="text-sm text-muted-foreground">
              {isOpen ? "Markets open" : "Markets closed"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isPending}
              className="gap-1.5"
            >
              <RefreshCw className={cn("size-4", isPending && "animate-spin")} />
              Refresh
            </Button>
            <Button asChild size="sm" className="gap-1.5">
              <Link href="/portfolio/holdings?add=true">
                <Plus className="size-4" />
                Add
              </Link>
            </Button>
          </div>
        </div>

        <Card className="p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Total balance
          </p>
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
            <span className="text-2xl sm:text-3xl font-bold tabular-nums tracking-tight">
              {formatCurrency(totalValue)}
            </span>
            {dayChange !== 0 && (
              <span
                className={cn(
                  "text-sm font-medium tabular-nums",
                  dayChange >= 0 ? "text-emerald-600" : "text-rose-500"
                )}
              >
                {dayChange >= 0 ? "+" : ""}
                {compactCurrency(dayChange)} ({dayChangePct >= 0 ? "+" : ""}
                {dayChangePct.toFixed(2)}%) today
              </span>
            )}
          </div>
        </Card>

        <Card className="p-4 sm:p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Performance
          </h2>
          <PortfolioChart snapshots={snapshots} />
        </Card>

        <AssetAllocation holdings={holdings} prices={prices} />
      </div>

      <div className="lg:block space-y-5">
        <MarketWatchCard data={marketData} initialSymbols={watchedSymbols} />
      </div>
    </div>
  )
}
