"use client"

import { useState } from "react"
import { Sensitive } from "@/components/sensitive"
import { ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { CategoryBreakdownChart } from "./category-breakdown-chart"
import { SpendingTrendsChart } from "./spending-trends-chart"
import { UpcomingBillsList } from "./upcoming-bills-list"

type CategoryData = {
  id: string
  name: string
  amount: number
  icon: string | null
  color: string | null
}

type BudgetData = {
  categoryId: string
  amount: number
}

type RecurringBill = {
  id: string
  merchantName: string
  expectedAmount: number
  nextDate: string
  frequency: string
}

type SpendingTrend = {
  month: string
  totalExpenses: number
  totalIncome: number
}

type SpendingInsightsProps = {
  categoryBreakdown: CategoryData[]
  budgetsByCategory: BudgetData[]
  recurringBills: RecurringBill[]
  spendingTrends: SpendingTrend[]
}

export function SpendingInsights({
  categoryBreakdown,
  budgetsByCategory,
  recurringBills,
  spendingTrends,
}: SpendingInsightsProps) {
  const [openSections, setOpenSections] = useState({
    categories: true,
    trends: false,
    upcoming: false,
  })

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  const enrichedCategories = categoryBreakdown.map(category => {
    const budget = budgetsByCategory.find(b => b.categoryId === category.id)
    return {
      ...category,
      budget: budget?.amount || 0,
      percentUsed: budget ? (category.amount / budget.amount) * 100 : 0,
    }
  })

  return (
    <div className="spending-insights space-y-6">
      <div className="spending-section">
        <button
          onClick={() => toggleSection('categories')}
          className="spending-section__header"
        >
          <h2 className="spending-section__title">Category Breakdown</h2>
          <ChevronDown
            className={cn(
              "w-5 h-5 transition-transform",
              "spending-section__toggle",
              openSections.categories && "spending-section__toggle--open"
            )}
          />
        </button>
        {openSections.categories && (
          <div className="spending-section__content">
            <CategoryBreakdownChart categories={enrichedCategories} />
          </div>
        )}
      </div>

      <div className="spending-section">
        <button
          onClick={() => toggleSection('trends')}
          className="spending-section__header"
        >
          <h2 className="spending-section__title">Spending Trends</h2>
          <ChevronDown
            className={cn(
              "w-5 h-5 transition-transform",
              "spending-section__toggle",
              openSections.trends && "spending-section__toggle--open"
            )}
          />
        </button>
        {openSections.trends && (
          <div className="spending-section__content">
            <SpendingTrendsChart data={spendingTrends} />
          </div>
        )}
      </div>

      <div className="spending-section">
        <button
          onClick={() => toggleSection('upcoming')}
          className="spending-section__header"
        >
          <h2 className="spending-section__title">
            Upcoming Bills ({recurringBills.length})
          </h2>
          <ChevronDown
            className={cn(
              "w-5 h-5 transition-transform",
              "spending-section__toggle",
              openSections.upcoming && "spending-section__toggle--open"
            )}
          />
        </button>
        {openSections.upcoming && (
          <div className="spending-section__content">
            <UpcomingBillsList bills={recurringBills} />
          </div>
        )}
      </div>
    </div>
  )
}