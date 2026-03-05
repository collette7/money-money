"use client";

import { useState, useTransition, useRef } from "react";
import Link from "next/link";
import { ChevronRight, ChevronDown, Target, Plus, Settings, Info, MessageSquare, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CategoryWithHierarchy } from "./expandable-categories";
import { RebalanceButton } from "../../budgets/rebalance-button";
import { getCategoryColor } from "@/lib/category-colors";
import { BudgetWizard } from "@/components/budget-wizard";
import { BudgetEditPopover } from "@/components/budget-edit-popover";
import { BudgetModeSelector } from "./budget-mode-selector";
import { BudgetAdvisorSheet } from "./budget-advisor-sheet";
import { SpendingPaceChart, PaceStatusBanner } from "./spending-pace-chart";
import { BudgetComparisonChart } from "./budget-comparison-chart";
import { updateTotalBudgetLimit } from "@/app/(dashboard)/budgets/actions";
import type { BudgetPaceData, BudgetComparisonData } from "@/app/(dashboard)/budgets/actions";
import type { BudgetMode } from "@/types/database";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  budgetId?: string;
  budgetMode?: BudgetMode;
  paceData?: BudgetPaceData;
  totalBudgetLimit?: number | null;
  tagsByCategory?: Record<string, string[]>;
  allTags?: string[];
  comparisonData?: BudgetComparisonData;
  fixedExpensesTotal?: number;
  estimatedIncome?: number;
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

function TagBadges({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null;
  const visible = tags.slice(0, 3);
  const overflow = tags.length - 3;
  return (
    <span className="inline-flex items-center gap-1 ml-1.5 flex-shrink-0">
      {visible.map((tag) => (
        <span
          key={tag}
          className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 text-xs rounded-full px-2 py-0.5 whitespace-nowrap"
        >
          {tag}
        </span>
      ))}
      {overflow > 0 && (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          +{overflow}
        </span>
      )}
    </span>
  );
}

function BudgetRow({
  category,
  month,
  year,
  depth = 0,
  tagsByCategory,
}: {
  category: CategoryWithHierarchy;
  month: number;
  year: number;
  depth?: number;
  tagsByCategory?: Record<string, string[]>;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = category.children && category.children.length > 0;
  const limit = category.effective_limit;
  const pct = limit > 0 ? (category.spent_amount / limit) * 100 : 0;
  const available = limit - category.spent_amount;
  const isOver = available < 0;
  const barWidth = Math.min(pct, 100);
  const color = getCategoryColor(category);

  return (
    <>
      <div
        role={hasChildren ? "button" : undefined}
        tabIndex={hasChildren ? 0 : undefined}
        onClick={() => hasChildren && setExpanded(!expanded)}
        onKeyDown={(e) => {
          if (hasChildren && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault()
            setExpanded(!expanded)
          }
        }}
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
          {tagsByCategory && tagsByCategory[category.id] && (
            <TagBadges tags={tagsByCategory[category.id]} />
          )}
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

        <div className="w-20 flex items-center justify-end gap-1">
          <span className="text-sm text-muted-foreground tabular-nums">
            {fmt.format(limit)}
          </span>
          <BudgetEditPopover
            categoryId={category.id}
            categoryName={category.name}
            currentLimit={category.budget_amount}
            month={month}
            year={year}
            onUpdated={() => window.location.reload()}
          />
        </div>

        <span className={cn(
          "w-20 text-right text-sm font-medium tabular-nums",
          isOver ? "text-red-600" : "text-slate-900 dark:text-slate-100"
        )}>
          {isOver ? "-" : ""}{fmt.format(Math.abs(available))}
        </span>
      </div>

      {hasChildren && expanded && category.children!.map((child) => (
        <BudgetRow
          key={child.id}
          category={child}
          month={month}
          year={year}
          depth={depth + 1}
          tagsByCategory={tagsByCategory}
        />
      ))}
    </>
  );
}

export function BudgetTab({ categories = [], month, year, budgetId, budgetMode, paceData, totalBudgetLimit, tagsByCategory = {}, allTags = [], comparisonData, fixedExpensesTotal = 0, estimatedIncome = 0 }: BudgetTabProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [advisorOpen, setAdvisorOpen] = useState(false);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [limitValue, setLimitValue] = useState<string>(
    totalBudgetLimit != null ? String(totalBudgetLimit) : ""
  );
  const limitInputRef = useRef<HTMLInputElement>(null);

  function categoryHasTag(cat: CategoryWithHierarchy, tag: string): boolean {
    if (tagsByCategory[cat.id]?.includes(tag)) return true;
    if (cat.children) {
      return cat.children.some((child) => categoryHasTag(child, tag));
    }
    return false;
  }

  const sorted = [...categories].sort((a, b) => b.spent_amount - a.spent_amount);
  const filtered = activeTag
    ? sorted.filter((cat) => categoryHasTag(cat, activeTag))
    : sorted;
  const totalSpent = sorted.reduce((sum, c) => sum + c.spent_amount, 0);
  const totalBudget = sorted.reduce((sum, c) => sum + c.effective_limit, 0);

  function handleLimitSubmit() {
    if (!budgetId) return;
    const parsed = limitValue.trim() === "" ? null : parseFloat(limitValue);
    if (parsed !== null && isNaN(parsed)) return;
    startTransition(async () => {
      await updateTotalBudgetLimit(budgetId, parsed);
    });
  }

  if (totalBudget === 0 && totalSpent === 0) {
    return (
      <>
        <EmptyState
          icon={<Target className="size-6" />}
          title="No budget set"
          description="Create budgets to track spending against limits for each category."
          actions={[
            {
              label: "Create Budget",
              onClick: () => setCreateDialogOpen(true),
            },
          ]}
        />
        <BudgetWizard
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          month={month}
          year={year}
          onCreated={() => {
            setCreateDialogOpen(false)
            window.location.reload()
          }}
        />
      </>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <GaugeChart spent={totalSpent} budget={totalBudget} />

        {estimatedIncome > 0 && fixedExpensesTotal > 0 && (
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-muted-foreground">Income</span>
                  <span className="ml-1.5 font-semibold tabular-nums">{fmt.format(estimatedIncome)}</span>
                </div>
                <span className="text-muted-foreground">→</span>
                <div>
                  <span className="text-muted-foreground">Fixed</span>
                  <span className="ml-1.5 font-semibold tabular-nums text-red-500">{fmt.format(fixedExpensesTotal)}</span>
                </div>
                <span className="text-muted-foreground">→</span>
                <div>
                  <span className="text-muted-foreground">Available</span>
                  <span className={cn(
                    "ml-1.5 font-semibold tabular-nums",
                    estimatedIncome - fixedExpensesTotal > 0 ? "text-emerald-600" : "text-red-500"
                  )}>
                    {fmt.format(estimatedIncome - fixedExpensesTotal)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {paceData && paceData.totalBudget > 0 && (
          <PaceStatusBanner data={paceData} />
        )}

        {paceData && paceData.points.length > 0 && (
          <SpendingPaceChart
            data={paceData.points}
            daysInMonth={paceData.daysInMonth}
            currentDay={paceData.currentDay}
          />
        )}

        {comparisonData && comparisonData.categories.length > 0 && (
          <div className="rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setComparisonOpen(!comparisonOpen)}
              className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <BarChart3 className="size-4 text-muted-foreground" />
              Month Comparison
              {comparisonOpen ? (
                <ChevronDown className="ml-auto size-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="ml-auto size-4 text-muted-foreground" />
              )}
            </button>
            {comparisonOpen && (
              <div className="px-4 pb-4">
                <BudgetComparisonChart {...comparisonData} />
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Settings className="size-4 mr-2" />
              Budget Settings
            </Button>
            {budgetId && budgetMode && (
              <BudgetModeSelector budgetId={budgetId} currentMode={budgetMode} />
            )}
            {budgetId && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                  Total Budget
                </span>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                    $
                  </span>
                  <Input
                    ref={limitInputRef}
                    type="number"
                    value={limitValue}
                    onChange={(e) => setLimitValue(e.target.value)}
                    onBlur={handleLimitSubmit}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleLimitSubmit();
                        limitInputRef.current?.blur();
                      }
                    }}
                    disabled={isPending}
                    placeholder="No limit"
                    className="w-32 h-8 text-sm pl-5 tabular-nums"
                  />
                </div>
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="size-3.5 text-muted-foreground cursor-help flex-shrink-0" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[220px]">
                      <p className="text-xs">
                        Sets a maximum total budget. The rebalance engine will keep suggestions within this limit.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setAdvisorOpen(true)}>
              <MessageSquare className="mr-2 h-4 w-4" />
              Ask AI
            </Button>
            <RebalanceButton month={month} year={year} />
          </div>
        </div>

        <div className="space-y-0">
        {allTags.length > 0 && (
          <div className="flex items-center gap-2 py-2 overflow-x-auto flex-nowrap">
            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap flex-shrink-0">Tags</span>
            {allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                className={cn(
                  "text-xs rounded-full px-2.5 py-1 whitespace-nowrap transition-colors flex-shrink-0",
                  activeTag === tag
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
          <div className="w-4" />
          <div className="flex-1">Category</div>
          <div className="w-48 text-left">Amount spent</div>
          <div className="w-20 text-right">Budget</div>
          <div className="w-20 text-right">Available</div>
        </div>

        {filtered.map((category) => (
          <BudgetRow
            key={category.id}
            category={category}
            month={month}
            year={year}
            tagsByCategory={tagsByCategory}
          />
        ))}
        </div>
      </div>
      
      <BudgetWizard
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        month={month}
        year={year}
        onCreated={() => {
          setCreateDialogOpen(false)
          window.location.reload()
        }}
      />

      <BudgetAdvisorSheet
        open={advisorOpen}
        onOpenChange={setAdvisorOpen}
        month={month}
        year={year}
      />
    </>
  );
}
