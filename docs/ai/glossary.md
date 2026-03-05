# Glossary

## Domain Terms

| Term | Definition |
|------|-----------|
| Transaction | A single financial event (debit or credit) on an account. Negative amount = expense. |
| Category | A classification for a transaction (e.g., "Groceries", "Salary"). Has type: income, expense, or transfer. |
| Parent category | A top-level grouping (e.g., "Essentials", "Lifestyle"). Children link via `parent_id`. |
| System category | A category with `user_id = NULL`. Seeded by migrations. Shared across all users. |
| User category | A category with `user_id` set. Created by a specific user. |
| Categorized_by | How a transaction was categorized: `rule` (user rule), `learned` (merchant pattern), `default` (keyword match), `manual` (user pick), `ai` (LLM). |
| Category confidence | A 0.00-1.00 score indicating how certain the auto-categorization is. |
| Category confirmed | Boolean flag: user has explicitly verified this category assignment. |
| Review flagged | Boolean flag: transaction needs user review (e.g., category changed during taxonomy migration). |
| Ignored | Boolean flag: transaction is hidden from spending/budget calculations but still exists in the DB. |
| Merchant mapping | A learned association between a merchant name and a category, built from manual overrides. |
| Category rule | A user-created rule: "When [field] [operator] [value], categorize as [category]". |
| Rule graduation | Prompting the user to create a permanent rule after a manual categorization. |
| Rule conditions | A rule can have multiple conditions (field + operator + value). All must match for the rule to fire. |
| Rule side-effects | Beyond categorization, rules can set: `set_ignored`, `set_merchant_name`, `set_tags`. |
| Tags | Free-form text labels on transactions (`text[]`). Applied manually or via rules. |
| Excluded category | A category with `excluded_from_budget = true`. Hidden from budget calculations and shown in its own editor section. |
| Budget | A monthly spending plan: a container (`budgets` table) with line items (`budget_items` table). |
| Budget item | A single category's spending limit within a monthly budget. |
| Budget mode | Controls how sub-budgets interact within a parent group. Three modes: `independent` (each category tracked alone), `pooled` (underspend in one child offsets overspend in sibling), `strict_pooled` (pooled but overspend is penalized). Stored as `app_budget_mode` enum. |
| Budget period | Time span for a budget: `weekly`, `monthly`, or `annual`. Stored as `app_budget_period` enum. |
| BudgetAllocation | Engine type representing a single category's budget data (categoryId, categoryName, limitAmount, parentCategoryId, isOverride). Defined in `src/lib/rebalance/engine.ts`. |
| Rebalance | Adjusting budget allocations based on actual spending patterns. Uses 50/30/20 as fallback. Only expense categories are rebalanced; income is used as the target total, transfers are excluded. |
| Rollover | Unspent budget from a prior month carried forward to the current month. Stored as `rollover_amount` on `budget_items`. Calculated via `calculate_rollover` RPC. |
| 50/30/20 | Budget framework: 50% essentials, 30% lifestyle, 20% savings. |
| Drift | The difference between budgeted amount and actual spending for a category. |
| Drift alert | Mid-month warning when a category's projected month-end spending exceeds its budget. Severity: `warning` (on pace to exceed) or `critical` (already exceeded). Generated when day >= 15. |
| Net worth | Total assets minus total liabilities. Tracked via `net_worth_snapshots`. |
| Net worth sensitivity | 90-day net worth change ratio. Negative values indicate decline, tightening drift thresholds during rebalance. Fetched via `get_networth_sensitivity` RPC. |
| Forecast | Projected future net worth based on historical income/expense trends. |
| Goal pressure | Ratio of monthly savings goal contributions to income (0.0–1.0). Higher values squeeze discretionary budget categories. Fetched via `get_goal_pressure` RPC. |
| Scenario | Forecast variant: conservative (pessimistic), realistic (neutral), optimistic. |
| Slack | In pooled budget modes, the surplus amount available in a parent category group when some children underspend. Fetched via `get_pooled_slack` RPC. |
| SimpleFin | Third-party API for read-only bank account aggregation. |
| Setup token | One-time SimpleFin token exchanged for a permanent access URL. |
| Access URL | Permanent SimpleFin credential (encrypted in DB) used to fetch account data. |
| Sync | On-demand process that fetches latest accounts and transactions from SimpleFin. |
| Split | Dividing a transaction's cost among multiple people (for shared expenses). |
| Person | A contact used in transaction splits. Not a Supabase auth user. |
| Recurring | A transaction pattern that repeats (detected by SQL RPC using LAG window function). |
| AI provider | User-configurable LLM service (OpenAI, Anthropic, Gemini, Ollama, etc.). |
| Savings goal | A target amount the user is saving toward, with contribution schedule. |
| Transfer pair | Two transactions (one negative, one positive) across different accounts linked by matching amount and close dates. Linked via `to_account_id`. |
| Transfer detection | Auto-matching algorithm that pairs inter-account transfers by abs(amount), ±3 day date tolerance, and opposite signs. |
| Confirmed recurring | A detected recurring pattern the user has approved. Stored as `recurring_rules.confirmed = true`. Appears in "Upcoming" section. |
| Dismissed recurring | A detected recurring pattern the user has rejected. Stored as `recurring_rules.confirmed = false`. Excluded from future detection. |
| Auto-sync | Automatic SimpleFin account sync triggered on app open. 3-hour cooldown between syncs. Zero-UI (no loading indicators). |
| CategoryPicker | Unified category selection component used across all category dropdowns. Searchable, type-grouped, hierarchical. |
| Confidence bands | Upper/lower bounds on forecast projections. Spread widens as confidence decays over forecast horizon. |
| Amount tolerance | For recurring matching: transaction amount must be within 15% (or $5) of expected amount to match a recurring rule. |

## Technical Terms

| Term | Definition |
|------|-----------|
| Server action | Next.js `"use server"` function callable from client components. All mutations go through these. |
| Server component | Default in Next.js App Router. Renders on server, can be async, can fetch data directly. |
| Client component | Marked with `"use client"`. Runs in browser. Required for interactivity (state, effects, events). |
| RLS | Row-Level Security. PostgreSQL feature enforced by Supabase. Every query is filtered by `auth.uid()`. |
| RPC | Remote Procedure Call. PostgreSQL function called via `supabase.rpc("function_name", params)`. |
| Revalidation | Next.js cache busting. `revalidatePath("/path")` forces re-render on next request. |
| shadcn/ui | Component library that generates source code into `components/ui/`. Not a package — files are owned by the project. |
| CVA | Class Variance Authority. Used by shadcn/ui for component variant styling. |
| Radix UI | Headless accessible UI primitives. The foundation under shadcn/ui components. |

## Abbreviations

| Abbrev | Meaning |
|--------|---------|
| tx | Transaction |
| cat | Category |
| acc | Account |
| RLS | Row-Level Security |
| RPC | Remote Procedure Call |
| SSR | Server-Side Rendering |
| SSG | Static Site Generation |
| CSP | Content Security Policy |
| JWT | JSON Web Token |
| OFX | Open Financial Exchange (bank file format) |
| CSV | Comma-Separated Values |
| PK | Primary Key |
| FK | Foreign Key |
