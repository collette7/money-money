"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { aiBudgetRecommendation } from "../../advisor/actions";
import { applyBudgetRecommendations } from "../../budgets/actions";

interface AIRecommendation {
  items: Array<{
    categoryId: string;
    categoryName: string;
    recommendedLimit: number;
    reasoning: string;
  }>;
  totalBudget: number;
  savingsTarget: number;
  summary: string;
}

const currency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

export function AIRebalanceButton({
  month,
  year,
}: {
  month: number;
  year: number;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [aiResult, setAIResult] = useState<AIRecommendation | null>(null);
  const [isApplying, startApplyTransition] = useTransition();

  async function handleAI() {
    setIsLoading(true);
    setError(null);
    try {
      const data = await aiBudgetRecommendation();
      setAIResult(data as AIRecommendation);
      setDialogOpen(true);
    } catch (err) {
      console.error("[AI Budget]", err);
      setError(
        err instanceof Error ? err.message : "Failed to get AI suggestions"
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleApplyAI() {
    if (!aiResult) return;
    startApplyTransition(async () => {
      await applyBudgetRecommendations(
        aiResult.items.map((i) => ({
          categoryId: i.categoryId,
          recommendedLimit: i.recommendedLimit,
        })),
        month,
        year
      );
      setDialogOpen(false);
      setAIResult(null);
      router.refresh();
    });
  }

  return (
    <>
      <button
        onClick={handleAI}
        disabled={isLoading}
        className="flex items-center gap-2 px-4 h-9 rounded-lg text-sm font-medium bg-[#4f39f6] text-white hover:bg-[#4330e6] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Sparkles className="size-4" />
        )}
        AI Rebalance
      </button>
      {error && (
        <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          {aiResult && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="size-4" />
                  AI Budget Recommendations
                </DialogTitle>
                <DialogDescription>{aiResult.summary}</DialogDescription>
              </DialogHeader>

              <div className="flex items-center gap-4">
                <div className="flex-1 rounded-md border p-3 text-center">
                  <p className="text-muted-foreground text-xs font-medium">
                    Total Budget
                  </p>
                  <p className="text-lg font-bold">
                    {currency(aiResult.totalBudget)}
                  </p>
                </div>
                <div className="flex-1 rounded-md border p-3 text-center">
                  <p className="text-muted-foreground text-xs font-medium">
                    Savings Target
                  </p>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {currency(aiResult.savingsTarget)}
                  </p>
                </div>
              </div>

              <Separator />

              <ScrollArea className="max-h-[320px]">
                <div className="space-y-3 pr-3">
                  {aiResult.items.map((item) => (
                    <div
                      key={item.categoryId}
                      className="flex items-start justify-between gap-3 rounded-md border p-3"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {item.categoryName}
                          </span>
                          <Badge
                            variant="secondary"
                            className="text-xs tabular-nums"
                          >
                            {currency(item.recommendedLimit)}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground text-xs leading-relaxed">
                          {item.reasoning}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Close</Button>
                </DialogClose>
                <Button onClick={handleApplyAI} disabled={isApplying}>
                  {isApplying && (
                    <Loader2 className="size-3.5 animate-spin" />
                  )}
                  Apply All
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
