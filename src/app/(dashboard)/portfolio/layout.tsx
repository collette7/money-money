"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export default function PortfolioLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex-1 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Portfolio</h1>
      </div>
      <Tabs />
      <div className="mt-6">{children}</div>
    </div>
  )
}

function Tabs() {
  const pathname = usePathname()
  const isOverview = pathname === "/portfolio"
  const isHoldings = pathname.includes("/portfolio/holdings")

  return (
    <div className="border-b">
      <nav className="-mb-px flex space-x-8">
        <Link
          href="/portfolio"
          className={cn(
            "whitespace-nowrap border-b-2 px-1 pb-4 text-sm font-medium transition-colors hover:text-foreground",
            isOverview
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground"
          )}
        >
          Overview
        </Link>
        <Link
          href="/portfolio/holdings"
          className={cn(
            "whitespace-nowrap border-b-2 px-1 pb-4 text-sm font-medium transition-colors hover:text-foreground",
            isHoldings
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground"
          )}
        >
          Holdings
        </Link>
      </nav>
    </div>
  )
}
