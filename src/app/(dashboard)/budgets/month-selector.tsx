"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

function MonthSelector({
  month,
  year,
}: {
  month: number
  year: number
}) {
  const router = useRouter()

  const navigate = (newMonth: number, newYear: number) => {
    const params = new URLSearchParams()
    params.set("month", String(newMonth))
    params.set("year", String(newYear))
    router.push(`/spending/breakdown?${params.toString()}`)
  }

  const goPrev = () => {
    if (month === 1) {
      navigate(12, year - 1)
    } else {
      navigate(month - 1, year)
    }
  }

  const goNext = () => {
    if (month === 12) {
      navigate(1, year + 1)
    } else {
      navigate(month + 1, year)
    }
  }

  const now = new Date()
  const isCurrentMonth =
    month === now.getMonth() + 1 && year === now.getFullYear()

  return (
    <div className="flex items-center gap-3">
      <Button variant="outline" size="icon-sm" onClick={goPrev}>
        <ChevronLeft className="size-4" />
      </Button>
      <div className="min-w-[160px] text-center">
        <p className="text-lg font-semibold">
          {MONTH_NAMES[month - 1]} {year}
        </p>
        {isCurrentMonth && (
          <p className="text-muted-foreground text-xs">Current month</p>
        )}
      </div>
      <Button variant="outline" size="icon-sm" onClick={goNext}>
        <ChevronRight className="size-4" />
      </Button>
    </div>
  )
}

export { MonthSelector }
