"use client"

import { useEffect, useState } from "react"
import { useFormStatus } from "react-dom"
import { KeyRound, Loader2, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const STATUS_MESSAGES = [
  "Establishing secure connection…",
  "Claiming your SimpleFIN token…",
  "Fetching account details…",
  "Syncing transactions…",
]

function ConnectSubmitButton() {
  const { pending } = useFormStatus()
  const [messageIndex, setMessageIndex] = useState(0)

  useEffect(() => {
    if (!pending) {
      setMessageIndex(0)
      return
    }

    const interval = setInterval(() => {
      setMessageIndex((prev) =>
        prev < STATUS_MESSAGES.length - 1 ? prev + 1 : prev
      )
    }, 2500)

    return () => clearInterval(interval)
  }, [pending])

  return (
    <div className="space-y-4">
      {pending && (
        <div className="rounded-lg border bg-muted/50 p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex size-9 shrink-0 items-center justify-center">
              <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
              <Loader2 className="size-5 animate-spin text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Connecting your accounts…</p>
              <p className="mt-0.5 text-xs text-muted-foreground transition-all">
                {STATUS_MESSAGES[messageIndex]}
              </p>
            </div>
          </div>
          <div className="mt-3 flex gap-1">
            {STATUS_MESSAGES.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors duration-500",
                  i <= messageIndex
                    ? "bg-primary"
                    : "bg-primary/20"
                )}
              />
            ))}
          </div>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Connecting…
          </>
        ) : (
          <>
            <KeyRound className="size-4" />
            Connect Accounts
          </>
        )}
      </Button>

      {pending && (
        <p className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
          <ShieldCheck className="size-3" />
          Your credentials are encrypted and never stored
        </p>
      )}
    </div>
  )
}

export { ConnectSubmitButton }
