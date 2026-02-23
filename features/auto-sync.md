# Auto-Sync on App Open

Automatically syncs SimpleFin-connected accounts when the user opens the app, with a 6-hour cooldown.

## How It Works

1. `<AutoSync />` is a zero-UI client component rendered in the dashboard layout
2. On mount (once per page load, via `useRef` guard):
   - Calls `autoSyncIfNeeded()` server action
   - Fire-and-forget — no loading indicators, no error UI

### Cooldown Logic (`autoSyncIfNeeded`)

1. Fetch the most recent `last_synced` timestamp across all SimpleFin accounts
2. If last sync was < 6 hours ago → skip (return `{ synced: false, reason: "cooldown" }`)
3. If no SimpleFin accounts exist → skip (return `{ synced: false, reason: "no_accounts" }`)
4. Otherwise → run full `syncSimpleFinAccounts()` pipeline

### Full Sync Pipeline
The sync triggers the complete chain:
1. Fetch accounts + transactions from SimpleFin API
2. Upsert accounts (balance, name updates)
3. Insert new transactions (deduplicated by `simplefin_transaction_id`)
4. Auto-categorize new transactions (`categorizeTransactionWithCache`)
5. Auto-detect transfers for new transactions (`detectTransfersForNewTransactions`)

## Key Files

| File | Purpose |
|------|---------|
| `src/components/auto-sync.tsx` | Zero-UI client component (18 lines) |
| `src/app/(dashboard)/accounts/actions.ts` | `autoSyncIfNeeded()` with cooldown check |
| `src/lib/simplefin/sync.ts` | `syncSimpleFinAccounts()` — full sync pipeline |
| `src/app/(dashboard)/layout.tsx` | Renders `<AutoSync />` |

## Design Decisions

- **Zero UI**: No loading spinners or success toasts. Sync happens invisibly.
- **6-hour cooldown**: Prevents excessive API calls if user refreshes frequently.
- **useRef guard**: Prevents double-fire in React 19 strict mode.
- **Fire-and-forget**: `.catch(() => {})` — sync errors are silently swallowed. User can always trigger manual sync from Accounts page.
