# SimpleFin Account Sync

Connects to bank accounts via SimpleFin for automatic transaction and balance syncing.

## Setup Flow

1. User obtains a **setup token** from SimpleFin
2. App exchanges setup token for a permanent **access URL** via SimpleFin API
3. Access URL is encrypted and stored in the `accounts` table (`simplefin_access_url`)
4. Accounts are created/linked based on SimpleFin account IDs

## Sync Pipeline (`src/lib/simplefin/sync.ts`)

### Trigger Points
- **Manual**: User clicks "Sync" on Accounts page
- **Auto-sync**: On app open, with 3-hour cooldown (see [auto-sync.md](./auto-sync.md))

### Process

1. **Group accounts by access URL** — one API call per unique SimpleFin credential
2. **Determine lookback period**:
   - First sync: 90 days (or custom `initialLookbackDays`)
   - Subsequent syncs: from earliest `last_synced` among group accounts
3. **Fetch from SimpleFin API** — accounts + transactions for the lookback window
4. **Upsert accounts**: Update balances, names, available balance
5. **Insert transactions**: Deduplicated by `simplefin_transaction_id` (upsert on conflict)
6. **Post-processing** (for new transactions only):
   - Auto-categorize via `categorizeTransactionWithCache()` (uses prefetched cache)
   - Auto-detect transfers via `detectTransfersForNewTransactions()`

### Deduplication
- Each SimpleFin transaction has a unique `simplefin_transaction_id`
- Upsert on conflict: updates amount, description, date if changed
- Prevents duplicate transactions across syncs

## Account Types

SimpleFin reports account types that map to the app's internal types:
- Checking, Savings → asset accounts
- Credit Card → liability accounts
- Investment, Retirement → asset accounts

## Encryption

- Access URLs are encrypted at rest using AES-256
- `src/lib/encryption.ts` handles encrypt/decrypt
- Decrypted only at sync time, never stored in plaintext

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/simplefin/client.ts` | SimpleFin API client (fetch accounts, exchange token) |
| `src/lib/simplefin/sync.ts` | Full sync pipeline (upsert, categorize, detect transfers) |
| `src/app/(dashboard)/accounts/actions.ts` | Server actions (sync, auto-sync, connect) |
| `src/lib/encryption.ts` | AES-256 encrypt/decrypt for access URLs |

## Constants

- Default lookback: 90 days (first sync)
- Auto-sync cooldown: 3 hours
- SimpleFin API base: configured via access URL
