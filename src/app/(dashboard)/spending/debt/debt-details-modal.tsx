"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateDebtDetails } from "../actions-debt"
import type { DebtAccount } from "../actions-debt"

type DebtDetailsModalProps = {
  debt: DebtAccount | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: () => void
}

export function DebtDetailsModal({ debt, open, onOpenChange, onUpdate }: DebtDetailsModalProps) {
  const [originalBalance, setOriginalBalance] = useState(debt?.originalBalance || 0)
  const [interestRate, setInterestRate] = useState(debt?.interestRate || 0)
  const [monthlyPayment, setMonthlyPayment] = useState(debt?.monthlyPayment || 0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!debt) return
    
    setIsSubmitting(true)
    try {
      await updateDebtDetails(debt.id, {
        original_balance: originalBalance,
        interest_rate: interestRate,
        monthly_payment: monthlyPayment,
      })
      onUpdate()
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to update debt details:', error)
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Debt Details</DialogTitle>
          <DialogDescription>
            Update the details for {debt?.name}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="original" className="text-right">
                Original Balance
              </Label>
              <Input
                id="original"
                type="number"
                min="0"
                step="0.01"
                value={originalBalance}
                onChange={(e) => setOriginalBalance(parseFloat(e.target.value) || 0)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="rate" className="text-right">
                Interest Rate (%)
              </Label>
              <Input
                id="rate"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={interestRate}
                onChange={(e) => setInterestRate(parseFloat(e.target.value) || 0)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="payment" className="text-right">
                Monthly Payment
              </Label>
              <Input
                id="payment"
                type="number"
                min="0"
                step="1"
                value={monthlyPayment}
                onChange={(e) => setMonthlyPayment(parseFloat(e.target.value) || 0)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}