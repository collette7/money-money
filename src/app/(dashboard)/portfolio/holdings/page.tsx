import { getPortfolioData, refreshPrices, type HoldingRow, type PriceCacheRow } from "../actions"
import { HoldingsList } from "../holdings-list"

export default async function HoldingsPage() {
  const data = await getPortfolioData()
  
  // Refresh prices in the background (don't await)
  refreshPrices().catch(() => {})
  
  // Convert Map to array for serialization
  const pricesArray: [string, PriceCacheRow][] = Array.from(data.prices.entries())
  
  return (
    <HoldingsList 
      holdings={data.holdings} 
      prices={pricesArray}
    />
  )
}
