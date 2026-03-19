"use client"

import { useState } from "react"
import { Menu } from "bloom-menu"
import {
  Filter, ChevronRight, Building2, Tag, X, Check, Search,
  CreditCard, Landmark, PiggyBank, Briefcase, CircleDot,
} from "lucide-react"
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

const ACCOUNT_ICONS: Record<string, typeof CreditCard> = {
  credit: CreditCard,
  checking: Landmark,
  savings: PiggyBank,
  investment: Briefcase,
}

function AccountIcon({ type }: { type?: string | null }) {
  const Icon = ACCOUNT_ICONS[type || ""] || CircleDot
  return <Icon className="size-3.5 text-muted-foreground/70" />
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
  const [categorySearch, setCategorySearch] = useState("")

  const activeFilterCount = [
    currentAccountId && currentAccountId !== "all",
    currentCategoryId && currentCategoryId !== "all",
  ].filter(Boolean).length

  const allCategories = [
    ...categories.expense,
    ...categories.income,
    ...categories.transfer,
  ]

  const filteredCategories = categorySearch
    ? allCategories.filter(c => c.name.toLowerCase().includes(categorySearch.toLowerCase()))
    : allCategories

  const activeAccountName = accounts.find(a => a.id === currentAccountId)?.name
  const activeCategoryName = allCategories.find(c => c.id === currentCategoryId)?.name

  return (
    <div className="sm:hidden">
      <Menu.Root direction="bottom" anchor="start" bounce={0.12} visualDuration={0.22}>
        <Menu.Container
          buttonSize={{ width: activeFilterCount > 0 ? 96 : 76, height: 36 }}
          menuWidth={300}
          menuRadius={14}
          buttonRadius={10}
          className="bg-card border border-border shadow-sm"
          style={{ zIndex: 40 }}
        >
          <Menu.Trigger>
            <div className="flex items-center gap-1.5 text-[13px] font-medium text-foreground">
              <Filter className="size-3.5" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="flex items-center justify-center size-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold leading-none">
                  {activeFilterCount}
                </span>
              )}
            </div>
          </Menu.Trigger>

          <Menu.Content className="py-1.5">
            <Menu.SubMenu id="account">
              <Menu.SubMenuTrigger className="flex items-center gap-3 w-full px-3 py-2.5 text-[13px] hover:bg-muted/60 transition-colors">
                {(isActive: boolean) => (
                  <>
                    <span className="flex items-center justify-center size-7 rounded-lg bg-muted">
                      <Building2 className="size-3.5 text-foreground/70" />
                    </span>
                    <span className="flex-1 text-left font-medium text-foreground">Account</span>
                    {activeAccountName && (
                      <span className="text-[11px] text-muted-foreground bg-muted rounded-full px-2 py-0.5 truncate max-w-[90px]">
                        {activeAccountName}
                      </span>
                    )}
                    <ChevronRight className={cn(
                      "size-3.5 text-muted-foreground/50 transition-transform duration-150",
                      isActive && "rotate-90"
                    )} />
                  </>
                )}
              </Menu.SubMenuTrigger>
              <Menu.SubMenuContent className="py-1">
                <div className="px-3 pb-1.5 pt-0.5">
                  <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest">Select account</span>
                </div>
                <Menu.Item
                  onSelect={() => onAccountChange("all")}
                  closeOnSelect={false}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 text-[13px] hover:bg-muted/60 transition-colors",
                    (!currentAccountId || currentAccountId === "all") && "text-foreground font-medium"
                  )}
                >
                  <span className={cn(
                    "flex items-center justify-center size-4 rounded-full border-2 transition-colors",
                    (!currentAccountId || currentAccountId === "all")
                      ? "border-primary bg-primary" : "border-muted-foreground/30"
                  )}>
                    {(!currentAccountId || currentAccountId === "all") && (
                      <Check className="size-2.5 text-primary-foreground" strokeWidth={3} />
                    )}
                  </span>
                  All accounts
                </Menu.Item>
                {accounts.map(acc => (
                  <Menu.Item
                    key={acc.id}
                    onSelect={() => onAccountChange(acc.id)}
                    closeOnSelect={false}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 text-[13px] hover:bg-muted/60 transition-colors",
                      currentAccountId === acc.id && "text-foreground font-medium"
                    )}
                  >
                    <span className={cn(
                      "flex items-center justify-center size-4 rounded-full border-2 transition-colors",
                      currentAccountId === acc.id
                        ? "border-primary bg-primary" : "border-muted-foreground/30"
                    )}>
                      {currentAccountId === acc.id && (
                        <Check className="size-2.5 text-primary-foreground" strokeWidth={3} />
                      )}
                    </span>
                    <AccountIcon type={acc.account_type} />
                    <span className="truncate flex-1">{acc.institution_name ? `${acc.institution_name} · ` : ""}{acc.name}</span>
                  </Menu.Item>
                ))}
              </Menu.SubMenuContent>
            </Menu.SubMenu>

            <Menu.SubMenu id="category">
              <Menu.SubMenuTrigger className="flex items-center gap-3 w-full px-3 py-2.5 text-[13px] hover:bg-muted/60 transition-colors">
                {(isActive: boolean) => (
                  <>
                    <span className="flex items-center justify-center size-7 rounded-lg bg-muted">
                      <Tag className="size-3.5 text-foreground/70" />
                    </span>
                    <span className="flex-1 text-left font-medium text-foreground">Category</span>
                    {activeCategoryName && (
                      <span className="text-[11px] text-muted-foreground bg-muted rounded-full px-2 py-0.5 truncate max-w-[90px]">
                        {activeCategoryName}
                      </span>
                    )}
                    <ChevronRight className={cn(
                      "size-3.5 text-muted-foreground/50 transition-transform duration-150",
                      isActive && "rotate-90"
                    )} />
                  </>
                )}
              </Menu.SubMenuTrigger>
              <Menu.SubMenuContent className="py-1">
                <div className="px-3 py-1.5">
                  <div className="flex items-center gap-2 px-2 py-1.5 bg-muted/50 rounded-lg">
                    <Search className="size-3 text-muted-foreground/60" />
                    <input
                      type="text"
                      placeholder="Search categories..."
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      className="flex-1 bg-transparent border-none outline-none text-[12px] text-foreground placeholder:text-muted-foreground/50"
                      onClick={(e) => e.stopPropagation()}
                    />
                    {categorySearch && (
                      <button onClick={(e) => { e.stopPropagation(); setCategorySearch("") }}>
                        <X className="size-3 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="max-h-[240px] overflow-y-auto">
                  <Menu.Item
                    onSelect={() => onCategoryChange("all")}
                    closeOnSelect={false}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 text-[13px] hover:bg-muted/60 transition-colors",
                      (!currentCategoryId || currentCategoryId === "all") && "text-foreground font-medium"
                    )}
                  >
                    <span className={cn(
                      "flex items-center justify-center size-4 rounded-full border-2 transition-colors",
                      (!currentCategoryId || currentCategoryId === "all")
                        ? "border-primary bg-primary" : "border-muted-foreground/30"
                    )}>
                      {(!currentCategoryId || currentCategoryId === "all") && (
                        <Check className="size-2.5 text-primary-foreground" strokeWidth={3} />
                      )}
                    </span>
                    All categories
                  </Menu.Item>

                  {categories.expense.length > 0 && filteredCategories.some(c => c.type === "expense") && (
                    <div className="px-3 pt-2 pb-1">
                      <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest">Expenses</span>
                    </div>
                  )}
                  {filteredCategories.filter(c => c.type === "expense").map(cat => (
                    <Menu.Item
                      key={cat.id}
                      onSelect={() => onCategoryChange(cat.id)}
                      closeOnSelect={false}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 text-[13px] hover:bg-muted/60 transition-colors",
                        currentCategoryId === cat.id && "text-foreground font-medium"
                      )}
                    >
                      <span
                        className="size-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color || "#94a3b8" }}
                      />
                      <span className="truncate flex-1">{cat.name}</span>
                      {currentCategoryId === cat.id && (
                        <Check className="size-3 text-primary shrink-0" strokeWidth={3} />
                      )}
                    </Menu.Item>
                  ))}

                  {categories.income.length > 0 && filteredCategories.some(c => c.type === "income") && (
                    <div className="px-3 pt-2 pb-1">
                      <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest">Income</span>
                    </div>
                  )}
                  {filteredCategories.filter(c => c.type === "income").map(cat => (
                    <Menu.Item
                      key={cat.id}
                      onSelect={() => onCategoryChange(cat.id)}
                      closeOnSelect={false}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 text-[13px] hover:bg-muted/60 transition-colors",
                        currentCategoryId === cat.id && "text-foreground font-medium"
                      )}
                    >
                      <span
                        className="size-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color || "#94a3b8" }}
                      />
                      <span className="truncate flex-1">{cat.name}</span>
                      {currentCategoryId === cat.id && (
                        <Check className="size-3 text-primary shrink-0" strokeWidth={3} />
                      )}
                    </Menu.Item>
                  ))}

                  {categories.transfer.length > 0 && filteredCategories.some(c => c.type === "transfer") && (
                    <div className="px-3 pt-2 pb-1">
                      <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest">Transfers</span>
                    </div>
                  )}
                  {filteredCategories.filter(c => c.type === "transfer").map(cat => (
                    <Menu.Item
                      key={cat.id}
                      onSelect={() => onCategoryChange(cat.id)}
                      closeOnSelect={false}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 text-[13px] hover:bg-muted/60 transition-colors",
                        currentCategoryId === cat.id && "text-foreground font-medium"
                      )}
                    >
                      <span
                        className="size-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color || "#94a3b8" }}
                      />
                      <span className="truncate flex-1">{cat.name}</span>
                      {currentCategoryId === cat.id && (
                        <Check className="size-3 text-primary shrink-0" strokeWidth={3} />
                      )}
                    </Menu.Item>
                  ))}

                  {filteredCategories.length === 0 && (
                    <div className="px-3 py-4 text-center text-[12px] text-muted-foreground/60">
                      No categories match "{categorySearch}"
                    </div>
                  )}
                </div>
              </Menu.SubMenuContent>
            </Menu.SubMenu>

            {hasFilters && (
              <>
                <div className="mx-3 my-1 h-px bg-border" />
                <Menu.Item
                  onSelect={onClearFilters}
                  className="flex items-center gap-3 px-3 py-2 text-[13px] text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
                >
                  <span className="flex items-center justify-center size-7 rounded-lg">
                    <X className="size-3.5" />
                  </span>
                  Clear all filters
                </Menu.Item>
              </>
            )}
          </Menu.Content>
        </Menu.Container>
        <Menu.Overlay className="fixed inset-0 bg-black/25 z-30" />
      </Menu.Root>
    </div>
  )
}
