"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { useIsMobile } from "@/hooks/use-mobile";
import type { CategoryTotal } from "../actions";
import { getCategoryColor } from "@/lib/category-colors";

const fmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function CategoryPieChart({ data }: { data: CategoryTotal[] }) {
  const isMobile = useIsMobile();
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
    color: getCategoryColor(item),
  }));

  return (
    <div className="h-[280px] sm:h-[320px] w-full">
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
            layout={isMobile ? "horizontal" : "vertical"}
            verticalAlign={isMobile ? "bottom" : "middle"}
            align={isMobile ? "center" : "right"}
            iconType="circle"
            iconSize={8}
            formatter={(value: string) => (
              <span style={{ fontSize: 11, color: "oklch(0.5 0 0)" }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export { CategoryPieChart };
