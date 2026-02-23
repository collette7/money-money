"use client"

import { useState, useTransition } from "react"
import { CheckCircle2, Loader2, RefreshCw, XCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { syncAccounts } from "./actions"

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

  const handleSync = () => {
    if (isPending) return

    setSyncState("syncing")
    setStatusMessage("Connecting to your accounts…")

    startTransition(async () => {
      try {
        setStatusMessage("Connecting to your accounts…")
        await new Promise((resolve) => setTimeout(resolve, 500))

        setStatusMessage("Syncing transactions…")
        const result = await syncAccounts()

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
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size={size}
            onClick={handleSync}
            disabled={isPending}
            className={cn(
              "gap-1.5 transition-colors",
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
    </TooltipProvider>
  )
}

export { SyncButton }
