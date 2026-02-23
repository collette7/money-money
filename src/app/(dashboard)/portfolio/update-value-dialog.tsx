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
import { updateHolding } from "./actions"

type Props = {
  holdingId: string | null
  holdingName: string | null
  currentValue: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

export function UpdateValueDialog({
  holdingId,
  holdingName,
  currentValue,
  open,
  onOpenChange,
  onSaved,
}: Props) {
  const [value, setValue] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && currentValue != null) {
      setValue(currentValue.toString())
    } else if (open) {
      setValue("")
    }
  }, [open, currentValue])

  const handleSubmit = async () => {
    if (!holdingId || !value) return
    setSaving(true)
    try {
      await updateHolding(holdingId, { currentValue: parseFloat(value) })
      onSaved()
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Update Value</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Update current value for <span className="font-medium text-foreground">{holdingName}</span>
          </p>

          <div className="space-y-2">
            <Label htmlFor="new-value">Current Value</Label>
            <Input
              id="new-value"
              type="number"
              step="any"
              min="0"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="$0.00"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !value}>
            {saving ? "Updating..." : "Update Value"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
