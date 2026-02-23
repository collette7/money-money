"use client"

import { useState, useTransition } from "react"
import { CheckCircle2, ChevronDown, History, Loader2, RefreshCw, XCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { syncAccounts, syncFullHistory } from "./actions"

interface SyncButtonProps {
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "icon"
  className?: string
}

function SyncButton({
  variant = "outline",
  size = "sm",
  className,
}: SyncButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [syncState, setSyncState] = useState<
    "idle" | "syncing" | "success" | "error"
  >("idle")
  const [statusMessage, setStatusMessage] = useState("")

  const runSync = (fullHistory: boolean) => {
    if (isPending) return

    setSyncState("syncing")
    setStatusMessage(fullHistory ? "Fetching full transaction history…" : "Connecting to your accounts…")

    startTransition(async () => {
      try {
        if (!fullHistory) {
          setStatusMessage("Connecting to your accounts…")
          await new Promise((resolve) => setTimeout(resolve, 500))
        }

        setStatusMessage(fullHistory ? "Fetching full transaction history… this may take a minute" : "Syncing transactions…")
        const result = fullHistory ? await syncFullHistory() : await syncAccounts()

        if (result.success) {
          setSyncState("success")
          setStatusMessage(
            `Synced ${result.accounts} account${result.accounts !== 1 ? "s" : ""}, ${result.transactions} transaction${result.transactions !== 1 ? "s" : ""}`
          )
          setTimeout(() => {
            setSyncState("idle")
            setStatusMessage("")
          }, 3000)
        } else {
          throw new Error(result.error || "Sync failed")
        }
      } catch (error) {
        console.error("Sync error:", error)
        setSyncState("error")
        setStatusMessage("Sync failed. Try again?")
        setTimeout(() => {
          setSyncState("idle")
          setStatusMessage("")
        }, 5000)
      }
    })
  }

  const getButtonContent = () => {
    if (size === "icon") return null
    if (syncState === "idle") return "Sync All"
    if (syncState === "syncing") return "Syncing…"
    if (syncState === "success") return "Synced"
    return "Failed"
  }

  const iconSize = size === "icon" ? "size-4" : "size-3.5"

  return (
    <TooltipProvider>
      <div className="flex items-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={variant}
              size={size}
              onClick={() => runSync(false)}
              disabled={isPending}
              className={cn(
                "gap-1.5 transition-colors rounded-r-none",
                syncState === "success" &&
                  "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300",
                syncState === "error" &&
                  "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20",
                className
              )}
            >
              {syncState === "syncing" ? (
                <Loader2 className={cn(iconSize, "animate-spin")} />
              ) : syncState === "success" ? (
                <CheckCircle2 className={iconSize} />
              ) : syncState === "error" ? (
                <XCircle className={iconSize} />
              ) : (
                <RefreshCw className={iconSize} />
              )}
              {getButtonContent()}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {statusMessage || "Sync all connected accounts"}
          </TooltipContent>
        </Tooltip>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={variant}
              size="icon"
              disabled={isPending}
              className={cn(
                "h-8 w-6 rounded-l-none border-l-0",
                syncState === "success" &&
                  "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20",
                syncState === "error" &&
                  "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20",
              )}
            >
              <ChevronDown className="size-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => runSync(false)}>
              <RefreshCw className="size-4" />
              Sync Recent
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => runSync(true)}>
              <History className="size-4" />
              Fetch Full History
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TooltipProvider>
  )
}

export { SyncButton }
