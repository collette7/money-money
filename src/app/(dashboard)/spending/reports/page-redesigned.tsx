"use client";

import { Suspense, useState } from "react"
import { Card } from "@/components/ui/card"
import { CategoryReportView } from "./category-report"
import { IncomeExpenseReportView } from "./income-expense-report"
import { BalanceReportView } from "./balance-report"
import { FileText, TrendingUp, PieChart, DollarSign, Repeat } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import "@/app/spending.css"

const reportSections = [
  {
    id: 'cash-flow',
    title: 'Cash Flow',
    description: 'Income vs expenses over time',
    icon: TrendingUp,
    component: IncomeExpenseReportView,
  },
  {
    id: 'expenses',
    title: 'Expense Analysis',
    description: 'Detailed category breakdown',
    icon: PieChart,
    component: CategoryReportView,
  },
  {
    id: 'income',
    title: 'Income Sources',
    description: 'Track your income streams',
    icon: DollarSign,
    component: BalanceReportView,
  },
  {
    id: 'transfers',
    title: 'Transfer Activity',
    description: 'Money movement between accounts',
    icon: Repeat,
    component: null,
  },
]

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState('cash-flow')
  const activeSection = reportSections.find(s => s.id === activeReport)
  const ActiveComponent = activeSection?.component

  return (
    <div className="reports-layout">
      <div className="reports-layout__grid">
        <div className="reports-layout__main">
          <Card className="p-0 overflow-hidden">
            <div className="reports-header">
              <h2 className="text-heading font-bold">Financial Reports</h2>
              <p className="text-detail text-muted-foreground mt-1">
                Analyze your spending patterns and financial trends
              </p>
            </div>

            <div className="reports-nav">
              {reportSections.map((section) => {
                const Icon = section.icon
                const isActive = section.id === activeReport
                
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveReport(section.id)}
                    className={cn(
                      "reports-nav__item",
                      isActive && "reports-nav__item--active"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <div className="text-left">
                      <h3 className="font-medium">{section.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {section.description}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="reports-content">
              {ActiveComponent ? (
                <Suspense fallback={<ReportSkeleton />}>
                  <ActiveComponent />
                </Suspense>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="size-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">Transfer reports coming soon</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Track money movement between your accounts
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="reports-layout__sidebar">
          <Card className="p-6">
            <h3 className="text-label text-muted-foreground mb-4">
              Report Actions
            </h3>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Save your current filters and date range for quick access.
              </p>
              <Button variant="outline" className="w-full">
                Save Report
              </Button>
              <Button variant="ghost" className="w-full">
                Export CSV
              </Button>
            </div>
          </Card>

          <Card className="p-6 mt-4">
            <h3 className="text-label text-muted-foreground mb-4">
              Report Tips
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Use date filters to focus on specific periods</li>
              <li>• Click categories to drill down into transactions</li>
              <li>• Compare months to identify spending trends</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  )
}

function ReportSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <div className="h-[300px] bg-muted animate-pulse rounded" />
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 bg-muted animate-pulse rounded" />
        ))}
      </div>
    </div>
  )
}