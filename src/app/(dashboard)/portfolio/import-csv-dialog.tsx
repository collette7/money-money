"use client"

import { useState, useCallback, useRef } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { importHoldingsFromCSV, type ImportRow } from "./actions"
import type { HoldingType } from "@/types/database"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImported: () => void
}

type Step = "upload" | "mapping" | "preview" | "importing" | "done"

const COLUMN_ROLES = [
  { value: "skip", label: "Skip" },
  { value: "symbol", label: "Symbol" },
  { value: "name", label: "Name" },
  { value: "shares", label: "Shares" },
  { value: "price", label: "Price Per Share" },
  { value: "date", label: "Purchase Date" },
]

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false
  for (const char of line) {
    if (char === '"') { inQuotes = !inQuotes; continue }
    if (char === ',' && !inQuotes) { result.push(current.trim()); current = ""; continue }
    current += char
  }
  result.push(current.trim())
  return result
}

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0)
  if (lines.length === 0) return { headers: [], rows: [] }

  const headers = parseCSVLine(lines[0])
  const rows = lines.slice(1).map((line) => parseCSVLine(line))

  return { headers, rows }
}

function autoDetectColumnMapping(headers: string[]): Record<number, string> {
  const mapping: Record<number, string> = {}

  headers.forEach((header, i) => {
    const h = header.toLowerCase().trim()
    if (h === "symbol" || h === "ticker" || h === "symbol/ticker") {
      mapping[i] = "symbol"
    } else if (h === "name" || h === "description" || h === "company name" || h === "security") {
      mapping[i] = "name"
    } else if (h === "shares" || h === "quantity" || h === "qty" || h === "units") {
      mapping[i] = "shares"
    } else if (
      h === "price" ||
      h === "price per share" ||
      h === "cost per share" ||
      h === "cost basis" ||
      h === "avg cost" ||
      h === "unit cost"
    ) {
      mapping[i] = "price"
    } else if (
      h === "date" ||
      h === "purchase date" ||
      h === "trade date" ||
      h === "acquired" ||
      h === "open date"
    ) {
      mapping[i] = "date"
    } else {
      mapping[i] = "skip"
    }
  })

  return mapping
}

function parseDate(dateStr: string): string {
  const d = new Date(dateStr)
  if (!isNaN(d.getTime())) {
    return d.toISOString().split("T")[0]
  }
  const parts = dateStr.split(/[/-]/)
  if (parts.length === 3) {
    const [a, b, c] = parts.map(Number)
    if (a > 1000) {
      return `${a}-${String(b).padStart(2, "0")}-${String(c).padStart(2, "0")}`
    } else if (c > 1000) {
      return `${c}-${String(a).padStart(2, "0")}-${String(b).padStart(2, "0")}`
    }
  }
  return new Date().toISOString().split("T")[0]
}

function parseNumber(value: string): number {
  const cleaned = value.replace(/[$,\s]/g, "")
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}

export function ImportCSVDialog({ open, onOpenChange, onImported }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>("upload")
  const [fileName, setFileName] = useState("")
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<string[][]>([])
  const [columnMapping, setColumnMapping] = useState<Record<number, string>>({})
  const [dragActive, setDragActive] = useState(false)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ imported: number; errors: string[] } | null>(null)

  const resetState = useCallback(() => {
    setStep("upload")
    setFileName("")
    setHeaders([])
    setRows([])
    setColumnMapping({})
    setResult(null)
  }, [])

  const handleFile = useCallback(async (file: File) => {
    const text = await file.text()
    const parsed = parseCSV(text)
    setFileName(file.name)
    setHeaders(parsed.headers)
    setRows(parsed.rows)
    setColumnMapping(autoDetectColumnMapping(parsed.headers))
    setStep("mapping")
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragActive(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const getPreviewData = useCallback((): ImportRow[] => {
    const symbolCol = Object.entries(columnMapping).find(([, v]) => v === "symbol")?.[0]
    const nameCol = Object.entries(columnMapping).find(([, v]) => v === "name")?.[0]
    const sharesCol = Object.entries(columnMapping).find(([, v]) => v === "shares")?.[0]
    const priceCol = Object.entries(columnMapping).find(([, v]) => v === "price")?.[0]
    const dateCol = Object.entries(columnMapping).find(([, v]) => v === "date")?.[0]

    if (!symbolCol || !sharesCol || !priceCol) return []

    return rows.map((row) => ({
      symbol: row[parseInt(symbolCol)]?.toUpperCase() || "",
      name: nameCol ? row[parseInt(nameCol)] || "" : "",
      assetType: "stock" as HoldingType,
      shares: parseNumber(row[parseInt(sharesCol)]),
      pricePerShare: parseNumber(row[parseInt(priceCol)]),
      purchaseDate: dateCol ? parseDate(row[parseInt(dateCol)]) : new Date().toISOString().split("T")[0],
    })).filter((r) => r.symbol && r.shares > 0)
  }, [columnMapping, rows])

  const canProceedToPreview = useCallback(() => {
    const mappingValues = Object.values(columnMapping)
    const hasSymbol = mappingValues.includes("symbol")
    const hasShares = mappingValues.includes("shares")
    const hasPrice = mappingValues.includes("price")
    return hasSymbol && hasShares && hasPrice
  }, [columnMapping])

  const handleImport = async () => {
    const previewData = getPreviewData()
    if (previewData.length === 0) return

    setStep("importing")
    setImporting(true)

    try {
      const res = await importHoldingsFromCSV(previewData)
      setResult(res)
      setStep("done")
      if (res.imported > 0) {
        onImported()
      }
    } catch {
      setResult({ imported: 0, errors: ["Failed to import holdings"] })
      setStep("done")
    } finally {
      setImporting(false)
    }
  }

  const handleClose = () => {
    resetState()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Holdings from CSV</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 py-2">
          {["Upload", "Map Columns", "Review"].map((label, i) => {
            const stepMap: Step[] = ["upload", "mapping", "preview"]
            const currentIdx = stepMap.indexOf(step === "done" || step === "importing" ? "preview" : step)
            const isActive = i === currentIdx
            const isComplete = i < currentIdx || step === "done" || step === "importing"

            return (
              <div key={label} className="flex items-center gap-2">
                {i > 0 && (
                  <div className={cn("h-px w-6", isComplete ? "bg-primary" : "bg-border")} />
                )}
                <div
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                    isActive && "bg-primary text-primary-foreground",
                    !isActive && isComplete && "bg-primary/10 text-primary",
                    !isActive && !isComplete && "bg-muted text-muted-foreground"
                  )}
                >
                  {isComplete && <CheckCircle2 className="size-3" />}
                  {label}
                </div>
              </div>
            )
          })}
        </div>

        {step === "upload" && (
          <div className="space-y-4 py-4">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors",
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50"
              )}
            >
              <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
                <Upload className="size-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">Drop your CSV file here, or click to browse</p>
              <p className="mt-1 text-xs text-muted-foreground">Supports broker exports (Schwab, Fidelity, Robinhood)</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFile(file)
                }}
              />
            </div>
          </div>
        )}

        {step === "mapping" && (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileSpreadsheet className="size-4" />
              <span>{fileName}</span>
              <span className="text-muted-foreground/50">({rows.length} rows)</span>
            </div>

            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50">
                    {headers.map((header, i) => (
                      <th key={i} className="min-w-[120px] p-2 text-left border-b">
                        <div className="space-y-1.5">
                          <Select
                            value={columnMapping[i] ?? "skip"}
                            onValueChange={(v) =>
                              setColumnMapping((prev) => ({ ...prev, [i]: v }))
                            }
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {COLUMN_ROLES.map((role) => (
                                <SelectItem key={role.value} value={role.value}>
                                  {role.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="truncate font-medium">{header}</p>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 3).map((row, rowIdx) => (
                    <tr key={rowIdx} className="border-b last:border-0">
                      {row.map((cell, cellIdx) => (
                        <td
                          key={cellIdx}
                          className={cn(
                            "p-2",
                            columnMapping[cellIdx] === "skip" && "text-muted-foreground/40"
                          )}
                        >
                          <span className="line-clamp-1">{cell}</span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {rows.length > 3 && (
              <p className="text-xs text-muted-foreground text-center">
                Showing 3 of {rows.length} rows
              </p>
            )}

            <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
              <p className="font-medium mb-1">Required columns:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Symbol (e.g., AAPL)</li>
                <li>Shares (quantity)</li>
                <li>Price Per Share (cost basis)</li>
              </ul>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {getPreviewData().length} holdings ready to import
              </p>
              <p className="text-xs text-muted-foreground">All imports are market holdings (stocks)</p>
            </div>

            <div className="overflow-y-auto max-h-[250px] rounded-md border">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="p-2 text-left font-medium">Symbol</th>
                    <th className="p-2 text-left font-medium">Name</th>
                    <th className="p-2 text-right font-medium">Shares</th>
                    <th className="p-2 text-right font-medium">Price</th>
                    <th className="p-2 text-right font-medium">Total</th>
                    <th className="p-2 text-left font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {getPreviewData().slice(0, 20).map((row, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2 font-mono font-medium">{row.symbol}</td>
                      <td className="p-2 truncate max-w-[120px]">{row.name || "-"}</td>
                      <td className="p-2 text-right tabular-nums">{row.shares.toLocaleString()}</td>
                      <td className="p-2 text-right tabular-nums">
                        ${row.pricePerShare.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-2 text-right tabular-nums font-medium">
                        ${(row.shares * row.pricePerShare).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-2">{row.purchaseDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {getPreviewData().length > 20 && (
              <p className="text-xs text-muted-foreground text-center">
                Showing 20 of {getPreviewData().length} holdings
              </p>
            )}
          </div>
        )}

        {step === "importing" && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="mb-4 size-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Importing holdings...</p>
            <p className="text-xs text-muted-foreground">This may take a moment</p>
          </div>
        )}

        {step === "done" && result && (
          <div className="flex flex-col items-center justify-center py-12">
            {result.imported > 0 ? (
              <>
                <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/50">
                  <CheckCircle2 className="size-6 text-emerald-600" />
                </div>
                <p className="text-lg font-semibold">Import Complete</p>
                <p className="text-sm text-muted-foreground">
                  Successfully imported {result.imported} holding{result.imported !== 1 ? "s" : ""}
                </p>
                {result.errors.length > 0 && (
                  <div className="mt-4 w-full rounded-md bg-amber-50 dark:bg-amber-950/30 p-3 text-xs">
                    <p className="font-medium text-amber-700 dark:text-amber-400 mb-1">
                      {result.errors.length} row{result.errors.length !== 1 ? "s" : ""} had errors:
                    </p>
                    <ul className="list-disc list-inside text-amber-600 dark:text-amber-300 max-h-[100px] overflow-y-auto">
                      {result.errors.slice(0, 5).map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                      {result.errors.length > 5 && (
                        <li>...and {result.errors.length - 5} more</li>
                      )}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-destructive/10">
                  <AlertCircle className="size-6 text-destructive" />
                </div>
                <p className="text-lg font-semibold">Import Failed</p>
                <p className="text-sm text-muted-foreground">No holdings were imported</p>
                {result.errors.length > 0 && (
                  <div className="mt-4 w-full rounded-md bg-destructive/10 p-3 text-xs">
                    <ul className="list-disc list-inside text-destructive">
                      {result.errors.slice(0, 3).map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <DialogFooter>
          {step === "upload" && (
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          )}

          {step === "mapping" && (
            <>
              <Button variant="outline" onClick={() => setStep("upload")}>
                Back
              </Button>
              <Button onClick={() => setStep("preview")} disabled={!canProceedToPreview()}>
                Continue
              </Button>
            </>
          )}

          {step === "preview" && (
            <>
              <Button variant="outline" onClick={() => setStep("mapping")}>
                Back
              </Button>
              <Button onClick={handleImport} disabled={getPreviewData().length === 0}>
                Import {getPreviewData().length} Holdings
              </Button>
            </>
          )}

          {step === "done" && (
            <Button onClick={handleClose}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
