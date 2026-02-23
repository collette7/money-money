"use client"

import { useState } from "react"
import { Calendar } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
import { format } from "date-fns"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface EditRecurringModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  merchantName: string
  amount: number
  frequency: string
  nextExpected: string | null
  endDate: string | null
  stopAfter: number | null
  onSave: (data: {
    amount: number
    frequency: string
    nextPaymentDate: string
    endDate: string | null
    stopAfter: number | null
  }) => void
}

export function EditRecurringModal({
  open,
  onOpenChange,
  merchantName,
  amount: initialAmount,
  frequency: initialFrequency,
  nextExpected,
  endDate: initialEndDate,
  stopAfter: initialStopAfter,
  onSave,
}: EditRecurringModalProps) {
  const [amount, setAmount] = useState(Math.abs(initialAmount))
  const [frequency, setFrequency] = useState(initialFrequency || "monthly")
  const [nextPaymentDate, setNextPaymentDate] = useState<Date>(
    nextExpected ? new Date(nextExpected + "T00:00:00") : new Date()
  )
  const [endDate, setEndDate] = useState<Date | undefined>(
    initialEndDate ? new Date(initialEndDate + "T00:00:00") : undefined
  )
  const [stopAfter, setStopAfter] = useState(initialStopAfter?.toString() ?? "")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const parsedStopAfter = parseInt(stopAfter, 10)
    onSave({
      amount,
      frequency,
      nextPaymentDate: format(nextPaymentDate, "yyyy-MM-dd"),
      endDate: endDate ? format(endDate, "yyyy-MM-dd") : null,
      stopAfter: isNaN(parsedStopAfter) ? null : parsedStopAfter,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
            Edit Recurring Transaction
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-6 pb-6">
          <div className="flex items-center gap-3 mt-6 mb-6">
            <div className="h-12 w-12 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
              {merchantName.substring(0, 2).toUpperCase()}
            </div>
            <h3 className="text-lg font-semibold">{merchantName}</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-sm text-muted-foreground">
                Amount
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="frequency" className="text-sm text-muted-foreground">
                Frequency
              </Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger id="frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Biweekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annual">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nextPayment" className="text-sm text-muted-foreground">
                Next payment date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="nextPayment"
                    variant="outline"
                    className="w-full justify-between text-left font-normal"
                  >
                    <span>{format(nextPaymentDate, "MM/dd/yyyy")}</span>
                    <Calendar className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={nextPaymentDate}
                    onSelect={(date) => date && setNextPaymentDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate" className="text-sm text-muted-foreground">
                End date (optional)
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="endDate"
                    variant="outline"
                    className="w-full justify-between text-left font-normal"
                  >
                    <span>{endDate ? format(endDate, "MM/dd/yyyy") : "No end date"}</span>
                    <Calendar className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => setEndDate(date ?? undefined)}
                    initialFocus
                  />
                  {endDate && (
                    <div className="border-t px-3 py-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => setEndDate(undefined)}
                      >
                        Clear end date
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stopAfter" className="text-sm text-muted-foreground">
                Stop after N payments (optional)
              </Label>
              <Input
                id="stopAfter"
                type="number"
                min={1}
                placeholder="No limit"
                value={stopAfter}
                onChange={(e) => setStopAfter(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}