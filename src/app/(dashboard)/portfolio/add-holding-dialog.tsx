"use client"

import { useState, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
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
import { Search, X } from "lucide-react"
import {
  createHolding,
  searchHoldingSymbol,
  type CreateHoldingInput,
} from "./actions"
import type { HoldingType } from "@/types/database"
import type { SymbolSearchResult } from "@/lib/finnhub/client"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

const MARKET_TYPES: { value: HoldingType; label: string }[] = [
  { value: "stock", label: "Stock" },
  { value: "etf", label: "ETF" },
  { value: "crypto", label: "Crypto" },
  { value: "option", label: "Option" },
  { value: "mutual_fund", label: "Mutual Fund" },
]

const MANUAL_TYPES: { value: HoldingType; label: string }[] = [
  { value: "real_estate", label: "Real Estate" },
  { value: "private_equity", label: "Private Equity" },
  { value: "vehicle", label: "Vehicle" },
  { value: "alternative", label: "Alternative" },
  { value: "other", label: "Other" },
]

export function AddHoldingDialog({ open, onOpenChange, onSaved }: Props) {
  const [mode, setMode] = useState<"market" | "manual">("market")
  const [saving, setSaving] = useState(false)

  const [assetType, setAssetType] = useState<HoldingType>("stock")
  const [symbolQuery, setSymbolQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SymbolSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedSymbol, setSelectedSymbol] = useState("")
  const [selectedName, setSelectedName] = useState("")
  const [shares, setShares] = useState("")
  const [pricePerShare, setPricePerShare] = useState("")
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0])
  const [notes, setNotes] = useState("")

  const [manualAssetType, setManualAssetType] = useState<HoldingType>("real_estate")
  const [manualName, setManualName] = useState("")
  const [purchaseValue, setPurchaseValue] = useState("")
  const [currentValue, setCurrentValue] = useState("")
  const [manualPurchaseDate, setManualPurchaseDate] = useState(new Date().toISOString().split("T")[0])
  const [manualNotes, setManualNotes] = useState("")

  useEffect(() => {
    if (open) {
      setMode("market")
      setAssetType("stock")
      setSymbolQuery("")
      setSearchResults([])
      setSelectedSymbol("")
      setSelectedName("")
      setShares("")
      setPricePerShare("")
      setPurchaseDate(new Date().toISOString().split("T")[0])
      setNotes("")
      setManualAssetType("real_estate")
      setManualName("")
      setPurchaseValue("")
      setCurrentValue("")
      setManualPurchaseDate(new Date().toISOString().split("T")[0])
      setManualNotes("")
    }
  }, [open])

  useEffect(() => {
    if (mode !== "market" || symbolQuery.length < 1) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const results = await searchHoldingSymbol(symbolQuery)
        setSearchResults(results.slice(0, 8))
      } catch {
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [symbolQuery, mode])

  const handleSelectSymbol = useCallback((result: SymbolSearchResult) => {
    setSelectedSymbol(result.symbol)
    setSelectedName(result.name)
    setSymbolQuery(result.displaySymbol)
    setSearchResults([])
  }, [])

  const handleClearSymbol = useCallback(() => {
    setSelectedSymbol("")
    setSelectedName("")
    setSymbolQuery("")
  }, [])

  const handleSubmit = async () => {
    setSaving(true)
    try {
      if (mode === "market") {
        if (!selectedSymbol || !shares || !pricePerShare) return

        const input: CreateHoldingInput = {
          assetType,
          isManual: false,
          symbol: selectedSymbol,
          name: selectedName || selectedSymbol,
          shares: parseFloat(shares),
          pricePerShare: parseFloat(pricePerShare),
          purchaseDate,
          notes: notes || null,
        }
        await createHolding(input)
      } else {
        if (!manualName || !purchaseValue) return

        const pv = parseFloat(purchaseValue)
        const cv = currentValue ? parseFloat(currentValue) : pv

        const input: CreateHoldingInput = {
          assetType: manualAssetType,
          isManual: true,
          name: manualName,
          purchaseValue: pv,
          currentValue: cv,
          purchaseDate: manualPurchaseDate,
          notes: manualNotes || null,
        }
        await createHolding(input)
      }
      onSaved()
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  const canSubmit = mode === "market"
    ? !!(selectedSymbol && shares && pricePerShare)
    : !!(manualName && purchaseValue)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add Holding</DialogTitle>
        </DialogHeader>

        <div className="flex gap-1 p-1 bg-muted/50 rounded-lg mb-4">
          <button
            onClick={() => setMode("market")}
            className={cn(
              "flex-1 text-sm font-medium py-1.5 rounded-md transition-colors",
              mode === "market"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Market
          </button>
          <button
            onClick={() => setMode("manual")}
            className={cn(
              "flex-1 text-sm font-medium py-1.5 rounded-md transition-colors",
              mode === "manual"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Manual
          </button>
        </div>

        {mode === "market" ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Asset Type</Label>
              <div className="flex flex-wrap gap-1.5">
                {MARKET_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setAssetType(t.value)}
                    className={cn(
                      "px-3 py-1 text-xs font-medium rounded-full border transition-colors",
                      assetType === t.value
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-muted-foreground hover:border-foreground/50"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Symbol</Label>
              <div className="relative">
                {selectedSymbol ? (
                  <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-muted/30">
                    <span className="font-mono font-semibold text-sm">{selectedSymbol}</span>
                    <span className="text-sm text-muted-foreground truncate">{selectedName}</span>
                    <button onClick={handleClearSymbol} className="ml-auto shrink-0">
                      <X className="size-4 text-muted-foreground hover:text-foreground" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      value={symbolQuery}
                      onChange={(e) => setSymbolQuery(e.target.value)}
                      placeholder="Search symbol (e.g., AAPL)..."
                      className="pl-9"
                    />
                    {searchResults.length > 0 && (
                      <div className="absolute z-50 mt-1 w-full border rounded-lg bg-popover shadow-lg max-h-60 overflow-y-auto">
                        {searchResults.map((r, idx) => (
                          <button
                            key={`${r.symbol}-${idx}`}
                            onClick={() => handleSelectSymbol(r)}
                            className="flex items-center gap-3 w-full px-3 py-2 hover:bg-muted/50 text-left transition-colors"
                          >
                            <span className="font-mono font-semibold text-sm shrink-0">{r.displaySymbol}</span>
                            <span className="text-sm text-muted-foreground truncate">{r.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {searching && (
                      <div className="absolute z-50 mt-1 w-full border rounded-lg bg-popover shadow-lg p-3 text-center">
                        <span className="text-sm text-muted-foreground">Searching...</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="shares">Shares</Label>
                <Input
                  id="shares"
                  type="number"
                  step="any"
                  min="0"
                  value={shares}
                  onChange={(e) => setShares(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price per Share</Label>
                <Input
                  id="price"
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
              <Label htmlFor="purchase-date">Purchase Date</Label>
              <Input
                id="purchase-date"
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes..."
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Asset Type</Label>
              <div className="flex flex-wrap gap-1.5">
                {MANUAL_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setManualAssetType(t.value)}
                    className={cn(
                      "px-3 py-1 text-xs font-medium rounded-full border transition-colors",
                      manualAssetType === t.value
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-muted-foreground hover:border-foreground/50"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="manual-name">Name</Label>
              <Input
                id="manual-name"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder="e.g., Austin Condo"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="purchase-value">Purchase Value</Label>
                <Input
                  id="purchase-value"
                  type="number"
                  step="any"
                  min="0"
                  value={purchaseValue}
                  onChange={(e) => setPurchaseValue(e.target.value)}
                  placeholder="$0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="current-value">Current Value</Label>
                <Input
                  id="current-value"
                  type="number"
                  step="any"
                  min="0"
                  value={currentValue}
                  onChange={(e) => setCurrentValue(e.target.value)}
                  placeholder={purchaseValue || "$0.00"}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="manual-purchase-date">Purchase Date</Label>
              <Input
                id="manual-purchase-date"
                type="date"
                value={manualPurchaseDate}
                onChange={(e) => setManualPurchaseDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="manual-notes">Notes (optional)</Label>
              <Input
                id="manual-notes"
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
                placeholder="Optional notes..."
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !canSubmit}>
            {saving ? "Adding..." : "Add Holding"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
