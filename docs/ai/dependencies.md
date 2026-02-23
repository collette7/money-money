# Dependencies & External Integrations

## External Services

### Supabase (PostgreSQL + Auth)
- **Purpose**: Database, authentication, row-level security
- **Auth**: Anon key (public, RLS-protected) + service role key (admin, server-only)
- **Env vars**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **Client factories**: `lib/supabase/server.ts` (server actions), `lib/supabase/client.ts` (browser), `lib/supabase/middleware.ts` (middleware)
- **Risk**: HIGH — sole data store. Schema changes require migrations.

### SimpleFin
- **Purpose**: Bank account aggregation (read-only transaction sync)
- **Auth**: Setup token → exchanged for access URL (stored encrypted)
- **Env vars**: None (user provides setup token)
- **Files**: `lib/simplefin/client.ts`, `lib/simplefin/sync.ts`
- **Flow**: User provides token → app claims access URL → GET /accounts on demand
- **Risk**: MEDIUM — external API, may have downtime or format changes

### AI Providers (OpenAI, Anthropic, Gemini, Ollama, MiniMax, Moonshot)
- **Purpose**: Financial advisor chat, auto-categorization, budget recommendations
- **Auth**: User-provided API key (encrypted in `ai_settings` table)
- **Env vars**: None (per-user keys stored in DB)
- **Files**: `lib/ai/provider.ts`
- **Risk**: LOW — graceful degradation if unavailable

### Finnhub
- **Purpose**: Market data (Dow Jones, S&P 500, VIX) for dashboard widget
- **Auth**: API key
- **Env var**: `FINNHUB_API_KEY`
- **Files**: Inline in `(dashboard)/page.tsx`
- **Cache**: 5-minute revalidation
- **Risk**: LOW — static fallback data if API unavailable

### Upstash Redis
- **Purpose**: Rate limiting for API routes and middleware
- **Auth**: REST token
- **Env vars**: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- **Files**: `lib/rate-limit.ts`
- **Risk**: LOW — rate limiting is optional enhancement

### Logo.dev
- **Purpose**: Bank/institution logo lookup by domain
- **Auth**: Public token via `NEXT_PUBLIC_LOGO_DEV_TOKEN` env var
- **URL**: `https://img.logo.dev/{domain}?token={NEXT_PUBLIC_LOGO_DEV_TOKEN}&size=64&format=png`
- **Fallback**: Google favicons (`google.com/s2/favicons?domain={domain}&sz=64`) when token missing or Logo.dev fails
- **Files**: `lib/account-utils.ts`, `components/account-icon.tsx`, `spending/recurring/recurring-confirmation.tsx`
- **Risk**: NONE — decorative, fallback chain to Google favicons → generic icon

## NPM Dependencies (Key Packages)

### Runtime

| Package | Version | Purpose | Risk |
|---------|---------|---------|------|
| next | 16.1.6 | App framework | HIGH — core |
| react / react-dom | 19.2.3 | UI library | HIGH — core |
| @supabase/supabase-js | ^2.95.3 | DB client | HIGH — core |
| @supabase/ssr | ^0.8.0 | Server-side auth | HIGH — auth |
| radix-ui | ^1.4.3 | Accessible UI primitives | MEDIUM — all UI components depend on this |
| tailwindcss | ^4 | Styling | MEDIUM — all styling |
| recharts | ^3.7.0 | Charts | LOW — dashboard only |
| zustand | ^5.0.11 | State (sidebar only) | LOW — minimal usage |
| @tanstack/react-query | ^5.90.21 | Client cache (advisor chat) | LOW — limited usage |
| zod | ^4.3.6 | Validation | LOW — forms only |
| date-fns | ^4.1.0 | Date formatting | LOW — utility |
| papaparse | ^5.5.3 | CSV parsing | LOW — import only |
| ofx-js | ^0.2.0 | OFX parsing | LOW — import only |
| react-hotkeys-hook | ^5.2.4 | Keyboard shortcuts | LOW — enhancement |
| @emoji-mart/react + @emoji-mart/data | latest | Full emoji picker | LOW — category editor |
| @dnd-kit/core + @dnd-kit/sortable | ^6 | Drag-and-drop reordering | LOW — category editor |
| cmdk | ^1.1.1 | Command palette | LOW — category search |
| lucide-react | ^0.564.0 | Icons | LOW — decorative |
| @upstash/redis | ^1.36.2 | Rate limiting | LOW — optional |
| @upstash/ratelimit | ^2.0.8 | Rate limiting | LOW — optional |
| pg | ^8.18.0 | PostgreSQL client | LOW — scripts only |
| react-markdown | ^10.1.0 | Markdown rendering | LOW — AI chat only |

### Dev Only

| Package | Purpose |
|---------|---------|
| @playwright/test | E2E testing |
| eslint + eslint-config-next | Linting |
| typescript | Type checking |
| shadcn | UI component CLI |

## Security-Sensitive Code

| File | What It Does | Risk |
|------|-------------|------|
| `lib/encryption.ts` | AES-256-CBC encryption for SimpleFin tokens and AI API keys | CRITICAL — key in `ENCRYPTION_KEY` env var |
| `lib/supabase/server.ts` | Creates server Supabase client with cookie auth | HIGH — auth boundary |
| `lib/supabase/middleware.ts` | Session refresh logic | HIGH — auth flow |
| `middleware.ts` | Rate limiting + auth redirect | HIGH — security gate |
| `lib/rate-limit.ts` | Upstash rate limiter | MEDIUM — DoS protection |
| `lib/audit-log.ts` | Audit logging for sensitive ops | MEDIUM — compliance |
| `auth/login/actions.ts` | Password auth | HIGH — credential handling |

## Files That Must Not Change Casually

- `supabase/migrations/*` — Applied to production DB. Never edit applied migrations; create new ones.
- `lib/encryption.ts` — Breaking this = losing access to all encrypted tokens
- `lib/supabase/server.ts` — Auth boundary for every server action
- `middleware.ts` — Gate for all requests
- `src/types/database.ts` — Referenced by every feature; changes ripple everywhere
