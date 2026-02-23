"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateBudgetMode } from "../../budgets/actions";
import type { BudgetMode } from "@/types/database";

const MODE_OPTIONS: { value: BudgetMode; label: string; description: string }[] = [
  {
    value: "independent",
    label: "Independent",
    description: "Each category has its own limit",
  },
  {
    value: "pooled",
    label: "Pooled",
    description: "Under-budget categories share slack with siblings",
  },
  {
    value: "strict_pooled",
    label: "Strict Pooled",
    description: "Pooled slack, but no single category can exceed its limit",
  },
];

export function BudgetModeSelector({
  budgetId,
  currentMode,
}: {
  budgetId: string;
  currentMode: BudgetMode;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleChange(mode: BudgetMode) {
    if (mode === currentMode) return;
    startTransition(async () => {
      await updateBudgetMode(budgetId, mode);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-muted-foreground">Budget Mode:</span>
      <div className="flex gap-1 rounded-lg border border-slate-200 dark:border-slate-700 p-0.5">
        {MODE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleChange(opt.value)}
            disabled={isPending}
            title={opt.description}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              currentMode === opt.value
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            } ${isPending ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
