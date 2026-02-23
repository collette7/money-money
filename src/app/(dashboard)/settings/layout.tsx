"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex-1 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage your preferences, rules, and account settings.
        </p>
      </div>
      <SettingsTabs />
      <div className="mt-6">{children}</div>
    </div>
  )
}

function SettingsTabs() {
  const pathname = usePathname()
  const isGeneral = pathname === "/settings"
  const isRules = pathname === "/settings/rules"

  return (
    <div className="border-b">
      <nav className="-mb-px flex space-x-8">
        <Link
          href="/settings"
          className={cn(
            "whitespace-nowrap border-b-2 px-1 pb-4 text-sm font-medium transition-colors hover:text-foreground",
            isGeneral
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground"
          )}
        >
          General
        </Link>
        <Link
          href="/settings/rules"
          className={cn(
            "whitespace-nowrap border-b-2 px-1 pb-4 text-sm font-medium transition-colors hover:text-foreground",
            isRules
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground"
          )}
        >
          Rules
        </Link>
      </nav>
    </div>
  )
}
