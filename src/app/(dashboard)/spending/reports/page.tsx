"use client";

import { Suspense } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CategoryReportView } from "./category-report"
import { IncomeExpenseReportView } from "./income-expense-report"
import { BalanceReportView } from "./balance-report"
import { FileText } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function ReportsPage() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                Reports
              </h2>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="cash-flow" className="space-y-6">
              <TabsList className="bg-transparent p-0 h-auto border-b rounded-none w-full justify-start gap-6">
                <TabsTrigger
                  value="cash-flow"
                  className="rounded-none border-b-2 border-transparent px-0 pb-2 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none font-medium"
                >
                  Cash flow
                </TabsTrigger>
                <TabsTrigger
                  value="expenses"
                  className="rounded-none border-b-2 border-transparent px-0 pb-2 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none font-medium"
                >
                  Expenses
                </TabsTrigger>
                <TabsTrigger
                  value="income"
                  className="rounded-none border-b-2 border-transparent px-0 pb-2 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none font-medium"
                >
                  Income
                </TabsTrigger>
                <TabsTrigger
                  value="transfers"
                  className="rounded-none border-b-2 border-transparent px-0 pb-2 data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none font-medium"
                >
                  Transfers
                </TabsTrigger>
              </TabsList>

              <TabsContent value="cash-flow" className="space-y-6 mt-0">
                <Suspense fallback={<ReportSkeleton />}>
                  <IncomeExpenseReportView />
                </Suspense>
              </TabsContent>

              <TabsContent value="expenses" className="space-y-6 mt-0">
                <Suspense fallback={<ReportSkeleton />}>
                  <CategoryReportView />
                </Suspense>
              </TabsContent>

              <TabsContent value="income" className="space-y-6 mt-0">
                <Suspense fallback={<ReportSkeleton />}>
                  <BalanceReportView />
                </Suspense>
              </TabsContent>

              <TabsContent value="transfers" className="mt-0">
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="size-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">Transfer reports coming soon</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Track money movement between your accounts
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <div>
        <Card>
          <CardHeader>
            <CardTitle className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              Saved Reports
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Save filters for quick access to your most used reports.
            </p>
            <Button variant="outline" className="w-full">
              Save
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ReportSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-[300px] bg-muted animate-pulse rounded" />
      <div className="grid gap-4 grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 bg-muted animate-pulse rounded" />
        ))}
      </div>
    </div>
  )
}