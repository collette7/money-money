"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts"

type Snapshot = {
  date: string
  net_worth: number
}

const PERIODS = ["1W", "1M", "3M", "YTD", "ALL"] as const
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

export function HomeNetWorthChart({ snapshots, height = 260 }: { snapshots: Snapshot[]; height?: number }) {
  const [activePeriod, setActivePeriod] = useState<PeriodType>("3M")
  const containerRef = useRef<HTMLDivElement>(null)
  const [chartWidth, setChartWidth] = useState(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setChartWidth(entry.contentRect.width)
      }
    })
    observer.observe(el)
    setChartWidth(el.clientWidth)
    return () => observer.disconnect()
  }, [])

  const chartData = useMemo(() => snapshots.map((s) => ({
    date: s.date,
    netWorth: s.net_worth,
  })), [snapshots])

  const filteredData = useMemo(() => {
    if (activePeriod === "ALL") return chartData

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
      case "YTD":
        cutoff = new Date(now.getFullYear(), 0, 1)
        break
      default:
        return chartData
    }

    const filtered = chartData.filter((d) => new Date(d.date) >= cutoff)

    if (filtered.length === 0 && chartData.length >= 1) {
      const anchorIdx = chartData.findIndex((d) => new Date(d.date) >= cutoff)
      const anchor = chartData[Math.max(0, anchorIdx - 1)] ?? chartData[chartData.length - 1]
      return [anchor]
    }

    if (filtered.length < chartData.length) {
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
      <div ref={containerRef} className="w-full overflow-hidden" style={{ height }}>
        {filteredData.length > 0 && chartWidth > 0 ? (
          <AreaChart
            data={filteredData}
            width={chartWidth}
            height={height}
            margin={{ top: 4, right: 8, left: 8, bottom: 0 }}
          >
            <defs>
              <linearGradient id="homeNwGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.55 0.15 250)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="oklch(0.55 0.15 250)" stopOpacity={0.02} />
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
              dataKey="netWorth"
              stroke="oklch(0.55 0.15 250)"
              strokeWidth={2}
              fill="url(#homeNwGrad)"
              dot={filteredData.length === 1}
              activeDot={{
                r: 4,
                fill: "oklch(0.55 0.15 250)",
                stroke: "white",
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        ) : filteredData.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">No data yet</p>
          </div>
        ) : null}
      </div>

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
