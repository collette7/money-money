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
import { addLot } from "./actions"

type Props = {
  holdingId: string | null
  holdingName: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

export function AddLotDialog({
  holdingId,
  holdingName,
  open,
  onOpenChange,
  onSaved,
}: Props) {
  const [shares, setShares] = useState("")
  const [pricePerShare, setPricePerShare] = useState("")
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setShares("")
      setPricePerShare("")
      setPurchaseDate(new Date().toISOString().split("T")[0])
    }
  }, [open])

  const handleSubmit = async () => {
    if (!holdingId || !shares || !pricePerShare) return
    setSaving(true)
    try {
      await addLot(holdingId, parseFloat(shares), parseFloat(pricePerShare), purchaseDate)
      onSaved()
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  const canSubmit = !!(shares && pricePerShare)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Add Shares</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Adding shares to <span className="font-medium text-foreground">{holdingName}</span>
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="lot-shares">Shares</Label>
              <Input
                id="lot-shares"
                type="number"
                step="any"
                min="0"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lot-price">Price per Share</Label>
              <Input
                id="lot-price"
                type="number"
                step="any"
                min="0"
                value={pricePerShare}
                onChange={(e) => setPricePerShare(e.target.value)}
                placeholder="$0.00"
              />
            </div>
          </div>

          {shares && pricePerShare && (
            <div className="text-sm text-muted-foreground px-1">
              Total: <span className="font-medium text-foreground tabular-nums">
                {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
                  parseFloat(shares) * parseFloat(pricePerShare)
                )}
              </span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="lot-date">Purchase Date</Label>
            <Input
              id="lot-date"
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !canSubmit}>
            {saving ? "Adding..." : "Add Shares"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
