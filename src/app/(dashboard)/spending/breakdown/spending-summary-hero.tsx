"use client"

import { Sensitive } from "@/components/sensitive"
import { Button } from "@/components/ui/button"
import { CelebrationBadge } from "@/components/celebration-badge"
import { ArrowRight, TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useEntranceAnimation, TIMING } from "@/hooks/use-entrance-animation"
import "@/app/spending.css"

type SpendingSummaryHeroProps = {
  totalSpent: number
  budgetComparison: {
    amount: number
    spent: number
    remaining: number
    percentUsed: number
    status: 'safe' | 'warning' | 'over'
  } | null
  daysLeft: number
  projectedTotal: number
  monthName: string
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { 
    style: "currency", 
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(value))

export function SpendingSummaryHero({
  totalSpent,
  budgetComparison,
  daysLeft,
  projectedTotal,
  monthName,
}: SpendingSummaryHeroProps) {
  const isOverBudget = budgetComparison && budgetComparison.status === 'over'
  const isWarning = budgetComparison && budgetComparison.status === 'warning'
  const stage = useEntranceAnimation(TIMING.heroFade)
  
  return (
    <div className={cn("spending-summary__hero", stage && "animate-in")}>
      <div className="spending-summary__primary">
        <h1 className={cn("spending-summary__value", stage && "animate-scale-in")}>
          <Sensitive>{formatCurrency(totalSpent)}</Sensitive>
        </h1>
        <p className={cn("spending-summary__context", stage && "animate-fade-in")}>
          spent in {monthName}
        </p>
      </div>

      {budgetComparison && (
        <>
          <div 
            className={cn(
              "spending-summary__status",
              {
                "spending-summary__status--safe": budgetComparison.status === 'safe',
                "spending-summary__status--warning": budgetComparison.status === 'warning',
                "spending-summary__status--over": budgetComparison.status === 'over',
              }
            )}
          >
            {budgetComparison.status === 'safe' && (
              <>
                <TrendingDown className="w-4 h-4" />
                <span>
                  <Sensitive>{formatCurrency(budgetComparison.remaining)}</Sensitive> under budget
                </span>
              </>
            )}
            {budgetComparison.status === 'warning' && (
              <>
                <TrendingUp className="w-4 h-4" />
                <span>Approaching budget limit</span>
              </>
            )}
            {budgetComparison.status === 'over' && (
              <>
                <TrendingUp className="w-4 h-4" />
                <span>
                  <Sensitive>{formatCurrency(Math.abs(budgetComparison.remaining))}</Sensitive> over budget
                </span>
              </>
            )}
          </div>
          
          {budgetComparison.status === 'safe' && budgetComparison.percentUsed < 50 && (
            <div className="mt-4 flex justify-center">
              <CelebrationBadge
                type="under-budget"
                message="Great job staying under budget!"
                value={`${(100 - budgetComparison.percentUsed).toFixed(0)}% remaining`}
                animate
              />
            </div>
          )}
        </>
      )}

      <div className="flex items-center justify-center gap-4 mt-4 text-sm text-muted-foreground">
        <span>{daysLeft} days left</span>
        <span>•</span>
        <span>Projected: <Sensitive>{formatCurrency(projectedTotal)}</Sensitive></span>
      </div>

      <div className="spending-summary__actions">
        <Button variant="default" asChild>
          <Link href="/spending/transactions">
            Review transactions
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/budgets">
            Adjust budget
          </Link>
        </Button>
      </div>
    </div>
  )
}