# Workflows & Execution Traces

## 1. User Connects Bank Account (SimpleFin)

```
User clicks "Connect Account" → /accounts/connect page
  ↓
User enters SimpleFin setup token
  ↓
accounts/actions.ts → connectSimpleFin()
  → POST to SimpleFin claim URL (exchanges token for access URL)
  → Encrypt access URL with AES-256-CBC (lib/encryption.ts)
  → Store encrypted URL in accounts.simplefin_access_url
  → redirect("/accounts")
```

## 2. User Syncs Accounts

```
User clicks "Sync" on accounts page
  ↓
accounts/actions.ts → syncAccounts()
  → Decrypt SimpleFin access URL
  → lib/simplefin/client.ts → fetchAccounts() (GET /accounts)
  → For each SimpleFin account:
      → Upsert into accounts table (match by simplefin_account_id)
      → lib/simplefin/sync.ts → upsertTransactions()
          → Batch insert transactions (ON CONFLICT simplefin_id DO UPDATE)
          → Capture pending status from SimpleFin
      → lib/simplefin/sync.ts → categorizeNewTransactions()
          → For each uncategorized transaction:
           → lib/categorization/engine.ts → categorizeTransaction()
                   → Check category_rules (priority order, multi-condition support)
                   → Check merchant_mappings (learned patterns)
                   → Check DEFAULT_PATTERNS (keyword matching for all 3 types)
               → Update transaction with category_id, categorized_by, type, category_confidence
               → If rule matched: apply set_ignored, set_merchant_name, set_tags from rule
      → lib/transfers/detector.ts → detectTransfersForNewTransactions()
          → Find matching pairs: abs(amount) match, ±3 days, opposite signs, different accounts
          → Set to_account_id on both sides
          → Categorize both as "Transfer" (if Transfer category exists)
          → Clear review_flagged on both
  → revalidatePath("/accounts"), revalidatePath("/transactions")
```

## 3. User Changes Transaction Category

```
User clicks category pill on transaction (list or detail sheet)
  ↓
CategorySelector.handleSelect() or TransactionDetailSheet.handleCategorySelect()
  → Optimistic update (setOptimisticCategory)
  ↓
transactions/actions.ts → updateTransactionCategory(transactionId, categoryId)
  → Fetch category.type (parallel with merchant_name fetch)
  → Update transaction: category_id, categorized_by='manual', type, category_confirmed=true, review_flagged=false, category_confidence=null
  → learnFromOverride() → upsert merchant_mappings (increment times_confirmed)
  → revalidatePath("/transactions"), revalidatePath("/"), revalidatePath("/spending")
  ↓
Post-update (client):
  → Dispatch "transactionCategoryChanged" CustomEvent
  → Check if rule exists for merchant (checkRuleExists())
  → If no rule → open RuleDialog for graduation prompt
  → RuleToast appears in transaction list
```

## 4. User Creates Budget

```
User navigates to /spending/breakdown
  ↓
page.tsx → getHierarchicalBudget(month, year)
  → Fetch categories (hierarchical tree)
  → Call RPC get_category_spending for actuals
  → Fetch existing budget + budget_items
  → Build tree: parent categories with children, each with limit + spent
  ↓
User adjusts budget amounts → clicks Save
  ↓
budgets/actions.ts → createBudget(month, year, items)
  → Upsert budget row (unique on user_id + month + year)
  → Delete existing budget_items
  → Insert new budget_items (category_id + limit_amount)
  → revalidatePath("/spending/breakdown")
```

## 5. User Views Forecast

```
User navigates to /forecast
  ↓
forecast/actions.ts → getForecast(scenario, horizon)
  → Fetch: accounts (inner join), transactions (6 months, excluding transfers via to_account_id IS NULL)
  → Filter out: transfer-category txns, positive credit card amounts (payments), uncategorized checking/savings debits
  → Calculate current net worth (sum of account balances)
  → lib/forecast/engine.ts → ForecastEngine.calculateForecast()
      → Compute average monthly income (amount > 0 AND category.type = 'income', last 3 months)
      → Compute average monthly expenses (amount < 0, last 3 months)
      → Apply scenario multipliers:
          conservative: income × 0.95, expenses × 1.1, growth -2%
          realistic: income × 1.0, expenses × 1.0, growth +1%
          optimistic: income × 1.05, expenses × 0.95, growth +3%
      → Generate month-0 "today" anchor point (confidence=1, no spread)
      → Project month-by-month: netWorth, assets, liabilities, confidence, confidenceUpper, confidenceLower
      → Confidence decays from 0.95 by 0.05/month; spread widens proportionally
  → Return ForecastResult with points array and assumptions
```

## 6. User Asks AI Advisor

```
User types message in /advisor chat
  ↓
advisor/actions.ts → sendChatMessage(conversationId, message)
  → Fetch or create ai_conversation
  → Insert user message into ai_messages
  → Fetch user's financial context:
      → accounts, recent transactions, budget, spending summary, goals
  → lib/ai/provider.ts → getAIProvider(userId)
      → Fetch ai_settings for user
      → Decrypt API key
      → Create provider-specific client (OpenAI, Anthropic, etc.)
  → Send chat completion with system prompt + financial context + conversation history
  → Insert assistant response into ai_messages
  → Return { conversationId, reply }
```

## 7. AI Auto-Categorization

```
User clicks "AI Categorize" in transaction list header
  ↓
use-transaction-list.ts → aiCategorize() (from advisor/actions.ts)
  → Fetch ALL categories (expense + income + transfer) with type
  → Count uncategorized transactions (category_id IS NULL)
  ↓
For each batch of 50 uncategorized transactions:
  → lib/ai/prompts.ts → buildCategorizationPrompt(batch, categories)
      → Format: "cat-id: Category Name (type)" — AI sees all three types
  → Send to user's configured AI provider with CATEGORIZE_SYSTEM prompt
  → Parse JSON response: [{transactionId, categoryId, confidence}]
  → For each valid assignment (confidence >= 0.7):
      → Update transaction: category_id, type (from category.type), categorized_by='ai',
        review_flagged=true, review_flagged_reason='ai_low_confidence'
  ↓
revalidatePath("/transactions")
Return { categorized, total }
```

## 8. Bulk Categorization (Rule Engine)

```
User clicks "Auto Categorize" or during sync
  ↓
lib/categorization/engine.ts → bulkCategorize(userId)
  → Prefetch all data in parallel:
      → category_rules (user's active rules, priority order)
      → merchant_mappings (learned patterns, confidence >= 0.8)
      → default categories (system categories for keyword matching)
      → categoryTypes map (id → income/expense/transfer)
  ↓
For each uncategorized transaction (up to 500):
  → categorizeTransactionWithCache():
      1. matchUserRuleCached() — multi-condition rules, all fields (merchant, description, amount, account)
      2. matchLearnedPatternCached() — merchant name substring matching
      3. matchDefaultCategoryCached() — keyword patterns for all 3 types
  → If matched: set category_id, type (from categoryTypes map), categorized_by
  → Rule matches: also apply set_ignored, set_merchant_name, set_tags
  → Rule matches: category_confirmed=true, review_flagged=false
  → Non-rule matches: review_flagged=true
```

## 9. Transaction List Filtering

```
User interacts with filters (search, category, account, dates, view tabs)
  ↓
TransactionList (client component)
  → updateParams() → router.push(pathname + "?" + newParams)
  → useEffect triggers on searchParams change
  ↓
transactions/actions.ts → getTransactions({ search, categoryId, accountId, startDate, endDate, page, view })
  → Build Supabase query with filters
  → View filtering:
      "all" → ignored = false (hides excluded)
      "review" → ignored = false, review_flagged = true, category_confirmed = false
      "uncategorized" → ignored = false, category_id IS NULL
      "excluded" → ignored = true
  → Order by date DESC, paginate
  → Return { transactions, total, page, totalPages }
  ↓
Also fetches: getTransactionViewCounts() → { review: N, uncategorized: N, excluded: N }
  → Displayed as badge counts on view tabs
```

## 10. CSV/OFX Import

```
User navigates to /accounts/import
  → Upload CSV or OFX file
  ↓
Client-side parsing:
  → CSV: lib/parsers/csv-parser.ts (PapaParse)
  → OFX: lib/parsers/ofx-parser.ts (ofx-js)
  → Extract: date, amount, description, merchant_name
  ↓
User maps columns, selects or creates account
  ↓
accounts/import/actions.ts → importTransactions({ accountId, newAccountData, transactions })
  → Create account if new
  → Batch insert transactions
  → Return { success, inserted, accountId }
```

## 11. Budget Rebalancing with Signals

```
User clicks Rebalance on /spending/breakdown
  ↓
budgets/actions.ts → getRebalanceSuggestions(month, year)
  → Fetch 12 months of transactions + spending
  → Filter out transfer-type transactions; income tracked separately for avgMonthlyIncome
  → Only expense spending feeds into rebalancing weights
  → Fetch category parent hierarchy
  → Fetch goal_pressure via RPC (savings goals / income ratio)
  → Fetch networth_sensitivity via RPC (90-day NW trend)
  → Fetch mid-month spending (current month to date)
  → lib/rebalance/engine.ts → computeRebalance()
      → Goal pressure squeezes "wants" categories proportionally
      → NW sensitivity adjusts drift threshold (+/- 0.02-0.03)
      → computeTargetWeights() with goalPressure + categoryParents
      → detectDrift() with adjusted threshold
      → resolveWithinParent() — pairs over/under within same parent first
      → generateSuggestions() — remaining offsets cross-group
      → computeDriftAlerts() — if day >= 15, project spending to month end
  → Return suggestions + goalPressure + networthSensitivity + driftAlerts
  ↓
RebalanceButton dialog shows:
  - Goal pressure banner (if active goals)
  - NW sensitivity warning (if declining)
  - Mid-month drift alerts (warning/critical)
  - Editable suggestion list
```

## 12. Recurring Rule Matching on Import

```
SimpleFin sync inserts new transactions
  ↓
sync.ts → upsertTransactions() → categorizeNewTransactions()
  ↓
sync.ts → matchRecurringOnImport(userId, insertedIds)
  → lib/recurring/actions.ts → matchRecurringOnImport()
      → Fetch active recurring_rules for user
      → For each new transaction:
          → lib/recurring/matcher.ts → matchTransactionToRule()
              → Compare merchant_name/description to rule patterns
              → Check amount within 15% tolerance
          → If matched: set recurring_id, is_recurring=true, update rule.next_expected
```

## 13. Transfer Detection (Retroactive)

```
Admin/user triggers transfer detection
  ↓
lib/transfers/detector.ts → detectAndLinkTransfers(userId)
  → Fetch all accounts for user
  → Fetch unlinked transactions from last 6 months (to_account_id IS NULL)
  → detectTransferPairs():
      → For each negative-amount transaction:
          → Find matching positive-amount transaction:
              → Different account
              → abs(amount) matches within $0.01
              → Date within ±3 days
              → Pick closest date match
          → Each transaction can only match once
  → For each pair:
      → Set to_account_id on both sides (pointing to counterpart account)
      → Categorize both as "Transfer" category
      → Set categorized_by='default', clear review_flagged
  → Return count of linked pairs
```

## 14. Recurring Transaction Confirmation

```
User views /spending/recurring
  ↓
page.tsx loads three data sets in parallel:
  → getConfirmedRecurringRules() — rules where confirmed=true → "Upcoming" section
  → getDetectedRecurringPatterns() — SQL RPC detect_recurring_transactions
      → Filtered: excludes already-confirmed/dismissed merchant patterns
      → Filtered: excludes transfer-category transactions
  → getDismissedMerchantPatterns() — rules where confirmed=false → excluded from detection
  ↓
"Is This Recurring?" section shows detected patterns:
  → User clicks Yes → confirmRecurringPattern()
      → Upsert recurring_rules: confirmed=true, source='detected'
      → Pattern moves to "Upcoming" section
  → User clicks No → dismissRecurringPattern()
      → Upsert recurring_rules: confirmed=false, dismissed_at=now()
      → Shows undo toast (5 second window)
      → Undo → undoDismissRecurringPattern() → deletes the dismissed rule
  ↓
"Upcoming" section shows confirmed rules:
  → Computes next expected dates
  → Summary stats bar (total bills, monthly/yearly cost)
  → Filter by frequency
  → 3-dot menu: Edit (modal with end_date, stop_after) or Delete
```

## 15. Auto-Sync on App Open

```
User opens app (any dashboard page)
  ↓
(dashboard)/layout.tsx renders <AutoSync /> (zero-UI client component)
  ↓
auto-sync.tsx → useEffect (fires once via useRef guard)
  → accounts/actions.ts → autoSyncIfNeeded()
      → Fetch most recent last_synced across all SimpleFin accounts
      → If last sync < 6 hours ago → return { synced: false, reason: "cooldown" }
      → If no SimpleFin accounts → return { synced: false, reason: "no_accounts" }
      → Otherwise → syncSimpleFinAccounts() (full sync pipeline)
      → Return { synced: true }
  ↓
Fire-and-forget: no UI feedback, no loading state
```

## 16. Portfolio Management

```
User navigates to /portfolio
  ↓
portfolio/page.tsx → Parallel fetch:
  → portfolio/actions.ts → getPortfolioOverview()
      → Fetch holdings with current prices from price_cache
      → Calculate total value, total cost, gain/loss
  → portfolio/actions.ts → getPortfolioSnapshots()
      → Fetch daily snapshots for chart
  → portfolio/actions.ts → fetchMarketData()
      → Fetch watchlist prices from Finnhub
  ↓
User adds holding:
  → portfolio/actions.ts → addHolding({ symbol, shares, costBasis, ... })
      → Insert into portfolio_holdings
      → Snapshot portfolio value
      → Sync net worth
  ↓
User imports CSV:
  → Client-side CSV parse
  → portfolio/actions.ts → importHoldings(holdings[])
      → Batch insert into portfolio_holdings
      → Snapshot + net worth sync
```
