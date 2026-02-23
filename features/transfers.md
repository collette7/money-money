# Transfer Detection

Automatically identifies and links transactions that represent money moving between the user's own accounts.

## How It Works

1. **Matching algorithm** (`src/lib/transfers/detector.ts → detectTransferPairs`):
   - Pairs a negative transaction (outflow) with a positive transaction (inflow)
   - Different accounts (same account = not a transfer)
   - Amounts match within $0.01 (`abs(amount)`)
   - Dates within ±3 days
   - If multiple matches, picks closest date
   - Each transaction can only be matched once

2. **Linking**: Sets `to_account_id` on both sides — outflow points to inflow's account, inflow points to outflow's account.

3. **Categorization**: Both transactions get:
   - `category_id` → "Transfer" category (type=transfer)
   - `type` → "transfer"
   - `categorized_by` → "default"
   - `review_flagged` → false

## Two Entry Points

| Function | When | Scope |
|----------|------|-------|
| `detectTransfersForNewTransactions()` | During SimpleFin sync | Only new transaction IDs + nearby existing txns |
| `detectAndLinkTransfers()` | Retroactive / admin | All unlinked transactions from last 6 months |

## Impact on Other Features

- **Forecast**: Queries exclude transfers via `to_account_id IS NULL` filter to prevent double-counting
- **Spending**: Transfers excluded from expense calculations
- **Home page**: Transfer-category transactions filtered from spending totals

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/transfers/detector.ts` | Core detection algorithm + DB linking |
| `src/lib/transfers/actions.ts` | Server action wrapper (`runTransferDetection`) |
| `src/lib/simplefin/sync.ts` | Calls `detectTransfersForNewTransactions` after sync |

## Constants

- `DATE_TOLERANCE_DAYS = 3`
- Amount tolerance: `$0.01` (exact match for transfers, unlike recurring which uses 15%)
