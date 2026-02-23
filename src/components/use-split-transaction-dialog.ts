"use client"

import { useState, useCallback, useTransition, useEffect, useRef } from "react"
import { useHotkeys } from "react-hotkeys-hook"
import {
  splitTransaction,
  removeSplit,
} from "@/app/(dashboard)/transactions/actions"

import type { TransactionForSheet } from "@/components/transaction-detail-sheet"

type Category = {
  id: string
  name: string
  icon: string | null
  color: string | null
  type: string
}

export type SplitEntry = {
  id: string
  personName: string
  amount: string
  categoryId: string | null
}

const shortDate = (dateStr: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateStr + "T00:00:00"))

const currency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(Math.abs(value))

let splitCounter = 0
function nextSplitId() {
  splitCounter += 1
  return `split-${splitCounter}`
}

function makeSplit(amount = ""): SplitEntry {
  return { id: nextSplitId(), personName: "", amount, categoryId: null }
}

export function useSplitTransactionDialog({
  transaction,
  categories,
  open,
  onOpenChange,
}: {
  transaction: TransactionForSheet | null
  categories: Category[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [splits, setSplits] = useState<SplitEntry[]>([makeSplit()])
  const [hideTransaction, setHideTransaction] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false)
  const [activeSplitIndex, setActiveSplitIndex] = useState<number | null>(null)

  const equalSplitRef = useRef<HTMLButtonElement>(null)

  const totalAmount = transaction ? Math.abs(transaction.amount) : 0
  const merchantDisplay =
    transaction?.merchant_name ?? transaction?.description ?? "Transaction"

  const handleEqualSplit = useCallback(() => {
    const count = Math.max(splits.length, 2)
    const perPerson = +(totalAmount / count).toFixed(2)
    const remainder = +(totalAmount - perPerson * count).toFixed(2)

    const equalized: SplitEntry[] = Array.from({ length: count }, (_, i) => {
      const existing = splits[i]
      const amt = i === 0 ? +(perPerson + remainder).toFixed(2) : perPerson
      return {
        id: existing?.id ?? nextSplitId(),
        personName: existing?.personName ?? "",
        amount: amt.toFixed(2),
        categoryId: existing?.categoryId ?? null,
      }
    })
    setSplits(equalized)
  }, [splits, totalAmount])

  const handleAddSplit = useCallback(() => {
    setSplits((prev) => [...prev, makeSplit()])
  }, [])

  const handleRemoveEntry = useCallback((id: string) => {
    setSplits((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((s) => s.id !== id)
    })
  }, [])

  const updateSplit = useCallback(
    (id: string, field: keyof SplitEntry, value: string) => {
      setSplits((prev) =>
        prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
      )
    },
    []
  )

  const handleSplitCategoryCreated = useCallback(
    (newCategory: any) => {
      if (activeSplitIndex !== null) {
        setSplits((prev) =>
          prev.map((s, i) =>
            i === activeSplitIndex ? { ...s, categoryId: newCategory.id } : s
          )
        )
      }
    },
    [activeSplitIndex]
  )

  const splitsTotal = splits.reduce(
    (sum, s) => sum + (parseFloat(s.amount) || 0),
    0
  )
  const userShare = Math.max(0, totalAmount - splitsTotal)
  const isOverBudget = splitsTotal > totalAmount + 0.01
  const hasEmptyNames = splits.some((s) => !s.personName.trim())
  const hasZeroAmounts = splits.some(
    (s) => !s.amount || parseFloat(s.amount) <= 0
  )
  const canApply = !isOverBudget && !hasEmptyNames && !hasZeroAmounts

  const handleApply = useCallback(() => {
    if (!transaction || !canApply) return

    startTransition(async () => {
      await splitTransaction(
        transaction.id,
        splits.map((s) => ({
          personName: s.personName.trim(),
          amount: parseFloat(s.amount),
          splitType:
            splits.length >= 2 &&
            new Set(splits.map((x) => parseFloat(x.amount))).size === 1
              ? ("equal" as const)
              : ("custom" as const),
        })),
        hideTransaction
      )
      onOpenChange(false)
    })
  }, [transaction, splits, hideTransaction, canApply, onOpenChange])

  const handleRemoveSplit = useCallback(() => {
    if (!transaction) return
    startTransition(async () => {
      await removeSplit(transaction.id)
      onOpenChange(false)
    })
  }, [transaction, onOpenChange])

  useHotkeys(
    "alt+s",
    () => {
      if (open && canApply && !isPending) handleApply()
    },
    { enableOnFormTags: true },
    [open, canApply, isPending, handleApply]
  )

  useHotkeys(
    "alt+a",
    () => {
      if (open) handleAddSplit()
    },
    { enableOnFormTags: true },
    [open, handleAddSplit]
  )

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        equalSplitRef.current?.focus()
      }, 150)
    }
  }, [open])

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (next) {
        setSplits([makeSplit()])
        setHideTransaction(false)
      }
      onOpenChange(next)
    },
    [onOpenChange]
  )

  const grouped = {
    expense: categories.filter((c) => c.type === "expense"),
    income: categories.filter((c) => c.type === "income"),
    transfer: categories.filter((c) => c.type === "transfer"),
  }

  return {
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
    hasEmptyNames,
    hasZeroAmounts,
    canApply,
    grouped,
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
  }
}
