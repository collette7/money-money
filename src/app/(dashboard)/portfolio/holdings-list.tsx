"use client"

import { useState, useMemo } from "react"
import {
  ChevronDown,
  ChevronRight,
  Home,
  Building2,
  Car,
  Gem,
  Package,
  MoreVertical,
  Plus,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { HoldingRow, PriceCacheRow } from "./actions"
import {
  createHolding,
  addLot,
  recordSale,
  updateHolding,
  deleteHolding,
  searchHoldingSymbol,
  type CreateHoldingInput,
} from "./actions"
import { AddHoldingDialog } from "./add-holding-dialog"
import { RecordSaleDialog } from "./record-sale-dialog"
import { AddLotDialog } from "./add-lot-dialog"
import { UpdateValueDialog } from "./update-value-dialog"
import { ImportCSVDialog } from "./import-csv-dialog"
import type { HoldingType } from "@/types/database"

type Props = {
  holdings: HoldingRow[]
  prices: [string, PriceCacheRow][]
}

const ASSET_TYPE_LABELS: Record<HoldingType, string> = {
  stock: "Stocks",
  etf: "ETFs",
  crypto: "Crypto",
  option: "Options",
  mutual_fund: "Mutual Funds",
  real_estate: "Real Estate",
  private_equity: "Private Equity",
  vehicle: "Vehicles",
  alternative: "Alternatives",
  other: "Other",
}

const MARKET_TYPES = new Set(["stock", "etf", "crypto", "option", "mutual_fund"])
const MANUAL_TYPES = new Set(["real_estate", "private_equity", "vehicle", "alternative", "other"])

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)

const formatCurrencyShort = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

const formatPercent = (value: number) => {
  const sign = value >= 0 ? "+" : ""
  return `${sign}${value.toFixed(1)}%`
}

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" })
}

const getAssetIcon = (assetType: HoldingType) => {
  switch (assetType) {
    case "real_estate":
      return Home
    case "private_equity":
      return Building2
    case "vehicle":
      return Car
    case "alternative":
      return Gem
    default:
      return Package
  }
}

function isStale(updatedAt: string | null, days: number = 90): boolean {
  if (!updatedAt) return true
  const updated = new Date(updatedAt).getTime()
  const threshold = Date.now() - days * 24 * 60 * 60 * 1000
  return updated < threshold
}

type HoldingGroup = {
  type: HoldingType
  label: string
  holdings: HoldingRow[]
}

function MarketHoldingRow({
  holding,
  price,
  onAddLot,
  onRecordSale,
  onEdit,
  onDelete,
}: {
  holding: HoldingRow
  price: PriceCacheRow | undefined
  onAddLot: () => void
  onRecordSale: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const shares = holding.shares ?? 0
  const avgCost = holding.avg_cost ?? 0
  const totalCost = holding.total_cost ?? 0
  const currentPrice = price?.price ?? 0
  const prevClose = price?.prev_close ?? currentPrice
  
  const currentValue = shares * currentPrice
  const allTimeGain = totalCost > 0 ? ((currentValue - totalCost) / totalCost) * 100 : 0
  const dayChange = shares * (currentPrice - prevClose)
  const dayChangePct = prevClose > 0 ? ((currentPrice - prevClose) / prevClose) * 100 : 0
  
  const isPositiveAllTime = allTimeGain >= 0
  const isPositiveDay = dayChange >= 0

  return (
    <div className="flex items-center py-3 px-4 hover:bg-muted/30 transition-colors group">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="size-10 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
            {holding.symbol?.slice(0, 2) ?? "??"}
          </span>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono font-semibold text-sm">{holding.symbol}</span>
            <span className="text-sm text-muted-foreground truncate">{holding.name}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {shares.toLocaleString("en-US", { maximumFractionDigits: 4 })} shares
            <span className="mx-1.5">·</span>
            avg {formatCurrency(avgCost)}
          </div>
        </div>
      </div>
      
      <div className="text-right shrink-0 ml-4">
        <div className="font-semibold tabular-nums">{formatCurrencyShort(currentValue)}</div>
        <div className={cn(
          "text-xs font-medium tabular-nums",
          isPositiveAllTime ? "text-emerald-600" : "text-rose-500"
        )}>
          {formatPercent(allTimeGain)} all time
        </div>
      </div>
      
      <div className="text-right shrink-0 ml-6 w-28">
        <div className={cn(
          "text-sm font-medium tabular-nums",
          isPositiveDay ? "text-emerald-600" : "text-rose-500"
        )}>
          {isPositiveDay ? "+" : ""}{formatCurrencyShort(dayChange)}
        </div>
        <div className={cn(
          "text-xs tabular-nums",
          isPositiveDay ? "text-emerald-600/70" : "text-rose-500/70"
        )}>
          ({formatPercent(dayChangePct)}) today
        </div>
      </div>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="size-8 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-muted transition-all shrink-0 ml-2">
            <MoreVertical className="size-4 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={onAddLot}>
            <Plus className="size-3.5 mr-2" />
            Add shares
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onRecordSale}>
            <TrendingDown className="size-3.5 mr-2" />
            Record sale
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onEdit}>
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function ManualHoldingRow({
  holding,
  onUpdateValue,
  onRecordSale,
  onEdit,
  onDelete,
}: {
  holding: HoldingRow
  onUpdateValue: () => void
  onRecordSale: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const purchaseValue = holding.purchase_value ?? 0
  const currentValue = holding.current_value ?? purchaseValue
  const gain = currentValue - purchaseValue
  const gainPct = purchaseValue > 0 ? (gain / purchaseValue) * 100 : 0
  const isPositive = gain >= 0
  const stale = isStale(holding.current_value_updated_at)
  
  const Icon = getAssetIcon(holding.asset_type)

  return (
    <div className="flex items-center py-3 px-4 hover:bg-muted/30 transition-colors group">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="size-10 rounded-lg bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/30 flex items-center justify-center shrink-0">
          <Icon className="size-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="min-w-0">
          <div className="font-medium text-sm truncate">{holding.name}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Purchased {formatCurrencyShort(purchaseValue)}
            <span className="mx-1.5">·</span>
            Updated {formatDate(holding.current_value_updated_at ?? holding.purchase_date)}
          </div>
        </div>
      </div>
      
      <div className="text-right shrink-0 ml-4">
        <div className="font-semibold tabular-nums">{formatCurrencyShort(currentValue)}</div>
        <div className={cn(
          "text-xs font-medium tabular-nums",
          isPositive ? "text-emerald-600" : "text-rose-500"
        )}>
          {formatPercent(gainPct)} since purchase
        </div>
      </div>
      
      <div className="shrink-0 ml-6 w-28">
        {stale && (
          <button
            onClick={onUpdateValue}
            className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
          >
            <AlertTriangle className="size-3.5" />
            Update value
          </button>
        )}
      </div>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="size-8 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-muted transition-all shrink-0 ml-2">
            <MoreVertical className="size-4 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={onUpdateValue}>
            <TrendingUp className="size-3.5 mr-2" />
            Update value
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onRecordSale}>
            <TrendingDown className="size-3.5 mr-2" />
            Record sale
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onEdit}>
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function ClosedPositionRow({
  holding,
}: {
  holding: HoldingRow
}) {
  const saleValue = holding.sale_value ?? 0
  const costBasis = holding.is_manual 
    ? (holding.purchase_value ?? 0) 
    : (holding.total_cost ?? 0)
  const realizedGain = saleValue - costBasis
  const realizedGainPct = costBasis > 0 ? (realizedGain / costBasis) * 100 : 0
  const isPositive = realizedGain >= 0

  return (
    <div className="flex items-center py-2.5 px-4 hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {holding.is_manual ? (
          <div className="size-8 rounded bg-muted flex items-center justify-center shrink-0">
            {(() => {
              const Icon = getAssetIcon(holding.asset_type)
              return <Icon className="size-4 text-muted-foreground" />
            })()}
          </div>
        ) : (
          <div className="size-8 rounded bg-muted flex items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-muted-foreground">
              {holding.symbol?.slice(0, 2) ?? "??"}
            </span>
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-medium">
              {holding.is_manual ? holding.name : holding.symbol}
            </span>
            <span className="text-xs text-muted-foreground">
              Sold {holding.sale_date ? formatDate(holding.sale_date) : "N/A"}
            </span>
          </div>
          {!holding.is_manual && holding.shares && (
            <div className="text-xs text-muted-foreground">
              {holding.shares.toLocaleString("en-US", { maximumFractionDigits: 4 })} shares
            </div>
          )}
        </div>
      </div>
      
      <div className="text-right shrink-0 ml-4">
        <span className="text-xs text-muted-foreground">Realized:</span>
        <span className={cn(
          "ml-2 font-medium tabular-nums",
          isPositive ? "text-emerald-600" : "text-rose-500"
        )}>
          {isPositive ? "+" : ""}{formatCurrencyShort(realizedGain)}
        </span>
        <span className={cn(
          "ml-1 text-xs tabular-nums",
          isPositive ? "text-emerald-600/70" : "text-rose-500/70"
        )}>
          ({formatPercent(realizedGainPct)})
        </span>
      </div>
    </div>
  )
}

function HoldingGroupSection({
  group,
  prices,
  onAction,
}: {
  group: HoldingGroup
  prices: Map<string, PriceCacheRow>
  onAction: (action: string, holding: HoldingRow) => void
}) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="border border-border/60 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="size-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-4 text-muted-foreground" />
          )}
          <span className="font-medium text-sm">{group.label}</span>
          <span className="text-xs text-muted-foreground">({group.holdings.length})</span>
        </div>
      </button>
      
      {expanded && (
        <div className="divide-y divide-border/40">
          {group.holdings.map((holding) => {
            if (MARKET_TYPES.has(holding.asset_type)) {
              return (
                <MarketHoldingRow
                  key={holding.id}
                  holding={holding}
                  price={holding.symbol ? prices.get(holding.symbol) : undefined}
                  onAddLot={() => onAction("addLot", holding)}
                  onRecordSale={() => onAction("recordSale", holding)}
                  onEdit={() => onAction("edit", holding)}
                  onDelete={() => onAction("delete", holding)}
                />
              )
            }
            return (
              <ManualHoldingRow
                key={holding.id}
                holding={holding}
                onUpdateValue={() => onAction("updateValue", holding)}
                onRecordSale={() => onAction("recordSale", holding)}
                onEdit={() => onAction("edit", holding)}
                onDelete={() => onAction("delete", holding)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

function EditDialog({
  holding,
  open,
  onOpenChange,
  onSaved,
}: {
  holding: HoldingRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}) {
  const [name, setName] = useState("")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)

  useMemo(() => {
    if (holding) {
      setName(holding.name)
      setNotes(holding.notes ?? "")
    }
  }, [holding])

  const handleSave = async () => {
    if (!holding) return
    setSaving(true)
    try {
      await updateHolding(holding.id, { name, notes: notes || null })
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
          <DialogTitle>Edit Holding</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Name</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-notes">Notes</Label>
            <Input
              id="edit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DeleteConfirmDialog({
  holding,
  open,
  onOpenChange,
  onConfirm,
}: {
  holding: HoldingRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!holding) return
    setDeleting(true)
    try {
      await deleteHolding(holding.id)
      onConfirm()
      onOpenChange(false)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Delete Holding</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <span className="font-medium text-foreground">{holding?.name}</span>?
            This action cannot be undone.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function HoldingsList({ holdings, prices }: Props) {
  const priceMap = useMemo(() => new Map(prices), [prices])
  
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [editHolding, setEditHolding] = useState<HoldingRow | null>(null)
  const [deleteHoldingData, setDeleteHoldingData] = useState<HoldingRow | null>(null)
  const [recordSaleHolding, setRecordSaleHolding] = useState<HoldingRow | null>(null)
  const [addLotHolding, setAddLotHolding] = useState<HoldingRow | null>(null)
  const [updateValueHolding, setUpdateValueHolding] = useState<HoldingRow | null>(null)
  
  const { openGroups, closedHoldings } = useMemo(() => {
    const open: HoldingGroup[] = []
    const closed: HoldingRow[] = []
    
    const grouped = new Map<HoldingType, HoldingRow[]>()
    
    for (const h of holdings) {
      if (h.sale_date) {
        closed.push(h)
      } else {
        const existing = grouped.get(h.asset_type) ?? []
        existing.push(h)
        grouped.set(h.asset_type, existing)
      }
    }
    
    const typeOrder: HoldingType[] = [
      "stock", "etf", "crypto", "option", "mutual_fund",
      "real_estate", "private_equity", "vehicle", "alternative", "other",
    ]
    
    for (const type of typeOrder) {
      const items = grouped.get(type)
      if (items && items.length > 0) {
        open.push({
          type,
          label: ASSET_TYPE_LABELS[type],
          holdings: items,
        })
      }
    }
    
    return { openGroups: open, closedHoldings: closed }
  }, [holdings])
  
  const [closedExpanded, setClosedExpanded] = useState(false)
  
  const handleAction = (action: string, holding: HoldingRow) => {
    switch (action) {
      case "addLot":
        setAddLotHolding(holding)
        break
      case "recordSale":
        setRecordSaleHolding(holding)
        break
      case "updateValue":
        setUpdateValueHolding(holding)
        break
      case "edit":
        setEditHolding(holding)
        break
      case "delete":
        setDeleteHoldingData(holding)
        break
    }
  }
  
  const refreshPage = () => {
    window.location.reload()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Holdings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track your investments and assets
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="size-4 mr-1.5" />
            Add Holding
          </Button>
          <Button variant="outline" onClick={() => setShowImportDialog(true)}>
            Import CSV
          </Button>
        </div>
      </div>
      
      {openGroups.length === 0 && closedHoldings.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border/60 rounded-xl">
          <p className="text-muted-foreground">No holdings yet</p>
          <Button variant="outline" className="mt-4" onClick={() => setShowAddDialog(true)}>
            <Plus className="size-4 mr-1.5" />
            Add your first holding
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {openGroups.map((group) => (
            <HoldingGroupSection
              key={group.type}
              group={group}
              prices={priceMap}
              onAction={handleAction}
            />
          ))}
          
          {closedHoldings.length > 0 && (
            <div className="border border-border/60 rounded-xl overflow-hidden">
              <button
                onClick={() => setClosedExpanded(!closedExpanded)}
                className="flex items-center justify-between w-full px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {closedExpanded ? (
                    <ChevronDown className="size-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="size-4 text-muted-foreground" />
                  )}
                  <span className="font-medium text-sm">Closed Positions</span>
                  <span className="text-xs text-muted-foreground">({closedHoldings.length})</span>
                </div>
              </button>
              
              {closedExpanded && (
                <div className="divide-y divide-border/40">
                  {closedHoldings.map((holding) => (
                    <ClosedPositionRow key={holding.id} holding={holding} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      <AddHoldingDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSaved={refreshPage}
      />
      
      <EditDialog
        holding={editHolding}
        open={!!editHolding}
        onOpenChange={(open) => !open && setEditHolding(null)}
        onSaved={refreshPage}
      />
      
      <DeleteConfirmDialog
        holding={deleteHoldingData}
        open={!!deleteHoldingData}
        onOpenChange={(open) => !open && setDeleteHoldingData(null)}
        onConfirm={refreshPage}
      />
      
      <RecordSaleDialog
        holdingId={recordSaleHolding?.id ?? null}
        holdingName={recordSaleHolding?.name ?? null}
        isManual={recordSaleHolding?.is_manual ?? false}
        shares={recordSaleHolding?.shares ?? null}
        open={!!recordSaleHolding}
        onOpenChange={(open) => !open && setRecordSaleHolding(null)}
        onSaved={refreshPage}
      />
      
      <AddLotDialog
        holdingId={addLotHolding?.id ?? null}
        holdingName={addLotHolding?.name ?? null}
        open={!!addLotHolding}
        onOpenChange={(open) => !open && setAddLotHolding(null)}
        onSaved={refreshPage}
      />
      
      <UpdateValueDialog
        holdingId={updateValueHolding?.id ?? null}
        holdingName={updateValueHolding?.name ?? null}
        currentValue={updateValueHolding?.current_value ?? null}
        open={!!updateValueHolding}
        onOpenChange={(open) => !open && setUpdateValueHolding(null)}
        onSaved={refreshPage}
      />

      <ImportCSVDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onImported={refreshPage}
      />
    </div>
  )
}
