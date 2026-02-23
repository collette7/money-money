"use client"

import { useState, useTransition, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Loader2,
  Scale,
  Sparkles,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { getRebalanceSuggestions, applyBudgetRecommendations } from "./actions"
import { aiBudgetRecommendation } from "../advisor/actions"
import type { RebalanceResult, RebalanceSuggestion, DriftAlert, SlackInfo } from "@/lib/rebalance/engine"

interface EditableSuggestion extends RebalanceSuggestion {
  editedAmount: number
}

interface AIRecommendation {
  items: Array<{
    categoryId: string
    categoryName: string
    recommendedLimit: number
    reasoning: string
  }>
  totalBudget: number
  savingsTarget: number
  summary: string
}

const currency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

const pct = (value: number) =>
  `${value > 0 ? "+" : ""}${value}%`

export function RebalanceButton({
  month,
  year,
}: {
  month: number
  year: number
}) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingAI, setIsLoadingAI] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const [rebalanceResult, setRebalanceResult] =
    useState<RebalanceResult | null>(null)
  const [editableItems, setEditableItems] = useState<EditableSuggestion[]>([])

  const [aiResult, setAIResult] = useState<AIRecommendation | null>(null)
  const [mode, setMode] = useState<"rebalance" | "ai">("rebalance")

  const [isApplying, startApplyTransition] = useTransition()

  async function handleRebalance() {
    setIsLoading(true)
    setError(null)
    try {
      const result = await getRebalanceSuggestions(month, year)
      setRebalanceResult(result)
      setEditableItems(
        result.suggestions.map((s) => ({
          ...s,
          editedAmount: s.suggestedBudget,
        }))
      )
      setMode("rebalance")
      setDialogOpen(true)
    } catch (err) {
      console.error("[Rebalance]", err)
      setError(
        err instanceof Error ? err.message : "Failed to analyze budget"
      )
    } finally {
      setIsLoading(false)
    }
  }

  async function handleAI() {
    setIsLoadingAI(true)
    setError(null)
    try {
      const data = await aiBudgetRecommendation()
      setAIResult(data as AIRecommendation)
      setMode("ai")
      setDialogOpen(true)
    } catch (err) {
      console.error("[AI Budget]", err)
      setError(
        err instanceof Error ? err.message : "Failed to get AI suggestions"
      )
    } finally {
      setIsLoadingAI(false)
    }
  }

  const updateAmount = useCallback(
    (categoryId: string, amount: number) => {
      setEditableItems((prev) =>
        prev.map((item) =>
          item.categoryId === categoryId
            ? { ...item, editedAmount: amount }
            : item
        )
      )
    },
    []
  )

  function handleApplyRebalance() {
    if (!editableItems.length) return
    startApplyTransition(async () => {
      await applyBudgetRecommendations(
        editableItems.map((i) => ({
          categoryId: i.categoryId,
          recommendedLimit: i.editedAmount,
        })),
        month,
        year
      )
      setDialogOpen(false)
      setRebalanceResult(null)
      setEditableItems([])
      router.refresh()
    })
  }

  function handleApplyAI() {
    if (!aiResult) return
    startApplyTransition(async () => {
      await applyBudgetRecommendations(
        aiResult.items.map((i) => ({
          categoryId: i.categoryId,
          recommendedLimit: i.recommendedLimit,
        })),
        month,
        year
      )
      setDialogOpen(false)
      setAIResult(null)
      router.refresh()
    })
  }

  const editedTotal = editableItems.reduce(
    (s, i) => s + i.editedAmount,
    0
  )

  return (
    <>
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          onClick={handleRebalance}
          disabled={isLoading || isLoadingAI}
        >
          {isLoading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Scale className="size-3.5" />
          )}
          Rebalance
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleAI}
          disabled={isLoading || isLoadingAI}
        >
          {isLoadingAI ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Sparkles className="size-3.5" />
          )}
          AI Suggestions
        </Button>
      </div>
      {error && (
        <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          {mode === "rebalance" && rebalanceResult && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Scale className="size-4" />
                  Budget Rebalancing
                </DialogTitle>
                <DialogDescription>
                  {rebalanceResult.suggestions.length === 0
                    ? "Your budget is on track! No rebalancing needed."
                    : rebalanceResult.usingFallback
                      ? "Based on the 50/30/20 rule (limited spending history)."
                      : "Based on your spending history."}
                  {" "}You can edit any amount before applying.
                </DialogDescription>
              </DialogHeader>

              {rebalanceResult.incomeCV > 0.5 && (
                <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Your income varies significantly month to month. Suggestions
                    may need manual adjustment.
                  </p>
                </div>
              )}

              {rebalanceResult.goalPressure > 0 && (
                <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/30">
                  <Sparkles className="mt-0.5 size-4 shrink-0 text-blue-600" />
                  <p className="text-xs text-blue-700 dark:text-blue-400">
                    Savings goals claim {Math.round(rebalanceResult.goalPressure * 100)}% of income.
                    Discretionary budgets adjusted down.
                  </p>
                </div>
              )}

              {rebalanceResult.networthSensitivity < -0.05 && (
                <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/30">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-600" />
                  <p className="text-xs text-red-700 dark:text-red-400">
                    Net worth declined {Math.abs(Math.round(rebalanceResult.networthSensitivity * 100))}% over 90 days.
                    Tighter drift thresholds applied.
                  </p>
                </div>
              )}

              {rebalanceResult.driftAlerts.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Mid-Month Alerts</p>
                  {rebalanceResult.driftAlerts.map((alert) => (
                    <div
                      key={alert.categoryId}
                      className={cn(
                        "flex items-center justify-between rounded-md border px-3 py-2 text-xs",
                        alert.severity === "critical"
                          ? "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
                          : "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30"
                      )}
                    >
                      <span className="font-medium">{alert.categoryName}</span>
                      <span>
                        {currency(alert.spentSoFar)} spent → projected {currency(alert.projectedMonthEnd)} / {currency(alert.budgetLimit)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {rebalanceResult.slackByParent.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pooled Slack Available</p>
                  {rebalanceResult.slackByParent
                    .filter((s) => s.slackAmount > 0)
                    .map((s) => (
                      <div
                        key={s.parentCategoryId}
                        className="flex items-center justify-between rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs dark:border-emerald-900 dark:bg-emerald-950/30"
                      >
                        <span className="font-medium text-emerald-700 dark:text-emerald-400">
                          Parent group
                        </span>
                        <span className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                          {currency(s.slackAmount)} slack
                        </span>
                      </div>
                    ))}
                </div>
              )}

              <div className="flex items-center gap-4">
                <div className="flex-1 rounded-md border p-3 text-center">
                  <p className="text-muted-foreground text-xs font-medium">
                    Avg Monthly Income
                  </p>
                  <p className="text-lg font-bold">
                    {currency(rebalanceResult.avgMonthlyIncome)}
                  </p>
                </div>
                <div className="flex-1 rounded-md border p-3 text-center">
                  <p className="text-muted-foreground text-xs font-medium">
                    New Total
                  </p>
                  <p className="text-lg font-bold">
                    {currency(editedTotal)}
                  </p>
                </div>
              </div>

              <Separator />

              {rebalanceResult.suggestions.length === 0 ? (
                <div className="py-8 text-center">
                  <Scale className="text-muted-foreground mx-auto mb-2 size-8" />
                  <p className="text-muted-foreground text-sm">
                    All categories are within 15% of target. Nice work!
                  </p>
                </div>
              ) : (
                <ScrollArea className="max-h-[360px]">
                  <div className="space-y-2 pr-3">
                    <TooltipProvider>
                      {editableItems.map((item) => (
                        <SuggestionRow
                          key={item.categoryId}
                          item={item}
                          onAmountChange={updateAmount}
                        />
                      ))}
                    </TooltipProvider>
                  </div>
                </ScrollArea>
              )}

              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Close</Button>
                </DialogClose>
                {rebalanceResult.suggestions.length > 0 && (
                  <Button
                    onClick={handleApplyRebalance}
                    disabled={isApplying}
                  >
                    {isApplying && (
                      <Loader2 className="size-3.5 animate-spin" />
                    )}
                    Apply{" "}
                    {editableItems.length === 1
                      ? "1 Change"
                      : `${editableItems.length} Changes`}
                  </Button>
                )}
              </DialogFooter>
            </>
          )}

          {mode === "ai" && aiResult && (
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
  )
}

function SuggestionRow({
  item,
  onAmountChange,
}: {
  item: EditableSuggestion
  onAmountChange: (categoryId: string, amount: number) => void
}) {
  const isIncrease = item.changeDollars < 0
  const [editing, setEditing] = useState(false)

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-md border p-3",
        isIncrease
          ? "border-emerald-200/50 bg-emerald-50/30 dark:border-emerald-900/30 dark:bg-emerald-950/10"
          : "border-rose-200/50 bg-rose-50/30 dark:border-rose-900/30 dark:bg-rose-950/10"
      )}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          {isIncrease ? (
            <ArrowUp className="size-3.5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <ArrowDown className="size-3.5 text-rose-600 dark:text-rose-400" />
          )}
          <span className="text-sm font-medium">{item.categoryName}</span>
          <Badge
            variant="outline"
            className={cn(
              "text-xs tabular-nums",
              isIncrease
                ? "border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400"
                : "border-rose-300 text-rose-700 dark:border-rose-800 dark:text-rose-400"
            )}
          >
            {pct(item.driftPercent)}
          </Badge>
        </div>
        <p className="text-muted-foreground text-xs">
          {item.offsetExplanation}
        </p>
      </div>

      <div className="flex items-center gap-2 text-right">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-muted-foreground text-xs tabular-nums line-through">
              {currency(item.currentBudget)}
            </span>
          </TooltipTrigger>
          <TooltipContent>Current budget</TooltipContent>
        </Tooltip>

        {editing ? (
          <Input
            type="number"
            className="h-7 w-24 text-right text-sm tabular-nums"
            value={item.editedAmount}
            onChange={(e) =>
              onAmountChange(
                item.categoryId,
                Math.max(0, parseInt(e.target.value) || 0)
              )
            }
            onBlur={() => setEditing(false)}
            onKeyDown={(e) => e.key === "Enter" && setEditing(false)}
            autoFocus
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className={cn(
              "cursor-pointer rounded px-1.5 py-0.5 text-sm font-semibold tabular-nums transition-colors hover:bg-accent",
              item.editedAmount !== item.suggestedBudget
                ? "text-blue-600 underline decoration-dotted dark:text-blue-400"
                : ""
            )}
          >
            {currency(item.editedAmount)}
          </button>
        )}
      </div>
    </div>
  )
}
