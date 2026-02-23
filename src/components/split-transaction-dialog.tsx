"use client"

import { useState } from "react"
import {
  ArrowLeft,
  ChevronRight,
  EyeOff,
  Plus,
  Scissors,
  Trash2,
  Users,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { CategoryPicker } from "@/components/category-picker"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { CategoryFormDialog } from "@/components/category-form-dialog"
import {
  useSplitTransactionDialog,
  type SplitEntry,
} from "@/components/use-split-transaction-dialog"

import type { TransactionForSheet } from "@/components/transaction-detail-sheet"

type Category = {
  id: string
  name: string
  icon: string | null
  color: string | null
  type: string
}

type SplitTransactionDialogProps = {
  transaction: TransactionForSheet | null
  categories: Category[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SplitTransactionDialog({
  transaction,
  categories,
  open,
  onOpenChange,
}: SplitTransactionDialogProps) {
  const {
    splits,
    hideTransaction,
    setHideTransaction,
    isPending,
    createCategoryOpen,
    setCreateCategoryOpen,
    activeSplitIndex,
    setActiveSplitIndex,
    equalSplitRef,
    totalAmount,
    merchantDisplay,
    splitsTotal,
    userShare,
    isOverBudget,
    canApply,
    handleEqualSplit,
    handleAddSplit,
    handleRemoveEntry,
    updateSplit,
    handleSplitCategoryCreated,
    handleApply,
    handleRemoveSplit,
    handleOpenChange,
    shortDate,
    currency,
  } = useSplitTransactionDialog({
    transaction,
    categories,
    open,
    onOpenChange,
  })

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="sm:max-w-md p-0 flex flex-col"
      >
        <SheetHeader className="border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onOpenChange(false)}
              className="size-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors -ml-1"
            >
              <ArrowLeft className="size-4" />
            </button>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                Split Transaction
              </SheetTitle>
              <SheetDescription className="sr-only">
                Split this transaction with other people
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="px-5 pt-5 pb-6 space-y-5">
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold tracking-tight">
                    {merchantDisplay}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {transaction ? shortDate(transaction.date) : "—"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold tabular-nums tracking-tight">
                    {currency(totalAmount)}
                  </p>
                  {transaction?.categories && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                      <span
                        className="size-1.5 rounded-full"
                        style={{
                          backgroundColor:
                            transaction.categories.color ?? "#94a3b8",
                        }}
                      />
                      {transaction.categories.name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <Button
                ref={equalSplitRef}
                variant="outline"
                size="sm"
                onClick={handleEqualSplit}
                className="text-xs font-medium h-9 rounded-lg"
              >
                <Users className="size-3.5" />
                Equal split
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddSplit}
                className="text-xs font-medium h-9 rounded-lg"
              >
                <Plus className="size-3.5" />
                Add split
                <span className="opacity-60 text-[10px]">(Alt+A)</span>
              </Button>
            </div>

            <div className="space-y-3">
              {splits.map((split, idx) => (
                <SplitEntryCard
                  key={split.id}
                  split={split}
                  index={idx}
                  categories={categories}
                  canRemove={splits.length > 1}
                  onUpdate={updateSplit}
                  onRemove={handleRemoveEntry}
                  onCreateCategory={() => {
                    setActiveSplitIndex(idx)
                    setCreateCategoryOpen(true)
                  }}
                />
              ))}
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Others owe
                </span>
                <span
                  className={cn(
                    "text-sm font-semibold tabular-nums",
                    isOverBudget && "text-red-500"
                  )}
                >
                  {currency(splitsTotal)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Your share
                </span>
                <span className="text-sm font-semibold tabular-nums">
                  {currency(userShare)}
                </span>
              </div>
              {isOverBudget && (
                <p className="text-[10px] text-red-500 font-medium">
                  Split total exceeds the transaction amount
                </p>
              )}
            </div>

            <div className="rounded-xl border border-border/60 divide-y divide-border/60">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <EyeOff className="size-3.5" />
                  Hide transaction
                </span>
                <Switch
                  checked={hideTransaction}
                  onCheckedChange={setHideTransaction}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-border px-5 py-3.5 flex items-center justify-between bg-muted/10">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemoveSplit}
            disabled={isPending}
            className="text-xs text-muted-foreground hover:text-red-600"
          >
            <Trash2 className="size-3" />
            Remove split
          </Button>
          <Button
            size="sm"
            onClick={handleApply}
            disabled={isPending || !canApply}
            className="text-xs bg-foreground text-background hover:bg-foreground/90"
          >
            {isPending ? (
              <span className="size-3 border-2 border-background/30 border-t-background rounded-full animate-spin" />
            ) : (
              <Scissors className="size-3" />
            )}
            {isPending ? "Applying..." : <>Apply split <span className="ml-1 opacity-60 text-[10px]">(Alt+S)</span></>}
          </Button>
        </div>
        <div className="sr-only">
          Press Alt+A to add a split. Press Alt+S to apply splits. Press Escape to close.
        </div>
      </SheetContent>

      <CategoryFormDialog
        open={createCategoryOpen}
        onOpenChange={setCreateCategoryOpen}
        onCreated={handleSplitCategoryCreated}
      />
    </Sheet>
  )
}

function SplitEntryCard({
  split,
  index,
  categories,
  canRemove,
  onUpdate,
  onRemove,
  onCreateCategory,
}: {
  split: SplitEntry
  index: number
  categories: Category[]
  canRemove: boolean
  onUpdate: (id: string, field: keyof SplitEntry, value: string) => void
  onRemove: (id: string) => void
  onCreateCategory: () => void
}) {
  const [catOpen, setCatOpen] = useState(false)

  const selectedCategory = categories.find((c) => c.id === split.categoryId)

  return (
    <div className="rounded-xl border border-border/60 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/20 border-b border-border/40">
        <div className="flex size-5 items-center justify-center rounded-full bg-foreground/10 text-[10px] font-bold text-foreground/60">
          {index + 1}
        </div>
        <input
          type="text"
          value={split.personName}
          onChange={(e) => onUpdate(split.id, "personName", e.target.value)}
          placeholder="Person's name"
          className="flex-1 text-sm font-medium bg-transparent outline-none placeholder:text-muted-foreground/40"
        />
        {canRemove && (
          <button
            onClick={() => onRemove(split.id)}
            className="size-6 rounded-md flex items-center justify-center hover:bg-destructive/10 hover:text-red-500 transition-colors text-muted-foreground/50"
          >
            <X className="size-3" />
          </button>
        )}
      </div>

      <div className="divide-y divide-border/40">
        <div className="flex items-center justify-between px-4 py-2.5">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Category
          </span>
          <Popover open={catOpen} onOpenChange={setCatOpen}>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-1.5 text-sm font-medium hover:text-foreground/80 transition-colors">
                {selectedCategory ? (
                  <>
                    {selectedCategory.icon && (
                      <span className="text-xs">{selectedCategory.icon}</span>
                    )}
                    <span
                      className="size-2 rounded-full shrink-0"
                      style={{
                        backgroundColor:
                          selectedCategory.color ?? "#94a3b8",
                      }}
                    />
                    {selectedCategory.name}
                  </>
                ) : (
                  <span className="text-muted-foreground/60">Same as original</span>
                )}
                <ChevronRight className="size-3 text-muted-foreground/50" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-0" align="end">
              <CategoryPicker
                categories={categories}
                selectedId={split.categoryId}
                onSelect={(cat) => {
                  onUpdate(split.id, "categoryId", cat.id)
                  setCatOpen(false)
                }}
                onCreateNew={onCreateCategory}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex items-center justify-between px-4 py-2.5">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Amount
          </span>
          <div className="flex items-center gap-1">
            <span className="text-sm text-muted-foreground/60">$</span>
            <input
              type="text"
              inputMode="decimal"
              value={split.amount}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9.]/g, "")
                onUpdate(split.id, "amount", val)
              }}
              placeholder="0.00"
              className="w-20 text-sm font-semibold tabular-nums text-right bg-transparent outline-none placeholder:text-muted-foreground/30"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
