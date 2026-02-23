"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import type { CategoryTotal } from "../actions"

const PALETTE = [
  "oklch(0.65 0.22 250)",
  "oklch(0.72 0.19 155)",
  "oklch(0.75 0.18 70)",
  "oklch(0.63 0.21 25)",
  "oklch(0.65 0.24 305)",
  "oklch(0.70 0.16 200)",
  "oklch(0.78 0.14 85)",
  "oklch(0.60 0.20 340)",
]

const fmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

interface SpendingBreakdownChartProps {
  data: CategoryTotal[]
}

export function SpendingBreakdownChart({ data }: SpendingBreakdownChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
        No spending data available
      </div>
    )
  }

  const chartData = data.map((item, i) => ({
    name: item.name,
    value: item.total,
    color: item.color ?? PALETTE[i % PALETTE.length],
  }))

  return (
    <div className="flex items-center gap-8">
      <div className="h-[280px] w-[280px] flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number | undefined) => fmt.format(value ?? 0)}
              contentStyle={{
                background: "white",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
                fontSize: 13,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-x-8 gap-y-3 flex-1">
        {chartData.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <div
              className="h-2.5 w-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-sm text-slate-600 dark:text-slate-400 truncate flex-1">
              {item.name}
            </span>
            <span className="text-sm font-medium text-slate-900 dark:text-slate-100 tabular-nums">
              {fmt.format(item.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
