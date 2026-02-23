import {
  getPortfolioData,
  getPortfolioSnapshots,
  ensureFreshPrices,
  recordPortfolioSnapshot,
  syncPortfolioToNetWorth,
  type HoldingRow,
  type PriceCacheRow,
} from "./actions"
import { PortfolioOverview } from "./portfolio-overview"
import { getWatchedSymbols, type WatchedSymbol } from "../settings/actions"
import type { MarketQuote } from "./market-watch-card"
import type { MarketStatus } from "@/lib/finnhub/client"

type Snapshot = {
  date: string
  total_value: number
  total_cost: number
}

async function fetchMarketData(symbols: WatchedSymbol[]): Promise<MarketQuote[] | null> {
  const apiKey = process.env.FINNHUB_API_KEY
  if (!apiKey || symbols.length === 0) return null

  try {
    const results = await Promise.all(
      symbols.map(async ({ symbol, name }): Promise<MarketQuote | null> => {
        const res = await fetch(
          `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`,
          { next: { revalidate: 300 } }
        )
        if (!res.ok) return null
        const data = await res.json()
        if (!data || typeof data.c !== "number" || data.c === 0) return null
        return {
          name,
          symbol,
          price: data.c as number,
          change: (data.d ?? 0) as number,
          changePct: (data.dp ?? 0) as number,
        }
      })
    )
    const valid = results.filter((r): r is MarketQuote => r !== null)
    return valid.length > 0 ? valid : null
  } catch {
    return null
  }
}

export default async function PortfolioPage() {
  await ensureFreshPrices()

  const [data, snapshots, watchedSymbols] = await Promise.all([
    getPortfolioData(),
    getPortfolioSnapshots(),
    getWatchedSymbols(),
  ])

  recordPortfolioSnapshot(data.totalValue, data.totalCost).catch(() => {})
  syncPortfolioToNetWorth(data.totalValue).catch(() => {})

  const pricesArray = Array.from(data.prices.entries())
  const marketData = await fetchMarketData(watchedSymbols)

  return (
    <PortfolioOverview
      holdings={data.holdings}
      prices={pricesArray}
      marketStatus={data.marketStatus}
      totalValue={data.totalValue}
      totalCost={data.totalCost}
      dayChange={data.dayChange}
      dayChangePct={data.dayChangePct}
      snapshots={snapshots as Snapshot[]}
      marketData={marketData}
      watchedSymbols={watchedSymbols}
    />
  )
}
