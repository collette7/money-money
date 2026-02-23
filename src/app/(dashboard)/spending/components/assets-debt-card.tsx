"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, TrendingUp, TrendingDown } from "lucide-react";
import {
  AreaChart,
  Area,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const fmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

type NetWorthSnapshot = {
  date: string;
  net_worth: number;
  total_assets: number;
  total_liabilities: number;
};

type AssetsDebtCardProps = {
  totalAssets: number;
  totalDebt: number;
  snapshots: NetWorthSnapshot[];
};

const PERIODS = ["1W", "1M", "3M", "YTD", "1Y", "ALL"] as const;

function filterByPeriod(snapshots: NetWorthSnapshot[], period: string): NetWorthSnapshot[] {
  if (snapshots.length === 0) return [];
  if (period === "ALL") return snapshots;

  const now = new Date();
  let cutoff: Date;

  switch (period) {
    case "1W":
      cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      break;
    case "1M":
      cutoff = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      break;
    case "3M":
      cutoff = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      break;
    case "YTD":
      cutoff = new Date(now.getFullYear(), 0, 1);
      break;
    case "1Y":
      cutoff = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      break;
    default:
      return snapshots;
  }

  const cutoffStr = cutoff.toISOString().split("T")[0];
  const filtered = snapshots.filter(s => s.date >= cutoffStr);
  return filtered.length > 0 ? filtered : snapshots.slice(-1);
}

function computeChange(
  filtered: NetWorthSnapshot[],
  key: "total_assets" | "total_liabilities"
): number {
  if (filtered.length < 2) return 0;
  const first = filtered[0][key];
  const last = filtered[filtered.length - 1][key];
  if (first === 0) return 0;
  return ((last - first) / Math.abs(first)) * 100;
}

export function AssetsDebtCard({
  totalAssets,
  totalDebt,
  snapshots,
}: AssetsDebtCardProps) {
  const [activePeriod, setActivePeriod] = useState<string>("1M");

  const filtered = useMemo(
    () => filterByPeriod(snapshots, activePeriod),
    [snapshots, activePeriod]
  );

  const assetsChange = useMemo(() => computeChange(filtered, "total_assets"), [filtered]);
  const debtChange = useMemo(() => computeChange(filtered, "total_liabilities"), [filtered]);

  const chartData = filtered.length > 0
    ? filtered.map(s => ({ date: s.date, value: s.net_worth }))
    : [{ date: "", value: totalAssets - totalDebt }];

  return (
    <Card className="rounded-[14px]">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Assets & Debt
        </CardTitle>
        <Link
          href="/accounts"
          className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 transition-colors"
        >
          Accounts
          <ChevronRight className="size-3" />
        </Link>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-blue-500" />
            <div>
              <p className="text-xs text-muted-foreground">Assets</p>
              <p className="text-lg font-bold tabular-nums">{fmt.format(totalAssets)}</p>
              {filtered.length >= 2 ? (
                <span className={cn(
                  "inline-flex items-center gap-0.5 text-xs font-medium",
                  assetsChange >= 0 ? "text-emerald-600" : "text-rose-600"
                )}>
                  {assetsChange >= 0 ? (
                    <TrendingUp className="size-3" />
                  ) : (
                    <TrendingDown className="size-3" />
                  )}
                  {Math.abs(assetsChange).toFixed(1)}%
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">--</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-orange-500" />
            <div>
              <p className="text-xs text-muted-foreground">Debt</p>
              <p className="text-lg font-bold tabular-nums">{fmt.format(totalDebt)}</p>
              {filtered.length >= 2 ? (
                <span className={cn(
                  "inline-flex items-center gap-0.5 text-xs font-medium",
                  debtChange <= 0 ? "text-emerald-600" : "text-rose-600"
                )}>
                  {debtChange <= 0 ? (
                    <TrendingDown className="size-3" />
                  ) : (
                    <TrendingUp className="size-3" />
                  )}
                  {Math.abs(debtChange).toFixed(1)}%
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">--</span>
              )}
            </div>
          </div>
        </div>

        <div className="h-16 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="netWorthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.65 0.22 250)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="oklch(0.65 0.22 250)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
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
                fill="url(#netWorthGrad)"
                dot={chartData.length === 1}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="flex justify-center gap-1 mt-4">
          {PERIODS.map((period) => (
            <button
              key={period}
              onClick={() => setActivePeriod(period)}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-full transition-colors",
                activePeriod === period
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {period}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
