"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import type { CategoryTotal } from "../actions";

const PALETTE = [
  "oklch(0.65 0.22 250)",
  "oklch(0.72 0.19 155)",
  "oklch(0.75 0.18 70)",
  "oklch(0.63 0.21 25)",
  "oklch(0.65 0.24 305)",
  "oklch(0.70 0.16 200)",
  "oklch(0.78 0.14 85)",
  "oklch(0.60 0.20 340)",
  "oklch(0.68 0.15 125)",
  "oklch(0.72 0.12 180)",
];

const fmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function CategoryPieChart({ data }: { data: CategoryTotal[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
        No spending data available
      </div>
    );
  }

  const chartData = data.slice(0, 10).map((item, i) => ({
    name: item.name,
    value: item.total,
    color: item.color ?? PALETTE[i % PALETTE.length],
  }));

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius="55%"
            outerRadius="80%"
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
            stroke="none"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number | undefined) => fmt.format(value ?? 0)}
            contentStyle={{
              background: "oklch(0.98 0 0)",
              border: "1px solid oklch(0.9 0 0)",
              borderRadius: "8px",
              boxShadow: "0 4px 12px oklch(0 0 0 / 0.08)",
              fontSize: 13,
            }}
          />
          <Legend
            layout="vertical"
            verticalAlign="middle"
            align="right"
            iconType="circle"
            iconSize={8}
            formatter={(value: string) => (
              <span style={{ fontSize: 12, color: "oklch(0.5 0 0)" }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export { CategoryPieChart };
