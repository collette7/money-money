"use client"

import { ArrowLeft, Check, ChevronRight, Repeat, Repeat2, Scissors, StickyNote, EyeOff, X, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { CategoryPicker } from "@/components/category-picker"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { RuleDialog } from "@/components/rule-dialog"
import { SplitTransactionDialog } from "@/components/split-transaction-dialog"
import { CategoryFormDialog } from "@/components/category-form-dialog"
import { MerchantDetailSheet } from "@/components/merchant-detail-sheet"
import { useTransactionDetail } from "./use-transaction-detail"

export type TransactionForSheet = {
  id: string
  description: string
  merchant_name: string | null
  amount: number
  date: string
  notes?: string | null
  tags?: string[] | null
  ignored?: boolean
  review_flagged?: boolean
  review_flagged_reason?: string | null
  category_confirmed?: boolean
  category_confidence?: number | null
  categorized_by?: string | null
  recurring_id?: string | null
  is_recurring?: boolean
  recurring_frequency?: string | null
  categories: {
    id: string
    name: string
    icon: string | null
    color: string | null
  } | null
}

type Category = {
  id: string
  name: string
  icon: string | null
  color: string | null
  type: string
  parent_id?: string | null
}

interface TransactionDetailSheetProps {
  transaction: TransactionForSheet | null
  categories: Category[]
  open: boolean
  onOpenChange: (open: boolean) => void
  openRuleDialog?: boolean
  onRuleDialogOpenChange?: (open: boolean) => void
  onRuleSaved?: () => void
}

const fullDate = (dateStr: string) =>
  new Intl.DateTimeFormat("en-US", {
    weekday: "long",
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

export function TransactionDetailSheet({
  transaction,
  categories,
  open,
  onOpenChange,
  openRuleDialog,
  onRuleDialogOpenChange,
  onRuleSaved,
}: TransactionDetailSheetProps) {
  const {
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
  } = useTransactionDetail(transaction, open, categories, onRuleDialogOpenChange, openRuleDialog)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" showCloseButton={false} className="sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onOpenChange(false)}
              className="size-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors -ml-1"
            >
              <ArrowLeft className="size-4" />
            </button>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground truncate">
                {merchantDisplay}
              </SheetTitle>
              <SheetDescription className="sr-only">
                Transaction details for {merchantDisplay}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="px-5 pt-8 pb-4 space-y-6">
            <div className="text-center space-y-2">
              {transaction?.review_flagged && !transaction?.category_confirmed && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                  <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                  {transaction.review_flagged_reason === "migration"
                    ? "Needs review — category may have changed"
                    : transaction.review_flagged_reason === "ai_low_confidence"
                      ? "Needs review — low confidence suggestion"
                      : "Needs review"}
                </span>
              )}

              {(transaction?.is_recurring || transaction?.ignored) && (
                <div className="flex items-center justify-center gap-2">
                  {transaction?.is_recurring && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                      <Repeat2 className="size-3.5" />
                      Recurring
                    </span>
                  )}
                  {transaction?.ignored && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                      <EyeOff className="size-3.5" />
                      Hidden
                    </span>
                  )}
                </div>
              )}

              <p
                className={cn(
                  "text-4xl font-bold tabular-nums tracking-tight",
                  isIncome ? "text-emerald-600" : "text-foreground"
                )}
              >
                {isIncome ? "+" : ""}
                {currency(transaction?.amount ?? 0)}
              </p>

              <Popover open={catOpen} onOpenChange={setCatOpen}>
                <PopoverTrigger asChild>
                  <button
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors hover:bg-muted/50 mx-auto",
                      isPending && "opacity-60",
                      !currentCategory && "border-dashed text-muted-foreground"
                    )}
                  >
                    {currentCategory ? (
                      <>
                        {currentCategory.icon && (
                          <span className="text-[11px]">{currentCategory.icon}</span>
                        )}
                        <span
                          className="size-2 rounded-full shrink-0"
                          style={{ backgroundColor: currentCategory.color ?? "#94a3b8" }}
                        />
                        {currentCategory.name}
                      </>
                    ) : (
                      "Uncategorized"
                    )}
                    <span className="text-[10px] opacity-50">(C)</span>
                    <ChevronRight className="size-3 text-muted-foreground -mr-0.5 rotate-90" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-64 p-0"
                  align="center"
                  side="bottom"
                  sideOffset={4}
                  onOpenAutoFocus={(e) => e.preventDefault()}
                >
                  <CategoryPicker
                    categories={categories}
                    selectedId={currentCategory?.id}
                    onSelect={handleCategorySelect}
                    onCreateNew={() => setCreateCategoryOpen(true)}
                  />
                </PopoverContent>
              </Popover>

              {currentCategory && !transaction?.ignored && (
                <button
                  onClick={() => setRuleOpen(true)}
                  className="inline-flex items-center gap-1 rounded-full border border-dashed border-border/60 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground mx-auto"
                >
                  Create Rule
                  <span className="opacity-60 text-[10px]">(R)</span>
                </button>
              )}

              {transaction?.category_confidence != null && !transaction?.category_confirmed && (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-[11px] text-muted-foreground">
                    {Math.round(transaction.category_confidence * 100)}% confidence
                    {transaction.categorized_by && ` · ${transaction.categorized_by}`}
                  </span>
                  {currentCategory && (
                    <button
                      onClick={handleConfirmCategory}
                      disabled={isPendingConfirm}
                      className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/5 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 transition-colors hover:bg-emerald-500/10 hover:border-emerald-400/60"
                    >
                      <Check className="size-3" />
                      Confirm
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-xl border divide-y divide-border">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-muted-foreground">Date</span>
                <span className="text-sm font-medium">
                  {transaction ? fullDate(transaction.date) : "—"}
                </span>
              </div>
              <button
                onClick={() => setMerchantOpen(true)}
                className="flex items-center justify-between px-4 py-3 w-full text-left hover:bg-muted/30 transition-colors"
              >
                <span className="text-sm text-muted-foreground">Merchant</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium">
                    {transaction?.merchant_name ?? "Unknown"}
                  </span>
                  <ChevronRight className="size-3.5 text-muted-foreground/50" />
                </div>
              </button>
              <div className="px-4 py-3 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-sm text-muted-foreground pt-0.5">Tags</span>
                  <div className="flex flex-wrap items-center gap-1.5 justify-end flex-1 min-w-0">
                    {tags.length === 0 && !tagInput && (
                      <span className="text-xs text-muted-foreground/60 italic">None</span>
                    )}
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="flex items-center gap-1 bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full group/tag"
                      >
                        {tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="size-3 flex items-center justify-center rounded-full opacity-60 hover:opacity-100 hover:text-foreground transition-opacity"
                          disabled={isPendingTags}
                        >
                          <X className="size-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleTagKeyDown}
                      className="h-7 text-xs pr-8"
                      placeholder="Add a tag..."
                      disabled={isPendingTags}
                    />
                    {tagInput && (
                      <button
                        onClick={() => addTag(tagInput)}
                        className="absolute right-1 top-1/2 -translate-y-1/2 size-5 flex items-center justify-center rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        disabled={isPendingTags}
                      >
                        <Plus className="size-3" />
                      </button>
                    )}
                  </div>
                </div>
                {isPendingTags && (
                  <p className="text-[10px] text-muted-foreground">Saving...</p>
                )}
              </div>
              <div className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Repeat className="size-3.5" />
                    Recurring
                  </span>
                  <div className="flex items-center gap-1.5">
                    {isPendingRecurring && (
                      <span className="text-[10px] text-muted-foreground">Saving...</span>
                    )}
                    <select
                      value={recurringFrequency ?? ""}
                      onChange={(e) => handleRecurringChange(e.target.value || null)}
                      disabled={isPendingRecurring}
                      className="h-7 rounded-md border border-input bg-background px-2 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 cursor-pointer"
                    >
                      <option value="">None</option>
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Biweekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="annual">Annual</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <EyeOff className="size-3.5" />
                  Hide transaction
                </span>
                <Switch
                  checked={ignored}
                  onCheckedChange={handleIgnoredToggle}
                  disabled={isPendingIgnored}
                />
              </div>
              <button
                onClick={() => setSplitOpen(true)}
                className="flex items-center justify-between px-4 py-3 w-full text-left hover:bg-muted/30 transition-colors"
              >
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Scissors className="size-3.5" />
                  Split transaction
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="text-[10px] opacity-50">(S)</span>
                  <ChevronRight className="size-3.5 text-muted-foreground/50" />
                </span>
              </button>
              <button
                onClick={() => setNotesOpen(!notesOpen)}
                className="flex items-center justify-between px-4 py-3 w-full text-left hover:bg-muted/30 transition-colors"
              >
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <StickyNote className="size-3.5" />
                  Add note
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="text-[10px] opacity-50">(N)</span>
                  {notes ? (
                    <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                      {notes}
                    </span>
                  ) : (
                    <ChevronRight className="size-3.5 text-muted-foreground/50" />
                  )}
                </span>
              </button>
            </div>

            {notesOpen && (
              <div className="rounded-xl border p-3 space-y-2">
                <Textarea
                  placeholder="Add a note..."
                  value={notes}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  className="min-h-20 resize-none text-sm border-0 p-0 focus-visible:ring-0 shadow-none"
                  autoFocus
                />
                {isPending && (
                  <p className="text-[10px] text-muted-foreground">Saving...</p>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="sr-only">
          Press C to change category. Press R to create a rule. Press S to split transaction.
          Press N to add a note. Press Escape to close.
        </div>
      </SheetContent>

      <RuleDialog
        transaction={transaction}
        categories={categories}
        open={ruleOpen}
        onOpenChange={handleRuleDialogChange}
        onSaved={onRuleSaved}
      />

      <SplitTransactionDialog
        transaction={transaction}
        categories={categories}
        open={splitOpen}
        onOpenChange={setSplitOpen}
      />

      <CategoryFormDialog
        open={createCategoryOpen}
        onOpenChange={setCreateCategoryOpen}
        onCreated={handleCategoryCreated}
      />

      <MerchantDetailSheet
        open={merchantOpen}
        onOpenChange={setMerchantOpen}
        merchantName={transaction?.merchant_name ?? null}
        transactionId={transaction?.id ?? null}
      />
    </Sheet>
  )
}
