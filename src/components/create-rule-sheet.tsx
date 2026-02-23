"use client"

import { useState, useEffect } from "react"
import { ChevronRight, X } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"

interface CreateRuleSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaction: {
    merchant_name: string | null
    description: string
    amount: number
    category_id: string | null
  }
  categoryName: string
  categories?: Array<{
    id: string
    name: string
    icon: string | null
    color: string | null
  }>
  onCreateRule: (rule: any) => void
}

interface ExpandedSection {
  merchant?: boolean
  amount?: boolean
  category?: boolean
}

interface RuleCondition {
  id: string
  label: string
  value?: string
  expanded?: boolean
}

interface RuleUpdate {
  id: string
  label: string
  value?: string
  expanded?: boolean
}

export function CreateRuleSheet({
  open,
  onOpenChange,
  transaction,
  categoryName,
  categories = [],
  onCreateRule
}: CreateRuleSheetProps) {
  const [selectedConditions, setSelectedConditions] = useState<string[]>(["merchant"])
  const [selectedUpdates, setSelectedUpdates] = useState<string[]>(["category"])
  const [merchantValue, setMerchantValue] = useState("")
  const [merchantOperator, setMerchantOperator] = useState("equals")
  const [categoryValue, setCategoryValue] = useState(transaction.category_id || "")
  const [matchCount, setMatchCount] = useState(3)
  const [expanded, setExpanded] = useState<ExpandedSection>({
    merchant: false,
  })

  useEffect(() => {
    setMerchantValue(transaction.merchant_name || transaction.description || "")
    setCategoryValue(transaction.category_id || "")
  }, [transaction])

  const handleConditionToggle = (conditionId: string) => {
    if (conditionId === "merchant") {
      setExpanded(prev => ({ ...prev, merchant: !prev.merchant }))
      if (!selectedConditions.includes(conditionId)) {
        setSelectedConditions([...selectedConditions, conditionId])
      }
    }
  }

  const handleUpdateToggle = (updateId: string) => {
    if (updateId === "category") {
      setExpanded(prev => ({ ...prev, category: !prev.category }))
    }
  }

  const handlePreview = () => {
    console.log("Preview matches")
  }

  const handleCreateRule = () => {
    const rule = {
      field: "merchant_name",
      operator: merchantOperator,
      value: merchantValue,
      categoryId: categoryValue,
      categoryName: categories.find(c => c.id === categoryValue)?.name || categoryName,
    }
    onCreateRule(rule)
    onOpenChange(false)
  }

  const conditions: RuleCondition[] = [
    { id: "merchant", label: "Merchant", value: merchantValue, expanded: expanded.merchant },
    { id: "categories", label: "Categories", expanded: false },
    { id: "amount", label: "Amount", expanded: false },
    { id: "account", label: "Account", expanded: false },
    { id: "tags", label: "Tags", expanded: false },
    { id: "date", label: "Date", expanded: false },
    { id: "type", label: "Type", expanded: false },
  ]

  const updates: RuleUpdate[] = [
    { id: "category", label: "Update category", value: categoryValue, expanded: expanded.category },
    { id: "visibility", label: "Transaction visibility", expanded: false },
    { id: "merchant_name", label: "Rename merchant", expanded: false },
    { id: "description", label: "Change description", expanded: false },
    { id: "tag", label: "Add tag", expanded: false },
    { id: "split", label: "Split", expanded: false },
  ]

  const getMerchantDisplayValue = () => {
    if (merchantValue) {
      return merchantValue
    }
    return "Select merchant"
  }

  const getCategoryDisplayValue = () => {
    const category = categories.find(c => c.id === categoryValue)
    return category?.name || categoryName || "Select category"
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-[540px] p-0 overflow-hidden"
      >
        <div className="flex flex-col h-full">
          <SheetHeader className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                CREATE RULE
              </SheetTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-medium mb-4">If the transactions matches:</h3>
                <div className="space-y-1">
                  {conditions.map((condition) => (
                    <div key={condition.id}>
                      <div
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors hover:bg-accent`}
                        onClick={() => handleConditionToggle(condition.id)}
                      >
                        <span className="text-sm">{condition.label}</span>
                        <div className="flex items-center gap-2">
                          {condition.id === "merchant" && merchantValue && (
                            <span className="text-sm text-muted-foreground">{getMerchantDisplayValue()}</span>
                          )}
                          <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${condition.expanded ? 'rotate-90' : ''}`} />
                        </div>
                      </div>
                      {condition.expanded && condition.id === "merchant" && (
                        <div className="px-3 py-4 space-y-3 border-x border-b rounded-b-lg">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs">Field</Label>
                              <Select value="merchant_name">
                                <SelectTrigger className="mt-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="merchant_name">Merchant name</SelectItem>
                                  <SelectItem value="description">Description</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs">Operator</Label>
                              <Select value={merchantOperator} onValueChange={setMerchantOperator}>
                                <SelectTrigger className="mt-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="equals">Equals</SelectItem>
                                  <SelectItem value="contains">Contains</SelectItem>
                                  <SelectItem value="starts_with">Starts with</SelectItem>
                                  <SelectItem value="ends_with">Ends with</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs">Value</Label>
                            <Input 
                              value={merchantValue} 
                              onChange={(e) => setMerchantValue(e.target.value)}
                              className="mt-1"
                              placeholder="Enter merchant name"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-sm font-medium mb-4">Then apply these updates:</h3>
                <div className="space-y-1">
                  {updates.map((update) => (
                    <div key={update.id}>
                      <div
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors hover:bg-accent`}
                        onClick={() => handleUpdateToggle(update.id)}
                      >
                        <span className="text-sm">{update.label}</span>
                        <div className="flex items-center gap-2">
                          {update.id === "category" && categoryValue && (
                            <span className="text-sm text-muted-foreground">{getCategoryDisplayValue()}</span>
                          )}
                          <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${update.expanded ? 'rotate-90' : ''}`} />
                        </div>
                      </div>
                      {update.expanded && update.id === "category" && (
                        <div className="px-3 py-4 space-y-3 border-x border-b rounded-b-lg">
                          <div>
                            <Label className="text-xs">Category</Label>
                            <Select value={categoryValue} onValueChange={setCategoryValue}>
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                {categories.map(cat => (
                                  <SelectItem key={cat.id} value={cat.id}>
                                    <div className="flex items-center gap-2">
                                      {cat.icon && <span>{cat.icon}</span>}
                                      <span>{cat.name}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-center py-2">
                <span className="text-xs text-muted-foreground uppercase">OR</span>
              </div>
            </div>
          </div>

          <div className="border-t px-6 py-4 bg-muted/30">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="default"
                onClick={handlePreview}
              >
                Preview {matchCount} matches
              </Button>
              <Button
                size="default"
                onClick={handleCreateRule}
                className="bg-foreground hover:bg-foreground/90 text-background"
              >
                Review rule
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}