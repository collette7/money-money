# Portfolio (Invest)

Tracks investment holdings — market-priced assets via Finnhub (stocks, ETFs, crypto, options, mutual funds) and manually valued assets (real estate, private equity, vehicles, alternative investments).

## Page: `/portfolio`

Two tabs: **Overview** and **Holdings**

### Overview Tab
- Market status badge (open/closed via Finnhub `/stock/market-status`)
- Total portfolio value with day change ($ and %)
- Performance area chart with time range selector (1W/1M/3M/6M/1Y/All)
- Asset allocation horizontal bar chart grouped by asset_type

### Holdings Tab
- Holdings grouped by asset type (collapsible sections)
- Market-priced rows: symbol, shares, current value, gain/loss, day change
- Manual asset rows: name, current value, gain since purchase, last updated
- Closed positions section (collapsed, shows realized gains)
- 3-dot menu: Add shares, Update value, Record sale, Edit, Delete

## Database Schema

### `holdings`
Replaces the old unused `investments` table. Key fields:
- `user_id` (direct FK, not through accounts — simpler RLS)
- `account_id` (optional — for brokerage-linked holdings)
- `asset_type` enum: stock, etf, crypto, option, mutual_fund, real_estate, private_equity, vehicle, alternative, other
- `is_manual` boolean — market-priced vs manually valued
- `symbol` — Finnhub symbol (null for manual assets)
- `shares`, `avg_cost`, `total_cost` — market holdings (recalculated from lots)
- `purchase_value`, `current_value` — manual holdings
- `sale_date`, `sale_price`, `sale_value` — closed positions

### `holding_lots`
Individual purchase lots. Average cost recalculated on every lot insert:
```
avg_cost   = sum(lot.shares * lot.price_per_share) / sum(lot.shares)
total_cost = sum(lot.shares * lot.price_per_share)
```

### `price_cache`
Finnhub quote cache with 15-minute TTL. Keyed by symbol.

### `portfolio_snapshots`
Daily aggregate portfolio value (like `net_worth_snapshots`). Recorded on page load, one per day per user.

## Finnhub Integration

### Client Module: `src/lib/finnhub/client.ts`
- `getQuote(symbol)` — single stock/ETF quote
- `getBatchQuotes(symbols)` — parallel quotes for all open holdings
- `searchSymbol(query)` — symbol search for add holding flow
- `getMarketStatus()` — US market open/closed status

### Refresh Behavior
- Triggered on page load and manual refresh button
- Checks `price_cache.fetched_at` — if < 15 min ago, uses cache
- Batch fetches all stale symbols via `Promise.allSettled`
- Rate limit aware: Finnhub free tier = 60 calls/min

### Stale Price Indicators
| Age | Treatment |
|-----|-----------|
| < 15 min | Fresh |
| 15 min – 1 day | Show "as of [time]" |
| > 1 day | Amber stale indicator |

## Gain/Loss Calculation

```
// Market holding
currentValue      = shares * cachedPrice
unrealizedGain    = currentValue - total_cost
dayChange         = shares * (currentPrice - prevClose)

// Manual holding
unrealizedGain    = current_value - purchase_value

// Closed holding
realizedGain      = sale_value - (total_cost | purchase_value)
```

## Net Worth Integration

Portfolio value flows into net worth via an auto-created "Portfolio" investment account:
1. On page load, `syncPortfolioToNetWorth()` sums all open holdings
2. Creates/updates a "Portfolio" account (type=investment, sync_method=manual)
3. Updates account balance → existing net worth calculation picks it up automatically
4. Zero changes to the 5+ places that compute net worth from account balances

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/finnhub/client.ts` | Finnhub API client (quote, search, market status) |
| `src/app/(dashboard)/portfolio/actions.ts` | Server actions (CRUD, price refresh, lot management, net worth sync) |
| `src/app/(dashboard)/portfolio/page.tsx` | Overview tab (server component) |
| `src/app/(dashboard)/portfolio/portfolio-overview.tsx` | Overview tab UI (chart, allocation) |
| `src/app/(dashboard)/portfolio/holdings/page.tsx` | Holdings tab (server component) |
| `src/app/(dashboard)/portfolio/holdings-list.tsx` | Holdings list UI (grouped, 3-dot menu) |
| `src/app/(dashboard)/portfolio/add-holding-dialog.tsx` | Add holding (market + manual modes) |
| `src/app/(dashboard)/portfolio/record-sale-dialog.tsx` | Record sale dialog |
| `src/app/(dashboard)/portfolio/add-lot-dialog.tsx` | Add shares to existing holding |
| `src/app/(dashboard)/portfolio/update-value-dialog.tsx` | Update manual asset value |

## Constants

- Price cache TTL: 15 minutes
- Manual asset stale warning: 90 days since `current_value_updated_at`
- Finnhub free tier: 60 API calls/minute
- Crypto symbols: stored with exchange prefix (e.g., `BINANCE:BTCUSDT`)
