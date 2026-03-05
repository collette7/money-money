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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RecurringTrendPoint } from "@/lib/recurring/actions";

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

export function RecurringTrendChart({ data }: { data: RecurringTrendPoint[] }) {
  const monthsWithData = data.filter((d) => d.total > 0);

  if (monthsWithData.length < 2) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Subscription Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[120px] items-center justify-center text-sm text-muted-foreground">
            Not enough recurring transaction data to show trends
          </div>
        </CardContent>
      </Card>
    );
  }

  const avg =
    monthsWithData.reduce((sum, d) => sum + d.total, 0) / monthsWithData.length;
  const current = data[data.length - 1];
  const delta = current.total - avg;
  const deltaSign = delta >= 0 ? "+" : "";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          Subscription Trends
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
            >
              <defs>
                <linearGradient
                  id="recurringGrad"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="oklch(0.65 0.22 250)"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="100%"
                    stopColor="oklch(0.65 0.22 250)"
                    stopOpacity={0.05}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="oklch(0.8 0 0 / 0.3)"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "oklch(0.55 0 0)" }}
                axisLine={false}
                tickLine={false}
                dy={8}
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
                formatter={(value: number | undefined) =>
                  fmtFull(value ?? 0)
                }
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
                name="Recurring"
                stroke="oklch(0.65 0.22 250)"
                strokeWidth={2}
                fill="url(#recurringGrad)"
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
        <p className="text-xs text-muted-foreground">
          Avg: {fmtFull(avg)}/mo &middot; {current.label}:{" "}
          {deltaSign}
          {fmtFull(delta)} vs avg
        </p>
      </CardContent>
    </Card>
  );
}
