-- ============================================================================
-- Portfolio Holdings Migration
-- ============================================================================
-- Drops the unused `investments` table and creates:
--   holdings        — market-priced + manual assets with position lifecycle
--   holding_lots    — individual purchase lots for average cost tracking
--   price_cache     — Finnhub quote cache (15-min TTL)
--   portfolio_snapshots — daily aggregate portfolio value for charting
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Drop unused investments table and its enum
-- --------------------------------------------------------------------------
drop policy if exists "investments: users can view own investments" on public.investments;
drop policy if exists "investments: users can create own investments" on public.investments;
drop policy if exists "investments: users can update own investments" on public.investments;
drop policy if exists "investments: users can delete own investments" on public.investments;
drop trigger if exists set_updated_at on public.investments;
drop table if exists public.investments cascade;
drop type if exists public.app_asset_type;

-- --------------------------------------------------------------------------
-- 2. New enum types
-- --------------------------------------------------------------------------
create type public.app_holding_type as enum (
  'stock', 'etf', 'crypto', 'option', 'mutual_fund',
  'real_estate', 'private_equity', 'vehicle', 'alternative', 'other'
);

-- --------------------------------------------------------------------------
-- 3. Holdings table
-- --------------------------------------------------------------------------
create table public.holdings (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references auth.users(id) on delete cascade,
  account_id               uuid references public.accounts(id) on delete set null,

  -- Classification
  asset_type               public.app_holding_type not null,
  is_manual                boolean not null default false,

  -- Identity
  symbol                   text,            -- ticker/crypto symbol (market assets); null for manual
  name                     text not null,    -- display name

  -- Market-priced fields
  shares                   decimal(18,8),    -- fractional shares supported

  -- Cost basis (average cost method — recalculated from lots)
  avg_cost                 decimal(12,4),    -- average cost per share
  total_cost               decimal(12,2),    -- total invested

  -- Manual asset fields
  purchase_value           decimal(12,2),    -- original purchase price
  current_value            decimal(12,2),    -- user-set current value
  current_value_updated_at timestamptz,

  -- Position lifecycle
  purchase_date            date not null,
  sale_date                date,             -- null = open position
  sale_price               decimal(12,4),    -- per share (market) or total (manual)
  sale_value               decimal(12,2),    -- total proceeds

  -- Metadata
  notes                    text,
  source                   text not null default 'manual',  -- 'manual' | 'csv'
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

comment on table public.holdings is 'Investment holdings — market-priced assets (Finnhub) and manually valued assets';

-- Indexes
create index idx_holdings_user_id on public.holdings(user_id);
create index idx_holdings_account_id on public.holdings(account_id) where account_id is not null;
create index idx_holdings_symbol on public.holdings(symbol) where symbol is not null;
create index idx_holdings_open on public.holdings(user_id) where sale_date is null;

-- Updated_at trigger
create trigger set_updated_at before update on public.holdings
  for each row execute function public.update_updated_at();

-- --------------------------------------------------------------------------
-- 4. Holding lots table
-- --------------------------------------------------------------------------
create table public.holding_lots (
  id               uuid primary key default gen_random_uuid(),
  holding_id       uuid not null references public.holdings(id) on delete cascade,
  shares           decimal(18,8) not null,
  price_per_share  decimal(12,4) not null,
  purchase_date    date not null,
  notes            text,
  created_at       timestamptz not null default now()
);

comment on table public.holding_lots is 'Individual purchase lots for holdings — avg cost recalculated from lots';

create index idx_holding_lots_holding_id on public.holding_lots(holding_id);

-- --------------------------------------------------------------------------
-- 5. Price cache table
-- --------------------------------------------------------------------------
create table public.price_cache (
  symbol      text primary key,
  price       decimal(12,4) not null,
  prev_close  decimal(12,4),
  change_pct  decimal(8,4),
  currency    text not null default 'USD',
  fetched_at  timestamptz not null
);

comment on table public.price_cache is 'Finnhub quote cache with 15-minute TTL';

-- --------------------------------------------------------------------------
-- 6. Portfolio snapshots table (daily aggregate value)
-- --------------------------------------------------------------------------
create table public.portfolio_snapshots (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null,
  total_value decimal(12,2) not null default 0,
  total_cost  decimal(12,2) not null default 0,
  created_at  timestamptz not null default now(),

  constraint portfolio_snapshots_user_date_unique unique (user_id, date)
);

comment on table public.portfolio_snapshots is 'Daily aggregate portfolio value for charting';

create index idx_portfolio_snapshots_user_date on public.portfolio_snapshots(user_id, date);

-- --------------------------------------------------------------------------
-- 7. RLS policies
-- --------------------------------------------------------------------------

-- holdings: direct user_id check (no join needed)
alter table public.holdings enable row level security;

create policy "holdings: users can view own holdings"
  on public.holdings for select
  using (user_id = auth.uid());

create policy "holdings: users can create own holdings"
  on public.holdings for insert
  with check (user_id = auth.uid());

create policy "holdings: users can update own holdings"
  on public.holdings for update
  using (user_id = auth.uid());

create policy "holdings: users can delete own holdings"
  on public.holdings for delete
  using (user_id = auth.uid());

-- holding_lots: join through holdings.user_id
alter table public.holding_lots enable row level security;

create policy "holding_lots: users can view own lots"
  on public.holding_lots for select
  using (
    exists (
      select 1 from public.holdings
      where holdings.id = holding_lots.holding_id
        and holdings.user_id = auth.uid()
    )
  );

create policy "holding_lots: users can create own lots"
  on public.holding_lots for insert
  with check (
    exists (
      select 1 from public.holdings
      where holdings.id = holding_lots.holding_id
        and holdings.user_id = auth.uid()
    )
  );

create policy "holding_lots: users can update own lots"
  on public.holding_lots for update
  using (
    exists (
      select 1 from public.holdings
      where holdings.id = holding_lots.holding_id
        and holdings.user_id = auth.uid()
    )
  );

create policy "holding_lots: users can delete own lots"
  on public.holding_lots for delete
  using (
    exists (
      select 1 from public.holdings
      where holdings.id = holding_lots.holding_id
        and holdings.user_id = auth.uid()
    )
  );

-- price_cache: public read, service role write (no user_id column)
alter table public.price_cache enable row level security;

create policy "price_cache: anyone can read"
  on public.price_cache for select
  using (true);

create policy "price_cache: authenticated users can upsert"
  on public.price_cache for insert
  with check (auth.uid() is not null);

create policy "price_cache: authenticated users can update"
  on public.price_cache for update
  using (auth.uid() is not null);

-- portfolio_snapshots: direct user_id check
alter table public.portfolio_snapshots enable row level security;

create policy "portfolio_snapshots: users can view own snapshots"
  on public.portfolio_snapshots for select
  using (user_id = auth.uid());

create policy "portfolio_snapshots: users can create own snapshots"
  on public.portfolio_snapshots for insert
  with check (user_id = auth.uid());

create policy "portfolio_snapshots: users can update own snapshots"
  on public.portfolio_snapshots for update
  using (user_id = auth.uid());
