"use client"

import { useState, useEffect, useRef, useTransition, useCallback } from "react"
import { useRouter } from "next/navigation"
import { X, Pencil, Search, Check, Loader2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  updateWatchedSymbols,
  searchSymbols,
  type WatchedSymbol,
} from "../settings/actions"

export type MarketQuote = {
  name: string
  symbol: string
  price: number
  change: number
  changePct: number
}

function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString("en-US", { maximumFractionDigits: 0 })
  return price.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

function SymbolSearch({
  onSelect,
  existingSymbols,
}: {
  onSelect: (s: WatchedSymbol) => void
  existingSymbols: Set<string>
}) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<WatchedSymbol[]>([])
  const [searching, setSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const doSearch = useCallback(
    async (q: string) => {
      setSearching(true)
      try {
        const data = await searchSymbols(q)
        setResults(data.filter((s) => !existingSymbols.has(s.symbol)))
        setShowDropdown(true)
      } finally {
        setSearching(false)
      }
    },
    [existingSymbols]
  )

  useEffect(() => {
    doSearch("")
  }, [doSearch])

  function handleChange(value: string) {
    setQuery(value)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(value), 250)
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div ref={wrapperRef} className="relative">
      <div className="flex items-center gap-1.5 rounded border border-input bg-background px-2 py-1.5">
        {searching ? (
          <Loader2 className="size-3.5 text-muted-foreground animate-spin shrink-0" />
        ) : (
          <Search className="size-3.5 text-muted-foreground shrink-0" />
        )}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setShowDropdown(true)}
          placeholder="Search stocks, indices, crypto..."
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
        />
      </div>

      {showDropdown && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded border bg-popover shadow-md max-h-48 overflow-y-auto">
          {results.map((s) => (
            <button
              key={s.symbol}
              onClick={() => {
                onSelect(s)
                setQuery("")
                doSearch("")
                inputRef.current?.focus()
              }}
              className="flex items-center justify-between w-full px-2.5 py-2 text-left hover:bg-muted/60 transition-colors"
            >
              <span className="text-sm truncate">{s.name}</span>
              <span className="text-xs font-mono text-muted-foreground shrink-0 ml-2">
                {s.symbol}
              </span>
            </button>
          ))}
        </div>
      )}

      {showDropdown && !searching && query.length > 0 && results.length === 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded border bg-popover shadow-md px-3 py-2">
          <p className="text-xs text-muted-foreground">No results for &ldquo;{query}&rdquo;</p>
        </div>
      )}
    </div>
  )
}

export function MarketWatchCard({
  data,
  initialSymbols,
}: {
  data: MarketQuote[] | null
  initialSymbols: WatchedSymbol[]
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [symbols, setSymbols] = useState<WatchedSymbol[]>(initialSymbols)
  const [isPending, startTransition] = useTransition()

  const markets = data ?? []

  function persistSymbols(next: WatchedSymbol[]) {
    setSymbols(next)
    startTransition(async () => {
      await updateWatchedSymbols(next)
    })
  }

  function removeSymbol(symbol: string) {
    const next = symbols.filter((s) => s.symbol !== symbol)
    if (next.length === 0) return
    persistSymbols(next)
  }

  function addSymbol(entry: WatchedSymbol) {
    if (symbols.some((s) => s.symbol === entry.symbol)) return
    persistSymbols([...symbols, entry])
  }

  function handleDone() {
    setEditing(false)
    router.refresh()
  }

  const existingSet = new Set(symbols.map((s) => s.symbol))

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
          Market Watch
        </p>
        <button
          onClick={editing ? handleDone : () => setEditing(true)}
          className="p-1 rounded hover:bg-muted transition-colors"
          aria-label={editing ? "Done editing" : "Edit watchlist"}
        >
          {editing ? (
            <Check className="size-3.5 text-emerald-600" />
          ) : (
            <Pencil className="size-3.5 text-muted-foreground" />
          )}
        </button>
      </div>

      {editing ? (
        <div className="mt-3 space-y-3">
          <SymbolSearch onSelect={addSymbol} existingSymbols={existingSet} />

          <div className="space-y-1">
            {symbols.map((s) => (
              <div
                key={s.symbol}
                className="flex items-center justify-between py-1.5 px-2 rounded bg-muted/50 group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-mono text-muted-foreground shrink-0">
                    {s.symbol}
                  </span>
                  <span className="text-sm truncate">{s.name}</span>
                </div>
                {symbols.length > 1 && (
                  <button
                    onClick={() => removeSymbol(s.symbol)}
                    className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition-all shrink-0"
                    disabled={isPending}
                  >
                    <X className="size-3 text-muted-foreground hover:text-destructive" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3 mt-3">
          {markets.length === 0 && (
            <p className="text-xs text-muted-foreground">No market data available</p>
          )}
          {markets.map((market) => {
            const positive = market.changePct >= 0
            return (
              <div key={market.symbol} className="flex items-center justify-between">
                <span className="text-sm font-medium w-20 shrink-0">{market.name}</span>
                <span className="text-sm tabular-nums flex-1 text-right">
                  {formatPrice(market.price)}
                </span>
                <span
                  className={cn(
                    "text-xs font-medium tabular-nums w-16 text-right",
                    positive ? "text-emerald-600" : "text-orange-500"
                  )}
                >
                  {positive ? "+" : ""}
                  {market.changePct.toFixed(2)}%
                </span>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
