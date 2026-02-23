"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ChevronRight, PiggyBank } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const fmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

type DailySpend = { date: string; total: number };

type MonthlySpendingCardProps = {
  remaining: number;
  totalBudget: number;
  spent: number;
  month: number;
  year: number;
  dailySpending: DailySpend[];
};

export function MonthlySpendingCard({
  remaining,
  totalBudget,
  spent,
  month,
  year,
  dailySpending,
}: MonthlySpendingCardProps) {
  const hasBudget = totalBudget > 0;

  const chartData = useMemo(() => {
    let cumulative = 0;
    return dailySpending.map((d) => {
      cumulative += d.total;
      const day = new Date(d.date + "T00:00:00").getDate();
      return { day: String(day), value: cumulative };
    });
  }, [dailySpending]);

  return (
    <Card className="rounded-[14px]">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Monthly Spending
        </CardTitle>
        <Link
          href="/spending/transactions"
          className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 transition-colors"
        >
          Transactions
          <ChevronRight className="size-3" />
        </Link>
      </CardHeader>
      <CardContent>
        {hasBudget ? (
          <div className="text-center py-4">
            <p className="text-3xl font-bold tabular-nums tracking-tight">
              {fmt.format(Math.max(0, remaining))} left
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {fmt.format(spent)} spent of {fmt.format(totalBudget)} budgeted
            </p>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-3xl font-bold tabular-nums tracking-tight">
              {fmt.format(spent)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">spent this month</p>
            <Link
              href={`/spending/breakdown/edit?month=${month}&year=${year}`}
              className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 dark:text-purple-400 dark:hover:bg-purple-500/15 transition-colors"
            >
              <PiggyBank className="size-3.5" />
              Set up a budget
            </Link>
          </div>
        )}

        {chartData.length > 0 && (
          <div className="h-20 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="monthlySpendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.65 0.22 250)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="oklch(0.65 0.22 250)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null;
                    return (
                      <div className="rounded-md bg-popover px-2.5 py-1.5 text-xs shadow-md border">
                        <span className="font-medium tabular-nums">{fmt.format(payload[0].value as number)}</span>
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="oklch(0.65 0.22 250)"
                  strokeWidth={2}
                  fill="url(#monthlySpendGrad)"
                  dot={chartData.length === 1}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
