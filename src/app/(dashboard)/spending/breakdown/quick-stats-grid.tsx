"use client"

import { Sensitive } from "@/components/sensitive"
import { TrendingUp, TrendingDown, DollarSign, Activity } from "lucide-react"
import { useStaggeredEntrance, TIMING } from "@/hooks/use-entrance-animation"
import { cn } from "@/lib/utils"

type QuickStatsGridProps = {
  dailyAverage: number
  totalIncome: number
  netCashFlow: number
  transactionCount: number
  lastMonthComparison: number
  currentMonthExpenses: number
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { 
    style: "currency", 
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(value))

const formatCompactCurrency = (value: number) => {
  if (Math.abs(value) >= 1000) {
    return `$${(Math.abs(value) / 1000).toFixed(1)}k`
  }
  return formatCurrency(value)
}

export function QuickStatsGrid({
  dailyAverage,
  totalIncome,
  netCashFlow,
  transactionCount,
  lastMonthComparison,
  currentMonthExpenses,
}: QuickStatsGridProps) {
  const monthOverMonthChange = lastMonthComparison 
    ? ((currentMonthExpenses - lastMonthComparison) / lastMonthComparison) * 100
    : 0
  
  const visibleItems = useStaggeredEntrance(4, TIMING.statsStagger, 100)

  const stats = [
    {
      label: "Daily Average",
      value: formatCompactCurrency(dailyAverage),
      icon: Activity,
      comparison: "spending per day",
    },
    {
      label: "Total Income",
      value: formatCompactCurrency(totalIncome),
      icon: DollarSign,
      comparison: "this month",
      valueClass: "text-income",
    },
    {
      label: "Net Cash Flow",
      value: formatCompactCurrency(netCashFlow),
      icon: netCashFlow >= 0 ? TrendingUp : TrendingDown,
      comparison: netCashFlow >= 0 ? "surplus" : "deficit",
      valueClass: netCashFlow >= 0 ? "text-income" : "text-expense",
    },
    {
      label: "Month over Month",
      value: `${monthOverMonthChange >= 0 ? '+' : ''}${monthOverMonthChange.toFixed(0)}%`,
      icon: monthOverMonthChange >= 0 ? TrendingUp : TrendingDown,
      comparison: "vs last month",
      valueClass: monthOverMonthChange >= 0 ? "text-expense" : "text-income",
    },
  ]

  return (
    <div className="spending-stats">
      {stats.map((stat, index) => {
        const Icon = stat.icon
        return (
          <div 
            key={index} 
            className={cn(
              "spending-stats__card",
              visibleItems.includes(index) && "animate-slide-in-bottom"
            )}
            style={{
              opacity: visibleItems.includes(index) ? 1 : 0,
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="spending-stats__label">{stat.label}</span>
              <Icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="spending-stats__value">
              <span className={stat.valueClass}>
                <Sensitive>{stat.value}</Sensitive>
              </span>
            </div>
            <div className="spending-stats__comparison">
              {stat.comparison}
            </div>
          </div>
        )
      })}
    </div>
  )
}