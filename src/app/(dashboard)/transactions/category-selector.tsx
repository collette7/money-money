"use client"

import { cn } from "@/lib/utils"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { CategoryFormDialog } from "@/components/category-form-dialog"
import { CategoryPicker } from "@/components/category-picker"
import { RuleDialog } from "@/components/rule-dialog"
import { useCategorySelector, type CategoryItem } from "./use-category-selector"

export function CategorySelector({
  transactionId,
  currentCategory,
  categories,
  transaction,
}: {
  transactionId: string
  currentCategory: CategoryItem | null
  categories: CategoryItem[]
  transaction?: {
    merchant_name: string | null
    description: string
  }
}) {
  const {
    open,
    setOpen,
    createDialogOpen,
    setCreateDialogOpen,
    ruleDialogOpen,
    setRuleDialogOpen,
    selectedCategory,
    isPending,
    optimisticCategory,
    handleSelect,
    handleCategoryCreated,
  } = useCategorySelector({ transactionId, currentCategory, categories, transaction })

  return (
    <>
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border border-transparent px-2.5 py-0.5 text-xs font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isPending && "opacity-60",
            !optimisticCategory && "border-dashed border-border text-muted-foreground"
          )}
        >
          {optimisticCategory ? (
            <>
              <span
                className="size-2 rounded-full shrink-0"
                style={{ backgroundColor: optimisticCategory.color || "#94a3b8" }}
              />
              {optimisticCategory.name}
            </>
          ) : (
            "Uncategorized"
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <CategoryPicker
          categories={categories}
          selectedId={optimisticCategory?.id}
          onSelect={handleSelect}
          onCreateNew={() => setCreateDialogOpen(true)}
        />
      </PopoverContent>
    </Popover>
    <CategoryFormDialog
      open={createDialogOpen}
      onOpenChange={setCreateDialogOpen}
      onCreated={handleCategoryCreated}
    />
    
    {transaction && (
      <RuleDialog
        open={ruleDialogOpen}
        onOpenChange={setRuleDialogOpen}
        transaction={{
          id: transactionId,
          merchant_name: transaction.merchant_name,
          description: transaction.description,
          amount: 0,
          date: new Date().toISOString(),
          categories: selectedCategory
        }}
        categories={categories}
      />
    )}
    </>
  )
}
