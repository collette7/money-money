"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

export function SpendingShell({
  firstName,
  children,
}: {
  firstName: string
  children: React.ReactNode
}) {
  return (
    <div className="flex-1 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {getGreeting()}, {firstName}
        </h1>
      </div>
      <Tabs />
      <div className="mt-6">{children}</div>
    </div>
  )
}

function Tabs() {
  const pathname = usePathname()
  const isBreakdown = pathname.includes("/spending/breakdown")
  const isTransactions = pathname.includes("/spending/transactions")
  const isRecurring = pathname.includes("/spending/recurring")
  const isReports = pathname.includes("/spending/reports")

  return (
    <div className="border-b">
      <nav className="-mb-px flex space-x-8">
        <Link
          href="/spending/breakdown"
          className={cn(
            "whitespace-nowrap border-b-2 px-1 pb-4 text-sm font-medium transition-colors hover:text-foreground",
            isBreakdown
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground"
          )}
        >
          Breakdown & budget
        </Link>
        <Link
          href="/spending/transactions"
          className={cn(
            "whitespace-nowrap border-b-2 px-1 pb-4 text-sm font-medium transition-colors hover:text-foreground",
            isTransactions
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground"
          )}
        >
          Transactions
        </Link>
        <Link
          href="/spending/recurring"
          className={cn(
            "whitespace-nowrap border-b-2 px-1 pb-4 text-sm font-medium transition-colors hover:text-foreground",
            isRecurring
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground"
          )}
        >
          Recurring
        </Link>
        <Link
          href="/spending/reports"
          className={cn(
            "whitespace-nowrap border-b-2 px-1 pb-4 text-sm font-medium transition-colors hover:text-foreground",
            isReports
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground"
          )}
        >
          Reports
        </Link>
      </nav>
    </div>
  )
}
