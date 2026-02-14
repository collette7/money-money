# Origin Financial Clone - Project Plan

## Overview

An AI-powered personal finance platform that consolidates budgeting, investing, forecasting, and financial planning into a single app. Inspired by [Origin Financial](https://useorigin.com).

**Key constraint**: Account connections must use **free or open-source** solutions only (no Plaid production fees, no paid aggregators).

---

## Features Breakdown

### Phase 1 - MVP (Core Financial Dashboard)

#### 1. Account Aggregation (Free/Open-Source)
- **Primary**: [SimpleFIN Bridge](https://simplefin.org/) (~$15/year per user - cheapest automated option)
- **Secondary**: Manual CSV/OFX file import using `ofxtools` or `ofxparse`
- **Future**: CFPB Open Banking APIs (US banks required to provide free API access, phased rollout 2026-2030)
- Connect bank accounts, credit cards, loans, investment accounts
- Real-time balance syncing (daily via SimpleFIN)
- 90-day historical transaction import
- Support for 11,000+ US financial institutions (via SimpleFIN's MX backend)

#### 2. Net Worth Dashboard
- Total assets vs liabilities summary
- Net worth trend graph over time
- Breakdown by account type (cash, investments, property, debt)
- Real-time updates as accounts sync

#### 3. Transaction Management
- Automatic transaction categorization (ML-based)
- Manual category override and custom categories
- Transaction search, filtering, and tagging
- Split transaction support
- Recurring transaction detection

#### 4. Budgeting
- AI Budget Builder: analyze spending history to auto-generate budgets
- Category-based spending limits with progress bars
- Monthly budget vs actual comparisons
- Spending trend analysis with visual charts
- Real-time budget tracking

#### 5. Authentication & Security
- Email/password + OAuth (Google, Apple)
- Multi-factor authentication (TOTP)
- Bank-level encryption (AES-256)
- Secure token storage for linked accounts

---

### Phase 2 - Financial Intelligence

#### 6. AI Financial Advisor (Chat)
- Natural language queries about spending, budgets, net worth
- Personalized insights grounded in user's actual financial data
- Example queries:
  - "Where can I save $500/month?"
  - "How much did I spend on dining last quarter?"
  - "What's my average monthly grocery spend?"
- Powered by OpenAI API (or local LLM for cost savings)
- Conversation history and suggested prompts

#### 7. Spending Insights & Analytics
- 6-month spending trend analysis
- Income vs spending comparison
- Cash flow tracking (income - expenses over time)
- Category breakdown with Sankey diagrams
- Weekly/monthly financial recap summaries

#### 8. Subscription Management
- Automatic recurring charge detection
- Calendar view of upcoming bills
- Total recurring spend summary
- Quick-cancel links to cancellation pages
- Bill reminders and notifications

#### 9. Couples/Partner Mode
- Invite partner (free, no additional cost)
- Shared dashboard with all linked accounts
- Filter transactions by household member
- Joint budget creation
- Shared financial goals

---

### Phase 3 - Investment Tracking & Forecasting

#### 10. Portfolio Tracking
- Aggregate all investment accounts (401k, IRA, brokerage, crypto)
- Real-time portfolio performance monitoring
- Benchmark comparison (S&P 500, major indices)
- Asset allocation visualization (pie/donut charts)
- Individual position detail with gain/loss

#### 11. Market Discovery
- Custom watchlists (stocks, ETFs, crypto)
- Daily market movers with news context
- Earnings calendar
- Basic stock/ETF screening
- Sector trend tracking

#### 12. Financial Forecasting
- Net worth projection over time
- Monte Carlo simulations for retirement probability
- Life event modeling:
  - Buying a home
  - Having children
  - Career changes
  - Retirement
- Adjustable assumptions (inflation, returns, income growth)
- Success probability scoring

---

### Phase 4 - Advanced Features

#### 13. Estate Planning
- Guided will builder (step-by-step)
- Basic will document generation
- Healthcare directive templates
- Power of attorney documents
- Secure document storage
- Valid in all 50 states (use legal templates)

#### 14. Tax Integration
- Tax summary dashboard (estimated tax liability)
- Capital gains/loss tracking
- Tax-loss harvesting suggestions
- Integration with tax filing services (e.g., link to TurboTax, FreeTaxUSA)
- W-2 and 1099 income categorization

#### 15. Notifications & Alerts
- Large transaction alerts
- Budget limit warnings
- Bill due reminders
- Unusual spending detection
- Weekly financial digest (email/push)

---

## Account Connection Strategy (Deep Dive)

Since we're avoiding paid aggregators, here's the tiered approach:

### Tier 1: SimpleFIN Bridge (Recommended Primary)
- **Cost**: $1.50/month or $15/year per user
- **How it works**: Token-based API, user creates SimpleFIN account, generates access token, app syncs via REST API
- **Coverage**: US banks via MX backend
- **Update frequency**: Daily
- **History**: 90 days
- **Proven by**: Actual Budget (53.9k GitHub stars), Firefly III (22.4k stars)

### Tier 2: Manual Import (Always Available)
- CSV import with intelligent column mapping
- OFX/QFX file parsing (using `ofxtools` Python lib or JS equivalent)
- QIF file support
- Drag-and-drop upload UI
- Template matching for repeat imports from same bank

### Tier 3: Future - CFPB Open Banking (2026+)
- US banks required to provide standardized free API access
- FDX (Financial Data Exchange) standard
- Phased rollout: largest banks first (April 2026), smaller institutions through 2030
- Build adapter layer now so we can plug in when available

### NOT Using
| Option | Why Not |
|--------|---------|
| Plaid (production) | Paid per connection |
| Teller | No free tier |
| GoCardless/Nordigen | Closed to new signups (July 2025) |
| Screen scraping | Legal risks, unreliable, banks block it |
| Akoya (production) | Paid for production use |

---

## Proposed Tech Stack

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **UI Library**: Tailwind CSS + shadcn/ui
- **Charts**: Recharts or Tremor (for financial visualizations)
- **State Management**: Zustand or React Query
- **Mobile**: React Native (Phase 2+) or PWA

### Backend
- **Runtime**: Node.js
- **Framework**: Next.js API Routes (monorepo) or separate Express/Fastify API
- **Database**: PostgreSQL (via Prisma ORM)
- **Auth**: NextAuth.js (Auth.js)
- **Job Queue**: BullMQ + Redis (for account sync scheduling)
- **AI**: OpenAI API (GPT-4) or local Ollama for cost savings

### Infrastructure
- **Hosting**: Vercel (frontend) + Railway/Fly.io (backend/workers)
- **Database**: Supabase or Neon (managed Postgres)
- **Cache**: Redis (Upstash)
- **File Storage**: S3-compatible (for document uploads)
- **Monitoring**: Sentry

### Account Aggregation
- **SimpleFIN**: REST API integration
- **File Import**: `ofxtools` parser, custom CSV mapper
- **Future**: FDX/Open Banking adapter

---

## Data Model (Core Entities)

```
User
  - id, email, name, password_hash, mfa_secret
  - created_at, updated_at

Partner (couples mode)
  - id, user_id (owner), partner_user_id, status
  
Account
  - id, user_id, institution_name, account_type (checking, savings, credit, investment, loan)
  - name, balance, currency, last_synced
  - simplefin_token (encrypted), sync_method (simplefin | manual)

Transaction
  - id, account_id, date, amount, description
  - category_id, tags[], is_recurring, merchant_name
  - original_description, notes

Category
  - id, user_id (null for defaults), name, icon, color, parent_id
  - type (income | expense | transfer)

Budget
  - id, user_id, month, year
  
BudgetItem
  - id, budget_id, category_id, limit_amount, spent_amount

Subscription
  - id, user_id, name, amount, frequency (monthly | yearly | weekly)
  - next_charge_date, category_id, cancel_url

Investment
  - id, account_id, symbol, name, shares, cost_basis
  - current_price, asset_type (stock | etf | crypto | bond | mutual_fund)

NetWorthSnapshot
  - id, user_id, date, total_assets, total_liabilities, net_worth

Forecast
  - id, user_id, name, assumptions (JSON), results (JSON)

AIConversation
  - id, user_id, messages (JSON), created_at

Document (estate planning)
  - id, user_id, type (will | trust | poa | healthcare_directive)
  - content, status (draft | complete), created_at
```

---

## UI Screens (Key Views)

1. **Dashboard/Home** - Net worth card, recent transactions, AI insight card, budget summary
2. **Accounts** - List of linked accounts, add account flow, sync status
3. **Transactions** - Searchable feed, category filter, date range, bulk edit
4. **Budgets** - Monthly view, category progress bars, AI suggestions
5. **Investments** - Portfolio value, allocation chart, holdings table, performance
6. **Subscriptions** - List with costs, calendar view, total monthly spend
7. **Forecast** - Interactive net worth projection, life event timeline, scenario toggles
8. **AI Chat** - Conversational interface, suggested prompts, financial context
9. **Settings** - Profile, partner invite, notification preferences, security
10. **Estate Planning** - Document builder wizard, document storage

---

## Milestones

### M1: Foundation (Weeks 1-3)
- [ ] Project setup (Next.js, Prisma, Postgres, Auth)
- [ ] User authentication (email + OAuth + MFA)
- [ ] Database schema and migrations
- [ ] SimpleFIN integration (connect account, sync transactions)
- [ ] Manual CSV/OFX import
- [ ] Basic dashboard layout

### M2: Core Finance (Weeks 4-6)
- [ ] Transaction categorization (auto + manual)
- [ ] Net worth dashboard with trend chart
- [ ] Budget creation and tracking
- [ ] Spending analytics and category breakdowns
- [ ] Recurring transaction / subscription detection

### M3: Intelligence (Weeks 7-9)
- [ ] AI chat advisor (OpenAI integration)
- [ ] Spending insights and recommendations
- [ ] Weekly financial digest
- [ ] Notification system (email + in-app)
- [ ] Couples/partner mode

### M4: Investing & Forecasting (Weeks 10-12)
- [ ] Investment portfolio tracking
- [ ] Market data integration (free API: Yahoo Finance, Alpha Vantage)
- [ ] Watchlists
- [ ] Financial forecasting engine
- [ ] Monte Carlo simulations
- [ ] Life event modeling

### M5: Advanced & Polish (Weeks 13-16)
- [ ] Estate planning document builder
- [ ] Tax summary dashboard
- [ ] Mobile responsive / PWA
- [ ] Performance optimization
- [ ] Security audit
- [ ] Beta testing

---

## Open Questions

1. **Monetization**: Free with premium tier? Or flat subscription like Origin ($99/year)?
2. **Mobile**: React Native apps or PWA-first?
3. **AI Provider**: OpenAI API (quality) vs local LLM (cost/privacy)?
4. **Hosting**: Self-hostable option or SaaS-only?
5. **Transaction Categorization**: Train custom ML model or use rules-based + LLM?
