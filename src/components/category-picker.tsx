"use client"

import { Check, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

export type CategoryPickerItem = {
  id: string
  name: string
  icon: string | null
  color: string | null
  type: string
  parent_id?: string | null
}

type CategoryWithChildren = CategoryPickerItem & { children: CategoryPickerItem[] }

function organizeHierarchy(cats: CategoryPickerItem[], type: string): CategoryWithChildren[] {
  const parents = cats.filter(c => c.type === type && !c.parent_id)
  return parents.map(parent => ({
    ...parent,
    children: cats.filter(c => c.parent_id === parent.id),
  }))
}

interface CategoryPickerProps {
  categories: CategoryPickerItem[]
  selectedId?: string | null
  onSelect: (category: CategoryPickerItem) => void
  onCreateNew?: () => void
  className?: string
}

export function CategoryPicker({
  categories,
  selectedId,
  onSelect,
  onCreateNew,
  className,
}: CategoryPickerProps) {
  const grouped = {
    expense: organizeHierarchy(categories, "expense"),
    income: organizeHierarchy(categories, "income"),
    transfer: organizeHierarchy(categories, "transfer"),
  }

  return (
    <Command className={className}>
      <CommandInput placeholder="Search categories..." />
      <CommandList>
        <CommandEmpty>No category found.</CommandEmpty>
        <CategoryGroup heading="Expense" categories={grouped.expense} selectedId={selectedId} onSelect={onSelect} />
        <CategoryGroup heading="Income" categories={grouped.income} selectedId={selectedId} onSelect={onSelect} />
        <CategoryGroup heading="Transfer" categories={grouped.transfer} selectedId={selectedId} onSelect={onSelect} />
        {onCreateNew && (
          <CommandGroup heading="Actions">
            <CommandItem onSelect={onCreateNew} className="text-primary">
              <Plus className="mr-2 size-4" />
              <span>Create New Category</span>
            </CommandItem>
          </CommandGroup>
        )}
      </CommandList>
    </Command>
  )
}

function CategoryGroup({
  heading,
  categories,
  selectedId,
  onSelect,
}: {
  heading: string
  categories: CategoryWithChildren[]
  selectedId?: string | null
  onSelect: (category: CategoryPickerItem) => void
}) {
  if (categories.length === 0) return null

  return (
    <CommandGroup heading={heading}>
      {categories.map(cat => (
        <div key={cat.id}>
          <CommandItem
            value={cat.name}
            onSelect={() => onSelect(cat)}
            className="font-medium"
          >
            {cat.icon && <span className="text-[11px]">{cat.icon}</span>}
            <span
              className="size-2.5 rounded-full shrink-0"
              style={{ backgroundColor: cat.color ?? "#94a3b8" }}
            />
            <span className="truncate">{cat.name}</span>
            {selectedId === cat.id && (
              <Check className="ml-auto size-3.5 text-primary" />
            )}
          </CommandItem>
          {cat.children.map(child => (
            <CommandItem
              key={child.id}
              value={`${cat.name} ${child.name}`}
              onSelect={() => onSelect(child)}
              className={cn("pl-8", !child.icon && "pl-9")}
            >
              {child.icon && <span className="text-[11px]">{child.icon}</span>}
              <span
                className="size-2 rounded-full shrink-0"
                style={{ backgroundColor: child.color ?? cat.color ?? "#94a3b8" }}
              />
              <span className="truncate">{child.name}</span>
              {selectedId === child.id && (
                <Check className="ml-auto size-3.5 text-primary" />
              )}
            </CommandItem>
          ))}
        </div>
      ))}
    </CommandGroup>
  )
}
