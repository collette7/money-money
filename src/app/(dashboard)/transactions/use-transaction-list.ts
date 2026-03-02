"use client"

import { useCallback, useEffect, useMemo, useState, useTransition } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { getTransactions, getCategories, getAccounts, getTransactionViewCounts } from "./actions"
import { bulkUpdateCategory, bulkMarkReviewed, runAutoCategorize, createCategoryRule, checkRuleExists } from "./actions"
import { aiCategorize } from "../advisor/actions"

export type Category = {
  id: string
  name: string
  icon: string | null
  color: string | null
  type: string
  parent_id?: string | null
}

export type Account = {
  id: string
  name: string
  institution_name: string | null
  account_type?: string | null
}

export type Transaction = {
  id: string
  date: string
  status: string | null
  amount: number
  description: string
  merchant_name: string | null
  original_description: string | null
  notes: string | null
  tags: string[] | null
  is_recurring: boolean | null
  is_split: boolean | null
  user_share_amount: number | null
  categorized_by: string | null
  category_id: string | null
  account_id: string
  ignored: boolean | null
  review_flagged: boolean | null
  review_flagged_reason: string | null
  category_confirmed: boolean | null
  category_confidence: number | null
  recurring_id: string | null
  recurring_rules: { frequency: string } | { frequency: string }[] | null
  categories: Category | Category[] | null
  accounts: Account | Account[]
  cached_logo_domain: string | null
}

export function resolveCategory(val: Category | Category[] | null): Category | null {
  if (!val) return null
  return Array.isArray(val) ? val[0] ?? null : val
}

export function resolveAccount(val: Account | Account[]): Account {
  return Array.isArray(val) ? val[0] : val
}

export const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
})

export const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
})

export function useTransactionList(initial?: {
  transactions?: Transaction[]
  categories?: Category[]
  accounts?: Account[]
  total?: number
  page?: number
  totalPages?: number
}) {
  const initialTransactions = initial?.transactions
  const initialCategories = initial?.categories
  const initialAccounts = initial?.accounts
  const initialTotal = initial?.total
  const initialPage = initial?.page
  const initialTotalPages = initial?.totalPages

  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions || [])
  const [categories, setCategories] = useState<Category[]>(initialCategories || [])
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts || [])
  const [total, setTotal] = useState(initialTotal || 0)
  const [page, setPage] = useState(initialPage || 1)
  const [totalPages, setTotalPages] = useState(initialTotalPages || 0)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [searchValue, setSearchValue] = useState(searchParams.get("search") ?? "")
  const [isLoading, setIsLoading] = useState(!initialTransactions)
  const [hasMounted, setHasMounted] = useState(false)
  const [dataVersion, setDataVersion] = useState(0)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  useEffect(() => {
    if (!initialTransactions) {
      Promise.all([getCategories(), getAccounts()]).then(
        ([categoriesData, accountsData]) => {
          setCategories(categoriesData);
          setAccounts(accountsData);
        }
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const searchParamsString = searchParams.toString();
  useEffect(() => {
    if (!initialTransactions || dataVersion > 0) {
      const loadData = async () => {
        setIsLoading(true);
        try {
          const categoryId = searchParams.get("categoryId") || undefined;
          const accountId = searchParams.get("accountId") || undefined;
          const defaultStart = new Date(); defaultStart.setFullYear(defaultStart.getFullYear() - 1);
          const startDate = searchParams.get("startDate") || searchParams.get("date") || `${defaultStart.getFullYear()}-${String(defaultStart.getMonth() + 1).padStart(2, "0")}-${String(defaultStart.getDate()).padStart(2, "0")}`;
          const endDate = searchParams.get("endDate") || searchParams.get("date") || undefined;
          const pageParam = searchParams.get("page") ? Number(searchParams.get("page")) : 1;
          const search = searchParams.get("search") || undefined;
          
          const view = (searchParams.get("view") as "all" | "review" | "excluded") || "all";
          
          const transactionData = await getTransactions({
            search,
            categoryId,
            accountId,
            startDate,
            endDate,
            page: pageParam,
            view,
            sortBy: (searchParams.get("sortBy") as any) || undefined,
            sortDir: (searchParams.get("sortDir") as any) || undefined,
          });
          
          setTransactions(transactionData.transactions);
          setTotal(transactionData.total);
          setPage(transactionData.page);
          setTotalPages(transactionData.totalPages);
        } catch (error) {
          console.error("Failed to load transaction data:", error);
        } finally {
          setIsLoading(false);
        }
      };
      
      loadData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTransactions, searchParamsString, dataVersion]);

  const currentView = (searchParams.get("view") as "all" | "review" | "excluded") || "all"
  const [viewCounts, setViewCounts] = useState({ review: 0, excluded: 0 })

  useEffect(() => {
    getTransactionViewCounts().then(setViewCounts).catch(() => {})
  }, [searchParamsString, dataVersion])

  const [bulkCategoryOpen, setBulkCategoryOpen] = useState(false)
  const [isAutoCategorizing, setIsAutoCategorizing] = useState(false)
  const [isAICategorizing, setIsAICategorizing] = useState(false)
  const [aiResult, setAiResult] = useState<string | null>(null)
  const [aiResultType, setAiResultType] = useState<"success" | "error">("success")
  const [startDateOpen, setStartDateOpen] = useState(false)
  const [endDateOpen, setEndDateOpen] = useState(false)
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null)
  const selectedTransaction = selectedTransactionId
    ? transactions.find(t => t.id === selectedTransactionId) ?? null
    : null
  const [detailOpen, setDetailOpen] = useState(false)
  const [toastOpen, setToastOpen] = useState(false)
  const [lastCategoryChange, setLastCategoryChange] = useState<{
    transactionId: string
    categoryName: string
    categoryId: string
  } | null>(null)
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false)
  const [createRuleSheetOpen, setCreateRuleSheetOpen] = useState(false)
  const [ruleTransaction, setRuleTransaction] = useState<Transaction | null>(null)

  const currentSearch = searchParams.get("search") ?? ""
  const currentCategoryId = searchParams.get("categoryId") ?? ""
  const currentAccountId = searchParams.get("accountId") ?? ""
  const defaultStartDate = useMemo(() => { const d = new Date(); d.setFullYear(d.getFullYear() - 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }, []);
  const currentStartDate = searchParams.get("startDate") ?? defaultStartDate
  const currentEndDate = searchParams.get("endDate") ?? ""
  const currentSortBy = (searchParams.get("sortBy") as "date" | "description" | "category" | "amount" | "account") ?? "date"
  const currentSortDir = (searchParams.get("sortDir") as "asc" | "desc") ?? "desc"

  const hasFilters = currentSearch || currentCategoryId || currentAccountId || (searchParams.get("startDate") && searchParams.get("startDate") !== defaultStartDate) || currentEndDate

  const allOnPageSelected = transactions.length > 0 && transactions.every((t) => selected.has(t.id))
  const someSelected = selected.size > 0

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value)
        } else {
          params.delete(key)
        }
      }
      if (!updates.page) {
        params.delete("page")
      }
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`)
      })
    },
    [router, pathname, searchParams, startTransition]
  )

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (searchValue !== currentSearch) {
        updateParams({ search: searchValue, page: "" })
      }
    }, 350)
    return () => clearTimeout(timeout)
  }, [searchValue, currentSearch, updateParams])

  function toggleAll() {
    if (allOnPageSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(transactions.map((t) => t.id)))
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  async function handleBulkCategory(categoryId: string) {
    setBulkCategoryOpen(false)
    const ids = Array.from(selected)
    await bulkUpdateCategory(ids, categoryId)
    setSelected(new Set())
    setDataVersion((v) => v + 1)
  }

  async function handleBulkMarkReviewed() {
    const ids = Array.from(selected)
    const uncategorizedCount = transactions
      .filter(t => ids.includes(t.id) && !t.category_id)
      .length

    if (uncategorizedCount > 0) {
      const proceed = window.confirm(
        `${uncategorizedCount} transaction${uncategorizedCount > 1 ? "s have" : " has"} no category. Mark as reviewed anyway?`
      )
      if (!proceed) return
    }

    await bulkMarkReviewed(ids)
    setSelected(new Set())
    setDataVersion((v) => v + 1)
  }

  async function handleAutoCategorize() {
    setIsAutoCategorizing(true)
    try {
      const result = await runAutoCategorize()
      setAiResultType("success")
      setAiResult(
        result.categorized > 0
          ? `Categorized ${result.categorized} of ${result.total} transactions`
          : "No uncategorized transactions to process"
      )
      setDataVersion((v) => v + 1)
    } catch (err) {
      setAiResultType("error")
      setAiResult(err instanceof Error ? err.message : "Auto-categorization failed")
    } finally {
      setIsAutoCategorizing(false)
      setTimeout(() => setAiResult(null), 8000)
    }
  }

  async function handleAICategorize() {
    setIsAICategorizing(true)
    setAiResult(null)
    try {
      const result = await aiCategorize()
      setAiResultType("success")
      setAiResult(
        result.categorized > 0
          ? `AI categorized ${result.categorized} of ${result.total} transactions`
          : result.total > 0
            ? "AI couldn't confidently categorize any transactions"
            : "No uncategorized transactions to process"
      )
      setDataVersion((v) => v + 1)
    } catch (err) {
      setAiResultType("error")
      setAiResult(err instanceof Error ? err.message : "AI categorization failed")
    } finally {
      setIsAICategorizing(false)
      setTimeout(() => setAiResult(null), 8000)
    }
  }

  function clearFilters() {
    setSearchValue("")
    startTransition(() => {
      router.push(pathname)
    })
  }

  useEffect(() => {
    const handleCategoryChange = async (e: Event) => {
      const { transactionId, categoryName, categoryId, categoryIcon, categoryColor, categoryType } = (e as CustomEvent).detail
      setLastCategoryChange({ transactionId, categoryName, categoryId })

      setTransactions(prev => prev.map(t =>
        t.id === transactionId
          ? {
              ...t,
              category_id: categoryId,
              categories: { id: categoryId, name: categoryName, icon: categoryIcon ?? null, color: categoryColor ?? null, type: categoryType ?? null },
              category_confirmed: true,
              review_flagged: false,
            }
          : t
      ))

      const tx = transactions.find(t => t.id === transactionId)
      const merchantName = tx?.merchant_name
      if (merchantName) {
        const ruleExists = await checkRuleExists(merchantName)
        if (!ruleExists) {
          setToastOpen(true)
        }
      } else {
        setToastOpen(true)
      }
    }

    window.addEventListener("transactionCategoryChanged", handleCategoryChange)
    return () => {
      window.removeEventListener("transactionCategoryChanged", handleCategoryChange)
    }
  }, [transactions])

  useEffect(() => {
    const handleIgnoredChange = (e: Event) => {
      const { transactionId, ignored } = (e as CustomEvent).detail
      setTransactions(prev => prev.map(t =>
        t.id === transactionId ? { ...t, ignored } : t
      ))
    }
    window.addEventListener("transactionIgnoredChanged", handleIgnoredChange)
    return () => window.removeEventListener("transactionIgnoredChanged", handleIgnoredChange)
  }, [])

  useEffect(() => {
    const handleRecurringChange = (e: Event) => {
      const { transactionId, isRecurring, frequency } = (e as CustomEvent).detail
      setTransactions(prev => prev.map(t =>
        t.id === transactionId
          ? { ...t, is_recurring: isRecurring, recurring_rules: frequency ? { frequency } : null }
          : t
      ))
    }
    window.addEventListener("transactionRecurringChanged", handleRecurringChange)
    return () => window.removeEventListener("transactionRecurringChanged", handleRecurringChange)
  }, [])

  function handleRowClick(transaction: Transaction) {
    setSelectedTransactionId(transaction.id)
    setDetailOpen(true)
  }

  function handleAddRule() {
    if (lastCategoryChange) {
      const tx = transactions.find(t => t.id === lastCategoryChange.transactionId)
      if (tx) {
        setRuleTransaction(tx)
        setRuleDialogOpen(true)
      }
    }
  }

  function handleSort(column: "date" | "description" | "category" | "amount" | "account") {
    const newDir = currentSortBy === column
      ? (currentSortDir === "desc" ? "asc" : "desc")
      : (column === "description" ? "asc" : "desc")
    updateParams({ sortBy: column === "date" && newDir === "desc" ? "" : column, sortDir: column === "date" && newDir === "desc" ? "" : newDir, page: "" })
  }

  const grouped = useMemo(() => {
    const organize = (type: string) => {
      const ofType = categories.filter((c) => c.type === type);
      const parents = ofType.filter((c) => !c.parent_id);
      return parents.map((p) => ({
        ...p,
        children: ofType.filter((c) => c.parent_id === p.id),
      }));
    };
    return {
      expense: organize("expense"),
      income: organize("income"),
      transfer: organize("transfer"),
    };
  }, [categories]);

  const startDateValue = currentStartDate ? new Date(currentStartDate + "T00:00:00") : undefined
  const endDateValue = currentEndDate ? new Date(currentEndDate + "T00:00:00") : undefined

  async function handleCreateRule(rule: {
    categoryId: string
    field: string
    operator: string
    value: string
  }) {
    try {
      await createCategoryRule(
        rule.categoryId,
        [{ field: rule.field, operator: rule.operator, value: rule.value }]
      )
      setCreateRuleSheetOpen(false)
      setToastOpen(false)
      router.refresh()
    } catch (error) {
      console.error("Failed to create rule:", error)
    }
  }

  return {
    router,
    isPending,
    transactions,
    categories,
    accounts,
    total,
    page,
    totalPages,
    selected,
    searchValue,
    setSearchValue,
    isLoading,
    hasMounted,
    currentView,
    viewCounts,
    bulkCategoryOpen,
    setBulkCategoryOpen,
    isAutoCategorizing,
    isAICategorizing,
    aiResult,
    setAiResult,
    aiResultType,
    startDateOpen,
    setStartDateOpen,
    endDateOpen,
    setEndDateOpen,
    selectedTransaction,
    detailOpen,
    setDetailOpen,
    toastOpen,
    setToastOpen,
    lastCategoryChange,
    ruleDialogOpen,
    setRuleDialogOpen,
    createRuleSheetOpen,
    setCreateRuleSheetOpen,
    ruleTransaction,
    currentSearch,
    currentCategoryId,
    currentAccountId,
    currentStartDate,
    currentEndDate,
    hasFilters,
    allOnPageSelected,
    someSelected,
    updateParams,
    toggleAll,
    toggleOne,
    handleBulkCategory,
    handleBulkMarkReviewed,
    handleAutoCategorize,
    handleAICategorize,
    clearFilters,
    handleRowClick,
    handleAddRule,
    handleCreateRule,
    refreshData: () => setDataVersion((v) => v + 1),
    grouped,
    startDateValue,
    endDateValue,
    currentSortBy,
    currentSortDir,
    handleSort,
  }
}
