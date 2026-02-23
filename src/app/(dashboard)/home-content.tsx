"use client"

import { useState } from "react"
import Link from "next/link"
import { CreditCard, Plus } from "lucide-react"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { cn } from "@/lib/utils"
import { HomeNetWorthChart } from "./home-chart"
import { HomeSpendingHeatmap } from "./home-spending-heatmap"
import { HomeSidebarCards } from "./home-sidebar-cards"
import { HomePageTabs, type HomeTab } from "./home-tabs"


type Snapshot = {
  date: string
  net_worth: number
  total_assets: number | null
  total_liabilities: number | null
}

type RecentTransaction = {
  id: string
  merchant_name: string | null
  description: string
  date: string
  amount: number
  notes?: string | null
  tags?: string[] | null
  ignored?: boolean
  review_flagged?: boolean
  review_flagged_reason?: string | null
  category_confirmed?: boolean
  category_confidence?: number | null
  categorized_by?: string | null
  categories: { id: string; name: string; icon: string | null; color: string | null } | null
}

type DashboardData = {
  netWorth: number
  assets: number
  liabilities: number
  netWorthPctChange: number | null
  netWorthDollarChange: number | null
  snapshots: Snapshot[]
  hasAccounts: boolean
  userName: string
  monthLabel: string
  monthLabelTitle: string
  monthlySpent: number
  budgetTotal: number
  dailySpending: { date: string; total: number }[]
  recentTransactions: RecentTransaction[]
  lastMonthSpent: number
}

const compactCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

function NetWorthCard({
  data,
  expanded,
}: {
  data: DashboardData
  expanded?: boolean
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between mb-1">
        <Link
          href="/forecast"
          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
        >
          NET WORTH &rsaquo;
        </Link>
        <Link
          href="/forecast"
          className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors rounded-full border px-3 py-1"
        >
          Forecast &rsaquo;
        </Link>
      </div>
      <div className="flex items-baseline gap-3 mb-4">
        <span className="text-3xl font-bold tabular-nums tracking-tight">
          {compactCurrency(data.netWorth)}
        </span>
        {data.netWorthDollarChange !== null && data.netWorthPctChange !== null && (
          <span
            className={cn(
              "text-sm font-medium tabular-nums",
              data.netWorthPctChange >= 0 ? "text-emerald-600" : "text-rose-500"
            )}
          >
            {data.netWorthDollarChange >= 0 ? "+" : ""}
            {compactCurrency(data.netWorthDollarChange)}{" "}
            ({data.netWorthPctChange >= 0 ? "+" : ""}
            {data.netWorthPctChange.toFixed(1)}%)
          </span>
        )}
      </div>
      <HomeNetWorthChart snapshots={data.snapshots} />
      {expanded && (
        <div className="grid grid-cols-2 gap-4 mt-5 pt-5 border-t">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Assets</p>
            <p className="text-xl font-semibold tabular-nums text-emerald-600 mt-1">
              {compactCurrency(data.assets)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Liabilities</p>
            <p className="text-xl font-semibold tabular-nums text-rose-500 mt-1">
              {compactCurrency(data.liabilities)}
            </p>
          </div>
        </div>
      )}
    </Card>
  )
}

export function HomeContent({ data }: { data: DashboardData }) {
  const [activeTab, setActiveTab] = useState<HomeTab>("overview")

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          {getGreeting()}, {data.userName}
        </h1>
        <HomePageTabs active={activeTab} onChange={setActiveTab} />
      </div>

      {!data.hasAccounts ? (
        <div className="py-10">
          <EmptyState
            icon={<CreditCard className="size-6" />}
            title="Get started by connecting your accounts"
            description="Connect your bank accounts to automatically import transactions and track your finances in one place."
            actions={[
              {
                label: "Connect Account",
                asChild: true,
                children: <Link href="/accounts/connect">Connect Account</Link>,
              },
              {
                label: "Import Transactions",
                variant: "outline",
                asChild: true,
                children: <Link href="/accounts/import">Import Transactions</Link>,
              },
            ]}
          />
        </div>
      ) : null}

      {activeTab === "overview" && (
        <div className="grid gap-5 grid-cols-1 lg:grid-cols-[1fr_320px]">
          <div className="space-y-5 min-w-0">
            <NetWorthCard data={data} />

            <Link
              href="/accounts/connect"
              className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/25 py-3 text-sm font-medium text-muted-foreground hover:border-foreground/40 hover:text-foreground transition-colors"
            >
              <Plus className="size-4" />
              Add account
            </Link>

            <HomeSpendingHeatmap
              monthLabel={data.monthLabel}
              totalSpent={data.monthlySpent}
              dailySpending={data.dailySpending}
              recentTransactions={data.recentTransactions}
            />
          </div>

          <div className="hidden lg:block">
            <HomeSidebarCards
              monthLabel={data.monthLabelTitle}
              budgetSpent={data.monthlySpent}
              budgetTotal={data.budgetTotal}
              lastMonthSpent={data.lastMonthSpent}
            />
          </div>
        </div>
      )}

      {activeTab === "networth" && (
        <div className="max-w-3xl space-y-5">
          <NetWorthCard data={data} expanded />

          <Card className="p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              This Month
            </p>
            <p className="text-lg font-semibold mt-2 tabular-nums">
              {compactCurrency(data.monthlySpent)} spent
            </p>
            {data.budgetTotal > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                of {compactCurrency(data.budgetTotal)} budget
              </p>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
