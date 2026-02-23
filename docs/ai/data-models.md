# Data Models

## Enums

| Enum | Values |
|------|--------|
| app_account_type | checking, savings, credit, investment, loan |
| app_category_type | income, expense, transfer |
| app_sync_method | simplefin, manual |
| app_categorized_by | rule, learned, default, manual, ai |
| app_rule_field | merchant_name, description, amount, account_id |
| app_rule_operator | contains, equals, starts_with, greater_than, less_than, between |
| app_split_type | equal, custom, percentage |
| app_split_direction | owed_to_me, i_owe |
| app_settled_method | cash, venmo, zelle, other |
| app_contribution_frequency | weekly, biweekly, monthly, custom |
| app_goal_status | active, paused, completed |
| app_contribution_type | scheduled, manual, extra |
| app_subscription_frequency | monthly, yearly, weekly |
| app_asset_type | stock, etf, crypto, bond, mutual_fund |
| app_document_type | will, trust, poa, healthcare_directive |
| app_document_status | draft, complete |
| app_partner_status | pending, accepted, rejected |
| app_ai_provider | openai, anthropic, ollama, gemini, minimax, moonshot |
| app_notification_type | large_transaction, budget_warning, budget_exceeded, goal_milestone, system |
| app_budget_mode | independent, pooled, strict_pooled |
| app_budget_period | weekly, monthly, annual |
| app_recurring_frequency | weekly, biweekly, monthly, quarterly, annual |
| app_recurring_source | detected, manual |

## Tables

### profiles
Extends Supabase auth.users. Created by trigger on auth signup.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid PK | no | — | FK → auth.users.id ON DELETE CASCADE |
| display_name | text | yes | null | |
| avatar_url | text | yes | null | |
| mfa_enabled | boolean | no | false | |
| preferences | jsonb | no | '{}' | |
| created_at | timestamptz | no | now() | |
| updated_at | timestamptz | no | now() | Trigger: set_updated_at |

### accounts
Bank, credit card, investment, and loan accounts.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid PK | no | gen_random_uuid() | |
| user_id | uuid | no | — | FK → auth.users ON DELETE CASCADE |
| institution_name | text | no | — | |
| account_type | app_account_type | no | — | |
| asset_type | text | yes | null | CHECK IN ('asset', 'liability') |
| name | text | no | — | |
| balance | decimal(12,2) | no | 0 | |
| opening_balance | decimal(12,2) | no | 0 | |
| currency | text | no | 'USD' | |
| last_synced | timestamptz | yes | null | |
| simplefin_token | text | yes | null | Encrypted at app layer |
| simplefin_access_url | text | yes | null | |
| simplefin_account_id | text | yes | null | |
| sync_method | app_sync_method | no | 'manual' | |
| institution_domain | text | yes | null | For logo lookup |
| payment_due_day | integer | yes | null | CHECK 1-31 |
| created_at | timestamptz | no | now() | |
| updated_at | timestamptz | no | now() | Trigger: set_updated_at |

### categories
Hierarchical transaction categories. `user_id IS NULL` = system default.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid PK | no | gen_random_uuid() | |
| user_id | uuid | yes | null | FK → auth.users; NULL = system |
| name | text | no | — | |
| icon | text | yes | null | Emoji |
| color | text | yes | null | Hex color |
| emoji | text | yes | null | |
| parent_id | uuid | yes | null | FK → categories.id ON DELETE SET NULL |
| type | app_category_type | no | 'expense' | |
| excluded_from_budget | boolean | no | false | |
| sort_order | integer | no | 0 | Display order within type section |
| created_at | timestamptz | no | now() | |

### transactions
Core ledger. Negative amount = expense, positive = income.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid PK | no | gen_random_uuid() | |
| account_id | uuid | no | — | FK → accounts ON DELETE CASCADE |
| date | date | no | — | |
| amount | decimal(12,2) | no | — | Negative=expense, positive=income |
| description | text | no | — | |
| category_id | uuid | yes | null | FK → categories ON DELETE SET NULL |
| type | app_category_type | yes | null | Derived from category.type on write |
| status | text | no | 'cleared' | CHECK IN ('pending', 'cleared') |
| ignored | boolean | no | false | Hidden from spending/budget calcs |
| category_confirmed | boolean | no | false | User verified the category |
| review_flagged | boolean | no | false | Needs user review (migration) |
| review_flagged_reason | text | yes | null | Why flagged: ai_low_confidence, taxonomy_migration, etc. |
| category_confidence | decimal(3,2) | yes | null | 0.00-1.00 auto-categorization score |
| recurring_id | uuid | yes | null | FK → recurring_rules ON DELETE SET NULL |
| to_account_id | uuid | yes | null | FK → accounts ON DELETE SET NULL; links transfer counterpart |
| tags | text[] | no | '{}' | |
| is_recurring | boolean | no | false | |
| merchant_name | text | yes | null | Cleaned merchant name |
| original_description | text | yes | null | Raw bank description |
| notes | text | yes | null | |
| is_split | boolean | no | false | |
| user_share_amount | decimal(12,2) | yes | null | After split |
| categorized_by | app_categorized_by | yes | null | |
| simplefin_id | text | yes | null | Unique with account_id |
| created_at | timestamptz | no | now() | |
| updated_at | timestamptz | no | now() | Trigger: set_updated_at |

Key indexes: date, account_id, category_id, merchant_name, ignored, status, review_flagged, type, simplefin_id (unique composite).

### category_rules
User-created auto-categorization rules. Actively used by categorization engine.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid PK | no | gen_random_uuid() | |
| user_id | uuid | no | — | FK → auth.users |
| category_id | uuid | no | — | FK → categories ON DELETE CASCADE |
| priority | int | no | 0 | Higher = checked first |
| field | app_rule_field | no | — | Legacy single-condition field |
| operator | app_rule_operator | no | — | Legacy single-condition operator |
| value | text | no | — | Legacy single-condition value |
| value_end | text | yes | null | For "between" operator |
| conditions | jsonb | no | '[]' | Array of {field, operator, value, value_end} — multi-condition rules |
| set_ignored | boolean | yes | null | If matched, set transaction.ignored |
| set_merchant_name | text | yes | null | If matched, override merchant name |
| set_tags | text[] | yes | null | If matched, apply these tags |
| is_active | boolean | no | true | |
| created_at | timestamptz | no | now() | |

### categorization_rules
Legacy rules table (from migration 20240215). **Not used** — `category_rules` is the active table.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid PK | no | gen_random_uuid() | |
| user_id | uuid | no | — | FK → auth.users |
| category_id | uuid | no | — | FK → categories ON DELETE CASCADE |
| rule_type | text | no | — | CHECK IN ('merchant', 'description', 'amount_range') |
| pattern | text | no | — | |
| min_amount | decimal(10,2) | yes | null | |
| max_amount | decimal(10,2) | yes | null | |
| enabled | boolean | no | true | |
| created_at | timestamptz | no | now() | |
| updated_at | timestamptz | no | now() | |

### merchant_mappings
Learned merchant → category associations from manual overrides.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid PK | no | gen_random_uuid() | |
| user_id | uuid | no | — | FK → auth.users |
| merchant_pattern | text | no | — | |
| category_id | uuid | no | — | FK → categories |
| confidence | decimal(3,2) | no | 0.00 | |
| times_confirmed | int | no | 0 | |
| last_updated | timestamptz | no | now() | |

### budgets
Monthly budget container. One per user per month/year.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid PK | no | gen_random_uuid() | |
| user_id | uuid | no | — | FK → auth.users |
| month | int | no | — | CHECK 1-12 |
| year | int | no | — | CHECK 2000-2100 |
| mode | app_budget_mode | no | 'independent' | How sub-budgets interact |
| period | app_budget_period | no | 'monthly' | Budget time period |
| created_at | timestamptz | no | now() | |

Unique constraint: (user_id, month, year).

### budget_items
Category line items within a monthly budget.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid PK | no | gen_random_uuid() | |
| budget_id | uuid | no | — | FK → budgets ON DELETE CASCADE |
| category_id | uuid | no | — | FK → categories |
| limit_amount | decimal(12,2) | no | — | |
| spent_amount | decimal(12,2) | no | 0 | |
| rollover_amount | decimal(12,2) | no | 0 | Carried from prior period |
| is_override | boolean | no | false | User manually set this limit |
| created_at | timestamptz | no | now() | |

### persons
Contacts for transaction splitting.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid PK | no | gen_random_uuid() | |
| user_id | uuid | no | — | FK → auth.users |
| name | text | no | — | |
| email | text | yes | null | |
| phone | text | yes | null | |
| created_at | timestamptz | no | now() | |

### transaction_splits
Split portions of a transaction.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid PK | no | gen_random_uuid() | |
| transaction_id | uuid | no | — | FK → transactions ON DELETE CASCADE |
| person_id | uuid | no | — | FK → persons ON DELETE CASCADE |
| amount | decimal(12,2) | no | — | |
| split_type | app_split_type | no | 'equal' | |
| direction | app_split_direction | no | — | |
| is_settled | boolean | no | false | |
| settled_date | date | yes | null | |
| settled_method | app_settled_method | yes | null | |
| notes | text | yes | null | |
| created_at | timestamptz | no | now() | |

### recurring_rules
Patterns for matching recurring transactions on import. Supports confirmation workflow.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid PK | no | gen_random_uuid() | |
| user_id | uuid | no | — | FK → auth.users ON DELETE CASCADE |
| merchant_pattern | text | no | — | Pattern to match merchant names |
| category_id | uuid | yes | null | FK → categories ON DELETE SET NULL |
| expected_amount | decimal(12,2) | yes | null | |
| frequency | app_recurring_frequency | no | 'monthly' | |
| expected_day | int | yes | null | CHECK 1-31 |
| next_expected | date | yes | null | |
| is_active | boolean | no | true | |
| last_matched_at | timestamptz | yes | null | |
| confirmed | boolean | yes | null | null=unreviewed, true=confirmed, false=dismissed |
| dismissed_at | timestamptz | yes | null | When user dismissed this pattern |
| merchant_name | text | yes | null | Display name for the merchant |
| amount_tolerance | decimal(5,4) | no | 0.1500 | Tolerance for amount matching (15%) |
| interval_days | integer | yes | null | Detected interval in days |
| end_date | date | yes | null | Stop matching after this date |
| stop_after | integer | yes | null | Stop after N occurrences |
| occurrence_count | integer | no | 0 | Number of times matched |
| source | text | no | 'detected' | 'detected' or 'manual' |
| created_at | timestamptz | no | now() | |
| updated_at | timestamptz | no | now() | Trigger: update timestamp |

### portfolio_holdings

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid PK | no | gen_random_uuid() | |
| user_id | uuid | no | — | FK → auth.users ON DELETE CASCADE |
| account_id | uuid | yes | null | FK → accounts ON DELETE SET NULL |
| symbol | text | no | — | Ticker symbol |
| name | text | yes | null | Display name |
| asset_type | app_asset_type | no | 'stock' | |
| shares | decimal(18,8) | no | — | |
| cost_basis | decimal(12,2) | no | — | Per-share cost |
| purchase_date | date | yes | null | |
| notes | text | yes | null | |
| created_at | timestamptz | no | now() | |
| updated_at | timestamptz | no | now() | |

### portfolio_snapshots
Daily portfolio value snapshots.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid PK | no | gen_random_uuid() | |
| user_id | uuid | no | — | FK → auth.users ON DELETE CASCADE |
| date | date | no | — | |
| total_value | decimal(14,2) | no | — | Market value |
| total_cost | decimal(14,2) | no | — | Cost basis |
| created_at | timestamptz | no | now() | |

Unique: (user_id, date)

### price_cache
Market price cache.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| symbol | text PK | no | — | |
| price | decimal(14,4) | no | — | |
| change_pct | decimal(8,4) | yes | null | |
| fetched_at | timestamptz | no | now() | |

### savings_goals, goal_contributions, subscriptions, investments, net_worth_snapshots, partners, estate_documents, ai_settings, ai_conversations, ai_messages, notifications, audit_logs

See `src/types/database.ts` and `supabase/migrations/00001_initial_schema.sql` for complete definitions. These follow the same patterns as tables above.

## RPC Functions

| Function | Params | Returns | Used By |
|----------|--------|---------|---------|
| get_category_spending | p_user_id, p_start_date, p_end_date | {category_id, total}[] | getBudget(), getHierarchicalBudget() |
| get_net_worth_history | p_user_id, p_months (default 12) | {snapshot_date, total_assets, total_liabilities, net_worth}[] | Available but unused |
| detect_recurring_transactions | p_user_id, p_min_occurrences (default 3) | {merchant_name, avg_amount, occurrences, avg_interval_days, last_date, estimated_frequency}[] | getDetectedRecurringPatterns() |
| calculate_rollover | p_user_id, p_month, p_year | TABLE(category_id, rollover_amount) | Budget rollover calculation |
| get_pooled_slack | p_user_id, p_month, p_year | TABLE(parent_category_id, slack_amount) | Pooled budget surplus per parent |
| get_goal_pressure | p_user_id | decimal(5,4) | Ratio of monthly goal contributions to income |
| get_networth_sensitivity | p_user_id | decimal(8,4) | 90-day net worth change ratio |

Notes:
- `get_category_spending` filters `category_id IS NOT NULL` AND `c.type != 'transfer'`
- `detect_recurring_transactions` uses SQL LAG() window functions for interval calculation

## Row-Level Security

Every table with user data has 4 RLS policies: SELECT, INSERT, UPDATE, DELETE — all scoped to `auth.uid()`. Tables joined through `accounts` (like `transactions`, `transaction_splits`) use subqueries to verify ownership through the account chain.

## Triggers

- `set_updated_at`: Before UPDATE on profiles, accounts, transactions, savings_goals — sets `updated_at = now()`
- `on_auth_user_created`: After INSERT on auth.users — creates profile row
- `pgrst_watch`: Event trigger on DDL — notifies PostgREST to reload schema cache
