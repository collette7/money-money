"use client";

import Link from "next/link";
import { DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import type { CategoryWithHierarchy } from "./expandable-categories";

const fmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

interface IncomeTabProps {
  categories: CategoryWithHierarchy[];
}

export function IncomeTab({ categories = [] }: IncomeTabProps) {
  const sorted = [...categories].sort((a, b) => b.spent_amount - a.spent_amount);
  const totalIncome = sorted.reduce((sum, c) => sum + c.spent_amount, 0);
  const totalTarget = sorted.reduce((sum, c) => sum + c.effective_limit, 0);

  if (sorted.length === 0) {
    return (
      <EmptyState
        icon={<DollarSign className="size-6" />}
        title="No income categories yet"
        description="Add income categories in the editor to track income targets and variance."
        actions={[
          {
            label: "Edit Categories",
            asChild: true,
            children: <Link href="/spending/breakdown/edit">Edit Categories</Link>,
          },
        ]}
      />
    );
  }

  const hasTargets = totalTarget > 0;
  const variance = totalIncome - totalTarget;

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center py-4">
        <span className="text-2xl font-bold tracking-tight">
          {fmt.format(totalIncome)}
        </span>
        <span className="text-xs text-muted-foreground">Income this month</span>
        {hasTargets && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-muted-foreground">
              Target: {fmt.format(totalTarget)}
            </span>
            <span className={cn(
              "text-xs font-medium",
              variance >= 0 ? "text-emerald-600" : "text-red-600"
            )}>
              {variance >= 0 ? "+" : ""}{fmt.format(variance)}
            </span>
          </div>
        )}
      </div>

      <div className="space-y-0">
        {hasTargets && (
          <div className="flex items-center gap-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
            <div className="flex-1">Category</div>
            <div className="w-24 text-right">Received</div>
            <div className="w-24 text-right">Target</div>
            <div className="w-24 text-right">Variance</div>
          </div>
        )}

        {sorted.map((category) => {
          const target = category.effective_limit;
          const received = category.spent_amount;
          const catVariance = received - target;

          return (
            <div
              key={category.id}
              className="flex items-center gap-3 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-lg flex-shrink-0">{category.emoji || "💵"}</span>
                <span className="text-sm font-medium truncate">{category.name}</span>
              </div>

              <span className="w-24 text-right text-sm font-medium tabular-nums">
                {fmt.format(received)}
              </span>

              {hasTargets && (
                <>
                  <span className="w-24 text-right text-sm text-muted-foreground tabular-nums">
                    {target > 0 ? fmt.format(target) : "—"}
                  </span>
                  <span className={cn(
                    "w-24 text-right text-sm font-medium tabular-nums",
                    target > 0
                      ? catVariance >= 0 ? "text-emerald-600" : "text-red-600"
                      : "text-muted-foreground"
                  )}>
                    {target > 0
                      ? `${catVariance >= 0 ? "+" : ""}${fmt.format(catVariance)}`
                      : "—"
                    }
                  </span>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
