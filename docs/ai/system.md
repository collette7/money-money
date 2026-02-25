# System Overview

## What This Is

Money Money is a personal finance dashboard. Single-user (no multi-tenancy). Users connect bank accounts via SimpleFin, import transactions via CSV/OFX, categorize spending, set budgets, track savings goals, forecast net worth, and chat with an AI financial advisor.

## Primary User Workflows

1. **Account Connection** — User provides SimpleFin setup token → app exchanges for access URL → syncs accounts and transactions on demand
2. **Transaction Management** — View, search, filter, categorize (manual, rule-based, AI-assisted), split, tag, hide
3. **Spending Analysis** — Monthly trends, category breakdown, top merchants, daily heatmap, recurring detection
4. **Budgeting** — Set monthly category budgets, view actuals vs limits, AI-generated 50/30/20 recommendations, rebalance suggestions
5. **Forecasting** — Scenario-based net worth projection (conservative/realistic/optimistic) with confidence bands, transfer-aware expense filtering, time-series growth analysis
6. **Goals** — Track savings goals with contribution schedules, linked accounts, progress tracking
7. **AI Advisor** — Chat interface for financial questions, auto-categorization, budget recommendations
8. **Transfer Detection** — Auto-detect inter-account transfers by matching abs(amount) + date within ±3 days + opposite signs across accounts
9. **Auto-Sync** — Accounts sync automatically on app open with 3-hour cooldown between syncs
10. **Portfolio Tracking** — Manual holdings entry + CSV import, daily snapshots, performance chart, market watch via Finnhub, net worth integration

## Architectural Style

- **Monolithic Next.js app** — No microservices, no separate backend
- **Server-first rendering** — Pages are async server components that fetch data directly from Supabase
- **Server Actions for mutations** — All writes go through `"use server"` functions in `actions.ts` files
- **Supabase as sole database** — PostgreSQL via Supabase with Row-Level Security (RLS), RPCs, triggers
- **No ORM** — Direct Supabase client queries everywhere
- **Client components only where needed** — Interactive UI (forms, filters, sheets) are `"use client"`

## Key Technologies

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | Next.js 16 (App Router) | Server components, server actions, file-based routing |
| Database | Supabase (PostgreSQL 17) | Auth, RLS, RPCs, realtime, storage — all-in-one |
| Styling | Tailwind CSS 4 + shadcn/ui | Utility-first CSS with Radix-based accessible components |
| State | Zustand (minimal) | Only sidebar open/closed state; most state is server-side |
| Data Fetching | TanStack React Query | Client-side cache for AI advisor chat; most data is SSR |
| Charts | Recharts 3 | Financial visualizations |
| AI | Multi-provider (OpenAI, Anthropic, Gemini, Ollama, etc.) | User-configurable LLM for chat and categorization |
| Account Sync | SimpleFin API | Bank account aggregation |
| Rate Limiting | Upstash Redis + @upstash/ratelimit | API and middleware rate limiting |
| Validation | Zod 4 | Schema validation for forms and server actions |

## Runtime Model

- **Request/Response** — Standard Next.js server rendering. No WebSockets, no realtime subscriptions, no background workers.
- **Auto-sync on open** — SimpleFin sync triggers automatically when user opens the app (6-hour cooldown). Manual sync also available via button.
- **No cron jobs** — No background processing. All computation happens during request lifecycle.
- **Stateless server** — No in-memory state between requests. All state lives in Supabase.

## Authentication Model

- Supabase Auth with email/password (no OAuth providers configured)
- Session managed via HTTP-only cookies (Supabase SSR cookie adapter)
- Middleware refreshes session on every request
- RLS enforces data isolation at database level — every table has policies scoped to `auth.uid()`

## Amount Convention

- Signed amounts: negative = expense/debit, positive = income/credit
- 30+ files use `amount < 0` for expenses — do NOT change this convention
- `type` column on transactions is derived from `category.type` on write, nullable for uncategorized
- Display uses `Math.abs(amount)` with color/sign prefix
