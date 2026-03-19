"use client"

import { Sensitive } from "@/components/sensitive"
import { ContextualValue } from "@/components/contextual-value"
import { cn } from "@/lib/utils"

type Category = {
  id: string
  name: string
  amount: number
  icon: string | null
  color: string | null
  budget: number
  percentUsed: number
}

type CategoryBreakdownChartProps = {
  categories: Category[]
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { 
    style: "currency", 
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(value))

export function CategoryBreakdownChart({ categories }: CategoryBreakdownChartProps) {
  const topCategories = categories.slice(0, 6)
  
  return (
    <div className="space-y-4">
      {topCategories.map((category) => {
        const progressStatus = category.budget
          ? category.percentUsed > 100
            ? 'over'
            : category.percentUsed > 75
            ? 'warning'
            : 'safe'
          : 'safe'
          
        return (
          <div key={category.id} className="spending-card">
            <div className="spending-card__header">
              <div className="spending-card__label">
                {category.icon && (
                  <span className="spending-card__icon">{category.icon}</span>
                )}
                <span>{category.name}</span>
              </div>
              <button className="spending-card__action">Details</button>
            </div>
            
            <div className="spending-card__body">
              <ContextualValue
                value={category.amount}
                format="currency"
                comparison={category.budget > 0 ? {
                  value: category.budget,
                  label: 'budget',
                  type: 'budget'
                } : undefined}
                size="lg"
              />
              
              {category.budget > 0 && (
                <div className="spending-card__context mt-2">
                  <div
                    className={cn(
                      "spending-card__progress",
                      `spending-card__progress--${progressStatus}`
                    )}
                    style={{ '--progress': `${Math.min(category.percentUsed, 100)}%` } as any}
                  />
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}