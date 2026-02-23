"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "@/lib/utils";
import type { CategoryWithHierarchy } from "./expandable-categories";

const PALETTE = [
  "#ef4444", "#f97316", "#84cc16", "#14b8a6", "#6366f1",
  "#ec4899", "#eab308", "#06b6d4", "#8b5cf6", "#10b981",
  "#f43f5e", "#0ea5e9",
];

const fmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

interface ExpensesTabProps {
  categories: CategoryWithHierarchy[];
}

function ExpenseRow({
  category,
  totalSpent,
  colorIndex,
  depth = 0,
}: {
  category: CategoryWithHierarchy;
  totalSpent: number;
  colorIndex: number;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = category.children && category.children.length > 0;
  const pct = totalSpent > 0 ? (category.spent_amount / totalSpent) * 100 : 0;
  const color = category.color || PALETTE[colorIndex % PALETTE.length];

  return (
    <>
      <button
        type="button"
        onClick={() => hasChildren && setExpanded(!expanded)}
        className={cn(
          "w-full flex items-center gap-3 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0 text-left",
          hasChildren && "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50",
          depth > 0 && "bg-slate-50/50 dark:bg-slate-900/30"
        )}
        style={{ paddingLeft: depth > 0 ? `${depth * 20 + 4}px` : undefined }}
      >
        <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
          {hasChildren && (
            <ChevronRight className={cn(
              "w-3.5 h-3.5 text-slate-400 transition-transform duration-200",
              expanded && "rotate-90"
            )} />
          )}
        </span>

        <span
          className="flex-shrink-0 w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: color }}
        />

        <div className="flex-1 min-w-0">
          <span className={cn(
            "text-sm truncate block",
            depth === 0 ? "font-medium" : "text-slate-600 dark:text-slate-400"
          )}>
            {category.emoji && <span className="mr-1.5">{category.emoji}</span>}
            {category.name}
          </span>
          <span className="text-xs text-muted-foreground">
            {pct.toFixed(1)}% of expenses
          </span>
        </div>

        <span className={cn(
          "text-sm tabular-nums",
          depth === 0 ? "font-medium" : "text-slate-600 dark:text-slate-400"
        )}>
          {fmt.format(category.spent_amount)}
        </span>
      </button>

      {hasChildren && expanded && category.children!.map((child, ci) => (
        <ExpenseRow
          key={child.id}
          category={child}
          totalSpent={totalSpent}
          colorIndex={colorIndex}
          depth={depth + 1}
        />
      ))}
    </>
  );
}

export function ExpensesTab({ categories = [] }: ExpensesTabProps) {
  const sorted = [...categories].sort((a, b) => b.spent_amount - a.spent_amount);
  const totalSpent = sorted.reduce((sum, c) => sum + c.spent_amount, 0);

  const chartData = sorted
    .filter(c => c.spent_amount > 0)
    .map((c, i) => ({
      name: c.name,
      value: c.spent_amount,
      color: c.color || PALETTE[i % PALETTE.length],
    }));

  if (totalSpent === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p className="text-sm">No expenses this month</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <div className="relative h-[220px] w-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {chartData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
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
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-bold tracking-tight">
              {fmt.format(totalSpent)}
            </span>
            <span className="text-xs text-muted-foreground">Spent this month</span>
          </div>
        </div>
      </div>

      <div className="space-y-0">
        {sorted.map((category, i) => (
          <ExpenseRow
            key={category.id}
            category={category}
            totalSpent={totalSpent}
            colorIndex={i}
          />
        ))}
      </div>
    </div>
  );
}
