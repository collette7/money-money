"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CategoryWithHierarchy } from "./expandable-categories";
import { AIRebalanceButton } from "./ai-rebalance-button";

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

interface BudgetTabProps {
  categories: CategoryWithHierarchy[];
  month: number;
  year: number;
}

function GaugeChart({ spent, budget }: { spent: number; budget: number }) {
  const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const radius = 80;
  const stroke = 12;
  const circumference = Math.PI * radius;
  const filledLength = (pct / 100) * circumference;
  const cx = 100;
  const cy = 95;

  const isOver = spent > budget;
  const strokeColor = isOver ? "#ef4444" : pct > 80 ? "#f59e0b" : "#22c55e";

  return (
    <div className="flex flex-col items-center">
      <svg width="200" height="120" viewBox="0 0 200 120">
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        {pct > 0 && (
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none"
            stroke={strokeColor}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${filledLength} ${circumference}`}
          />
        )}
      </svg>
      <div className="flex flex-col items-center -mt-16">
        <span className="text-sm text-muted-foreground">{pct.toFixed(1)}%</span>
        <span className="text-2xl font-bold tracking-tight">{fmt.format(spent)}</span>
        <span className="text-xs text-muted-foreground">{fmt.format(budget)} budget</span>
      </div>
    </div>
  );
}

function BudgetRow({
  category,
  colorIndex,
  depth = 0,
}: {
  category: CategoryWithHierarchy;
  colorIndex: number;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = category.children && category.children.length > 0;
  const limit = category.effective_limit;
  const pct = limit > 0 ? (category.spent_amount / limit) * 100 : 0;
  const available = limit - category.spent_amount;
  const isOver = available < 0;
  const barWidth = Math.min(pct, 100);
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

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span
            className="flex-shrink-0 w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className={cn(
            "text-sm truncate",
            depth === 0 ? "font-medium" : "text-slate-600 dark:text-slate-400"
          )}>
            {category.emoji && <span className="mr-1">{category.emoji}</span>}
            {category.name}
          </span>
        </div>

        <div className="w-48 flex items-center gap-2">
          <span className={cn(
            "text-sm tabular-nums w-16 text-right flex-shrink-0",
            depth === 0 ? "font-medium" : "text-slate-600 dark:text-slate-400"
          )}>
            {fmt.format(category.spent_amount)}
          </span>
          <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                isOver ? "bg-red-500" : pct > 80 ? "bg-amber-500" : "bg-emerald-500"
              )}
              style={{ width: `${barWidth}%` }}
            />
          </div>
        </div>

        <span className="w-20 text-right text-sm text-muted-foreground tabular-nums">
          {fmt.format(limit)}
        </span>

        <span className={cn(
          "w-20 text-right text-sm font-medium tabular-nums",
          isOver ? "text-red-600" : "text-slate-900 dark:text-slate-100"
        )}>
          {isOver ? "-" : ""}{fmt.format(Math.abs(available))}
        </span>
      </button>

      {hasChildren && expanded && category.children!.map((child, ci) => (
        <BudgetRow
          key={child.id}
          category={child}
          colorIndex={colorIndex}
          depth={depth + 1}
        />
      ))}
    </>
  );
}

export function BudgetTab({ categories = [], month, year }: BudgetTabProps) {
  const sorted = [...categories].sort((a, b) => b.spent_amount - a.spent_amount);
  const totalSpent = sorted.reduce((sum, c) => sum + c.spent_amount, 0);
  const totalBudget = sorted.reduce((sum, c) => sum + c.effective_limit, 0);

  if (totalBudget === 0 && totalSpent === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p className="text-sm">No budget set for this month</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <GaugeChart spent={totalSpent} budget={totalBudget} />

      <div className="flex justify-end">
        <AIRebalanceButton month={month} year={year} />
      </div>

      <div className="space-y-0">
        <div className="flex items-center gap-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
          <div className="w-4" />
          <div className="flex-1">Category</div>
          <div className="w-48 text-left">Amount spent</div>
          <div className="w-20 text-right">Budget</div>
          <div className="w-20 text-right">Available</div>
        </div>

        {sorted.map((category, i) => (
          <BudgetRow
            key={category.id}
            category={category}
            colorIndex={i}
          />
        ))}
      </div>
    </div>
  );
}
