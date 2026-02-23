"use client"

import { useState, useEffect, useTransition, useMemo } from "react"
import { getMerchantTransactions } from "@/app/(dashboard)/transactions/actions"

export type MerchantTx = {
  id: string
  date: string
  amount: number
  description: string
  merchant_name: string | null
}

export const currency = (v: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(Math.abs(v))

export const shortCurrency = (v: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(v))

function getMonthlyBreakdown(txs: MerchantTx[]) {
  const months = new Map<string, number>()

  for (const tx of txs) {
    const d = new Date(tx.date + "T00:00:00")
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    months.set(key, (months.get(key) ?? 0) + Math.abs(tx.amount))
  }

  const sorted = [...months.entries()].sort(([a], [b]) => a.localeCompare(b))
  return sorted.slice(-5).map(([key, total]) => {
    const [y, m] = key.split("-")
    const label = new Date(Number(y), Number(m) - 1).toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    })
    return { key, label, total }
  })
}

export function useMerchantDetailSheet({
  open,
  onOpenChange,
  merchantName,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  merchantName: string | null
}) {
  const [transactions, setTransactions] = useState<MerchantTx[]>([])
  const [loading, setLoading] = useState(false)
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest")
  const [, startTransition] = useTransition()

  useEffect(() => {
    if (open && merchantName) {
      setLoading(true)
      startTransition(async () => {
        const data = await getMerchantTransactions(merchantName)
        setTransactions(data)
        setLoading(false)
      })
    } else {
      setTransactions([])
    }
  }, [open, merchantName])

  const monthlyData = useMemo(() => getMonthlyBreakdown(transactions), [transactions])
  const maxMonthly = Math.max(...monthlyData.map((m) => m.total), 1)

  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  const currentYear = now.getFullYear()

  const thisMonthCount = transactions.filter((tx) => {
    const d = new Date(tx.date + "T00:00:00")
    return d.getMonth() === now.getMonth() && d.getFullYear() === currentYear
  }).length

  const avgSpent =
    monthlyData.length > 0
      ? monthlyData.reduce((s, m) => s + m.total, 0) / monthlyData.length
      : 0

  const yearTotal = (year: number) =>
    transactions
      .filter((tx) => new Date(tx.date + "T00:00:00").getFullYear() === year)
      .reduce((s, tx) => s + Math.abs(tx.amount), 0)

  const total2025 = yearTotal(2025)
  const total2026 = yearTotal(2026)

  const sortedTxs = useMemo(() => {
    const copy = [...transactions]
    return sortOrder === "newest"
      ? copy.sort((a, b) => b.date.localeCompare(a.date))
      : copy.sort((a, b) => a.date.localeCompare(b.date))
  }, [transactions, sortOrder])

  const initial = merchantName?.[0]?.toUpperCase() ?? "?"

  return {
    transactions,
    loading,
    sortOrder,
    setSortOrder,
    monthlyData,
    maxMonthly,
    currentMonth,
    currentYear,
    thisMonthCount,
    avgSpent,
    total2025,
    total2026,
    sortedTxs,
    initial,
  }
}
