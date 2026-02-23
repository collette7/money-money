# Contributing to Money Money

This guide covers development workflows and coding standards for the Money Money personal finance platform.

## Getting Started

For setup instructions, see the [README.md](./README.md). This document focuses on how we write and ship code.

## Architecture Overview

Money Money is a Next.js 16 App Router application backed by Supabase (Postgres). All business logic lives in `src/lib/`, all UI in `src/app/` and `src/components/`.

### Key Subsystems

| Subsystem | Location | Purpose |
|-----------|----------|---------|
| Categorization | `src/lib/categorization/` | Rule-based, learned, and AI transaction classification |
| Rebalancing | `src/lib/rebalance/` | Budget drift detection, target weights, goal pressure |
| Recurring | `src/lib/recurring/` | Recurring transaction detection and rule management |
| Forecast | `src/lib/forecast/` | Financial projection calculations |
| SimpleFIN | `src/lib/simplefin/` | Account sync and transaction import pipeline |
| AI | `src/lib/ai/` | Multi-provider AI abstraction (OpenAI, Anthropic, etc.) |

For detailed documentation, see [`docs/ai/`](./docs/ai/).

## Git Practices

### Branch Naming

```
{initials}/{brief-description}
```

**Example:** `cm/budget-rollover-fix`

### Workflow

1. Create branch off latest `main`
2. Develop and commit with descriptive messages
3. Create Pull Request targeting `main`
4. Squash merge after approval

### Commit Messages

Write concise messages that explain *why*, not *what*:

- `fix: exclude unconfirmed transactions from rebalance weights`
- `feat: add pooled slack display to rebalance dialog`
- `refactor: extract useTransactionDetail hook from sheet component`

## Coding Standards

### TypeScript

1. **No `any`** — Never use `as any`, `@ts-ignore`, or `@ts-expect-error`
2. **Infer types** — Prefer inference over explicit annotation when the type is obvious
3. **Functions over classes** — Use plain functions and modules
4. **Strict null checks** — Handle null/undefined explicitly

### File Organization

- **Components own UI, hooks own logic** — Each complex component has a co-located hook
- **Co-location pattern**: `component-name.tsx` paired with `use-component-name.ts`
- **Server actions** live in `actions.ts` within their route directory
- **Pure logic** goes in `src/lib/`, never in components or actions

### Hook Extraction Pattern

When a component has non-trivial state or effects, extract into a co-located hook:

```
src/app/(dashboard)/transactions/
  transaction-list.tsx          # UI only — renders props from hook
  use-transaction-list.ts       # All state, effects, handlers, data fetching
```

The hook returns everything the component needs. The component is a pure render function.

### Naming Conventions

| Entity | Convention | Example |
|--------|-----------|---------|
| Files | kebab-case | `transaction-detail-sheet.tsx` |
| Hooks | `use-` prefix, kebab-case file | `use-transaction-detail.ts` |
| Components | PascalCase export | `TransactionDetailSheet` |
| Server actions | camelCase | `updateTransactionCategory` |
| Database columns | snake_case | `category_confirmed` |
| TypeScript types | PascalCase | `BudgetItem`, `DriftAlert` |
| Enums/unions | lowercase strings | `"independent" \| "pooled" \| "strict_pooled"` |

### Supabase Conventions

- **Migrations** go in `supabase/migrations/` with timestamp prefix: `YYYYMMDDHHMMSS_description.sql`
- **RPC functions** for complex queries (joins, aggregations) — prefer over client-side logic
- **Row-level security** on all user-facing tables
- **Signed amounts** — negative = expense, positive = income. No absolute values in the DB.

### UI Conventions

- **shadcn/ui** components as the base
- **Tailwind CSS** for all styling — no CSS modules or styled-components
- **Lucide icons** exclusively
- **`cn()` utility** for conditional class merging
- **Server Components first** — use Client Components only when interactivity is required

## Project Structure

```
src/
  app/
    (dashboard)/
      accounts/           # Account list, sync, SimpleFIN connection
      advisor/            # AI chat interface + actions (categorize, budget)
      budgets/            # Budget CRUD, mode selector, rebalance button
      forecast/           # Forecast page + hook
      goals/              # Savings goals with progress cards
      settings/           # User settings, AI config, account management
      spending/
        breakdown/        # Hierarchical spending view with budget overlays
      transactions/       # Transaction list, filters, category selector, rules
    auth/                 # Login/signup pages
  components/
    ui/                   # shadcn/ui primitives (button, dialog, input, etc.)
    transaction-detail-sheet.tsx
    merchant-detail-sheet.tsx
    rule-dialog.tsx
    split-transaction-dialog.tsx
    category-selector.tsx
  lib/
    categorization/engine.ts   # 4-mode categorization (rule, learned, default, manual)
    rebalance/engine.ts        # Target weights, drift detection, alerts, suggestions
    recurring/matcher.ts       # Recurring transaction pattern matching
    simplefin/sync.ts          # Import pipeline with batch categorization
    ai/provider.ts             # AI provider abstraction
    ai/prompts.ts              # System prompts for advisor, categorization, budgets
  types/
    database.ts                # All TypeScript types matching DB schema
```

## Database

Key tables and their relationships:

- **transactions** — Core financial records (amount, date, merchant, category_id, type, categorized_by, confidence, category_confirmed, review_flagged, excluded, is_recurring)
- **categories** — Hierarchical taxonomy (parent_id for nesting, type: income/expense/transfer/savings)
- **budgets** / **budget_items** — Monthly/weekly/annual budgets with per-category limits, modes, rollover
- **category_rules** — IF merchant contains X THEN assign category Y
- **merchant_mappings** — Learned merchant-to-category associations with confidence scores
- **recurring_rules** — Detected recurring transaction patterns
- **accounts** — Bank accounts synced via SimpleFIN
- **savings_goals** — Target amounts with deadlines and progress tracking
- **ai_conversations** — Chat history for the AI advisor

### Migrations

Create new migrations with a timestamp prefix:

```bash
# supabase/migrations/YYYYMMDDHHMMSS_description.sql
```

Apply: `npx supabase migration up`

All migrations should be idempotent — use `IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, etc.

## Development Workflow

### Before Starting

1. Pull latest `main` and create feature branch
2. Review related code in `docs/ai/` for context
3. Check existing patterns before implementing new ones

### During Development

1. Run `npm run dev` — dev server on port 3030
2. Type-check frequently: `npx tsc --noEmit`
3. Keep LSP diagnostics clean on changed files

### Before Submitting PR

1. `npx tsc --noEmit` — zero errors
2. `npm run build` — passes
3. `npm run lint` — clean
4. Self-review your diff

## Additional Resources

- **[README.md](./README.md)** — Setup and local development
- **[docs/ai/](./docs/ai/)** — Architecture, data models, workflows, conventions
- **[scripts/README.md](./scripts/README.md)** — Database utility scripts
