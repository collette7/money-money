"use client"

import { useState } from "react"
import {
  Check,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Plus,
  ShieldCheck,
  Sparkles,
  Store,
  Tag,
  Trash2,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { CategoryPicker } from "@/components/category-picker"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import type { TransactionForSheet } from "@/components/transaction-detail-sheet"
import {
  useRuleDialog,
  CONDITION_FIELDS,
  getOperatorsForField,
  type Category,
  type RuleCondition,
  type VisibilityAction,
  type EditingRule,
} from "@/components/use-rule-dialog"

type RuleDialogProps = {
  transaction: TransactionForSheet | null
  categories: Category[]
  open: boolean
  onOpenChange: (open: boolean) => void
  editingRule?: EditingRule | null
  onSaved?: () => void
}

const VISIBILITY_OPTIONS: { value: VisibilityAction; label: string; icon: typeof Eye }[] = [
  { value: "unchanged", label: "Unchanged", icon: Eye },
  { value: "hidden", label: "Hidden", icon: EyeOff },
  { value: "visible", label: "Visible", icon: Eye },
]

function ConditionRow({
  condition,
  index,
  canRemove,
  isFirst,
  valueInputRef,
  onUpdate,
  onRemove,
  onEnterSave,
}: {
  condition: RuleCondition
  index: number
  canRemove: boolean
  isFirst: boolean
  valueInputRef: React.RefObject<HTMLInputElement | null>
  onUpdate: (index: number, patch: Partial<RuleCondition>) => void
  onRemove: (index: number) => void
  onEnterSave: () => void
}) {
  const fieldDef = CONDITION_FIELDS.find((f) => f.value === condition.field)
  const operators = getOperatorsForField(condition.field)
  const operatorDef = operators.find((o) => o.value === condition.operator)
  const isAmount = condition.field === "amount"
  const isBetween = condition.operator === "between"

  return (
    <div className="rounded-xl border border-border/60 overflow-hidden">
      <div className="divide-y divide-border/60">
        <div className="flex items-center justify-between px-4 py-2.5">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Field
          </span>
          <div className="flex items-center gap-1.5">
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1.5 text-sm font-medium hover:text-foreground/80 transition-colors">
                  {fieldDef && <fieldDef.icon className="size-3.5 text-muted-foreground" />}
                  {fieldDef?.label ?? "Select"}
                  <ChevronRight className="size-3 text-muted-foreground/50" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-1" align="end">
                {CONDITION_FIELDS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => onUpdate(index, { field: f.value })}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors hover:bg-muted",
                      condition.field === f.value && "bg-muted"
                    )}
                  >
                    <f.icon className="size-3.5 text-muted-foreground" />
                    {f.label}
                    {condition.field === f.value && (
                      <Check className="ml-auto size-3.5 text-primary" />
                    )}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
            {canRemove && (
              <button
                onClick={() => onRemove(index)}
                className="size-6 rounded-md flex items-center justify-center hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors ml-1"
              >
                <Trash2 className="size-3" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between px-4 py-2.5">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Condition
          </span>
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-1.5 text-sm font-medium hover:text-foreground/80 transition-colors">
                {operatorDef?.label ?? "Select"}
                <ChevronRight className="size-3 text-muted-foreground/50" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-44 p-1" align="end">
              {operators.map((o) => (
                <button
                  key={o.value}
                  onClick={() => onUpdate(index, { operator: o.value })}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors hover:bg-muted",
                    condition.operator === o.value && "bg-muted"
                  )}
                >
                  {o.label}
                  {condition.operator === o.value && (
                    <Check className="ml-auto size-3.5 text-primary" />
                  )}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex items-center justify-between px-4 py-2.5 gap-3">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider shrink-0">
            Value
          </span>
          {isBetween ? (
            <div className="flex items-center gap-2 flex-1 justify-end">
              <input
                type="number"
                ref={isFirst ? valueInputRef : undefined}
                value={condition.value}
                onChange={(e) => onUpdate(index, { value: e.target.value })}
                placeholder="0.00"
                step="0.01"
                className="text-sm font-medium text-right bg-transparent outline-none w-20 placeholder:text-muted-foreground/40 tabular-nums"
              />
              <span className="text-xs text-muted-foreground">and</span>
              <input
                type="number"
                value={condition.valueEnd}
                onChange={(e) => onUpdate(index, { valueEnd: e.target.value })}
                placeholder="0.00"
                step="0.01"
                className="text-sm font-medium text-right bg-transparent outline-none w-20 placeholder:text-muted-foreground/40 tabular-nums"
              />
            </div>
          ) : (
            <input
              type={isAmount ? "number" : "text"}
              ref={isFirst ? valueInputRef : undefined}
              value={condition.value}
              onChange={(e) => onUpdate(index, { value: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") onEnterSave()
              }}
              placeholder={isAmount ? "0.00" : "e.g. Starbucks"}
              step={isAmount ? "0.01" : undefined}
              className={cn(
                "text-sm font-medium text-right bg-transparent outline-none w-full placeholder:text-muted-foreground/40",
                isAmount && "tabular-nums"
              )}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export function RuleDialog({
  transaction,
  categories,
  open,
  onOpenChange,
  editingRule,
  onSaved,
}: RuleDialogProps) {
  const {
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
    handleOpenChange,
    handleSave,
    hasValidConditions,
    matchCount,
    matchSamples,
    showPreview,
    setShowPreview,
    isLoadingPreview,
  } = useRuleDialog({
    transaction,
    categories,
    open,
    onOpenChange,
    editingRule,
    onSaved,
  })

  const [showMerchantInput, setShowMerchantInput] = useState(false)
  const [showTagsInput, setShowTagsInput] = useState(false)

  const visibilityDef = VISIBILITY_OPTIONS.find((v) => v.value === visibilityAction)

  const summaryParts = conditions.map((c) => {
    const fieldDef = CONDITION_FIELDS.find((f) => f.value === c.field)
    const ops = getOperatorsForField(c.field)
    const opDef = ops.find((o) => o.value === c.operator)
    const val = c.operator === "between" ? `${c.value} – ${c.valueEnd}` : c.value
    return `${fieldDef?.label.toLowerCase() ?? "field"} ${opDef?.label ?? "matches"} "${val || "..."}"`
  })

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[480px] p-0 overflow-hidden flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-4 border-b border-border/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10">
                <Sparkles className="size-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <SheetTitle className="text-base font-semibold tracking-tight">
                  {isEditing ? "Edit Rule" : "Create Rule"}
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                  {isEditing ? "Update rule conditions and actions" : "Auto-categorize matching transactions"}
                </SheetDescription>
              </div>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="size-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <div className="space-y-3">
            <button
              onClick={() => setShowConditionDetails(!showConditionDetails)}
              className="flex items-center gap-2 w-full text-left group"
            >
              <span className="flex size-5 items-center justify-center rounded bg-blue-500/10 text-[10px] font-bold text-blue-600 dark:text-blue-400">
                IF
              </span>
              <span className="text-sm font-medium text-foreground">
                If the transaction matches:
              </span>
              <ChevronDown
                className={cn(
                  "size-3.5 ml-auto text-muted-foreground/50 transition-transform",
                  !showConditionDetails && "-rotate-90"
                )}
              />
            </button>

            {showConditionDetails && (
              <div className="space-y-2">
                {conditions.map((cond, i) => (
                  <div key={i}>
                    {i > 0 && (
                      <div className="flex justify-center py-1">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 bg-muted px-2 py-0.5 rounded">
                          AND
                        </span>
                      </div>
                    )}
                    <ConditionRow
                      condition={cond}
                      index={i}
                      canRemove={conditions.length > 1}
                      isFirst={i === 0}
                      valueInputRef={valueInputRef}
                      onUpdate={updateCondition}
                      onRemove={removeCondition}
                      onEnterSave={() => {
                        if (selectedCategory && hasValidConditions && !isPending) handleSave()
                      }}
                    />
                  </div>
                ))}
                <button
                  onClick={addCondition}
                  className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-1 py-1.5"
                >
                  <Plus className="size-3" />
                  Add condition
                </button>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <button
              onClick={() => setShowActionDetails(!showActionDetails)}
              className="flex items-center gap-2 w-full text-left group"
            >
              <span className="flex size-5 items-center justify-center rounded bg-emerald-500/10 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                →
              </span>
              <span className="text-sm font-medium text-foreground">
                Then apply these updates:
              </span>
              <ChevronDown
                className={cn(
                  "size-3.5 ml-auto text-muted-foreground/50 transition-transform",
                  !showActionDetails && "-rotate-90"
                )}
              />
            </button>

            {showActionDetails && (
              <div className="rounded-xl border border-border/60 divide-y divide-border/60 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Tag className="size-3" />
                    Category
                  </span>
                  <Popover open={catPickerOpen} onOpenChange={setCatPickerOpen}>
                    <PopoverTrigger asChild>
                      <button className="flex items-center gap-1.5 text-sm font-medium hover:text-foreground/80 transition-colors">
                        {selectedCategory ? (
                          <>
                            {selectedCategory.icon && (
                              <span className="text-xs">{selectedCategory.icon}</span>
                            )}
                            <span
                              className="size-2 rounded-full shrink-0"
                              style={{ backgroundColor: selectedCategory.color ?? "#94a3b8" }}
                            />
                            {selectedCategory.name}
                          </>
                        ) : (
                          <span className="text-muted-foreground">Select category</span>
                        )}
                        <ChevronRight className="size-3 text-muted-foreground/50" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-0" align="end">
                      <CategoryPicker
                        categories={categories}
                        selectedId={selectedCategory?.id}
                        onSelect={(cat) => { setSelectedCategory(cat); setCatPickerOpen(false) }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <Popover>
                  <PopoverTrigger asChild>
                    <button className="flex items-center justify-between px-4 py-2.5 w-full hover:bg-muted/30 transition-colors">
                      <span className={cn(
                        "text-xs font-medium uppercase tracking-wider flex items-center gap-1.5",
                        visibilityAction === "unchanged" ? "text-muted-foreground" : "text-foreground"
                      )}>
                        {visibilityAction === "hidden" ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                        Visibility
                      </span>
                      <span className="text-sm font-medium flex items-center gap-1">
                        {visibilityDef?.label}
                        <ChevronRight className="size-3 text-muted-foreground/50" />
                      </span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-40 p-1" align="end">
                    {VISIBILITY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setVisibilityAction(opt.value)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors hover:bg-muted",
                          visibilityAction === opt.value && "bg-muted"
                        )}
                      >
                        <opt.icon className="size-3.5 text-muted-foreground" />
                        {opt.label}
                        {visibilityAction === opt.value && <Check className="ml-auto size-3.5 text-primary" />}
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>

                <div className="px-4 py-2.5">
                  <button
                    onClick={() => setShowMerchantInput(!showMerchantInput)}
                    className="flex items-center justify-between w-full"
                  >
                    <span className={cn(
                      "text-xs font-medium uppercase tracking-wider flex items-center gap-1.5",
                      merchantRename ? "text-foreground" : "text-muted-foreground"
                    )}>
                      <Store className="size-3" />
                      Rename merchant
                    </span>
                    <span className="text-sm font-medium flex items-center gap-1">
                      {merchantRename || "No change"}
                      <ChevronRight className={cn(
                        "size-3 text-muted-foreground/50 transition-transform",
                        showMerchantInput && "rotate-90"
                      )} />
                    </span>
                  </button>
                  {showMerchantInput && (
                    <Input
                      value={merchantRename}
                      onChange={(e) => setMerchantRename(e.target.value)}
                      placeholder="New merchant name..."
                      className="mt-2 h-8 text-xs"
                    />
                  )}
                </div>

                <div className="px-4 py-2.5">
                  <button
                    onClick={() => setShowTagsInput(!showTagsInput)}
                    className="flex items-center justify-between w-full"
                  >
                    <span className={cn(
                      "text-xs font-medium uppercase tracking-wider flex items-center gap-1.5",
                      ruleTags.length > 0 ? "text-foreground" : "text-muted-foreground"
                    )}>
                      <Tag className="size-3" />
                      Apply tags
                    </span>
                    <span className="text-sm font-medium flex items-center gap-1">
                      {ruleTags.length > 0 ? ruleTags.join(", ") : "None"}
                      <ChevronRight className={cn(
                        "size-3 text-muted-foreground/50 transition-transform",
                        showTagsInput && "rotate-90"
                      )} />
                    </span>
                  </button>
                  {showTagsInput && (
                    <div className="mt-2 space-y-2">
                      {ruleTags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {ruleTags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                            >
                              {tag}
                              <button
                                onClick={() => setRuleTags(ruleTags.filter((t) => t !== tag))}
                                className="hover:text-destructive"
                              >
                                <X className="size-2.5" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-1.5">
                        <Input
                          value={ruleTagInput}
                          onChange={(e) => setRuleTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && ruleTagInput.trim()) {
                              e.preventDefault()
                              const tag = ruleTagInput.trim().toLowerCase()
                              if (!ruleTags.includes(tag)) {
                                setRuleTags([...ruleTags, tag])
                              }
                              setRuleTagInput("")
                            }
                          }}
                          placeholder="Add tag..."
                          className="h-7 text-xs flex-1"
                        />
                        <button
                          onClick={() => {
                            if (ruleTagInput.trim()) {
                              const tag = ruleTagInput.trim().toLowerCase()
                              if (!ruleTags.includes(tag)) {
                                setRuleTags([...ruleTags, tag])
                              }
                              setRuleTagInput("")
                            }
                          }}
                          className="text-xs text-primary hover:text-primary/80 font-medium px-1.5"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl bg-muted/50 border border-border/40 px-4 py-3 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-amber-600 dark:text-amber-400" />
              <span className="text-xs font-semibold text-foreground">Rule Summary</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              When {summaryParts.join(" AND ")}, set category to{" "}
              <span className="font-medium text-foreground">
                {selectedCategory?.icon ? `${selectedCategory.icon} ` : ""}
                {selectedCategory?.name ?? "..."}
              </span>
              {visibilityAction !== "unchanged" && (
                <>, {visibilityAction === "hidden" ? "hide" : "show"} transaction</>
              )}
              {merchantRename && (
                <>, rename to &ldquo;<span className="font-medium text-foreground">{merchantRename}</span>&rdquo;</>
              )}
              {ruleTags.length > 0 && (
                <>, tag as <span className="font-medium text-foreground">{ruleTags.join(", ")}</span></>
              )}
            </p>
          </div>

          {showPreview && matchSamples.length > 0 && (
            <div className="rounded-xl border border-border/60 overflow-hidden">
              <div className="px-4 py-2.5 bg-muted/30 border-b border-border/40">
                <span className="text-xs font-semibold text-foreground">
                  {matchCount} matching transaction{matchCount !== 1 ? "s" : ""}
                </span>
                {matchCount > 5 && (
                  <span className="text-xs text-muted-foreground ml-1">(showing first 5)</span>
                )}
              </div>
              <div className="divide-y divide-border/40">
                {matchSamples.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between px-4 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{tx.merchant_name || tx.description}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(tx.date + "T00:00:00"))}
                      </p>
                    </div>
                    <span className={cn("text-xs font-medium tabular-nums ml-3", tx.amount >= 0 ? "text-emerald-600" : "text-foreground")}>
                      {tx.amount >= 0 ? "+" : ""}
                      {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Math.abs(tx.amount))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showPreview && matchCount === 0 && !isLoadingPreview && hasValidConditions && (
            <div className="rounded-xl border border-border/60 px-4 py-3">
              <p className="text-xs text-muted-foreground text-center">No transactions match this rule</p>
            </div>
          )}
        </div>

        <div className="border-t border-border/60 px-5 py-3.5 flex items-center justify-between bg-muted/20">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-xs text-muted-foreground">
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
              disabled={!hasValidConditions}
              className="text-xs"
            >
              <Eye className="size-3" />
              {isLoadingPreview ? "Checking..." : `Preview ${matchCount} match${matchCount !== 1 ? "es" : ""}`}
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isPending || !selectedCategory || !hasValidConditions}
              className="text-xs bg-foreground text-background hover:bg-foreground/90"
            >
              {isPending ? (
                <>
                  <span className="size-3 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Plus className="size-3" />
                  {isEditing ? "Update rule" : "Save rule"}
                  <span className="ml-1 opacity-60 text-[10px]">(Alt+S)</span>
                </>
              )}
            </Button>
          </div>
        </div>
        <div className="sr-only">
          Press Alt+S to save the rule. Press Enter in the value field to save. Press Escape to close.
        </div>
      </SheetContent>
    </Sheet>
  )
}
