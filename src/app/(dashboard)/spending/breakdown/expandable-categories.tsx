"use client";

import { useState, useTransition } from "react";
import { ChevronRight, ChevronDown, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleCategoryExclusion } from "@/app/(dashboard)/budgets/actions";

export type CategoryWithHierarchy = {
  id: string;
  name: string;
  emoji: string | null;
  color: string | null;
  parent_id: string | null;
  excluded_from_budget: boolean;
  sort_order: number;
  type: "income" | "expense" | "transfer";
  spent_amount: number;
  budget_amount: number;
  rollover_amount: number;
  effective_limit: number;
  pooled_slack: number;
  children?: CategoryWithHierarchy[];
};

function getProgressColor(percentage: number): string {
  if (percentage > 100) return "bg-red-500";
  if (percentage > 80) return "bg-amber-500";
  return "bg-emerald-500";
}

function ProgressBar({ spent, budget }: { spent: number; budget: number }) {
  const percentage = budget > 0 ? (spent / budget) * 100 : 0;
  const displayPercentage = Math.min(percentage, 100);
  const isOverBudget = percentage > 100;
  const barFillPercent = isOverBudget
    ? 100
    : displayPercentage;
  const markerPercent = isOverBudget
    ? (budget / spent) * 100
    : null;

  return (
    <div className="relative w-full rounded-full bg-slate-100 dark:bg-slate-800" style={{ height: 10 }}>
      <div
        className={cn("h-full rounded-full transition-all duration-300", getProgressColor(percentage))}
        style={{ width: `${barFillPercent}%` }}
      />
      {markerPercent !== null && (
        <div
          className="absolute top-[-2px] w-[3px] rounded-full bg-amber-500"
          style={{ left: `${markerPercent}%`, height: 14 }}
        />
      )}
    </div>
  );
}

function CategoryRow({
  category,
  isChild = false,
  depth = 0,
}: {
  category: CategoryWithHierarchy;
  isChild?: boolean;
  depth?: number;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const hasChildren = category.children && category.children.length > 0;
  const limit = category.effective_limit > 0 ? category.effective_limit : category.budget_amount;
  const percentage = limit > 0
    ? (category.spent_amount / limit) * 100
    : 0;
  const isOverBudget = percentage > 100;
  const childCount = hasChildren ? category.children!.length : 0;
  const hasRollover = category.rollover_amount !== 0;
  const isExcluded = category.excluded_from_budget;

  function handleToggleExclusion() {
    startTransition(async () => {
      await toggleCategoryExclusion(category.id, !isExcluded);
    });
  }

  return (
    <>
      <div
        className={cn(
          "group flex items-center gap-3 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0",
          isChild && "bg-slate-50/50 dark:bg-slate-900/50"
        )}
        style={{ paddingLeft: depth > 0 ? `${depth * 24 + 12}px` : undefined }}
      >
        <button
          onClick={() => hasChildren && setIsExpanded(!isExpanded)}
          className={cn(
            "flex-shrink-0 w-5 h-5 flex items-center justify-center transition-transform duration-200",
            hasChildren ? "cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 rounded" : "invisible"
          )}
        >
          {hasChildren && (
            <ChevronRight
              className={cn(
                "w-4 h-4 text-slate-400 transition-transform duration-200",
                isExpanded && "rotate-90"
              )}
            />
          )}
        </button>

        {childCount > 0 && (
          <span className={cn(
            "flex-shrink-0 w-5 h-5 flex items-center justify-center rounded text-white text-xs font-bold",
            isOverBudget ? "bg-red-500" : "bg-blue-500"
          )}>
            {childCount}
          </span>
        )}

        <span
          className="flex-shrink-0 w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: category.color || "#94a3b8" }}
        />

        <span className="flex-shrink-0 text-lg">
          {category.emoji || "📁"}
        </span>

        <span className={cn(
          "flex-1 font-medium truncate",
          isChild ? "text-sm text-slate-600 dark:text-slate-400" : "text-base"
        )}>
          {category.name}
          {hasRollover && (
            <span className={cn(
              "ml-2 text-xs font-normal",
              category.rollover_amount > 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-500 dark:text-red-400"
            )}>
              {category.rollover_amount > 0 ? "+" : ""}
              ${Math.abs(category.rollover_amount).toLocaleString("en-US", { maximumFractionDigits: 0 })} rollover
            </span>
          )}
        </span>

        <span className={cn(
          "w-24 text-right font-medium tabular-nums",
          isOverBudget ? "text-red-600 dark:text-red-400" : ""
        )}>
          ${category.spent_amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}
        </span>

        <div className="w-32">
          <ProgressBar spent={category.spent_amount} budget={limit} />
        </div>

        <span className="w-24 text-right text-slate-500 dark:text-slate-400 tabular-nums">
          ${limit.toLocaleString("en-US", { maximumFractionDigits: 0 })}
        </span>

        <button
          onClick={handleToggleExclusion}
          disabled={isPending}
          className={cn(
            "flex-shrink-0 w-6 h-6 flex items-center justify-center rounded transition-colors",
            "hover:bg-slate-100 dark:hover:bg-slate-800",
            isPending && "opacity-50 cursor-not-allowed"
          )}
          title={isExcluded ? "Include in budget" : "Exclude from budget"}
        >
          {isExcluded ? (
            <EyeOff className="w-4 h-4 text-slate-400" />
          ) : (
            <Eye className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </button>
      </div>

      {hasChildren && isExpanded && (
        <div className="border-l-2 border-slate-200 dark:border-slate-700 ml-3">
          {category.children!.map((child) => (
            <CategoryRow
              key={child.id}
              category={child}
              isChild
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </>
  );
}

interface ExpandableCategoriesProps {
  categories: CategoryWithHierarchy[];
  title: string;
}

export function ExpandableCategories({ categories, title }: ExpandableCategoriesProps) {
  const [isSectionExpanded, setIsSectionExpanded] = useState(true);

  if (categories.length === 0) {
    return null;
  }

  return (
    <div className="space-y-0">
      {/* Collapsible Section Header */}
      <button
        onClick={() => setIsSectionExpanded(!isSectionExpanded)}
        className="w-full flex items-center gap-2 py-3 text-base font-semibold text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors rounded-t"
      >
        {isSectionExpanded ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
        <span>{title}</span>
      </button>

      {/* Column Headers and Category Rows */}
      {isSectionExpanded && (
        <>
          {/* Header Row */}
          <div className="flex items-center gap-3 py-2 px-1 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <div className="w-5" /> {/* Chevron space */}
            <div className="w-5" /> {/* Badge space */}
            <div className="w-6" /> {/* Icon space */}
            <div className="flex-1" /> {/* Category name space */}
            <div className="w-24 text-right">SPENT</div>
            <div className="w-32" /> {/* Progress bar space - no label */}
            <div className="w-24 text-right">BUDGET</div>
            <div className="w-6" /> {/* Eye toggle space */}
          </div>

          {/* Category Rows */}
          {categories.map((category) => (
            <CategoryRow key={category.id} category={category} />
          ))}
        </>
      )}
    </div>
  );
}
