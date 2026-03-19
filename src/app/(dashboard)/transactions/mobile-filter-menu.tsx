"use client"

import { Menu } from "bloom-menu"
import { Filter, ChevronRight, Building2, Tag, Calendar as CalendarIcon, X, Check } from "lucide-react"
import { cn } from "@/lib/utils"

type Account = {
  id: string
  name: string
  account_type?: string | null
  institution_name?: string | null
}

type Category = {
  id: string
  name: string
  color: string | null
  type: string
  children?: Category[]
}

type MobileFilterMenuProps = {
  accounts: Account[]
  categories: { expense: Category[]; income: Category[]; transfer: Category[] }
  currentAccountId: string
  currentCategoryId: string
  currentStartDate: string
  currentEndDate: string
  hasFilters: boolean | string
  onAccountChange: (val: string) => void
  onCategoryChange: (val: string) => void
  onStartDateChange: (val: string) => void
  onEndDateChange: (val: string) => void
  onClearFilters: () => void
}

export function MobileFilterMenu({
  accounts,
  categories,
  currentAccountId,
  currentCategoryId,
  hasFilters,
  onAccountChange,
  onCategoryChange,
  onClearFilters,
}: MobileFilterMenuProps) {
  const activeFilterCount = [
    currentAccountId && currentAccountId !== "all",
    currentCategoryId && currentCategoryId !== "all",
  ].filter(Boolean).length

  const allCategories = [
    ...categories.expense,
    ...categories.income,
    ...categories.transfer,
  ]

  return (
    <div className="sm:hidden">
      <Menu.Root direction="bottom" anchor="start" bounce={0.15} visualDuration={0.25}>
        <Menu.Container
          buttonSize={{ width: activeFilterCount > 0 ? 90 : 72, height: 36 }}
          menuWidth={280}
          menuRadius={16}
          buttonRadius={10}
          className="bg-card border border-border shadow-sm"
          style={{ zIndex: 40 }}
        >
          <Menu.Trigger>
            <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              <Filter className="size-3.5" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="flex items-center justify-center size-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                  {activeFilterCount}
                </span>
              )}
            </div>
          </Menu.Trigger>

          <Menu.Content className="p-1.5">
            <Menu.SubMenu id="account">
              <Menu.SubMenuTrigger className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-sm hover:bg-muted transition-colors">
                {(isActive: boolean) => (
                  <>
                    <Building2 className="size-4 text-muted-foreground" />
                    <span className="flex-1 text-left">Account</span>
                    {currentAccountId && currentAccountId !== "all" && (
                      <span className="text-xs text-primary font-medium truncate max-w-[100px]">
                        {accounts.find(a => a.id === currentAccountId)?.name || ""}
                      </span>
                    )}
                    <ChevronRight className={cn("size-3.5 text-muted-foreground transition-transform", isActive && "rotate-90")} />
                  </>
                )}
              </Menu.SubMenuTrigger>
              <Menu.SubMenuContent className="p-1">
                <Menu.Item
                  onSelect={() => onAccountChange("all")}
                  closeOnSelect={false}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors",
                    (!currentAccountId || currentAccountId === "all") && "text-primary font-medium"
                  )}
                >
                  {(!currentAccountId || currentAccountId === "all") && <Check className="size-3.5" />}
                  All accounts
                </Menu.Item>
                {accounts.map(acc => (
                  <Menu.Item
                    key={acc.id}
                    onSelect={() => onAccountChange(acc.id)}
                    closeOnSelect={false}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors truncate",
                      currentAccountId === acc.id && "text-primary font-medium"
                    )}
                  >
                    {currentAccountId === acc.id && <Check className="size-3.5 shrink-0" />}
                    <span className="truncate">{acc.institution_name ? `${acc.institution_name} · ` : ""}{acc.name}</span>
                  </Menu.Item>
                ))}
              </Menu.SubMenuContent>
            </Menu.SubMenu>

            <Menu.SubMenu id="category">
              <Menu.SubMenuTrigger className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-sm hover:bg-muted transition-colors">
                {(isActive: boolean) => (
                  <>
                    <Tag className="size-4 text-muted-foreground" />
                    <span className="flex-1 text-left">Category</span>
                    {currentCategoryId && currentCategoryId !== "all" && (
                      <span className="text-xs text-primary font-medium truncate max-w-[100px]">
                        {allCategories.find(c => c.id === currentCategoryId)?.name || ""}
                      </span>
                    )}
                    <ChevronRight className={cn("size-3.5 text-muted-foreground transition-transform", isActive && "rotate-90")} />
                  </>
                )}
              </Menu.SubMenuTrigger>
              <Menu.SubMenuContent className="p-1 max-h-[280px] overflow-y-auto">
                <Menu.Item
                  onSelect={() => onCategoryChange("all")}
                  closeOnSelect={false}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors",
                    (!currentCategoryId || currentCategoryId === "all") && "text-primary font-medium"
                  )}
                >
                  {(!currentCategoryId || currentCategoryId === "all") && <Check className="size-3.5" />}
                  All categories
                </Menu.Item>
                {allCategories.map(cat => (
                  <Menu.Item
                    key={cat.id}
                    onSelect={() => onCategoryChange(cat.id)}
                    closeOnSelect={false}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors",
                      currentCategoryId === cat.id && "text-primary font-medium"
                    )}
                  >
                    <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: cat.color || "#94a3b8" }} />
                    {currentCategoryId === cat.id && <Check className="size-3.5 shrink-0" />}
                    <span className="truncate">{cat.name}</span>
                  </Menu.Item>
                ))}
              </Menu.SubMenuContent>
            </Menu.SubMenu>

            {hasFilters && (
              <Menu.Item
                onSelect={onClearFilters}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors mt-1 border-t border-border pt-2"
              >
                <X className="size-4" />
                Clear all filters
              </Menu.Item>
            )}
          </Menu.Content>
        </Menu.Container>
        <Menu.Overlay className="fixed inset-0 bg-black/20 z-30" />
      </Menu.Root>
    </div>
  )
}
