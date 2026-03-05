"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { BudgetComparisonData } from "@/app/(dashboard)/budgets/actions";

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

export function BudgetComparisonChart({
  categories,
  currentMonthLabel,
  previousMonthLabel,
  currentTotal,
  previousTotal,
}: BudgetComparisonData) {
  if (categories.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
        Not enough data to compare months
      </div>
    );
  }

  const totalChange = currentTotal - previousTotal;
  const totalChangePercent =
    previousTotal > 0
      ? ((currentTotal - previousTotal) / previousTotal) * 100
      : null;

  const data = categories.map((cat) => ({
    name: cat.name,
    currentMonth: cat.currentMonth,
    previousMonth: cat.previousMonth,
  }));

  return (
    <div className="space-y-4">
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
            barGap={2}
          >
            <defs>
              <linearGradient id="currentMonthGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.65 0.22 250)" stopOpacity={0.9} />
                <stop offset="100%" stopColor="oklch(0.65 0.22 250)" stopOpacity={0.6} />
              </linearGradient>
              <linearGradient id="previousMonthGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.7 0 0)" stopOpacity={0.6} />
                <stop offset="100%" stopColor="oklch(0.7 0 0)" stopOpacity={0.3} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="oklch(0.8 0 0 / 0.3)"
              vertical={false}
            />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: "oklch(0.55 0 0)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={fmtCompact}
              tick={{ fontSize: 11, fill: "oklch(0.55 0 0)" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value: number | undefined) => fmtFull(value ?? 0)}
              contentStyle={{
                background: "oklch(0.98 0 0)",
                border: "1px solid oklch(0.9 0 0)",
                borderRadius: "8px",
                boxShadow: "0 4px 12px oklch(0 0 0 / 0.08)",
                fontSize: 13,
              }}
            />
            <Legend
              verticalAlign="top"
              height={36}
              iconType="circle"
              iconSize={8}
              formatter={(value: string) => (
                <span style={{ fontSize: 12, color: "oklch(0.5 0 0)" }}>{value}</span>
              )}
            />
            <Bar
              dataKey="currentMonth"
              name={currentMonthLabel}
              fill="url(#currentMonthGrad)"
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            />
            <Bar
              dataKey="previousMonth"
              name={previousMonthLabel}
              fill="url(#previousMonthGrad)"
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="text-sm text-muted-foreground text-center">
        Total: {fmtFull(currentTotal)} this month vs {fmtFull(previousTotal)} last month{" "}
        {totalChangePercent !== null && (
          <span className={totalChange <= 0 ? "text-emerald-600" : "text-red-600"}>
            ({totalChange > 0 ? "+" : ""}
            {totalChangePercent.toFixed(1)}%)
          </span>
        )}
      </p>
    </div>
  );
}
