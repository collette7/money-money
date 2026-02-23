"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CalendarIcon, ListIcon, Plus } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { RecurringFilter } from "./recurring-filter"
import { RecurringActions } from "./recurring-actions"
import { DateStrip } from "./date-strip"
import type { RecurringFrequency } from "@/types/database"

interface UpcomingRule {
  id: string
  merchant_name: string
  merchant_pattern: string
  expected_amount: number
  frequency: RecurringFrequency
  expected_day: number | null
  next_expected: string | null
  category: {
    id: string
    name: string
    icon: string | null
    color: string | null
    type: string
  } | null
  nextDate: string
  daysUntil: number
  end_date: string | null
  stop_after: number | null
}

interface DateEntry {
  date: string
  day: string
  dayNum: number
  total: number
}

interface UpcomingTransactionsProps {
  upcomingRules: UpcomingRule[]
  dates: DateEntry[]
  monthlyExpenses: number
  yearlyTotal: number
  billCount: number
  subscriptionCount: number
}

const FREQ_LABELS: Record<string, string> = {
  weekly: "Weekly",
  biweekly: "Biweekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  annual: "Yearly",
}

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

export function UpcomingTransactions({
  upcomingRules = [],
  dates = [],
  monthlyExpenses,
  yearlyTotal,
  billCount,
  subscriptionCount,
}: UpcomingTransactionsProps) {
  const [offset, setOffset] = useState(0)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [frequencyFilter, setFrequencyFilter] = useState("all")
  const visibleCount = 7

  const visibleDates = dates.slice(offset, offset + visibleCount)

  const filteredRules = useMemo(() => {
    let filtered = upcomingRules

    if (frequencyFilter !== "all") {
      const freqMap: Record<string, RecurringFrequency[]> = {
        monthly: ["monthly"],
        weekly: ["weekly", "biweekly"],
        yearly: ["annual", "quarterly"],
      }
      const allowed = freqMap[frequencyFilter] ?? []
      filtered = filtered.filter((r) => allowed.includes(r.frequency))
    }

    if (selectedDate) {
      return filtered.filter((r) => r.nextDate === selectedDate)
    }
    const visibleDateSet = new Set(visibleDates.map((d) => d.date))
    return filtered.filter((r) => visibleDateSet.has(r.nextDate))
  }, [upcomingRules, visibleDates, selectedDate, frequencyFilter])

  const handleOffsetChange = (newOffset: number) => {
    setOffset(newOffset)
    setSelectedDate(null)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          Upcoming Transactions
        </CardTitle>
        <div className="flex items-center gap-2">
          <RecurringFilter value={frequencyFilter} onChange={setFrequencyFilter} />
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <CalendarIcon className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ListIcon className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <DateStrip
            dates={dates}
            visibleCount={visibleCount}
            offset={offset}
            onOffsetChange={handleOffsetChange}
            selectedDate={selectedDate}
            onSelectDate={(date) => setSelectedDate(date || null)}
          />

          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Bills</span>
              <span className="font-semibold tabular-nums">{billCount}</span>
              <span className="text-muted-foreground">•</span>
              <span className="font-semibold tabular-nums">{currency.format(monthlyExpenses)}/mo</span>
            </div>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Total</span>
              <span className="font-semibold tabular-nums">{currency.format(yearlyTotal)}/yr</span>
            </div>
          </div>

          <div className="space-y-3 mt-2">
            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Upcoming</h3>
            {filteredRules.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {selectedDate
                  ? `No recurring transactions on ${new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                  : "No upcoming recurring transactions"}
              </p>
            ) : (
              filteredRules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {rule.merchant_name[0] ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-sm">
                        {rule.merchant_name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {FREQ_LABELS[rule.frequency] ?? rule.frequency} &bull; Due{" "}
                        {new Date(rule.nextDate + "T00:00:00").toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                        {rule.category && (
                          <>
                            {" "}&bull;{" "}
                            <span style={{ color: rule.category.color ?? undefined }}>
                              {rule.category.icon} {rule.category.name}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium tabular-nums">
                      ${rule.expected_amount.toFixed(2)}
                    </span>
                    <RecurringActions
                      ruleId={rule.id}
                      merchantName={rule.merchant_name}
                      amount={rule.expected_amount}
                      frequency={rule.frequency}
                      nextExpected={rule.next_expected}
                      expectedDay={rule.expected_day}
                      endDate={rule.end_date}
                      stopAfter={rule.stop_after}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
