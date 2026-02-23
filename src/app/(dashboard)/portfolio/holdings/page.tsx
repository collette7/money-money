import { getPortfolioData, ensureFreshPrices, type HoldingRow, type PriceCacheRow } from "../actions"
import { HoldingsList } from "../holdings-list"

export default async function HoldingsPage() {
  await ensureFreshPrices()
  const data = await getPortfolioData()
  
  // Convert Map to array for serialization
  const pricesArray: [string, PriceCacheRow][] = Array.from(data.prices.entries())
  
  return (
    <HoldingsList 
      holdings={data.holdings} 
      prices={pricesArray}
    />
  )
}
