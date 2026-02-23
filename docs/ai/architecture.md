# Architecture Map

## Directory Responsibilities

```
/
├── src/
│   ├── app/                        # Next.js App Router (pages + server actions)
│   │   ├── layout.tsx              # Root: fonts, Providers wrapper
│   │   ├── globals.css             # Design tokens, Tailwind theme, dark mode
│   │   ├── auth/                   # Public auth pages (login, signup, confirm, callback)
│   │   ├── api/                    # REST endpoints (only budgets/route.ts active)
│   │   └── (dashboard)/            # Protected route group
│   │       ├── layout.tsx          # Shell: SidebarProvider > AppSidebar + AppHeader + content
│   │       ├── page.tsx            # Home dashboard (server component, inline queries)
│   │       ├── spending/           # Spending section with sub-layout (tabbed navigation)
│   │       │   ├── layout.tsx      # Client: tab bar (Breakdown|Transactions|Recurring|Reports|Categories)
│   │       │   ├── page.tsx        # Redirects to /spending/breakdown
│   │       │   ├── breakdown/      # Spending breakdown (Expenses/Budget/Income tabs), category editor
│   │       │   │   └── edit/      # Category editor route (4 sections: Expenses, Income, Transfers, Excluded)
│   │       │   ├── transactions/   # Full transaction list with filters
│   │       │   ├── recurring/      # Recurring transaction detection
│   │       │   ├── reports/        # Income/expense and category reports
│   │       │   ├── categories/     # Category CRUD
│   │       │   ├── charts/         # Shared chart components
│   │       │   └── components/     # Shared spending section components
│   │       ├── transactions/       # Transaction actions + components (redirects to spending/transactions)
│   │       ├── accounts/           # Account management, SimpleFin connect, CSV import
│   │       ├── forecast/           # Net worth forecasting
│   │       ├── goals/              # Savings goals
│   │       ├── advisor/            # AI chat + auto-categorize + budget recommendations
│   │       ├── portfolio/           # Investment portfolio (overview + holdings)
│   │       │   ├── page.tsx        # Portfolio overview with performance chart + market watch
│   │       │   └── holdings/       # Holdings list with add/edit/CSV import
│   │       ├── settings/           # AI config, notifications, profile
│   │       │   └── rules/         # Rules management page (CRUD for category_rules)
│   │       └── budgets/            # Budget server actions (getBudget, getHierarchicalBudget, createBudget, rebalance)
│   │
│   ├── components/                 # Shared React components
│   │   ├── ui/                     # shadcn/ui primitives (29 files) — DO NOT hand-edit, use shadcn CLI
│   │   ├── sidebar/                # AppSidebar navigation
│   │   ├── header/                 # AppHeader, NotificationBell
│   │   ├── providers.tsx           # QueryClientProvider (TanStack React Query)
│   │   ├── transaction-detail-sheet.tsx   # Transaction detail right panel
│   │   ├── merchant-detail-sheet.tsx      # Merchant history panel
│   │   ├── rule-dialog.tsx                # Categorization rule creation
│   │   ├── split-transaction-dialog.tsx   # Transaction splitting
│   │   ├── category-form-dialog.tsx       # Category CRUD dialog
│   │   ├── category-picker.tsx           # Unified category dropdown (used everywhere)
│   │   ├── auto-sync.tsx                 # Zero-UI auto-sync on app open (6hr cooldown)
│   │   └── account-icon.tsx               # Bank logo with fallback
│   │
│   ├── lib/                        # Business logic and utilities
│   │   ├── supabase/               # Supabase client factories (server, client, middleware)
│   │   ├── categorization/         # Auto-categorization engine (rules, learned, defaults)
│   │   ├── rebalance/              # Budget rebalancing algorithm
│   │   ├── recurring/              # Recurring rule matching engine
│   │   ├── transfers/             # Inter-account transfer detection & linking
│   │   ├── forecast/               # Net worth forecasting (scenario + time-series)
│   │   ├── simplefin/              # SimpleFin API client + sync orchestration
│   │   ├── ai/                     # Multi-provider LLM integration
│   │   ├── parsers/                # CSV and OFX file parsers
│   │   ├── stores/                 # Zustand store (sidebar state only)
│   │   ├── encryption.ts           # AES-256-CBC token encryption
│   │   ├── rate-limit.ts           # Upstash Redis rate limiter
│   │   ├── transfer-filter.ts      # Transfer category detection utilities
│   │   ├── validation.ts           # Zod schemas for all forms
│   │   ├── audit-log.ts            # Audit logging utility
│   │   └── utils.ts                # cn() classname helper
│   │
│   ├── hooks/                      # Custom React hooks
│   │   └── use-mobile.ts           # Mobile breakpoint detection (768px)
│   │
│   └── types/                      # TypeScript type definitions
│       └── database.ts             # All DB entity interfaces and enums
│
├── supabase/
│   ├── config.toml                 # Local dev config
│   ├── seed.sql                    # Seed data (system categories)
│   └── migrations/                 # 16 migration files (ordered by filename)
│
├── scripts/                        # One-off DB migration/fix scripts (Node.js)
├── docs/                           # Documentation
│   └── ai/                         # AI-navigable documentation (this directory)
├── public/                         # Static assets (SVG icons)
└── middleware.ts                    # Rate limiting + Supabase session refresh + auth redirects
```

## Data Flow

```
Browser Request
      │
      ▼
middleware.ts ──→ Rate limit check (Upstash Redis)
      │            Session refresh (Supabase cookie adapter)
      │            Auth redirect (unauthenticated → /auth/login)
      │
      ▼
layout.tsx (root) ──→ Providers (QueryClientProvider)
      │
      ▼
(dashboard)/layout.tsx ──→ Supabase auth.getUser()
      │                     Renders: AppSidebar + AppHeader + children
      │
      ▼
page.tsx (server component) ──→ Supabase queries (direct)
      │                          Passes data as props to client components
      │
      ▼
Client Component ──→ Server Action call (via import from actions.ts)
      │                 or: useEffect + getTransactions() for client-side fetch
      │
      ▼
actions.ts ("use server") ──→ createClient() (server Supabase)
      │                        auth.getUser() check
      │                        Supabase query/mutation
      │                        revalidatePath() for cache bust
      │
      ▼
Supabase PostgreSQL ──→ RLS policies enforce user_id = auth.uid()
```

## Entry Points

| Type | Path | Purpose |
|------|------|---------|
| Middleware | `middleware.ts` | Rate limiting, session refresh, auth redirects |
| Root Layout | `src/app/layout.tsx` | Fonts, QueryClientProvider |
| Dashboard Layout | `src/app/(dashboard)/layout.tsx` | Sidebar + header shell, auth check |
| Spending Layout | `src/app/(dashboard)/spending/layout.tsx` | Tab navigation for spending section |
| API Route | `src/app/api/budgets/route.ts` | GET budget data (used by advisor) |
| Auth Callback | `src/app/auth/callback/route.ts` | OAuth callback handler |
| SimpleFin Callback | `src/app/api/simplefin/callback/route.ts` | SimpleFin setup completion |

## State Storage and Mutation

| State | Storage | Mutated By |
|-------|---------|-----------|
| User session | Supabase Auth (cookies) | middleware.ts auto-refresh, login/signup actions |
| All financial data | Supabase PostgreSQL | Server actions in actions.ts files |
| UI sidebar state | Zustand (client memory) | SidebarProvider toggle |
| AI chat history | Supabase (ai_conversations, ai_messages) | advisor/actions.ts |
| Form state | React useState (ephemeral) | Component-local |
| Transaction filters | URL search params | useSearchParams + router.push |

## Integration Boundaries

| System | Protocol | Auth | Files |
|--------|----------|------|-------|
| Supabase | HTTPS REST | Anon key + RLS | lib/supabase/*.ts |
| SimpleFin | HTTPS REST | Access URL (encrypted) | lib/simplefin/client.ts, lib/simplefin/sync.ts |
| OpenAI/Anthropic/etc | HTTPS REST | User-provided API key (encrypted in DB) | lib/ai/provider.ts |
| Finnhub | HTTPS REST | API key (env var) | portfolio/page.tsx, lib/finnhub.ts |
| Upstash Redis | HTTPS REST | Token (env var) | lib/rate-limit.ts |
| Logo.dev | HTTPS GET | Public token (`NEXT_PUBLIC_LOGO_DEV_TOKEN`) | lib/account-utils.ts, components/account-icon.tsx |
| SimpleFin Auto-Sync | On app open | 6-hour cooldown | components/auto-sync.tsx, accounts/actions.ts |
