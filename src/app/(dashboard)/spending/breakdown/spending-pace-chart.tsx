"use client";

import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Check, AlertTriangle, AlertCircle } from "lucide-react";
import type { PaceDataPoint, BudgetPaceData } from "@/app/(dashboard)/budgets/actions";

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

const DAY_TICKS = [1, 5, 10, 15, 20, 25, 30];

interface SpendingPaceChartProps {
  data: PaceDataPoint[];
  daysInMonth: number;
  currentDay: number;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number | null }>;
  label?: number;
}) {
  if (!active || !payload?.length) return null;

  const actual = payload.find((p) => p.dataKey === "actual");
  const ideal = payload.find((p) => p.dataKey === "ideal");
  const projected = payload.find((p) => p.dataKey === "projected");

  return (
    <div
      style={{
        background: "oklch(0.98 0 0)",
        border: "1px solid oklch(0.9 0 0)",
        borderRadius: "8px",
        boxShadow: "0 4px 12px oklch(0 0 0 / 0.08)",
        fontSize: 13,
        padding: "8px 12px",
      }}
    >
      <p className="mb-1 font-medium text-slate-900">Day {label}</p>
      {actual?.value != null && (
        <p style={{ color: "oklch(0.65 0.22 250)" }}>
          {fmtFull(actual.value)} spent
        </p>
      )}
      {projected?.value != null && actual?.value == null && (
        <p style={{ color: "oklch(0.65 0.22 250)", opacity: 0.6 }}>
          {fmtFull(projected.value)} projected
        </p>
      )}
      {ideal?.value != null && (
        <p style={{ color: "oklch(0.7 0 0)" }}>
          {fmtFull(ideal.value)} ideal pace
        </p>
      )}
    </div>
  );
}

export function SpendingPaceChart({
  data,
  daysInMonth,
  currentDay,
}: SpendingPaceChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
        No pace data available
      </div>
    );
  }

  const filteredTicks = DAY_TICKS.filter((d) => d <= daysInMonth);

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
        >
          <defs>
            <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="oklch(0.65 0.22 250)"
                stopOpacity={0.2}
              />
              <stop
                offset="95%"
                stopColor="oklch(0.65 0.22 250)"
                stopOpacity={0.02}
              />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="oklch(0.8 0 0 / 0.3)"
            vertical={false}
          />
          <XAxis
            dataKey="day"
            ticks={filteredTicks}
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
            content={<CustomTooltip />}
          />
          <Line
            type="monotone"
            dataKey="ideal"
            stroke="oklch(0.7 0 0)"
            strokeWidth={1.5}
            strokeDasharray="6 4"
            dot={false}
            activeDot={false}
          />
          <Area
            type="monotone"
            dataKey="actual"
            stroke="oklch(0.65 0.22 250)"
            strokeWidth={2.5}
            fill="url(#actualGrad)"
            dot={false}
            activeDot={{
              r: 5,
              fill: "oklch(0.65 0.22 250)",
              stroke: "white",
              strokeWidth: 2,
            }}
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="projected"
            stroke="oklch(0.65 0.22 250)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            strokeOpacity={0.5}
            dot={false}
            activeDot={false}
            connectNulls={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

const STATUS_CONFIG = {
  on_track: {
    color: "emerald",
    Icon: Check,
    getText: (data: BudgetPaceData) =>
      `On track — ${fmtFull(data.freeToSpend)} free to spend`,
  },
  slightly_ahead: {
    color: "amber",
    Icon: AlertTriangle,
    getText: (data: BudgetPaceData) =>
      `Slightly ahead of pace — ${fmtFull(data.freeToSpend)} free to spend`,
  },
  significantly_ahead: {
    color: "orange",
    Icon: AlertTriangle,
    getText: (data: BudgetPaceData) =>
      `Spending faster than planned — projected ${fmtFull(data.projectedMonthEnd)} by month end`,
  },
  over_budget: {
    color: "red",
    Icon: AlertCircle,
    getText: (data: BudgetPaceData) =>
      `Over budget by ${fmtFull(data.totalSpent - data.totalBudget)}`,
  },
} as const;

const COLOR_CLASSES: Record<
  string,
  { border: string; bg: string; icon: string; text: string }
> = {
  emerald: {
    border: "border-emerald-200 dark:border-emerald-900",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    icon: "text-emerald-600",
    text: "text-emerald-700 dark:text-emerald-400",
  },
  amber: {
    border: "border-amber-200 dark:border-amber-900",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    icon: "text-amber-600",
    text: "text-amber-700 dark:text-amber-400",
  },
  orange: {
    border: "border-orange-200 dark:border-orange-900",
    bg: "bg-orange-50 dark:bg-orange-950/30",
    icon: "text-orange-600",
    text: "text-orange-700 dark:text-orange-400",
  },
  red: {
    border: "border-red-200 dark:border-red-900",
    bg: "bg-red-50 dark:bg-red-950/30",
    icon: "text-red-600",
    text: "text-red-700 dark:text-red-400",
  },
};

export function PaceStatusBanner({ data }: { data: BudgetPaceData }) {
  const config = STATUS_CONFIG[data.status];
  const classes = COLOR_CLASSES[config.color];
  const { Icon } = config;

  return (
    <div
      className={`flex items-start gap-2 rounded-md border ${classes.border} ${classes.bg} p-3`}
    >
      <Icon className={`mt-0.5 size-4 shrink-0 ${classes.icon}`} />
      <p className={`text-xs ${classes.text}`}>{config.getText(data)}</p>
    </div>
  );
}
