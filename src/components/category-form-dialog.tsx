"use client"

import { useState, useTransition, useRef, useEffect } from "react"
import { Check, Loader2 } from "lucide-react"
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { KeyboardDialog } from "@/components/ui/keyboard-dialog"
import { useHotkeys } from "react-hotkeys-hook"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createCategory, getCategories } from "@/app/(dashboard)/transactions/actions"

interface CategoryFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (category: any) => void
  isGroupCreation?: boolean
  parentCategoryId?: string
}

const CATEGORY_ICONS = ["🛒", "🏠", "🚗", "🍔", "✈️", "🎓", "💊", "🎭", "💰", "📱"]

const CATEGORY_COLORS = [
  "#f87171", // red
  "#fb923c", // orange
  "#fbbf24", // amber
  "#facc15", // yellow
  "#a3e635", // lime
  "#4ade80", // green
  "#2dd4bf", // teal
  "#22d3ee", // cyan
  "#60a5fa", // blue
  "#a78bfa", // violet
  "#e879f9", // fuchsia
  "#f472b6", // pink
]

export function CategoryFormDialog({ 
  open, 
  onOpenChange, 
  onCreated,
  isGroupCreation = false,
  parentCategoryId
}: CategoryFormDialogProps) {
  const [name, setName] = useState("")
  const [type, setType] = useState("expense")
  const [icon, setIcon] = useState<string | null>(null)
  const [color, setColor] = useState<string | null>(CATEGORY_COLORS[0])
  const [isPending, startTransition] = useTransition()
  const [categories, setCategories] = useState<any[]>([])
  const [selectedParentId, setSelectedParentId] = useState<string | null>(parentCategoryId || null)
  const [isCreatingGroup, setIsCreatingGroup] = useState(isGroupCreation)
  const nameInputRef = useRef<HTMLInputElement>(null)
  
  useEffect(() => {
    if (open) {
      startTransition(async () => {
        const allCategories = await getCategories()
        setCategories(allCategories)
      })
    }
  }, [open])

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        nameInputRef.current?.focus()
      }, 100)
    }
  }, [open])

  const resetForm = () => {
    setName("")
    setType("expense")
    setIcon(null)
    setColor(CATEGORY_COLORS[0])
    setSelectedParentId(null)
    setIsCreatingGroup(false)
  }

  const handleCreate = () => {
    if (!name.trim()) return

    startTransition(async () => {
      try {
        const newCategory = await createCategory(
          name.trim(), 
          type, 
          icon, 
          color, 
          isCreatingGroup ? null : selectedParentId
        )
        if (onCreated) onCreated(newCategory)
        onOpenChange(false)
        resetForm()
      } catch (error) {
        console.error("Failed to create category:", error)
      }
    })
  }

  useHotkeys("alt+s", () => {
    if (open && name.trim() && !isPending) handleCreate()
  }, { enableOnFormTags: true }, [open, name, isPending])

  return (
    <KeyboardDialog
      open={open}
      onOpenChange={onOpenChange}
      initialFocusRef={nameInputRef}
      className="sm:max-w-md"
    >
        <DialogHeader>
          <DialogTitle>{isCreatingGroup ? "Create Category Group" : "Create New Category"}</DialogTitle>
          <DialogDescription>
            {isCreatingGroup 
              ? "Create a new category group to organize multiple categories."
              : "Add a custom category to organize your transactions."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="name">Category Name</Label>
            <Input
              id="name"
              ref={nameInputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim() && !isPending) {
                  handleCreate()
                }
              }}
              placeholder="e.g., Groceries, Rent, Salary"
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select value={type} onValueChange={setType} disabled={isPending}>
              <SelectTrigger id="type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {!isCreatingGroup && (
            <div className="space-y-2">
              <Label htmlFor="parentCategory">Parent Category (Optional)</Label>
              <Select 
                value={selectedParentId || ""} 
                onValueChange={(val) => setSelectedParentId(val || null)} 
                disabled={isPending}
              >
                <SelectTrigger id="parentCategory">
                  <SelectValue placeholder="Select parent category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None (Top-Level Category)</SelectItem>
                  {categories
                    .filter(c => !c.parent_id && c.type === type)
                    .map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Parent categories help organize related categories into groups
              </p>
            </div>
          )}
          <div className="space-y-2">
            <Label>Icon (Optional)</Label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_ICONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={`size-8 rounded-md flex items-center justify-center text-lg ${
                    icon === emoji
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  }`}
                  disabled={isPending}
                >
                  {emoji}
                </button>
              ))}
              {icon && (
                <button
                  type="button"
                  onClick={() => setIcon(null)}
                  className="size-8 rounded-md flex items-center justify-center text-xs bg-muted hover:bg-muted/80 text-muted-foreground"
                  disabled={isPending}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_COLORS.map((colorValue) => (
                <button
                  key={colorValue}
                  type="button"
                  onClick={() => setColor(colorValue)}
                  className={`size-8 rounded-md border ${
                    color === colorValue ? "ring-2 ring-primary" : ""
                  }`}
                  style={{ backgroundColor: colorValue }}
                  disabled={isPending}
                >
                  {color === colorValue && <Check className="size-4 text-white mx-auto" />}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isPending || !name.trim()}>
            {isPending ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>Create Category <span className="ml-1 opacity-60 text-[10px]">(Alt+S)</span></>
            )}
          </Button>
        </DialogFooter>
    </KeyboardDialog>
  )
}
