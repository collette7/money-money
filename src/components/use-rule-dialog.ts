"use client"

import { useState, useTransition, useCallback, useRef, useEffect } from "react"
import { useHotkeys } from "react-hotkeys-hook"
import { createCategoryRule, previewRuleMatches } from "@/app/(dashboard)/transactions/actions"
import { updateCategoryRule } from "@/app/(dashboard)/settings/rules/actions"
import type { TransactionForSheet } from "@/components/transaction-detail-sheet"
import {
  Store,
  Pencil,
  DollarSign,
} from "lucide-react"

export type Category = {
  id: string
  name: string
  icon: string | null
  color: string | null
  type: string
}

export type ConditionField = "merchant_name" | "description" | "amount"
export type TextOperator = "contains" | "equals" | "starts_with"
export type AmountOperator = "equals" | "greater_than" | "less_than" | "between"
export type ConditionOperator = TextOperator | AmountOperator

export type RuleCondition = {
  field: ConditionField
  operator: ConditionOperator
  value: string
  valueEnd: string
}

export const CONDITION_FIELDS: {
  value: ConditionField
  label: string
  icon: typeof Store
}[] = [
  { value: "merchant_name", label: "Merchant", icon: Store },
  { value: "description", label: "Description", icon: Pencil },
  { value: "amount", label: "Amount", icon: DollarSign },
]

export const TEXT_OPERATORS: { value: TextOperator; label: string }[] = [
  { value: "contains", label: "contains" },
  { value: "equals", label: "is exactly" },
  { value: "starts_with", label: "starts with" },
]

export const AMOUNT_OPERATORS: { value: AmountOperator; label: string }[] = [
  { value: "equals", label: "is exactly" },
  { value: "greater_than", label: "greater than" },
  { value: "less_than", label: "less than" },
  { value: "between", label: "between" },
]

export type VisibilityAction = "unchanged" | "hidden" | "visible"

export type EditingRule = {
  id: string
  categoryId: string
  conditions: Array<{ field: string; operator: string; value: string; value_end?: string | null }>
  setIgnored: boolean | null
  setMerchantName: string | null
  setTags: string[] | null
}

export function getOperatorsForField(field: ConditionField) {
  return field === "amount" ? AMOUNT_OPERATORS : TEXT_OPERATORS
}

function defaultCondition(transaction: TransactionForSheet | null): RuleCondition {
  return {
    field: "merchant_name",
    operator: "contains",
    value: transaction?.merchant_name ?? transaction?.description ?? "",
    valueEnd: "",
  }
}

type UseRuleDialogProps = {
  transaction: TransactionForSheet | null
  categories: Category[]
  open: boolean
  onOpenChange: (open: boolean) => void
  editingRule?: EditingRule | null
  onSaved?: () => void
}

export function useRuleDialog({
  transaction,
  categories,
  open,
  onOpenChange,
  editingRule,
  onSaved,
}: UseRuleDialogProps) {
  const [isPending, startTransition] = useTransition()

  const [conditions, setConditions] = useState<RuleCondition[]>([
    defaultCondition(transaction),
  ])

  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [catPickerOpen, setCatPickerOpen] = useState(false)

  const [visibilityAction, setVisibilityAction] = useState<VisibilityAction>("unchanged")
  const [merchantRename, setMerchantRename] = useState("")
  const [ruleTags, setRuleTags] = useState<string[]>([])
  const [ruleTagInput, setRuleTagInput] = useState("")

  const [showConditionDetails, setShowConditionDetails] = useState(true)
  const [showActionDetails, setShowActionDetails] = useState(true)

  const [matchCount, setMatchCount] = useState(0)
  const [matchSamples, setMatchSamples] = useState<
    Array<{ id: string; description: string; merchant_name: string | null; amount: number; date: string }>
  >([])
  const [showPreview, setShowPreview] = useState(false)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const previewDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const valueInputRef = useRef<HTMLInputElement>(null)

  const resetForm = useCallback(() => {
    if (editingRule) {
      setConditions(
        editingRule.conditions.map((c) => ({
          field: c.field as ConditionField,
          operator: c.operator as ConditionOperator,
          value: c.value,
          valueEnd: c.value_end ?? "",
        }))
      )
      const cat = categories.find((c) => c.id === editingRule.categoryId)
      setSelectedCategory(cat ?? null)
      if (editingRule.setIgnored === true) {
        setVisibilityAction("hidden")
      } else if (editingRule.setIgnored === false) {
        setVisibilityAction("visible")
      } else {
        setVisibilityAction("unchanged")
      }
      setMerchantRename(editingRule.setMerchantName ?? "")
      setRuleTags(editingRule.setTags ?? [])
      setRuleTagInput("")
      setShowConditionDetails(true)
      setShowActionDetails(true)
      setMatchCount(0)
      setMatchSamples([])
      setShowPreview(false)
    } else if (transaction) {
      setConditions([defaultCondition(transaction)])
      setSelectedCategory(
        transaction.categories
          ? { ...transaction.categories, type: "expense" }
          : null
      )
      setVisibilityAction("unchanged")
      setMerchantRename("")
      setRuleTags([])
      setRuleTagInput("")
      setShowConditionDetails(true)
      setShowActionDetails(true)
      setMatchCount(0)
      setMatchSamples([])
      setShowPreview(false)
    }
  }, [transaction, editingRule, categories])

  const updateCondition = useCallback((index: number, patch: Partial<RuleCondition>) => {
    setConditions((prev) => {
      const next = [...prev]
      const current = next[index]
      const updated = { ...current, ...patch }

      if (patch.field && patch.field !== current.field) {
        const isNowAmount = patch.field === "amount"
        const wasAmount = current.field === "amount"
        if (isNowAmount !== wasAmount) {
          updated.operator = isNowAmount ? "equals" : "contains"
          updated.value = ""
          updated.valueEnd = ""
        }
      }

      next[index] = updated
      return next
    })
  }, [])

  const addCondition = useCallback(() => {
    setConditions((prev) => {
      const usedFields = new Set(prev.map((c) => c.field))
      const fieldOrder: ConditionField[] = ["amount", "description", "merchant_name"]
      const nextField = fieldOrder.find((f) => !usedFields.has(f)) ?? "amount"

      const isAmount = nextField === "amount"
      const prefillValue = transaction
        ? nextField === "amount"
          ? String(Math.abs(transaction.amount))
          : nextField === "description"
            ? transaction.description ?? ""
            : transaction.merchant_name ?? ""
        : ""

      return [
        ...prev,
        {
          field: nextField,
          operator: (isAmount ? "equals" : "contains") as ConditionOperator,
          value: prefillValue,
          valueEnd: "",
        },
      ]
    })
  }, [transaction])

  const removeCondition = useCallback((index: number) => {
    setConditions((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((_, i) => i !== index)
    })
  }, [])

  const hasValidConditions = conditions.length > 0 && conditions.every((c) => c.value.trim() !== "")

  useEffect(() => {
    if (!open || !hasValidConditions) {
      setMatchCount(0)
      setMatchSamples([])
      return
    }

    if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current)

    previewDebounceRef.current = setTimeout(async () => {
      setIsLoadingPreview(true)
      try {
        const mapped = conditions.map((c) => ({
          field: c.field,
          operator: c.operator,
          value: c.value,
          value_end: c.operator === "between" ? c.valueEnd : undefined,
        }))
        const result = await previewRuleMatches(mapped)
        setMatchCount(result.count)
        setMatchSamples(result.samples)
      } catch {
        setMatchCount(0)
        setMatchSamples([])
      } finally {
        setIsLoadingPreview(false)
      }
    }, 400)

    return () => {
      if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current)
    }
  }, [open, conditions, hasValidConditions])

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (next) resetForm()
      onOpenChange(next)
    },
    [onOpenChange, resetForm]
  )

  const isEditing = !!editingRule

  const handleSave = useCallback(() => {
    if (!selectedCategory || !hasValidConditions) return

    startTransition(async () => {
      const mapped = conditions.map((c) => ({
        field: c.field,
        operator: c.operator,
        value: c.value.trim(),
        value_end: c.operator === "between" ? c.valueEnd.trim() : undefined,
      }))

      const options: { setIgnored?: boolean | null; setMerchantName?: string | null; setTags?: string[] | null } = {}
      if (visibilityAction === "hidden") options.setIgnored = true
      else if (visibilityAction === "visible") options.setIgnored = false
      if (merchantRename.trim()) options.setMerchantName = merchantRename.trim()
      if (ruleTags.length > 0) options.setTags = ruleTags

      if (editingRule) {
        await updateCategoryRule(editingRule.id, {
          categoryId: selectedCategory.id,
          conditions: mapped,
          setIgnored: options.setIgnored ?? null,
          setMerchantName: options.setMerchantName ?? null,
          setTags: options.setTags ?? null,
        })
      } else {
        await createCategoryRule(selectedCategory.id, mapped, options)
      }
      onOpenChange(false)
      onSaved?.()
    })
  }, [
    selectedCategory,
    conditions,
    hasValidConditions,
    visibilityAction,
    merchantRename,
    ruleTags,
    onOpenChange,
    editingRule,
  ])

  useHotkeys("alt+s", () => {
    if (open && selectedCategory && hasValidConditions && !isPending) {
      handleSave()
    }
  }, { enableOnFormTags: true }, [open, selectedCategory, hasValidConditions, isPending, handleSave])

  useEffect(() => {
    if (open) {
      resetForm()
      setTimeout(() => {
        valueInputRef.current?.focus()
      }, 100)
    }
  }, [open, resetForm])

  const grouped = {
    expense: categories.filter((c) => c.type === "expense"),
    income: categories.filter((c) => c.type === "income"),
    transfer: categories.filter((c) => c.type === "transfer"),
  }

  return {
    isPending,
    isEditing,
    conditions,
    updateCondition,
    addCondition,
    removeCondition,
    selectedCategory,
    setSelectedCategory,
    catPickerOpen,
    setCatPickerOpen,
    visibilityAction,
    setVisibilityAction,
    merchantRename,
    setMerchantRename,
    ruleTags,
    setRuleTags,
    ruleTagInput,
    setRuleTagInput,
    showConditionDetails,
    setShowConditionDetails,
    showActionDetails,
    setShowActionDetails,
    valueInputRef,
    resetForm,
    handleOpenChange,
    handleSave,
    grouped,
    hasValidConditions,
    matchCount,
    matchSamples,
    showPreview,
    setShowPreview,
    isLoadingPreview,
  }
}
