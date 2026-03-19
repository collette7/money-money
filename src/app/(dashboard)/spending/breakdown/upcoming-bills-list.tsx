"use client"

import { Sensitive } from "@/components/sensitive"
import { Calendar, Repeat } from "lucide-react"

type UpcomingBillsListProps = {
  bills: {
    id: string
    merchantName: string
    expectedAmount: number
    nextDate: string
    frequency: string
  }[]
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { 
    style: "currency", 
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(value))

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const daysUntil = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  
  if (daysUntil < 0) return "Past due"
  if (daysUntil === 0) return "Today"
  if (daysUntil === 1) return "Tomorrow"
  if (daysUntil < 7) return `${daysUntil} days`
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function UpcomingBillsList({ bills }: UpcomingBillsListProps) {
  if (bills.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No upcoming bills in the next 30 days
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {bills.map((bill) => (
        <div key={bill.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors">
          <div className="flex items-start gap-3">
            <Calendar className="w-4 h-4 mt-0.5 text-muted-foreground" />
            <div>
              <p className="font-medium">{bill.merchantName}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{formatDate(bill.nextDate)}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Repeat className="w-3 h-3" />
                  {bill.frequency.charAt(0).toUpperCase() + bill.frequency.slice(1)}
                </span>
              </div>
            </div>
          </div>
          <span className="font-semibold text-expense">
            <Sensitive>-{formatCurrency(Math.abs(bill.expectedAmount))}</Sensitive>
          </span>
        </div>
      ))}
    </div>
  )
}