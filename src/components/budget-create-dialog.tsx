"use client"

import { useState, useTransition } from "react"
import { ChevronRight, Info, Target } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { createBudget, getHierarchicalBudget } from "@/app/(dashboard)/budgets/actions"
import type { BudgetMode } from "@/types/database"
import { cn } from "@/lib/utils"

interface BudgetCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  month: number
  year: number
  onCreated?: () => void
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

const BUDGET_MODES = [
  {
    value: "independent" as BudgetMode,
    label: "Independent",
    description: "Each category has its own fixed limit. Simple and predictable.",
  },
  {
    value: "pooled" as BudgetMode,
    label: "Flexible Pooled",
    description: "Parent categories share unused budget with their children. More flexibility.",
  },
  {
    value: "strict_pooled" as BudgetMode,
    label: "Strict Pooled",
    description: "Like flexible, but children cannot exceed parent limits. Maximum control.",
  },
]

export function BudgetCreateDialog({
  open,
  onOpenChange,
  month,
  year,
  onCreated,
}: BudgetCreateDialogProps) {
  const [step, setStep] = useState(1)
  const [mode, setMode] = useState<BudgetMode>("independent")
  const [applyTemplate, setApplyTemplate] = useState(true)
  const [enableRollover, setEnableRollover] = useState(true)
  const [categoryLimits, setCategoryLimits] = useState<Record<string, number>>({})
  const [categories, setCategories] = useState<any[]>([])
  const [isPending, startTransition] = useTransition()

  const loadCategories = async () => {
    const hierarchicalData = await getHierarchicalBudget(month, year)
    const expenseCategories = hierarchicalData.filter(c => c.type === "expense" && !c.excluded_from_budget)
    setCategories(expenseCategories)
    
    if (applyTemplate) {
      const initialLimits: Record<string, number> = {}
      expenseCategories.forEach(cat => {
        if (!cat.parent_id) {
          initialLimits[cat.id] = getTemplateAmount(cat.name)
        }
      })
      setCategoryLimits(initialLimits)
    }
  }

  const getTemplateAmount = (categoryName: string): number => {
    const templates: Record<string, number> = {
      "Housing": 2000,
      "Transportation": 800,
      "Food": 600,
      "Utilities": 200,
      "Healthcare": 300,
      "Personal": 400,
      "Entertainment": 200,
      "Shopping": 300,
      "Other": 200,
    }
    return templates[categoryName] || 200
  }

  const handleCreate = async () => {
    startTransition(async () => {
      const items = Object.entries(categoryLimits)
        .filter(([_, limit]) => limit > 0)
        .map(([categoryId, limitAmount]) => ({ categoryId, limitAmount }))
      
      await createBudget(month, year, items, mode)
      onOpenChange(false)
      onCreated?.()
    })
  }

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <>
            <DialogHeader>
              <DialogTitle>Create Budget for {MONTH_NAMES[month - 1]} {year}</DialogTitle>
              <DialogDescription>
                Choose how you want to manage your budget limits
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-3">
                <Label>Budget Mode</Label>
                <div className="space-y-2">
                  {BUDGET_MODES.map((m) => (
                    <button
                      key={m.value}
                      onClick={() => setMode(m.value)}
                      className={cn(
                        "w-full text-left space-y-1 rounded-lg border p-3 transition-colors",
                        mode === m.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-accent"
                      )}
                    >
                      <div className="font-medium">{m.label}</div>
                      <div className="text-sm text-muted-foreground">
                        {m.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between space-x-2 rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="template" className="text-sm font-medium">
                    Apply suggested amounts
                  </Label>
                  <div className="text-xs text-muted-foreground">
                    Start with recommended budget amounts based on 50/30/20 rule
                  </div>
                </div>
                <Switch
                  id="template"
                  checked={applyTemplate}
                  onCheckedChange={setApplyTemplate}
                />
              </div>

              <div className="flex items-center justify-between space-x-2 rounded-lg border p-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="rollover" className="text-sm font-medium">
                      Enable rollover
                    </Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Unused budget from previous months will be added to your limits</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Carry forward unused budget from previous months
                  </div>
                </div>
                <Switch
                  id="rollover"
                  checked={enableRollover}
                  onCheckedChange={setEnableRollover}
                />
              </div>
            </div>
          </>
        )

      case 2:
        return (
          <>
            <DialogHeader>
              <DialogTitle>Set Budget Limits</DialogTitle>
              <DialogDescription>
                Enter monthly spending limits for each category
              </DialogDescription>
            </DialogHeader>
            
            <div className="max-h-[400px] overflow-y-auto space-y-3 py-4">
              {categories.map((category) => (
                <div key={category.id} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 flex-1">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: category.color || "#94a3b8" }}
                      />
                      <Label htmlFor={category.id} className="font-medium">
                        {category.name}
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">$</span>
                      <Input
                        id={category.id}
                        type="number"
                        min="0"
                        step="10"
                        value={categoryLimits[category.id] || ""}
                        onChange={(e) => {
                          setCategoryLimits({
                            ...categoryLimits,
                            [category.id]: parseInt(e.target.value) || 0,
                          })
                        }}
                        className="w-32"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  
                  {category.children && category.children.length > 0 && (
                    <div className="ml-6 space-y-3">
                      {category.children.map((child: any) => (
                        <div key={child.id} className="flex items-center gap-3">
                          <div className="flex items-center gap-2 flex-1">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: child.color || category.color || "#94a3b8" }}
                            />
                            <Label htmlFor={child.id} className="text-sm">
                              {child.name}
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">$</span>
                            <Input
                              id={child.id}
                              type="number"
                              min="0"
                              step="10"
                              value={categoryLimits[child.id] || ""}
                              onChange={(e) => {
                                setCategoryLimits({
                                  ...categoryLimits,
                                  [child.id]: parseInt(e.target.value) || 0,
                                })
                              }}
                              className="w-28 h-8 text-sm"
                              placeholder="0"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        {renderStepContent()}
        
        <DialogFooter>
          {step === 1 ? (
            <Button
              onClick={() => {
                setStep(2)
                loadCategories()
              }}
              disabled={isPending}
            >
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <div className="flex gap-2 w-full">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                disabled={isPending}
              >
                Back
              </Button>
              <Button
                onClick={handleCreate}
                disabled={isPending || Object.keys(categoryLimits).length === 0}
                className="flex-1"
              >
                {isPending ? "Creating..." : "Create Budget"}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}