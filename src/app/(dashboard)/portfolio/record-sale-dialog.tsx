"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { recordSale } from "./actions"

type Props = {
  holdingId: string | null
  holdingName: string | null
  isManual: boolean
  shares: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

export function RecordSaleDialog({
  holdingId,
  holdingName,
  isManual,
  shares,
  open,
  onOpenChange,
  onSaved,
}: Props) {
  const [salePrice, setSalePrice] = useState("")
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split("T")[0])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setSalePrice("")
      setSaleDate(new Date().toISOString().split("T")[0])
    }
  }, [open])

  const handleSubmit = async () => {
    if (!holdingId || !salePrice) return
    setSaving(true)
    try {
      await recordSale(holdingId, parseFloat(salePrice), saleDate)
      onSaved()
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  const parsedPrice = parseFloat(salePrice) || 0
  const totalValue = isManual ? parsedPrice : parsedPrice * (shares ?? 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Record Sale</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Recording sale for <span className="font-medium text-foreground">{holdingName}</span>
          </p>

          <div className="space-y-2">
            <Label htmlFor="sale-price">
              {isManual ? "Total Sale Value" : "Sale Price per Share"}
            </Label>
            <Input
              id="sale-price"
              type="number"
              step="any"
              min="0"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
              placeholder="$0.00"
            />
          </div>

          {!isManual && salePrice && shares && (
            <div className="text-sm text-muted-foreground px-1">
              Total proceeds: <span className="font-medium text-foreground tabular-nums">
                {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(totalValue)}
              </span>
              {" "}({shares} shares)
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="sale-date">Sale Date</Label>
            <Input
              id="sale-date"
              type="date"
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !salePrice}>
            {saving ? "Recording..." : "Record Sale"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
