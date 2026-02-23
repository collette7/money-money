"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { HelpCircle, LayoutGrid, Plus, Settings } from "lucide-react"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"

const PAGE_TITLES: Record<string, string> = {
  "/": "Home",
  "/accounts": "Accounts",
  "/spending": "Spending",
  "/spending/breakdown": "Spending",
  "/spending/transactions": "Spending",
  "/spending/recurring": "Spending",
  "/spending/reports": "Spending",

  "/forecast": "Forecast",
  "/advisor": "AI Advisor",
  "/settings": "Settings",
  "/settings/rules": "Settings",
}

function AppHeader({ userName = "Collette Smith" }: { userName?: string }) {
  const pathname = usePathname()
  const pageTitle = PAGE_TITLES[pathname] ?? "Home"
  const initials = userName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 !h-4" />

      <h1 className="text-base font-semibold">{pageTitle}</h1>

      <div className="ml-auto flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="size-8 rounded-lg bg-violet-600 text-white hover:bg-violet-700"
        >
          <LayoutGrid className="size-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="size-8 rounded-full bg-zinc-800 text-white hover:bg-zinc-700 dark:bg-zinc-200 dark:text-zinc-800 dark:hover:bg-zinc-300"
        >
          <span className="text-xs font-medium">{initials}</span>
        </Button>

        <Button variant="ghost" size="icon" className="size-8">
          <Plus className="size-4" />
        </Button>

        <Button variant="ghost" size="icon" className="size-8">
          <HelpCircle className="size-4" />
        </Button>

        <Button variant="ghost" size="icon" className="size-8" asChild>
          <Link href="/settings">
            <Settings className="size-4" />
          </Link>
        </Button>
      </div>
    </header>
  )
}

export { AppHeader }
