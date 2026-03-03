"use client"

import { useState, useTransition } from "react"
import { Pencil } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createBudget, getBudget, updateBudgetItem } from "@/app/(dashboard)/budgets/actions"

interface BudgetEditPopoverProps {
  categoryId: string
  categoryName: string
  currentLimit: number
  month: number
  year: number
  onUpdated?: () => void
}

export function BudgetEditPopover({
  categoryId,
  categoryName,
  currentLimit,
  month,
  year,
  onUpdated,
}: BudgetEditPopoverProps) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState(currentLimit.toString())
  const [isPending, startTransition] = useTransition()

  const handleSave = () => {
    const newAmount = parseFloat(amount)
    if (isNaN(newAmount) || newAmount < 0) return

    startTransition(async () => {
      try {
        const budget = await getBudget(month, year)
        
        if (!budget) {
          await createBudget(month, year, [{ categoryId, limitAmount: newAmount }], "independent")
        } else {
          const budgetItem = budget.budget_items?.find(item => item.category_id === categoryId)
          
          if (budgetItem?.id) {
            await updateBudgetItem(budgetItem.id, newAmount)
          } else {
            await createBudget(month, year, [{ categoryId, limitAmount: newAmount }], budget.mode as any)
          }
        }
        
        setOpen(false)
        onUpdated?.()
      } catch (error) {
        console.error("Failed to update budget:", error)
      }
    })
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-auto p-1 hover:bg-transparent"
          onClick={(e) => {
            e.stopPropagation()
          }}
        >
          <Pencil className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Budget for {categoryName}</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">$</span>
              <Input
                id="amount"
                type="number"
                min="0"
                step="10"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave()
                }}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isPending || parseFloat(amount) === currentLimit}
            >
              {isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}