# Recurring Transactions

Detects repeating transaction patterns and lets users confirm/dismiss them. Confirmed rules power the "Upcoming" bills section.

## Page: `/spending/recurring`

Three sections loaded in parallel:

### 1. Upcoming (Confirmed Rules)
- Source: `recurring_rules` where `confirmed = true`
- Shows next expected date, amount, frequency, merchant
- Summary stats bar: total bills count, monthly/yearly cost
- Filter by frequency (weekly, monthly, yearly, all)
- Actions per rule: Edit (modal with end_date, stop_after) or Delete

### 2. Is This Recurring? (Detected Patterns)
- Source: SQL RPC `detect_recurring_transactions` (LAG window function)
- Filtered: excludes already-confirmed/dismissed merchants, transfer-category transactions
- User actions:
  - **Yes** → `confirmRecurringPattern()` → upserts rule with `confirmed=true, source='detected'`
  - **No** → `dismissRecurringPattern()` → upserts rule with `confirmed=false, dismissed_at=now()`
  - **Undo** → 5-second toast window → deletes the dismissed rule

### 3. Credit Card Payments
- Detected from transfer pairs where one account is credit card type
- Shown separately from regular recurring patterns

## Detection Logic

The SQL RPC uses a LAG window function grouped by merchant to find transactions that repeat at regular intervals. The matcher (`src/lib/recurring/matcher.ts`) handles:
- Pattern detection from transaction history
- Matching new transactions against existing rules
- Computing next expected dates

### Amount Tolerance
- **15% or $5** (whichever is greater) — user confirmed this threshold

## Database: `recurring_rules`

| Column | Purpose |
|--------|---------|
| `merchant_pattern` | Matching pattern (merchant name) |
| `merchant_name` | Display name |
| `expected_amount` | Expected transaction amount |
| `frequency` | weekly, monthly, yearly |
| `expected_day` | Day of month (1-31) |
| `confirmed` | `true` = user confirmed, `false` = user dismissed, `null` = unreviewed |
| `dismissed_at` | When user clicked "No" |
| `source` | `manual`, `detected`, `imported` (enum: `app_recurring_source`) |
| `next_expected` | Computed next occurrence date |
| `occurrence_count` | How many times this pattern has been seen |
| `end_date` | Optional: stop tracking after this date |
| `stop_after` | Optional: stop after N occurrences |
| `amount_tolerance` | Per-rule override for amount matching tolerance |
| `interval_days` | Computed interval between occurrences |

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/recurring/matcher.ts` | Pattern detection, rule matching, next-date computation |
| `src/lib/recurring/actions.ts` | Server actions (CRUD, confirm, dismiss, undo) |
| `src/app/(dashboard)/spending/recurring/page.tsx` | Page component |
