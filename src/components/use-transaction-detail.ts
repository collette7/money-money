import { useState, useEffect, useCallback, useTransition, useRef } from "react"
import { useHotkeys } from "react-hotkeys-hook"
import {
  updateTransactionCategory,
  updateTransactionNotes,
  updateTransactionTags,
  toggleTransactionIgnored,
  confirmTransactionCategory,
  setTransactionRecurring,
} from "@/app/(dashboard)/transactions/actions"
import type { TransactionForSheet } from "./transaction-detail-sheet"

type Category = {
  id: string
  name: string
  icon: string | null
  color: string | null
  type: string
  parent_id?: string | null
}



export function useTransactionDetail(
  transaction: TransactionForSheet | null,
  open: boolean,
  categories: Category[],
  onRuleDialogOpenChange?: (open: boolean) => void,
  openRuleDialog?: boolean
) {
  const [catOpen, setCatOpen] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const [ruleOpen, setRuleOpen] = useState(false)
  const [splitOpen, setSplitOpen] = useState(false)
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false)
  const [merchantOpen, setMerchantOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [currentCategory, setCurrentCategory] = useState(
    transaction?.categories ?? null
  )
  const [notes, setNotes] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [ignored, setIgnored] = useState(transaction?.ignored ?? false)
  const [isPendingTags, startTagsTransition] = useTransition()
  const [isPendingIgnored, startIgnoredTransition] = useTransition()
  const [isPendingConfirm, startConfirmTransition] = useTransition()
  const [recurringFrequency, setRecurringFrequency] = useState<string | null>(null)
  const [isPendingRecurring, startRecurringTransition] = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setCurrentCategory(transaction?.categories ?? null)
    setNotes(transaction?.notes ?? "")
    setTags(transaction?.tags ?? [])
    setIgnored(transaction?.ignored ?? false)
    setRecurringFrequency(transaction?.recurring_frequency ?? null)
    setTagInput("")
    setNotesOpen(false)
    setCatOpen(false)
  }, [transaction?.id, transaction?.categories, transaction?.notes, transaction?.tags, transaction?.ignored, transaction?.recurring_frequency])

  const handleCategorySelect = useCallback(
    (cat: Category) => {
      if (!transaction) return
      setCatOpen(false)
      setCurrentCategory({
        id: cat.id,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
      })
      startTransition(async () => {
        await updateTransactionCategory(transaction.id, cat.id)

        const event = new CustomEvent("transactionCategoryChanged", {
          detail: {
            transactionId: transaction.id,
            categoryName: cat.name,
            categoryId: cat.id,
          },
        })
        window.dispatchEvent(event)

      })
    },
    [transaction]
  )

  const handleCategoryCreated = useCallback(
    (newCategory: any) => {
      if (!transaction) return
      setCatOpen(false)
      setCurrentCategory({
        id: newCategory.id,
        name: newCategory.name,
        icon: newCategory.icon,
        color: newCategory.color,
      })
      startTransition(async () => {
        await updateTransactionCategory(transaction.id, newCategory.id)

        const event = new CustomEvent("transactionCategoryChanged", {
          detail: {
            transactionId: transaction.id,
            categoryName: newCategory.name,
            categoryId: newCategory.id,
          },
        })
        window.dispatchEvent(event)
      })
    },
    [transaction]
  )

  const handleNotesChange = useCallback(
    (value: string) => {
      setNotes(value)
      if (!transaction) return
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        startTransition(async () => {
          await updateTransactionNotes(transaction.id, value)
        })
      }, 500)
    },
    [transaction]
  )

  const addTag = useCallback(
    (tag: string) => {
      const normalized = tag.trim().toLowerCase()
      if (!normalized || tags.includes(normalized)) return
      const newTags = [...tags, normalized]
      setTags(newTags)
      setTagInput("")
      if (transaction) {
        startTagsTransition(async () => {
          await updateTransactionTags(transaction.id, newTags)
        })
      }
    },
    [tags, transaction]
  )

  const removeTag = useCallback(
    (tagToRemove: string) => {
      const newTags = tags.filter((t) => t !== tagToRemove)
      setTags(newTags)
      if (transaction) {
        startTagsTransition(async () => {
          await updateTransactionTags(transaction.id, newTags)
        })
      }
    },
    [tags, transaction]
  )

  const handleTagKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && tagInput) {
        e.preventDefault()
        addTag(tagInput)
      }
    },
    [tagInput, addTag]
  )

  const handleIgnoredToggle = useCallback(
    (checked: boolean) => {
      if (!transaction) return
      setIgnored(checked)
      startIgnoredTransition(async () => {
        await toggleTransactionIgnored(transaction.id, checked)
      })
    },
    [transaction]
  )

  const handleConfirmCategory = useCallback(() => {
    if (!transaction || !currentCategory) return
    startConfirmTransition(async () => {
      await confirmTransactionCategory(transaction.id)

      const event = new CustomEvent("transactionCategoryChanged", {
        detail: {
          transactionId: transaction.id,
          categoryName: currentCategory.name,
          categoryId: currentCategory.id,
          categoryIcon: currentCategory.icon,
          categoryColor: currentCategory.color,
        },
      })
      window.dispatchEvent(event)
    })
  }, [transaction, currentCategory])

  const handleRecurringChange = useCallback(
    (frequency: string | null) => {
      if (!transaction) return
      setRecurringFrequency(frequency)
      startRecurringTransition(async () => {
        await setTransactionRecurring(transaction.id, frequency)
      })
    },
    [transaction]
  )

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  useEffect(() => {
    if (openRuleDialog !== undefined) {
      setRuleOpen(openRuleDialog)
    }
  }, [openRuleDialog])

  const handleRuleDialogChange = useCallback(
    (nextOpen: boolean) => {
      setRuleOpen(nextOpen)
      onRuleDialogOpenChange?.(nextOpen)
    },
    [onRuleDialogOpenChange]
  )

  useHotkeys("c", () => {
    if (open && !ruleOpen && !splitOpen && !createCategoryOpen) setCatOpen(true)
  }, [open, ruleOpen, splitOpen, createCategoryOpen])

  useHotkeys("r", () => {
    if (open && !ruleOpen && !splitOpen && !createCategoryOpen) setRuleOpen(true)
  }, [open, ruleOpen, splitOpen, createCategoryOpen])

  useHotkeys("s", () => {
    if (open && !ruleOpen && !splitOpen && !createCategoryOpen) setSplitOpen(true)
  }, [open, ruleOpen, splitOpen, createCategoryOpen])

  useHotkeys("n", () => {
    if (open && !ruleOpen && !splitOpen && !createCategoryOpen) setNotesOpen(!notesOpen)
  }, [open, ruleOpen, splitOpen, createCategoryOpen, notesOpen])

  useEffect(() => {
    if (open) {
      const content = document.querySelector("[data-slot='sheet-content']")
      if (content) {
        const focusable = content.querySelector(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) as HTMLElement
        if (focusable) {
          setTimeout(() => focusable.focus(), 150)
        }
      }
    }
  }, [open])

  const isIncome = transaction ? transaction.amount >= 0 : false
  const merchantDisplay =
    transaction?.merchant_name ?? transaction?.description ?? "Transaction"

  return {
    catOpen,
    setCatOpen,
    notesOpen,
    setNotesOpen,
    ruleOpen,
    splitOpen,
    setSplitOpen,
    createCategoryOpen,
    setCreateCategoryOpen,
    merchantOpen,
    setMerchantOpen,
    isPending,
    currentCategory,
    notes,
    tags,
    tagInput,
    setTagInput,
    ignored,
    isPendingTags,
    isPendingIgnored,
    isPendingConfirm,
    handleCategorySelect,
    handleCategoryCreated,
    handleNotesChange,
    addTag,
    removeTag,
    handleTagKeyDown,
    handleIgnoredToggle,
    handleConfirmCategory,
    handleRecurringChange,
    recurringFrequency,
    isPendingRecurring,
    handleRuleDialogChange,
    setRuleOpen,
    isIncome,
    merchantDisplay,
  }
}
