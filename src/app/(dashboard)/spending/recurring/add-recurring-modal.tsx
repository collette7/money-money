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

interface AddRecurringModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: {
    merchantName: string
    amount: number
    frequency: string
    nextPaymentDate: string
    endDate: string | null
    stopAfter: number | null
  }) => void
}

export function AddRecurringModal({
  open,
  onOpenChange,
  onSave,
}: AddRecurringModalProps) {
  const [merchantName, setMerchantName] = useState("")
  const [amount, setAmount] = useState("")
  const [frequency, setFrequency] = useState("monthly")
  const [nextPaymentDate, setNextPaymentDate] = useState<Date>(new Date())
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [stopAfter, setStopAfter] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const parsedAmount = parseFloat(amount)
    if (!merchantName.trim() || isNaN(parsedAmount)) return

    const parsedStopAfter = parseInt(stopAfter, 10)
    onSave({
      merchantName: merchantName.trim(),
      amount: parsedAmount,
      frequency,
      nextPaymentDate: format(nextPaymentDate, "yyyy-MM-dd"),
      endDate: endDate ? format(endDate, "yyyy-MM-dd") : null,
      stopAfter: isNaN(parsedStopAfter) ? null : parsedStopAfter,
    })

    setMerchantName("")
    setAmount("")
    setFrequency("monthly")
    setNextPaymentDate(new Date())
    setEndDate(undefined)
    setStopAfter("")
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setMerchantName("")
      setAmount("")
      setFrequency("monthly")
      setNextPaymentDate(new Date())
      setEndDate(undefined)
      setStopAfter("")
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
            Add Recurring Transaction
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-6 pb-6">
          <div className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label htmlFor="merchantName" className="text-sm text-muted-foreground">
                Merchant Name
              </Label>
              <Input
                id="merchantName"
                type="text"
                placeholder="e.g., Netflix, Gym Membership"
                value={merchantName}
                onChange={(e) => setMerchantName(e.target.value)}
                required
              />
            </div>

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
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-8"
                  required
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
                Next Payment Date
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
                End Date (optional)
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
                Stop After N Payments (optional)
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
              onClick={() => handleOpenChange(false)}
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
