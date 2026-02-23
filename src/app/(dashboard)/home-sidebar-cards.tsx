"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

type Props = {
  monthLabel: string
  budgetSpent: number
  budgetTotal: number
  lastMonthSpent: number
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

function PersonalRecapCard({
  title,
  subtitle,
  onDismiss,
}: {
  title: string
  subtitle: string
  onDismiss: () => void
}) {
  return (
    <Card className="p-4 relative overflow-hidden bg-gradient-to-br from-violet-50 via-blue-50 to-indigo-50 dark:from-violet-950/30 dark:via-blue-950/30 dark:to-indigo-950/30 border-violet-100 dark:border-violet-900/50">
      <button
        onClick={onDismiss}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        aria-label="Dismiss"
      >
        <X className="size-3.5 text-muted-foreground" />
      </button>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
        Personal Recap
      </p>
      <div className="flex items-center gap-3 mt-2">
        <div className="size-9 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-lg shrink-0">
          📊
        </div>
        <div className="min-w-0 pr-4">
          <p className="text-sm font-semibold truncate">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
      </div>
    </Card>
  )
}

function BudgetCard({ monthLabel, budgetSpent, budgetTotal }: Props) {
  const percentage = budgetTotal > 0 ? Math.round((budgetSpent / budgetTotal) * 100) : 0
  const hasBudget = budgetTotal > 0

  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
        Budget in {monthLabel}
      </p>
      {hasBudget ? (
        <>
          <p className="text-sm font-semibold mt-2">
            {formatCurrency(budgetSpent)} spent of {formatCurrency(budgetTotal)}
          </p>
          <Progress value={percentage} className="mt-3 h-2 bg-emerald-100 dark:bg-emerald-950/50 [&>div]:bg-emerald-500" />
          <p className="text-xs text-muted-foreground mt-2">{percentage}% of budget used</p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground mt-2">No budget set</p>
      )}
    </Card>
  )
}

function getLastMonthName() {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  return new Intl.DateTimeFormat("en-US", { month: "long" }).format(d)
}

function getDaysLeftInMonth() {
  const now = new Date()
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  return lastDay - now.getDate()
}

export function HomeSidebarCards(props: Props) {
  const [showSpendingRecap, setShowSpendingRecap] = useState(true)
  const [showBudgetRecap, setShowBudgetRecap] = useState(true)

  const { budgetSpent, budgetTotal, lastMonthSpent } = props

  const spendingDiff = budgetSpent - lastMonthSpent
  const spendingDirection = spendingDiff >= 0 ? "more" : "less"
  const spendingDiffAbs = Math.abs(spendingDiff)
  const spendingPct =
    lastMonthSpent > 0 ? Math.round((spendingDiffAbs / lastMonthSpent) * 100) : 0

  const hasBudget = budgetTotal > 0
  const budgetPct = hasBudget ? Math.round((budgetSpent / budgetTotal) * 100) : 0
  const daysLeft = getDaysLeftInMonth()

  const spendingTitle = `You've spent ${formatCurrency(budgetSpent)} this month`
  const spendingSubtitle =
    lastMonthSpent > 0
      ? `${spendingPct}% ${spendingDirection} than ${getLastMonthName()}`
      : "No spending data from last month"

  const budgetRecapTitle = hasBudget
    ? `Budget is ${budgetPct}% used with ${daysLeft} days remaining`
    : "Set up a budget to track spending"
  const budgetRecapSubtitle = hasBudget
    ? `${formatCurrency(budgetTotal - budgetSpent)} remaining of ${formatCurrency(budgetTotal)} budget`
    : "Go to Budgets to get started"

  return (
    <div className="space-y-4">
      {showSpendingRecap && (
        <PersonalRecapCard
          title={spendingTitle}
          subtitle={spendingSubtitle}
          onDismiss={() => setShowSpendingRecap(false)}
        />
      )}
      {showBudgetRecap && (
        <PersonalRecapCard
          title={budgetRecapTitle}
          subtitle={budgetRecapSubtitle}
          onDismiss={() => setShowBudgetRecap(false)}
        />
      )}
      <BudgetCard {...props} />
    </div>
  )
}
