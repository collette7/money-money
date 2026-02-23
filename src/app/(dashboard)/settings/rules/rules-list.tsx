"use client"

import { useState, useTransition } from "react"
import { Eye, EyeOff, Pencil, Store, Tag, Trash2, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { RuleDialog } from "@/components/rule-dialog"
import type { CategoryRuleRow, RuleConditionRow } from "./actions"
import { toggleRuleActive, deleteCategoryRule } from "./actions"

type Category = {
  id: string
  name: string
  icon: string | null
  color: string | null
  type: string
}

type RulesListProps = {
  rules: CategoryRuleRow[]
  categories: Category[]
}

const FIELD_LABELS: Record<string, string> = {
  merchant_name: "Merchant",
  description: "Description",
  amount: "Amount",
}

const OPERATOR_LABELS: Record<string, string> = {
  contains: "contains",
  equals: "is exactly",
  starts_with: "starts with",
  greater_than: "greater than",
  less_than: "less than",
  between: "between",
}

function formatCondition(cond: RuleConditionRow): string {
  const field = FIELD_LABELS[cond.field] ?? cond.field
  const op = OPERATOR_LABELS[cond.operator] ?? cond.operator
  let value = cond.value
  if (cond.operator === "between" && cond.value_end) {
    value = `${cond.value} and ${cond.value_end}`
  }
  return `${field} ${op} '${value}'`
}

function formatConditionsSummary(conditions: RuleConditionRow[]): string {
  return "When " + conditions.map(formatCondition).join(" AND ")
}

type EditingRule = {
  id: string
  categoryId: string
  conditions: Array<{ field: string; operator: string; value: string; value_end?: string | null }>
  setIgnored: boolean | null
  setMerchantName: string | null
  setTags: string[] | null
}

export function RulesList({ rules, categories }: RulesListProps) {
  const [isPending, startTransition] = useTransition()
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [editingRule, setEditingRule] = useState<EditingRule | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleToggleActive = (ruleId: string, isActive: boolean) => {
    startTransition(async () => {
      await toggleRuleActive(ruleId, isActive)
    })
  }

  const handleDelete = (ruleId: string) => {
    startTransition(async () => {
      await deleteCategoryRule(ruleId)
      setDeleteConfirmId(null)
    })
  }

  const handleEdit = (rule: CategoryRuleRow) => {
    setEditingRule({
      id: rule.id,
      categoryId: rule.category_id,
      conditions: rule.conditions.map((c) => ({
        field: c.field,
        operator: c.operator,
        value: c.value,
        value_end: c.value_end,
      })),
      setIgnored: rule.set_ignored,
      setMerchantName: rule.set_merchant_name,
      setTags: rule.set_tags ?? null,
    })
    setDialogOpen(true)
  }

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setEditingRule(null)
    }
  }

  if (rules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-muted/50 mb-4">
          <Sparkles className="size-6 text-muted-foreground/60" />
        </div>
        <h3 className="text-base font-medium text-foreground mb-1">No rules yet</h3>
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          Create rules from any transaction to auto-categorize matching transactions in the future.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="divide-y divide-border/60 border border-border/60 rounded-xl overflow-hidden">
        {rules.map((rule) => {
          const category = rule.categories
          const hasVisibilityAction = rule.set_ignored !== null
          const hasRenameAction = rule.set_merchant_name !== null

          return (
            <div
              key={rule.id}
              className={cn(
                "flex items-center gap-4 px-4 py-3.5 transition-colors",
                !rule.is_active && "bg-muted/30"
              )}
            >
              <Switch
                size="sm"
                checked={rule.is_active}
                onCheckedChange={(checked) => handleToggleActive(rule.id, checked)}
                disabled={isPending}
              />

              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-sm leading-snug",
                  !rule.is_active && "text-muted-foreground"
                )}>
                  {formatConditionsSummary(rule.conditions)}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">→</span>
                  {category ? (
                    <div className="flex items-center gap-1.5">
                      {category.icon && <span className="text-xs">{category.icon}</span>}
                      <span
                        className="size-2 rounded-full shrink-0"
                        style={{ backgroundColor: category.color ?? "#94a3b8" }}
                      />
                      <span className="text-xs font-medium">{category.name}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Unknown category</span>
                  )}
                  {hasVisibilityAction && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {rule.set_ignored ? <EyeOff className="size-2.5" /> : <Eye className="size-2.5" />}
                      {rule.set_ignored ? "Hidden" : "Visible"}
                    </span>
                  )}
                  {hasRenameAction && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      <Store className="size-2.5" />
                      Rename
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(rule)}
                  disabled={isPending}
                  className="size-8 p-0"
                >
                  <Pencil className="size-3.5" />
                </Button>
                {deleteConfirmId === rule.id ? (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteConfirmId(null)}
                      disabled={isPending}
                      className="text-xs h-7 px-2"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(rule.id)}
                      disabled={isPending}
                      className="text-xs h-7 px-2"
                    >
                      Delete
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteConfirmId(rule.id)}
                    disabled={isPending}
                    className="size-8 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <RuleDialog
        transaction={null}
        categories={categories}
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        editingRule={editingRule}
      />
    </>
  )
}
