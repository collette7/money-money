"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { ChevronRight, TrendingUp, Receipt, RotateCcw, FileText } from "lucide-react"
import { endOfMonth, startOfMonth, format } from "date-fns"

const navigation = [
  {
    name: "Overview",
    href: "/spending/breakdown",
    icon: TrendingUp,
    description: "Budget progress & spending insights",
  },
  {
    name: "Transactions",
    href: "/spending/transactions",
    icon: Receipt,
    description: "Review & categorize transactions",
  },
  {
    name: "Recurring",
    href: "/spending/recurring",
    icon: RotateCcw,
    description: "Subscriptions & recurring bills",
  },
  {
    name: "Reports",
    href: "/spending/reports",
    icon: FileText,
    description: "Detailed spending analysis",
  },
]

export function SpendingShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const currentDate = new Date()
  const dateRange = `${format(startOfMonth(currentDate), 'MMM d')} - ${format(endOfMonth(currentDate), 'MMM d, yyyy')}`
  
  const currentSection = navigation.find(item => pathname === item.href)

  return (
    <div className="spending-layout">
      <div className="spending-layout__header">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-title font-bold text-foreground">Spending</h1>
            <p className="text-detail text-muted-foreground mt-1">{dateRange}</p>
          </div>
        </div>

        <nav className="spending-nav" role="navigation" aria-label="Spending sections">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "spending-nav__item",
                    "group relative flex flex-col gap-1 rounded-lg border p-4 transition-all",
                    "hover:bg-muted/50 hover:border-foreground/20",
                    isActive && "bg-muted border-foreground/20"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Icon className={cn(
                        "w-5 h-5",
                        isActive ? "text-foreground" : "text-muted-foreground"
                      )} />
                      <div>
                        <h3 className={cn(
                          "font-medium",
                          isActive ? "text-foreground" : "text-foreground/80"
                        )}>
                          {item.name}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.description}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className={cn(
                      "w-4 h-4 transition-transform",
                      "text-muted-foreground group-hover:text-foreground",
                      "group-hover:translate-x-0.5"
                    )} />
                  </div>
                </Link>
              )
            })}
          </div>
        </nav>
      </div>

      <div className="spending-layout__content mt-8">
        {currentSection && (
          <div className="mb-6">
            <h2 className="text-heading font-bold text-foreground flex items-center gap-2">
              <currentSection.icon className="w-5 h-5" />
              {currentSection.name}
            </h2>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}