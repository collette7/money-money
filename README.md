# Money Money

A personal finance platform for transaction management, budgeting, and financial insights. Built with Next.js 16, React 19, Supabase, and Tailwind CSS.

## Code Structure

```
src/
  app/                      # Next.js App Router pages & server actions
    (dashboard)/            # Authenticated dashboard routes
      accounts/             # Account management & sync
      advisor/              # AI financial advisor chat
      budgets/              # Budget engine & rebalancing
      forecast/             # Financial forecasting
      goals/                # Savings goals
      settings/             # User preferences, AI config & rules management
      spending/             # Spending breakdown, budgets, income & category editor
      transactions/         # Transaction list, detail, categorization & review
  components/               # Shared UI components (sheets, dialogs, selectors)
  hooks/                    # Global shared hooks
  lib/                      # Core business logic
    ai/                     # AI provider abstraction & prompts
    categorization/         # Auto-categorization engine (rules, learned, AI)
    forecast/               # Forecast computation
    parsers/                # OFX/CSV import parsers
    rebalance/              # Budget rebalancing engine
    recurring/              # Recurring transaction detection & rules
    simplefin/              # SimpleFIN account sync
    stores/                 # Zustand state stores
    supabase/               # Supabase client (server & browser)
  types/                    # TypeScript type definitions
docs/ai/                    # AI-navigable documentation (architecture, models, workflows)
scripts/                    # Database migration & utility scripts
supabase/migrations/        # SQL migration files
```

### Key Areas

- **Dashboard & UI** (`src/app/(dashboard)/`) — Next.js App Router with server actions, React Server Components
  - *Start here for: page layouts, data fetching, user interactions*

- **Business Logic** (`src/lib/`) — Pure logic modules with no UI dependencies
  - *Start here for: categorization rules, rebalancing algorithms, forecast math*

- **Shared Components** (`src/components/`) — Reusable UI built on shadcn/ui + Radix primitives
  - *Start here for: transaction sheets, category selectors, dialogs*

- **Database** (`supabase/migrations/`) — Supabase Postgres with RPC functions
  - *Start here for: schema changes, new tables, stored procedures*

## Quick Start

1. **Clone and install**
   ```bash
   git clone <repo-url> && cd origin-financial-clone
   npm install
   ```

2. **Configure environment** — Copy `.env.example` to `.env.local` and fill in:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

3. **Run migrations**
   ```bash
   npx supabase migration up
   ```

4. **Start dev server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3030](http://localhost:3030).

## Setup & Configuration

### Database (Supabase)

This project uses [Supabase](https://supabase.com) for Postgres, auth, and real-time subscriptions.

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Copy the project URL and keys into `.env.local`
3. Apply migrations: `npx supabase migration up`

### AI Provider

The AI advisor supports multiple providers (OpenAI, Anthropic, Gemini, Kimi, etc.). Configure via **Settings > AI Configuration** in the app, or run the enum migration if adding new providers:

```bash
node scripts/migrate-settings.js
```

### Account Sync (SimpleFIN)

For automatic account/transaction sync, configure SimpleFIN credentials in **Settings > Accounts**.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server (port 3030) |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm start` | Start production server |
| `node scripts/migrate-settings.js` | Update AI provider enum values |
| `node scripts/update-enums.js` | General enum migration utility |
| `node scripts/encrypt-existing-tokens.js` | Encrypt plaintext API tokens in DB |

## Features

- **Transaction management** — Automatic categorization via user rules → learned patterns → AI fallback
- **Category system** — Three types (expense, income, transfer) with hierarchical subcategories, drag-and-drop ordering, emoji icons, custom colors
- **Transaction rules** — Multi-condition rules (merchant, amount, description) with side-effects (set category, tags, merchant name, ignored flag)
- **Review states** — Transactions flagged for review (new, rule-suggested, AI-categorized) with bulk categorize/mark-reviewed
- **Budget engine** — Independent, pooled, and strict pooled modes with rebalancing (goal pressure, net worth sensitivity, drift alerts)
- **Spending breakdown** — Tabbed view: Expenses (donut chart), Budget (gauge + progress), Income (targets + variance)
- **AI financial advisor** — Multi-provider chat (OpenAI, Anthropic, Gemini, Kimi)
- **AI categorization** — Bulk auto-categorize using AI with type-aware assignment (expense/income/transfer)
- Financial forecasting
- Savings goals with progress tracking
- Account aggregation via SimpleFIN
- Recurring transaction detection
- Transfer tracking between accounts
- Import support (OFX, CSV)
- **Merchant logos** — Logo.dev API for transaction merchant icons
- **Emoji picker** — emoji-mart for category icon selection

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 4, shadcn/ui, Radix |
| State | Zustand, React Query |
| Database | Supabase (Postgres) |
| Auth | Supabase Auth |
| AI | OpenAI, Anthropic, Gemini, Kimi (configurable) |
| Charts | Recharts |
| Drag & Drop | @dnd-kit (sortable, core) |
| Emoji | emoji-mart (@emoji-mart/react, @emoji-mart/data) |
| Logos | Logo.dev API |
| Language | TypeScript 5 |

## Additional Resources

- **[CONTRIBUTING.md](./CONTRIBUTING.md)** — Development guidelines, coding standards, git workflow
- **[docs/ai/](./docs/ai/)** — AI-navigable architecture and data model documentation
- **[scripts/README.md](./scripts/README.md)** — Database migration scripts
