"use client"
import React from "react"

import {
  AlertCircle,
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  ArrowUpDown,
  Bot,
  CalendarIcon,
  Check,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  CreditCard,
  EyeOff,
  Repeat2,
  Filter,
  Loader2,
  Search,
  Sparkles,
  Tag,
  Upload,
  X,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import { CategoryPicker } from "@/components/category-picker"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { CategorySelector } from "./category-selector"
import { AccountIcon } from "@/components/account-icon"
import { MerchantLogo } from "@/components/merchant-logo"
import { TransactionDetailSheet } from "@/components/transaction-detail-sheet"
import { RuleToast } from "@/components/rule-toast"
import { RuleDialog } from "@/components/rule-dialog"
import { CreateRuleSheet } from "@/components/create-rule-sheet"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { EmptyState } from "@/components/ui/empty-state"
import {
  useTransactionList,
  resolveCategory,
  resolveAccount,
  dateFormatter,
  currencyFormatter,
  type Transaction,
  type Category,
  type Account,
} from "./use-transaction-list"

export function TransactionList({
  transactions: initialTransactions,
  categories: initialCategories,
  accounts: initialAccounts,
  total: initialTotal,
  page: initialPage,
  totalPages: initialTotalPages,
}: {
  transactions?: Transaction[]
  categories?: Category[]
  accounts?: Account[]
  total?: number
  page?: number
  totalPages?: number
}) {
  const {
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
    refreshData,
    startDateValue,
    endDateValue,
    currentSortBy,
    currentSortDir,
    handleSort,
  } = useTransactionList({
    transactions: initialTransactions,
    categories: initialCategories,
    accounts: initialAccounts,
    total: initialTotal,
    page: initialPage,
    totalPages: initialTotalPages,
  })

  return (
    <>
    {/* suppressHydrationWarning: Browser extensions like Proton Pass inject
       attributes (e.g. data-protonpass-form) into the DOM at runtime, causing
       React hydration mismatches. This prop tells React to silently ignore
       attribute differences on this element during hydration. */}
    <div className="space-y-4" suppressHydrationWarning>
      {someSelected && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkMarkReviewed}
          >
            <Check className="size-3.5" />
            Mark {selected.size} as reviewed
          </Button>
          <Popover open={bulkCategoryOpen} onOpenChange={setBulkCategoryOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Tag className="size-3.5" />
                Categorize {selected.size}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-0" align="end">
              <CategoryPicker
                categories={categories}
                onSelect={(cat) => handleBulkCategory(cat.id)}
              />
            </PopoverContent>
          </Popover>
        </div>
      )}

      <div className="flex items-center border-b border-border/50">
        <div className="flex items-center gap-1">
          {([
            { value: "all" as const, label: "All" },
            { value: "review" as const, label: "Needs Review", count: viewCounts.review },
            { value: "excluded" as const, label: "Excluded", count: viewCounts.excluded },
          ] as const).map((tab) => (
            <button
              key={tab.value}
              onClick={() => updateParams({ view: tab.value === "all" ? "" : tab.value, page: "" })}
              className={cn(
                "relative px-3 py-2 text-xs font-medium transition-colors",
                currentView === tab.value
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground/70"
              )}
            >
              <span className="flex items-center gap-1.5">
                {tab.value === "review" && <AlertCircle className="size-3" />}
                {tab.value === "excluded" && <EyeOff className="size-3" />}
                {tab.label}
                {"count" in tab && tab.count > 0 && (
                  <span className={cn(
                    "inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none",
                    tab.value === "review"
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {tab.count}
                  </span>
                )}
              </span>
              {currentView === tab.value && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-foreground rounded-full" />
              )}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2 pb-1">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAutoCategorize}
            disabled={isAutoCategorizing}
          >
            {isAutoCategorizing ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Sparkles className="size-3.5" />
            )}
            Auto-Categorize
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAICategorize}
            disabled={isAICategorizing}
          >
            {isAICategorizing ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Bot className="size-3.5" />
            )}
            AI Categorize
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Filter className="size-3.5 text-muted-foreground" />
        {hasMounted ? (
          <>
            <Select
              value={currentAccountId}
              onValueChange={(val) => updateParams({ accountId: val === "all" ? "" : val, page: "" })}
            >
              <SelectTrigger size="sm" className="h-8 text-xs">
                <SelectValue placeholder="All accounts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All accounts</SelectItem>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    <div className="flex items-center gap-2">
                      <AccountIcon 
                        accountNumber={acc.name}
                        accountType={acc.account_type || "default"}
                        institutionName={acc.institution_name}
                        size="sm"
                        showNumber={false}
                      />
                      <span className="truncate">
                        {acc.institution_name ? `${acc.institution_name} ‧ ` : ""}{acc.name}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={currentCategoryId}
              onValueChange={(val) => updateParams({ categoryId: val === "all" ? "" : val, page: "" })}
            >
              <SelectTrigger size="sm" className="h-8 text-xs">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                <SelectItem value="uncategorized">
                  <span className="inline-block size-2 rounded-full bg-slate-300" />
                  Uncategorized
                </SelectItem>
                {grouped.expense.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Expense</SelectLabel>
                    {grouped.expense.map((cat) => (
                      <React.Fragment key={cat.id}>
                        <SelectItem value={cat.id}>
                          <span className="inline-block size-2 rounded-full" style={{ backgroundColor: cat.color || "#94a3b8" }} />
                          {cat.name}
                        </SelectItem>
                        {cat.children.map((child) => (
                          <SelectItem key={child.id} value={child.id} className="pl-8">
                            <span className="inline-block size-1.5 rounded-full" style={{ backgroundColor: child.color || cat.color || "#94a3b8" }} />
                            {child.name}
                          </SelectItem>
                        ))}
                      </React.Fragment>
                    ))}
                  </SelectGroup>
                )}
                {grouped.income.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Income</SelectLabel>
                    {grouped.income.map((cat) => (
                      <React.Fragment key={cat.id}>
                        <SelectItem value={cat.id}>
                          <span className="inline-block size-2 rounded-full" style={{ backgroundColor: cat.color || "#94a3b8" }} />
                          {cat.name}
                        </SelectItem>
                        {cat.children.map((child) => (
                          <SelectItem key={child.id} value={child.id} className="pl-8">
                            <span className="inline-block size-1.5 rounded-full" style={{ backgroundColor: child.color || cat.color || "#94a3b8" }} />
                            {child.name}
                          </SelectItem>
                        ))}
                      </React.Fragment>
                    ))}
                  </SelectGroup>
                )}
                {grouped.transfer.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Transfer</SelectLabel>
                    {grouped.transfer.map((cat) => (
                      <React.Fragment key={cat.id}>
                        <SelectItem value={cat.id}>
                          <span className="inline-block size-2 rounded-full" style={{ backgroundColor: cat.color || "#94a3b8" }} />
                          {cat.name}
                        </SelectItem>
                        {cat.children.map((child) => (
                          <SelectItem key={child.id} value={child.id} className="pl-8">
                            <span className="inline-block size-1.5 rounded-full" style={{ backgroundColor: child.color || cat.color || "#94a3b8" }} />
                            {child.name}
                          </SelectItem>
                        ))}
                      </React.Fragment>
                    ))}
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>

            <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-8 text-xs font-normal",
                    !currentStartDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="size-3.5" />
                  {currentStartDate
                    ? dateFormatter.format(new Date(currentStartDate + "T00:00:00"))
                    : "Start date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDateValue}
                  onSelect={(date) => {
                    setStartDateOpen(false)
                    updateParams({
                      startDate: date ? date.toISOString().split("T")[0] : "",
                      page: "",
                    })
                  }}
                />
              </PopoverContent>
            </Popover>

            <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-8 text-xs font-normal",
                    !currentEndDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="size-3.5" />
                  {currentEndDate
                    ? dateFormatter.format(new Date(currentEndDate + "T00:00:00"))
                    : "End date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDateValue}
                  onSelect={(date) => {
                    setEndDateOpen(false)
                    updateParams({
                      endDate: date ? date.toISOString().split("T")[0] : "",
                      page: "",
                    })
                  }}
                />
              </PopoverContent>
            </Popover>

            {hasFilters && (
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={clearFilters}>
                <X className="size-3" />
                Clear
              </Button>
            )}
          </>
        ) : (
          <>
            <div className="h-8 w-36 rounded-md bg-muted animate-pulse" />
            <div className="h-8 w-36 rounded-md bg-muted animate-pulse" />
            <div className="h-8 w-24 rounded-md bg-muted animate-pulse" />
            <div className="h-8 w-24 rounded-md bg-muted animate-pulse" />
          </>
        )}
        <div className="relative ml-auto w-56">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="h-8 pl-9 text-xs"
          />
          {searchValue && (
            <button
              onClick={() => setSearchValue("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      <div
        className={cn(
          "rounded-lg border transition-opacity overflow-x-auto",
          isPending && "opacity-60"
        )}
      >
        {transactions.length === 0 ? (
          <div className="py-10">
            <EmptyState
              icon={<CreditCard className="size-6" />}
              title="No transactions found"
              description={
                hasFilters
                  ? "Try changing your search or filter criteria to see more results."
                  : "Connect your accounts or import transactions to get started tracking your finances."
              }
              actions={
                hasFilters
                  ? [
                      {
                        label: "Clear Filters",
                        variant: "outline",
                        onClick: clearFilters,
                      },
                    ]
                  : [
                      {
                        label: "Connect Account",
                        onClick: () => router.push("/accounts/connect"),
                      },
                      {
                        label: "Import Transactions",
                        variant: "outline",
                        onClick: () => router.push("/accounts/import"),
                      },
                    ]
              }
            />
          </div>
        ) : (
          <TooltipProvider>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10 hidden sm:table-cell">
                    <Checkbox
                      checked={allOnPageSelected}
                      onCheckedChange={toggleAll}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead className="w-20 sm:w-24">
                    <button
                      type="button"
                      className="flex items-center gap-1 text-xs font-medium hover:text-foreground transition-colors"
                      onClick={() => handleSort("date")}
                    >
                      Date
                      {currentSortBy === "date" ? (
                        currentSortDir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />
                      ) : (
                        <ArrowUpDown className="size-3 opacity-50" />
                      )}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      type="button"
                      className="flex items-center gap-1 text-xs font-medium hover:text-foreground transition-colors"
                      onClick={() => handleSort("description")}
                    >
                      Description
                      {currentSortBy === "description" ? (
                        currentSortDir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />
                      ) : (
                        <ArrowUpDown className="size-3 opacity-50" />
                      )}
                    </button>
                  </TableHead>
                  <TableHead className="w-32 sm:w-44 pl-4 sm:pl-8 hidden sm:table-cell">
                    <button
                      type="button"
                      className="flex items-center gap-1 text-xs font-medium hover:text-foreground transition-colors"
                      onClick={() => handleSort("category")}
                    >
                      Category
                      {currentSortBy === "category" ? (
                        currentSortDir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />
                      ) : (
                        <ArrowUpDown className="size-3 opacity-50" />
                      )}
                    </button>
                  </TableHead>
                  <TableHead className="w-24 sm:w-32 pl-4 sm:pl-8 text-right">
                    <button
                      type="button"
                      className="flex items-center gap-1 text-xs font-medium hover:text-foreground transition-colors ml-auto"
                      onClick={() => handleSort("amount")}
                    >
                      Amount
                      {currentSortBy === "amount" ? (
                        currentSortDir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />
                      ) : (
                        <ArrowUpDown className="size-3 opacity-50" />
                      )}
                    </button>
                  </TableHead>
                  <TableHead className="w-32 hidden lg:table-cell">
                    <button
                      type="button"
                      className="flex items-center gap-1 text-xs font-medium hover:text-foreground transition-colors"
                      onClick={() => handleSort("account")}
                    >
                      Account
                      {currentSortBy === "account" ? (
                        currentSortDir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />
                      ) : (
                        <ArrowUpDown className="size-3 opacity-50" />
                      )}
                    </button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => {
                  const isIncome = tx.amount > 0
                  const isPending = tx.status === "pending"
                  const isTransfer = (tx.categories as { type?: string } | null)?.type === "transfer"
                  const displayName = tx.merchant_name || tx.description
                  const hasOriginal =
                    tx.original_description &&
                    tx.original_description !== tx.description &&
                    tx.original_description !== tx.merchant_name
                  return (
                    <TableRow
                      key={tx.id}
                      data-state={selected.has(tx.id) ? "selected" : undefined}
                      className={cn("cursor-pointer", isPending && "opacity-60")}
                      onClick={(e) => {
                        if (
                          (e.target as HTMLElement).closest('input[type="checkbox"]') ||
                          (e.target as HTMLElement).closest('[data-category-selector]')
                        ) {
                          return
                        }
                        handleRowClick(tx)
                      }}
                    >
                      <TableCell className="hidden sm:table-cell">
                        <Checkbox
                          checked={selected.has(tx.id)}
                          onCheckedChange={() => toggleOne(tx.id)}
                          aria-label={`Select ${displayName}`}
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs tabular-nums">
                        <div className="flex items-center gap-1.5">
                          {dateFormatter.format(new Date(tx.date + "T00:00:00"))}
                          {isPending && (
                            <span className="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium leading-none text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                              Pending
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <MerchantLogo merchantName={tx.merchant_name || tx.description} cachedDomain={tx.cached_logo_domain} size="sm" />
                          <div className="flex flex-col min-w-0">
                            {hasOriginal ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="truncate max-w-[280px] text-sm font-medium cursor-default">
                                    {displayName}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <span className="text-xs">{tx.original_description}</span>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="truncate max-w-[280px] text-sm font-medium">
                                {displayName}
                              </span>
                            )}
                            {tx.merchant_name && tx.merchant_name !== tx.description && (
                              <span className="truncate max-w-[280px] text-xs text-muted-foreground">
                                {tx.description}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="pl-4 sm:pl-8 hidden sm:table-cell">
                        <div data-category-selector>
                          <CategorySelector
                            transactionId={tx.id}
                            currentCategory={resolveCategory(tx.categories)}
                            categories={categories}
                            transaction={{
                              merchant_name: tx.merchant_name,
                              description: tx.description,
                            }}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="pl-4 sm:pl-8 text-right tabular-nums">
                        <div className="flex items-center justify-end gap-1.5">
                          {tx.is_recurring && (
                            <Repeat2 className="size-3.5 text-muted-foreground/60 shrink-0" />
                          )}
                          {tx.ignored && (
                            <EyeOff className="size-3.5 text-muted-foreground/60 shrink-0" />
                          )}
                          {isTransfer && (
                            <ArrowLeftRight className="size-3.5 text-muted-foreground/60 shrink-0" />
                          )}
                          <span
                            className={cn(
                              "text-sm font-medium",
                              isIncome && "text-emerald-600 dark:text-emerald-400"
                            )}
                          >
                            {isIncome && "+"}
                            {currencyFormatter.format(Math.abs(tx.amount))}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <AccountIcon 
                          accountNumber={resolveAccount(tx.accounts)?.name}
                          accountType={resolveAccount(tx.accounts)?.account_type || "default"}
                          institutionName={resolveAccount(tx.accounts)?.institution_name}
                          size="sm"
                        />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TooltipProvider>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground tabular-nums">
            Page {page} of {totalPages}
            <span className="hidden sm:inline"> &middot; {total.toLocaleString()} transactions</span>
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              disabled={page <= 1}
              onClick={() => updateParams({ page: "" })}
              title="First page"
            >
              <ChevronsLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={page <= 1}
              onClick={() => updateParams({ page: String(page - 1) })}
              title="Previous page"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={page >= totalPages}
              onClick={() => updateParams({ page: String(page + 1) })}
              title="Next page"
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={page >= totalPages}
              onClick={() => updateParams({ page: String(totalPages) })}
              title="Last page"
            >
              <ChevronsRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>

    <TransactionDetailSheet
      transaction={selectedTransaction ? {
        id: selectedTransaction.id,
        description: selectedTransaction.description,
        merchant_name: selectedTransaction.merchant_name,
        amount: selectedTransaction.amount,
        date: selectedTransaction.date,
        tags: selectedTransaction.tags,
        notes: selectedTransaction.notes,
        ignored: selectedTransaction.ignored ?? false,
        review_flagged: selectedTransaction.review_flagged ?? false,
        review_flagged_reason: selectedTransaction.review_flagged_reason ?? null,
        category_confirmed: selectedTransaction.category_confirmed ?? false,
        category_confidence: selectedTransaction.category_confidence,
        categorized_by: selectedTransaction.categorized_by,
        recurring_id: selectedTransaction.recurring_id ?? null,
        is_recurring: selectedTransaction.is_recurring ?? false,
        recurring_frequency: selectedTransaction.recurring_rules
          ? (Array.isArray(selectedTransaction.recurring_rules)
              ? selectedTransaction.recurring_rules[0]?.frequency ?? null
              : selectedTransaction.recurring_rules.frequency)
          : null,
        categories: selectedTransaction.categories
          ? (Array.isArray(selectedTransaction.categories)
              ? selectedTransaction.categories[0] ?? null
              : selectedTransaction.categories)
          : null,
      } : null}
      categories={categories}
      open={detailOpen}
      onOpenChange={setDetailOpen}
      openRuleDialog={ruleDialogOpen}
      onRuleDialogOpenChange={setRuleDialogOpen}
      onRuleSaved={refreshData}
    />

    {lastCategoryChange && (
      <RuleToast
        categoryName={lastCategoryChange.categoryName}
        onAddRule={handleAddRule}
        open={toastOpen}
        onOpenChange={setToastOpen}
      />
    )}
    
    {ruleTransaction && lastCategoryChange && (
      <CreateRuleSheet
        open={createRuleSheetOpen}
        onOpenChange={setCreateRuleSheetOpen}
        transaction={ruleTransaction}
        categoryName={lastCategoryChange.categoryName}
        categories={categories}
        onCreateRule={handleCreateRule}
      />
    )}

    {ruleTransaction && (
      <RuleDialog
        transaction={{
          id: ruleTransaction.id,
          description: ruleTransaction.description,
          merchant_name: ruleTransaction.merchant_name,
          amount: ruleTransaction.amount,
          date: ruleTransaction.date,
          categories: ruleTransaction.categories
            ? (Array.isArray(ruleTransaction.categories)
                ? ruleTransaction.categories[0] ?? null
                : ruleTransaction.categories)
            : null,
        }}
        categories={categories}
        open={ruleDialogOpen}
        onOpenChange={setRuleDialogOpen}
        onSaved={refreshData}
      />
    )}

    <ToastProvider>
      <Toast
        open={!!aiResult}
        onOpenChange={(open) => { if (!open) setAiResult(null) }}
        className={cn(
          "max-w-md",
          aiResultType === "error" && "border-rose-200 dark:border-rose-800"
        )}
      >
        <div className="flex items-start gap-3">
          <div className={cn(
            "rounded-full p-1.5",
            aiResultType === "success"
              ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400"
              : "bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400"
          )}>
            {aiResultType === "success" ? (
              <Sparkles className="size-4" />
            ) : (
              <AlertCircle className="size-4" />
            )}
          </div>
          <div className="grid gap-0.5">
            <ToastTitle>
              {aiResultType === "success" ? "Categorization complete" : "Categorization failed"}
            </ToastTitle>
            <ToastDescription>{aiResult}</ToastDescription>
          </div>
        </div>
        <ToastClose />
      </Toast>
      <ToastViewport className="p-6" />
    </ToastProvider>
    </>
  )
}
