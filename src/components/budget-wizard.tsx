"use client"

import { useEffect, useState, useTransition } from "react"
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Info,
  Loader2,
  Sparkles,
  Target,
  AlertTriangle,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  createBudget,
  getHierarchicalBudget,
  getMonthlyIncomeEstimate,
  getActiveSavingsGoalsSummary,
} from "@/app/(dashboard)/budgets/actions"
import { aiBudgetRecommendation } from "@/app/(dashboard)/budgets/rebalance-actions"
import { BUDGET_MODES, type BudgetMode } from "@/types/database"
import { cn } from "@/lib/utils"

/* ─── Types ─── */

interface BudgetWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  month: number
  year: number
  onCreated?: () => void
}

type WizardStep = "setup" | "goals" | "ai-budget" | "review"

interface AIItem {
  categoryId: string
  categoryName: string
  recommendedLimit: number
  reasoning: string
  color?: string | null
}

const STEPS: { key: WizardStep; label: string }[] = [
  { key: "setup", label: "Setup" },
  { key: "goals", label: "Goals" },
  { key: "ai-budget", label: "AI Budget" },
  { key: "review", label: "Review" },
]

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

const fmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const fmtExact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/* ─── Step Indicator ─── */

function StepIndicator({ currentStep }: { currentStep: WizardStep }) {
  const currentIdx = STEPS.findIndex((s) => s.key === currentStep)

  return (
    <div className="flex items-center justify-center gap-0 py-4">
      {STEPS.map((step, i) => {
        const isActive = i === currentIdx
        const isComplete = i < currentIdx

        return (
          <div key={step.key} className="flex items-center gap-0">
            {i > 0 && (
              <div
                className={cn(
                  "h-px w-10 transition-colors duration-300",
                  isComplete ? "bg-primary" : "bg-border"
                )}
              />
            )}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300",
                  isActive &&
                    "bg-primary text-primary-foreground ring-4 ring-primary/20",
                  isComplete && "bg-primary text-primary-foreground",
                  !isActive &&
                    !isComplete &&
                    "border-2 border-muted-foreground/30 text-muted-foreground"
                )}
              >
                {isComplete ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium transition-colors",
                  isActive && "text-primary",
                  isComplete && "text-primary",
                  !isActive && !isComplete && "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ─── Main Wizard ─── */

export function BudgetWizard({
  open,
  onOpenChange,
  month,
  year,
  onCreated,
}: BudgetWizardProps) {
  /* ── State ── */
  const [step, setStep] = useState<WizardStep>("setup")
  const [isPending, startTransition] = useTransition()

  // Step 1 — Setup
  const [mode, setMode] = useState<BudgetMode>("independent")
  const [income, setIncome] = useState(0)
  const [incomeOverride, setIncomeOverride] = useState("")
  const [incomeMonths, setIncomeMonths] = useState(0)
  const [incomeLoaded, setIncomeLoaded] = useState(false)

  // Step 2 — Goals
  const [savingsAmount, setSavingsAmount] = useState("")
  const [savingsIsPercent, setSavingsIsPercent] = useState(false)
  const [enableRollover, setEnableRollover] = useState(true)
  const [goalsCount, setGoalsCount] = useState(0)
  const [goalsMonthly, setGoalsMonthly] = useState(0)
  const [goalsLoaded, setGoalsLoaded] = useState(false)

  // Step 3 — AI Budget
  const [aiItems, setAiItems] = useState<AIItem[]>([])
  const [aiLoading, setAiLoading] = useState(false)
  const [aiFailed, setAiFailed] = useState(false)
  const [aiSummary, setAiSummary] = useState("")

  // Derived
  const effectiveIncome = incomeOverride
    ? parseFloat(incomeOverride) || 0
    : income

  const savingsTarget = savingsIsPercent
    ? (effectiveIncome * (parseFloat(savingsAmount) || 0)) / 100
    : parseFloat(savingsAmount) || 0

  const savingsPercent = savingsIsPercent
    ? parseFloat(savingsAmount) || 0
    : effectiveIncome > 0
      ? (savingsTarget / effectiveIncome) * 100
      : 0

  const allocatedTotal = aiItems.reduce((s, i) => s + i.recommendedLimit, 0)
  const remaining = effectiveIncome - savingsTarget - allocatedTotal

  /* ── Effects ── */

  // Load income estimate on open
  useEffect(() => {
    if (open && !incomeLoaded) {
      startTransition(async () => {
        try {
          const result = await getMonthlyIncomeEstimate()
          setIncome(result.average)
          setIncomeMonths(result.months)
        } catch {
          // silently fail — user can enter manually
        }
        setIncomeLoaded(true)
      })
    }
  }, [open, incomeLoaded, startTransition])

  // Load savings goals summary on open
  useEffect(() => {
    if (open && !goalsLoaded) {
      startTransition(async () => {
        try {
          const result = await getActiveSavingsGoalsSummary()
          setGoalsCount(result.count)
          setGoalsMonthly(result.totalMonthlyContribution)
        } catch {
          // silently fail
        }
        setGoalsLoaded(true)
      })
    }
  }, [open, goalsLoaded, startTransition])

  // Reset state on close
  useEffect(() => {
    if (!open) {
      setStep("setup")
      setMode("independent")
      setIncome(0)
      setIncomeOverride("")
      setIncomeMonths(0)
      setIncomeLoaded(false)
      setSavingsAmount("")
      setSavingsIsPercent(false)
      setEnableRollover(true)
      setGoalsCount(0)
      setGoalsMonthly(0)
      setGoalsLoaded(false)
      setAiItems([])
      setAiLoading(false)
      setAiFailed(false)
      setAiSummary("")
    }
  }, [open])

  /* ── AI Budget Loading ── */

  const loadAIBudget = async () => {
    setAiLoading(true)
    setAiFailed(false)
    try {
      const result = await aiBudgetRecommendation(month, year)
      setAiItems(
        result.items.map((item) => ({
          categoryId: item.categoryId,
          categoryName: item.categoryName,
          recommendedLimit: item.recommendedLimit,
          reasoning: item.reasoning,
        }))
      )
      setAiSummary(result.summary)
    } catch {
      setAiFailed(true)
      // fallback: load categories for manual entry
      try {
        const hierarchical = await getHierarchicalBudget(month, year)
        const expenseCategories = hierarchical.filter(
          (c) => c.type === "expense" && !c.excluded_from_budget
        )
        setAiItems(
          expenseCategories
            .filter((c) => !c.parent_id)
            .map((c) => ({
              categoryId: c.id,
              categoryName: c.name,
              recommendedLimit: 0,
              reasoning: "",
              color: c.color,
            }))
        )
      } catch {
        // categories failed too — items will be empty
      }
    }
    setAiLoading(false)
  }

  /* ── Navigation ── */

  const goNext = () => {
    switch (step) {
      case "setup":
        setStep("goals")
        break
      case "goals":
        setStep("ai-budget")
        loadAIBudget()
        break
      case "ai-budget":
        setStep("review")
        break
    }
  }

  const goBack = () => {
    switch (step) {
      case "goals":
        setStep("setup")
        break
      case "ai-budget":
        setStep("goals")
        break
      case "review":
        setStep("ai-budget")
        break
    }
  }

  /* ── Create ── */

  const handleCreate = () => {
    startTransition(async () => {
      const items = aiItems
        .filter((i) => i.recommendedLimit > 0)
        .map((i) => ({
          categoryId: i.categoryId,
          limitAmount: i.recommendedLimit,
        }))

      await createBudget(month, year, items, mode)
      onOpenChange(false)
      onCreated?.()
    })
  }

  /* ── Update item amount ── */

  const updateItemAmount = (categoryId: string, value: string) => {
    const num = parseFloat(value) || 0
    setAiItems((prev) =>
      prev.map((item) =>
        item.categoryId === categoryId
          ? { ...item, recommendedLimit: num }
          : item
      )
    )
  }

  /* ── Step Content ── */

  const renderStep = () => {
    switch (step) {
      case "setup":
        return (
          <div className="space-y-5">
            {/* Budget Mode */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Budget Mode</Label>
              <div className="space-y-2">
                {BUDGET_MODES.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setMode(m.value)}
                    className={cn(
                      "w-full text-left space-y-1 rounded-lg border p-3 transition-colors",
                      mode === m.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-accent"
                    )}
                  >
                    <div className="font-medium">{m.label}</div>
                    <div className="text-sm text-muted-foreground">
                      {m.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Monthly Income */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Monthly Income</Label>
              {incomeLoaded && income > 0 ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-800 dark:bg-emerald-950/30">
                  <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
                    <Target className="h-4 w-4 flex-shrink-0" />
                    <span>
                      Based on your last{" "}
                      {incomeMonths === 1
                        ? "month"
                        : `${incomeMonths} months`}
                      :{" "}
                      <span className="font-semibold">
                        {fmtExact.format(income)}/mo
                      </span>
                    </span>
                  </div>
                </div>
              ) : incomeLoaded ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
                  <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
                    <Info className="h-4 w-4 flex-shrink-0" />
                    <span>
                      No income data found. Enter your monthly income below.
                    </span>
                  </div>
                </div>
              ) : null}

              <div className="space-y-1.5">
                <Label
                  htmlFor="income-override"
                  className="text-xs text-muted-foreground"
                >
                  {income > 0 ? "Override amount" : "Monthly income"}
                </Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">$</span>
                  <Input
                    id="income-override"
                    type="number"
                    min="0"
                    step="100"
                    value={incomeOverride}
                    onChange={(e) => setIncomeOverride(e.target.value)}
                    placeholder={income > 0 ? fmt.format(income) : "0"}
                    className="w-48"
                  />
                </div>
              </div>
            </div>
          </div>
        )

      case "goals":
        return (
          <div className="space-y-5">
            {/* Savings Target */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Savings Target</Label>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-sm text-muted-foreground">
                    {savingsIsPercent ? "%" : "$"}
                  </span>
                  <Input
                    type="number"
                    min="0"
                    step={savingsIsPercent ? "1" : "50"}
                    value={savingsAmount}
                    onChange={(e) => setSavingsAmount(e.target.value)}
                    placeholder="0"
                    className="w-40"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label
                    htmlFor="savings-mode"
                    className="text-xs text-muted-foreground whitespace-nowrap"
                  >
                    {savingsIsPercent ? "% of income" : "Dollar amount"}
                  </Label>
                  <Switch
                    id="savings-mode"
                    checked={savingsIsPercent}
                    onCheckedChange={setSavingsIsPercent}
                  />
                </div>
              </div>

              {savingsTarget > 0 && (
                <div className="text-sm text-muted-foreground">
                  {savingsIsPercent ? (
                    <>
                      = {fmt.format(savingsTarget)}/mo from{" "}
                      {fmt.format(effectiveIncome)} income
                    </>
                  ) : (
                    <>
                      = {savingsPercent.toFixed(1)}% of{" "}
                      {fmt.format(effectiveIncome)} income
                    </>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* Rollover */}
            <div className="flex items-center justify-between space-x-2 rounded-lg border p-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Label htmlFor="rollover" className="text-sm font-medium">
                    Enable rollover
                  </Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>
                          Unused budget from previous months will be added to
                          your limits
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="text-xs text-muted-foreground">
                  Carry forward unused budget from previous months
                </div>
              </div>
              <Switch
                id="rollover"
                checked={enableRollover}
                onCheckedChange={setEnableRollover}
              />
            </div>

            {/* Active Goals Info */}
            {goalsLoaded && goalsCount > 0 && (
              <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-800 dark:bg-blue-950/30">
                <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                  <Target className="h-4 w-4 flex-shrink-0" />
                  <span>
                    You have{" "}
                    <span className="font-semibold">{goalsCount} active</span>{" "}
                    savings goal{goalsCount !== 1 ? "s" : ""} requiring{" "}
                    <span className="font-semibold">
                      {fmt.format(goalsMonthly)}/mo
                    </span>
                  </span>
                </div>
              </div>
            )}
          </div>
        )

      case "ai-budget":
        return (
          <div className="space-y-4">
            {aiLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <div className="relative">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-primary animate-pulse" />
                  </div>
                  <Loader2 className="h-14 w-14 absolute -top-1 -left-1 animate-spin text-primary/30" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-medium">
                    Analyzing your spending...
                  </p>
                  <p className="text-xs text-muted-foreground">
                    AI is reviewing your transaction history
                  </p>
                </div>
              </div>
            ) : (
              <>
                {aiFailed && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
                    <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
                      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                      <span>
                        AI suggestions unavailable. Enter amounts manually.
                      </span>
                    </div>
                  </div>
                )}

                {!aiFailed && aiSummary && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                    <div className="flex items-start gap-2 text-sm">
                      <Sparkles className="h-4 w-4 flex-shrink-0 text-primary mt-0.5" />
                      <span className="text-muted-foreground">
                        {aiSummary}
                      </span>
                    </div>
                  </div>
                )}

                <ScrollArea className="h-[300px] pr-3">
                  <div className="space-y-2">
                    {aiItems.map((item) => (
                      <div
                        key={item.categoryId}
                        className="flex items-start gap-3 rounded-lg border p-3"
                      >
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                              style={{
                                backgroundColor:
                                  item.color || "#94a3b8",
                              }}
                            />
                            <span className="text-sm font-medium truncate">
                              {item.categoryName}
                            </span>
                          </div>
                          {item.reasoning && (
                            <p className="text-xs text-muted-foreground line-clamp-2 pl-[18px]">
                              {item.reasoning}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="text-sm text-muted-foreground">
                            $
                          </span>
                          <Input
                            type="number"
                            min="0"
                            step="10"
                            value={item.recommendedLimit || ""}
                            onChange={(e) =>
                              updateItemAmount(
                                item.categoryId,
                                e.target.value
                              )
                            }
                            className="w-28 h-8 text-sm"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <Separator />

                {/* Running Total */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Total allocated
                    </span>
                    <span className="font-medium tabular-nums">
                      {fmt.format(allocatedTotal)}
                    </span>
                  </div>
                  {savingsTarget > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Savings target
                      </span>
                      <span className="font-medium tabular-nums">
                        {fmt.format(savingsTarget)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span>Amount remaining</span>
                    <span
                      className={cn(
                        "tabular-nums",
                        remaining >= 0
                          ? "text-emerald-600"
                          : "text-red-600"
                      )}
                    >
                      {fmt.format(remaining)}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        )

      case "review":
        return (
          <div className="space-y-5">
            {/* Summary Card */}
            <div className="rounded-xl border bg-card p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">
                    Monthly Income
                  </span>
                  <p className="text-lg font-semibold tabular-nums">
                    {fmt.format(effectiveIncome)}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">
                    Savings Target
                  </span>
                  <p className="text-lg font-semibold tabular-nums">
                    {fmt.format(savingsTarget)}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">
                    Total Allocated
                  </span>
                  <p className="text-lg font-semibold tabular-nums">
                    {fmt.format(allocatedTotal)}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">
                    Remaining
                  </span>
                  <p
                    className={cn(
                      "text-lg font-semibold tabular-nums",
                      remaining >= 0
                        ? "text-emerald-600"
                        : "text-red-600"
                    )}
                  >
                    {fmt.format(remaining)}
                  </p>
                </div>
              </div>

              {/* Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary">
                  {BUDGET_MODES.find((m) => m.value === mode)?.label ??
                    mode}
                </Badge>
                {enableRollover && (
                  <Badge variant="outline">Rollover enabled</Badge>
                )}
              </div>
            </div>

            {/* Allocation Bar */}
            {allocatedTotal > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Budget Allocation
                </Label>
                <div className="flex h-5 w-full overflow-hidden rounded-full bg-muted">
                  {aiItems
                    .filter((i) => i.recommendedLimit > 0)
                    .map((item) => {
                      const pct =
                        (item.recommendedLimit / effectiveIncome) * 100
                      return (
                        <TooltipProvider key={item.categoryId}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className="h-full transition-all duration-300 first:rounded-l-full last:rounded-r-full"
                                style={{
                                  width: `${Math.max(pct, 1)}%`,
                                  backgroundColor:
                                    item.color || stringToColor(item.categoryName),
                                }}
                              />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">
                                {item.categoryName}:{" "}
                                {fmt.format(item.recommendedLimit)} (
                                {pct.toFixed(1)}%)
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )
                    })}
                  {savingsTarget > 0 && effectiveIncome > 0 && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className="h-full transition-all duration-300 last:rounded-r-full"
                            style={{
                              width: `${Math.max(
                                (savingsTarget / effectiveIncome) * 100,
                                1
                              )}%`,
                              backgroundColor: "#22c55e",
                              opacity: 0.6,
                            }}
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">
                            Savings: {fmt.format(savingsTarget)} (
                            {savingsPercent.toFixed(1)}%)
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </div>
            )}

            {/* Category Breakdown */}
            <ScrollArea className="h-[200px] pr-3">
              <div className="space-y-1.5">
                {aiItems
                  .filter((i) => i.recommendedLimit > 0)
                  .sort((a, b) => b.recommendedLimit - a.recommendedLimit)
                  .map((item) => (
                    <div
                      key={item.categoryId}
                      className="flex items-center justify-between py-1.5 text-sm"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                          style={{
                            backgroundColor:
                              item.color || stringToColor(item.categoryName),
                          }}
                        />
                        <span className="truncate">{item.categoryName}</span>
                      </div>
                      <span className="font-medium tabular-nums flex-shrink-0 ml-3">
                        {fmt.format(item.recommendedLimit)}
                      </span>
                    </div>
                  ))}
              </div>
            </ScrollArea>
          </div>
        )
    }
  }

  /* ── Titles ── */

  const stepTitle = () => {
    switch (step) {
      case "setup":
        return `Create Budget for ${MONTH_NAMES[month - 1]} ${year}`
      case "goals":
        return "Set Your Goals"
      case "ai-budget":
        return "AI Budget Recommendations"
      case "review":
        return "Review & Create"
    }
  }

  const stepDescription = () => {
    switch (step) {
      case "setup":
        return "Choose your budget mode and confirm your income"
      case "goals":
        return "Set a savings target and configure rollover"
      case "ai-budget":
        return "Adjust the AI-suggested amounts for each category"
      case "review":
        return "Review your budget and create it"
    }
  }

  const canGoNext = () => {
    switch (step) {
      case "setup":
        return effectiveIncome > 0
      case "goals":
        return true
      case "ai-budget":
        return aiItems.some((i) => i.recommendedLimit > 0) && !aiLoading
      case "review":
        return false
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{stepTitle()}</DialogTitle>
          <DialogDescription>{stepDescription()}</DialogDescription>
        </DialogHeader>

        <StepIndicator currentStep={step} />

        <div className="min-h-[320px]">{renderStep()}</div>

        <DialogFooter>
          <div className="flex gap-2 w-full">
            {step !== "setup" && (
              <Button
                variant="outline"
                onClick={goBack}
                disabled={isPending || aiLoading}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
            )}
            <div className="flex-1" />
            {step !== "review" ? (
              <Button
                onClick={goNext}
                disabled={!canGoNext() || isPending}
              >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleCreate}
                disabled={
                  isPending ||
                  aiItems.filter((i) => i.recommendedLimit > 0).length ===
                    0
                }
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Budget"
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ─── Helpers ─── */

function stringToColor(str: string): string {
  const colors = [
    "#ef4444", "#f97316", "#f59e0b", "#84cc16",
    "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
    "#6366f1", "#8b5cf6", "#a855f7", "#ec4899",
  ]
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}
