"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface DateEntry {
  date: string
  day: string
  dayNum: number
  total: number
}

interface DateStripProps {
  dates: DateEntry[]
  visibleCount?: number
  offset: number
  onOffsetChange: (offset: number) => void
  selectedDate?: string | null
  onSelectDate?: (date: string) => void
}

export function DateStrip({ dates, visibleCount = 7, offset, onOffsetChange, selectedDate, onSelectDate }: DateStripProps) {
  const maxOffset = Math.max(0, dates.length - visibleCount)

  const visible = dates.slice(offset, offset + visibleCount)

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        disabled={offset === 0}
        onClick={() => onOffsetChange(Math.max(0, offset - visibleCount))}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="flex gap-1.5 flex-1 justify-center">
        {visible.map((day) => {
          const isSelected = selectedDate === day.date
          return (
            <div
              key={day.date}
              onClick={() => onSelectDate?.(isSelected ? "" : day.date)}
              className={`flex flex-col items-center w-[52px] py-1.5 px-1 rounded-lg border cursor-pointer transition-colors ${
                isSelected
                  ? "border-primary bg-primary/10"
                  : "bg-muted/50 hover:bg-muted"
              }`}
            >
              <span className="text-[10px] text-muted-foreground leading-none">{day.day}</span>
              <span className="text-base font-semibold leading-tight mt-0.5">{day.dayNum}</span>
              {day.total > 0 && (
                <span className="text-[10px] font-medium text-primary leading-none mt-0.5">
                  ${day.total.toFixed(0)}
                </span>
              )}
            </div>
          )
        })}
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        disabled={offset >= maxOffset}
        onClick={() => onOffsetChange(Math.min(maxOffset, offset + visibleCount))}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
