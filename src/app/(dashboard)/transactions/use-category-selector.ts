import { useState, useOptimistic, useTransition } from "react"
import { updateTransactionCategory } from "./actions"

export type CategoryItem = {
  id: string
  name: string
  icon: string | null
  color: string | null
  type: string
  parent_id?: string | null
}

export function useCategorySelector({
  transactionId,
  currentCategory,
  categories,
  transaction,
}: {
  transactionId: string
  currentCategory: CategoryItem | null
  categories: CategoryItem[]
  transaction?: { merchant_name: string | null; description: string }
}) {
  const [open, setOpen] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<CategoryItem | null>(null)
  const [isPending, startTransition] = useTransition()
  const [optimisticCategory, setOptimisticCategory] = useOptimistic(currentCategory)

  function handleCategoryCreated(newCategory: CategoryItem) {
    handleSelect(newCategory)
  }

  function handleSelect(category: CategoryItem) {
    setOpen(false)
    startTransition(async () => {
      setOptimisticCategory(category)
      await updateTransactionCategory(transactionId, category.id)

      setSelectedCategory(category)

      const event = new CustomEvent("transactionCategoryChanged", {
        detail: {
          transactionId,
          categoryName: category.name,
          categoryId: category.id,
          categoryIcon: category.icon,
          categoryColor: category.color,
          categoryType: category.type,
        },
      })
      window.dispatchEvent(event)
    })
  }

  return {
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
  }
}
