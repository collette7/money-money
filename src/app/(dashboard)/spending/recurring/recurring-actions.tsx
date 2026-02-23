"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { MoreVertical, Edit2, Globe, XCircle, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  updateRecurringRule,
  deleteRecurringRule,
} from "@/lib/recurring/actions"
import { EditRecurringModal } from "./edit-recurring-modal"
import type { RecurringFrequency } from "@/types/database"

interface RecurringActionsProps {
  ruleId: string
  merchantName: string
  amount: number
  frequency: RecurringFrequency
  nextExpected: string | null
  expectedDay: number | null
  endDate: string | null
  stopAfter: number | null
}

export function RecurringActions({
  ruleId,
  merchantName,
  amount,
  frequency,
  nextExpected,
  expectedDay,
  endDate,
  stopAfter,
}: RecurringActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)

  const handleRemoveFromList = () => {
    startTransition(async () => {
      await deleteRecurringRule(ruleId)
      router.refresh()
    })
  }

  const handleGoToMerchant = () => {
    router.push(`/transactions?search=${encodeURIComponent(merchantName)}`)
  }

  const handleCancelMerchant = () => {
    setShowCancelDialog(false)
    startTransition(async () => {
      await updateRecurringRule(ruleId, { isActive: false, confirmed: false })
      router.refresh()
    })
  }

  const handleSave = (data: {
    amount: number
    frequency: string
    nextPaymentDate: string
    endDate: string | null
    stopAfter: number | null
  }) => {
    startTransition(async () => {
      await updateRecurringRule(ruleId, {
        expectedAmount: data.amount,
        frequency: data.frequency as RecurringFrequency,
        nextExpected: data.nextPaymentDate,
        expectedDay: new Date(data.nextPaymentDate + "T00:00:00").getDate(),
        endDate: data.endDate,
        stopAfter: data.stopAfter,
      })
      setShowEditModal(false)
      router.refresh()
    })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => setShowEditModal(true)}>
            <Edit2 className="mr-2 h-4 w-4" />
            Edit details
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleGoToMerchant}>
            <Globe className="mr-2 h-4 w-4" />
            Go to merchant
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleRemoveFromList} disabled={isPending}>
            <Trash2 className="mr-2 h-4 w-4" />
            Remove
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => setShowCancelDialog(true)}
          >
            <XCircle className="mr-2 h-4 w-4" />
            Cancel {merchantName}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Subscription</DialogTitle>
            <DialogDescription>
              This will remove {merchantName} from your recurring transactions.
              You&apos;ll need to cancel the subscription with the merchant directly.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Keep
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelMerchant}
              disabled={isPending}
            >
              Remove from recurring
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EditRecurringModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        merchantName={merchantName}
        amount={amount}
        frequency={frequency}
        nextExpected={nextExpected}
        endDate={endDate}
        stopAfter={stopAfter}
        onSave={handleSave}
      />
    </>
  )
}