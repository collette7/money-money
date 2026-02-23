"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { DailySpend } from "../actions";

const fmtCompact = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

const fmtFull = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (dateStr: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
    new Date(dateStr + "T00:00:00")
  );

function SpendingTrendChart({ data }: { data: DailySpend[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
        No spending data available
      </div>
    );
  }

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
        >
          <defs>
            <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.65 0.22 250)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="oklch(0.65 0.22 250)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="oklch(0.8 0 0 / 0.3)"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fontSize: 11, fill: "oklch(0.55 0 0)" }}
            axisLine={false}
            tickLine={false}
            dy={8}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={fmtCompact}
            tick={{ fontSize: 11, fill: "oklch(0.55 0 0)" }}
            axisLine={false}
            tickLine={false}
            dx={-4}
            width={64}
          />
          <Tooltip
            formatter={(value: number | undefined) => [fmtFull(value ?? 0), "Spending"]}
            labelFormatter={(label) => formatDate(String(label))}
            contentStyle={{
              background: "oklch(0.98 0 0)",
              border: "1px solid oklch(0.9 0 0)",
              borderRadius: "8px",
              boxShadow: "0 4px 12px oklch(0 0 0 / 0.08)",
              fontSize: 13,
            }}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke="oklch(0.65 0.22 250)"
            strokeWidth={2.5}
            fill="url(#spendGrad)"
            dot={false}
            activeDot={{
              r: 5,
              fill: "oklch(0.65 0.22 250)",
              stroke: "white",
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export { SpendingTrendChart };
