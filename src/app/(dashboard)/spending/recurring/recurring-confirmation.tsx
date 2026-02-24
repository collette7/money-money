"use client"

import { useState, useTransition, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Undo2 } from "lucide-react"
import {
  confirmRecurringPattern,
  dismissRecurringPattern,
  undoDismissRecurringPattern,
} from "@/lib/recurring/actions"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastViewport,
} from "@/components/ui/toast"
import { Button } from "@/components/ui/button"
import type { RecurringFrequency } from "@/types/database"
import { MerchantLogo } from "@/components/merchant-logo"

interface DetectedPattern {
  id: string
  merchant_name: string | null
  description: string
  amount: number
  date: string
  accounts?: {
    id: string
    name: string
    account_type: string
    institution_name: string
  } | null
  pattern: {
    avg_amount: number
    occurrences: number
    avg_interval_days: number
    estimated_frequency: string
  }
}

interface RecurringConfirmationProps {
  potentialRecurring: DetectedPattern[]
}

function getDueInfo(dateStr: string): { label: string; isUrgent: boolean } {
  const txDate = new Date(dateStr)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const nextDue = new Date(now.getFullYear(), now.getMonth(), txDate.getDate())
  if (nextDue < now) {
    nextDue.setMonth(nextDue.getMonth() + 1)
  }
  const diffDays = Math.round((nextDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return { label: "Due today", isUrgent: true }
  if (diffDays === 1) return { label: "Due tomorrow", isUrgent: true }
  if (diffDays <= 7) return { label: `Due in ${diffDays} days`, isUrgent: true }

  return {
    label: `Due on ${nextDue.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
    isUrgent: false,
  }
}

function mapFrequency(estimated: string): RecurringFrequency {
  switch (estimated) {
    case "weekly": return "weekly"
    case "biweekly": return "biweekly"
    case "quarterly": return "quarterly"
    case "yearly": return "annual"
    default: return "monthly"
  }
}

export function RecurringConfirmation({ potentialRecurring }: RecurringConfirmationProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set())
  const [undoState, setUndoState] = useState<{
    ruleId: string
    merchantName: string
  } | null>(null)
  const [toastOpen, setToastOpen] = useState(false)

  const handleConfirm = useCallback((pattern: DetectedPattern) => {
    const name = pattern.merchant_name || pattern.description
    const freq = mapFrequency(pattern.pattern.estimated_frequency)
    const expectedDay = new Date(pattern.date).getDate()

    startTransition(async () => {
      await confirmRecurringPattern({
        merchantName: name,
        merchantPattern: pattern.merchant_name || pattern.description,
        expectedAmount: Math.abs(pattern.pattern.avg_amount),
        frequency: freq,
        expectedDay,
        occurrenceCount: pattern.pattern.occurrences,
      })
      setHiddenIds((prev) => new Set(prev).add(pattern.id))
      router.refresh()
    })
  }, [router])

  const handleDismiss = useCallback((pattern: DetectedPattern) => {
    const name = pattern.merchant_name || pattern.description
    const freq = mapFrequency(pattern.pattern.estimated_frequency)

    startTransition(async () => {
      const result = await dismissRecurringPattern({
        merchantName: name,
        merchantPattern: pattern.merchant_name || pattern.description,
        expectedAmount: Math.abs(pattern.pattern.avg_amount),
        frequency: freq,
      })
      setHiddenIds((prev) => new Set(prev).add(pattern.id))
      setUndoState({ ruleId: result.id, merchantName: name })
      setToastOpen(true)
      router.refresh()
    })
  }, [router])

  const handleUndo = useCallback(() => {
    if (!undoState) return
    const { ruleId } = undoState
    startTransition(async () => {
      await undoDismissRecurringPattern(ruleId)
      setToastOpen(false)
      setUndoState(null)
      setHiddenIds(new Set())
      router.refresh()
    })
  }, [undoState, router])

  const visiblePatterns = potentialRecurring.filter(
    (p) => !hiddenIds.has(p.id)
  )

  return (
    <>
      <div className="bg-white dark:bg-gray-950 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="pt-5 pb-1">
          <h3 className="text-xs font-semibold tracking-widest text-gray-400 dark:text-gray-500 uppercase px-6">
            Is this recurring?
          </h3>
        </div>
        <div className="border-t border-gray-100 dark:border-gray-800" />
        <div className="pb-6 pt-2">
          {visiblePatterns.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8 px-6">
              No potential recurring transactions detected at this time.
            </p>
          ) : (
            <div className="space-y-3 px-4">
              {visiblePatterns.map((pattern) => {
                const name = pattern.merchant_name || pattern.description
                const due = getDueInfo(pattern.date)
                const freq = pattern.pattern.estimated_frequency
                const freqLabel = freq === "yearly" ? "Yearly"
                  : freq === "weekly" ? "Weekly"
                  : freq === "biweekly" ? "Biweekly"
                  : freq === "quarterly" ? "Quarterly"
                  : "Monthly"

                return (
                  <div
                    key={pattern.id}
                    className="border border-gray-100 dark:border-gray-800 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-3 gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <MerchantLogo merchantName={name} size="lg" />
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            <span>{freqLabel}</span>
                            <span className="mx-1">&bull;</span>
                            <span className={due.isUrgent ? "text-[#EF4444]" : ""}>
                              {due.label}
                            </span>
                            <span className="mx-1">&bull;</span>
                            <span>{pattern.pattern.occurrences} charges</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <span className="text-[13px] font-bold tabular-nums text-gray-900 dark:text-gray-100">
                          ${Math.abs(pattern.pattern.avg_amount).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        className="flex-1 py-2 rounded-lg border border-[#EF4444] text-[#EF4444] text-sm font-medium transition-colors hover:bg-[#EF4444]/5 disabled:opacity-50"
                        onClick={() => handleDismiss(pattern)}
                        disabled={isPending}
                      >
                        No
                      </button>
                      <button
                        type="button"
                        className="flex-1 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800 disabled:opacity-50"
                        onClick={() => handleConfirm(pattern)}
                        disabled={isPending}
                      >
                        Yes
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <ToastProvider>
        <Toast open={toastOpen} onOpenChange={setToastOpen} className="max-w-md">
          <div className="flex items-center gap-3">
            <ToastDescription>
              {undoState?.merchantName} dismissed
            </ToastDescription>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0"
              onClick={(e) => {
                e.preventDefault()
                handleUndo()
              }}
            >
              <Undo2 className="size-4 mr-1" />
              Undo
            </Button>
          </div>
          <ToastClose />
        </Toast>
        <ToastViewport className="p-6" />
      </ToastProvider>
    </>
  )
}