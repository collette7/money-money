"use client"

import { cn } from "@/lib/utils"

export type HomeTab = "overview" | "networth"

const TABS: { key: HomeTab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "networth", label: "Net worth" },
]

export function HomePageTabs({
  active,
  onChange,
}: {
  active: HomeTab
  onChange: (tab: HomeTab) => void
}) {
  return (
    <div className="flex items-center gap-1 rounded-full border p-1">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={cn(
            "rounded-full px-4 py-1 text-sm font-medium transition-colors",
            active === tab.key
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
