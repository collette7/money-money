"use client"

import { ArrowLeft, Check, X } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useMerchantDetailSheet, currency, shortCurrency } from "./use-merchant-detail-sheet"

interface MerchantDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  merchantName: string | null
  transactionId: string | null
}

export function MerchantDetailSheet({
  open,
  onOpenChange,
  merchantName,
}: MerchantDetailSheetProps) {
  const {
    loading,
    sortOrder,
    setSortOrder,
    monthlyData,
    maxMonthly,
    currentMonth,
    thisMonthCount,
    avgSpent,
    total2025,
    total2026,
    sortedTxs,
    initial,
  } = useMerchantDetailSheet({
    open,
    onOpenChange,
    merchantName,
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" showCloseButton={false} className="sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="border-b border-border px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => onOpenChange(false)}
                className="size-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors -ml-1"
              >
                <ArrowLeft className="size-4" />
              </button>
              <SheetTitle className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                Merchant Detail
              </SheetTitle>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="size-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"
            >
              <X className="size-3.5" />
            </button>
          </div>
          <SheetDescription className="sr-only">
            Spending history for {merchantName}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="px-5 py-5 space-y-5">
            <div className="rounded-xl border px-4 py-3 flex items-center gap-3">
              <div className="size-9 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-muted-foreground shrink-0">
                {initial}
              </div>
              <span className="font-semibold text-sm truncate">
                {merchantName || "Unknown"}
              </span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <span className="size-5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {monthlyData.length > 0 && (
                  <div className="flex items-end justify-between gap-2 px-1">
                    {monthlyData.map((m) => {
                      const height = Math.max(24, (m.total / maxMonthly) * 80)
                      const isCurrent = m.key === currentMonth
                      return (
                        <div key={m.key} className="flex flex-col items-center gap-1 flex-1">
                          <span className="text-[11px] font-medium tabular-nums">
                            {shortCurrency(m.total)}
                          </span>
                          <div
                            className={`w-full max-w-[48px] rounded-md ${isCurrent ? "bg-foreground" : "bg-muted"}`}
                            style={{ height }}
                          />
                          <span className="text-[10px] text-muted-foreground">{m.label}</span>
                        </div>
                      )
                    })}
                  </div>
                )}

                <div className="flex gap-2">
                  {[
                    { label: "This month", value: `${thisMonthCount}x` },
                    { label: "Avg. spent", value: currency(avgSpent) },
                    { label: "2025 total", value: currency(total2025) },
                    { label: "2026 total", value: currency(total2026) },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="flex-1 rounded-lg border px-2.5 py-2 text-center"
                    >
                      <div className="text-[10px] text-muted-foreground leading-tight">
                        {stat.label}
                      </div>
                      <div className="text-sm font-semibold mt-0.5">{stat.value}</div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-end gap-2">
                  <span className="text-xs text-muted-foreground">View by</span>
                  <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as "newest" | "oldest")}>
                    <SelectTrigger className="h-7 w-[100px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest</SelectItem>
                      <SelectItem value="oldest">Oldest</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-xl border">
                  <div className="px-4 py-2.5 border-b">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                      Transactions
                    </span>
                  </div>
                  {sortedTxs.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                      No transactions found
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {sortedTxs.map((tx) => {
                        const d = new Date(tx.date + "T00:00:00")
                        const dateLabel = d.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                        return (
                          <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                            <div className="size-6 rounded-full border-2 border-amber-400 flex items-center justify-center shrink-0">
                              <Check className="size-3 text-amber-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">
                                {tx.merchant_name || tx.description}
                              </div>
                              <div className="text-xs text-muted-foreground">{dateLabel}</div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-sm font-medium tabular-nums">
                                {currency(tx.amount)}
                              </span>
                              <span className="size-1.5 rounded-full bg-blue-500" />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
