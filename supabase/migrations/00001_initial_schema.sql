-- ============================================================================
-- Origin Financial Clone — Initial Schema Migration
-- ============================================================================
-- Supabase / PostgreSQL migration for a personal finance application.
-- Creates all tables, enum types, indexes, RLS policies, seed data,
-- and a trigger to auto-create profile rows on user signup.
--
-- IMPORTANT: This migration assumes auth.users already exists (provided by
-- Supabase). Do NOT create auth.users here.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 0. Extensions
-- --------------------------------------------------------------------------
create extension if not exists "pgcrypto"; -- for gen_random_uuid()

-- --------------------------------------------------------------------------
-- 1. Enum Types (prefixed with app_)
-- --------------------------------------------------------------------------

-- Partner invite status
create type public.app_partner_status as enum ('pending', 'accepted', 'rejected');

-- Financial account types
create type public.app_account_type as enum ('checking', 'savings', 'credit', 'investment', 'loan');

-- How an account is synced
create type public.app_sync_method as enum ('simplefin', 'manual');

-- Category / transaction direction
create type public.app_category_type as enum ('income', 'expense', 'transfer');

-- Category-rule match fields
create type public.app_rule_field as enum ('merchant_name', 'description', 'amount', 'account_id');

-- Category-rule operators
create type public.app_rule_operator as enum ('contains', 'equals', 'starts_with', 'greater_than', 'less_than', 'between');

-- How a transaction was categorized
create type public.app_categorized_by as enum ('rule', 'learned', 'default', 'manual');

-- Split direction
create type public.app_split_direction as enum ('owed_to_me', 'i_owe');

-- Split calculation type
create type public.app_split_type as enum ('equal', 'custom', 'percentage');

-- Settlement method
create type public.app_settled_method as enum ('cash', 'venmo', 'zelle', 'other');

-- Savings-goal contribution frequency
create type public.app_contribution_frequency as enum ('weekly', 'biweekly', 'monthly', 'custom');

-- Savings-goal status
create type public.app_goal_status as enum ('active', 'paused', 'completed');

-- Goal-contribution type
create type public.app_contribution_type as enum ('scheduled', 'manual', 'extra');

-- Subscription billing frequency
create type public.app_subscription_frequency as enum ('monthly', 'yearly', 'weekly');

-- Investment asset class
create type public.app_asset_type as enum ('stock', 'etf', 'crypto', 'bond', 'mutual_fund');

-- Estate-planning document type
create type public.app_document_type as enum ('will', 'trust', 'poa', 'healthcare_directive');

-- Document lifecycle status
create type public.app_document_status as enum ('draft', 'complete');


-- ============================================================================
-- 2. Tables
-- ============================================================================

-- --------------------------------------------------------------------------
-- profiles — extends Supabase auth.users with app-specific fields
-- --------------------------------------------------------------------------
comment on schema public is 'Application schema for Origin Financial Clone';

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url  text,
  mfa_enabled boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.profiles is 'User profile extending Supabase auth.users';

-- --------------------------------------------------------------------------
-- partners — couples / partner linking
-- --------------------------------------------------------------------------
create table public.partners (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  partner_user_id uuid not null references auth.users(id) on delete cascade,
  status          public.app_partner_status not null default 'pending',
  created_at      timestamptz not null default now(),
  constraint partners_no_self check (user_id <> partner_user_id)
);
comment on table public.partners is 'Partner / couples linking between two users';

-- --------------------------------------------------------------------------
-- accounts — bank & investment accounts
-- --------------------------------------------------------------------------
create table public.accounts (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  institution_name  text not null,
  account_type      public.app_account_type not null,
  name              text not null,
  balance           decimal(12,2) not null default 0,
  currency          text not null default 'USD',
  last_synced       timestamptz,
  simplefin_token   text,  -- encrypted at application layer
  sync_method       public.app_sync_method not null default 'manual',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
comment on table public.accounts is 'Financial accounts (bank, credit, investment, loan)';

-- --------------------------------------------------------------------------
-- categories — income / expense / transfer categories
-- --------------------------------------------------------------------------
create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade, -- NULL = system default
  name       text not null,
  icon       text,
  color      text,
  parent_id  uuid references public.categories(id) on delete set null,
  type       public.app_category_type not null default 'expense',
  created_at timestamptz not null default now()
);
comment on table public.categories is 'Transaction categories; user_id NULL = system default';

-- --------------------------------------------------------------------------
-- category_rules — user-created auto-categorization rules
-- --------------------------------------------------------------------------
create table public.category_rules (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  priority    int not null default 0,
  field       public.app_rule_field not null,
  operator    public.app_rule_operator not null,
  value       text not null,
  value_end   text,  -- used for "between" operator
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);
comment on table public.category_rules is 'User-defined rules for automatic transaction categorization';

-- --------------------------------------------------------------------------
-- merchant_mappings — ML-learned merchant-to-category patterns
-- --------------------------------------------------------------------------
create table public.merchant_mappings (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  merchant_pattern text not null,
  category_id      uuid not null references public.categories(id) on delete cascade,
  confidence       decimal(3,2) not null default 0.00,
  times_confirmed  int not null default 0,
  last_updated     timestamptz not null default now()
);
comment on table public.merchant_mappings is 'ML-learned merchant-to-category mapping patterns';

-- --------------------------------------------------------------------------
-- transactions — the core transaction ledger
-- --------------------------------------------------------------------------
create table public.transactions (
  id                    uuid primary key default gen_random_uuid(),
  account_id            uuid not null references public.accounts(id) on delete cascade,
  date                  date not null,
  amount                decimal(12,2) not null,
  description           text not null,
  category_id           uuid references public.categories(id) on delete set null,
  tags                  text[] default '{}',
  is_recurring          boolean not null default false,
  merchant_name         text,
  original_description  text,
  notes                 text,
  is_split              boolean not null default false,
  user_share_amount     decimal(12,2),
  categorized_by        public.app_categorized_by,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
comment on table public.transactions is 'Financial transactions linked to accounts';

-- --------------------------------------------------------------------------
-- persons — split contacts (no Supabase account required)
-- --------------------------------------------------------------------------
create table public.persons (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  email      text,
  phone      text,
  created_at timestamptz not null default now()
);
comment on table public.persons is 'Contacts for transaction splitting (no account required)';

-- --------------------------------------------------------------------------
-- transaction_splits — splitting a transaction among people
-- --------------------------------------------------------------------------
create table public.transaction_splits (
  id              uuid primary key default gen_random_uuid(),
  transaction_id  uuid not null references public.transactions(id) on delete cascade,
  person_id       uuid not null references public.persons(id) on delete cascade,
  amount          decimal(12,2) not null,
  split_type      public.app_split_type not null default 'equal',
  direction       public.app_split_direction not null,
  is_settled      boolean not null default false,
  settled_date    date,
  settled_method  public.app_settled_method,
  notes           text,
  created_at      timestamptz not null default now()
);
comment on table public.transaction_splits is 'Individual split portions of a transaction';

-- --------------------------------------------------------------------------
-- budgets — monthly budget headers
-- --------------------------------------------------------------------------
create table public.budgets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  month      int not null check (month between 1 and 12),
  year       int not null check (year between 2000 and 2100),
  created_at timestamptz not null default now(),
  constraint budgets_user_month_year_uq unique (user_id, month, year)
);
comment on table public.budgets is 'Monthly budget container per user';

-- --------------------------------------------------------------------------
-- budget_items — line items in a monthly budget
-- --------------------------------------------------------------------------
create table public.budget_items (
  id            uuid primary key default gen_random_uuid(),
  budget_id     uuid not null references public.budgets(id) on delete cascade,
  category_id   uuid not null references public.categories(id) on delete cascade,
  limit_amount  decimal(12,2) not null,
  spent_amount  decimal(12,2) not null default 0,
  created_at    timestamptz not null default now()
);
comment on table public.budget_items is 'Individual category line items within a monthly budget';

-- --------------------------------------------------------------------------
-- savings_goals — user savings targets
-- --------------------------------------------------------------------------
create table public.savings_goals (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references auth.users(id) on delete cascade,
  name                    text not null,
  icon                    text,
  color                   text,
  target_amount           decimal(12,2) not null,
  current_amount          decimal(12,2) not null default 0,
  deadline                date,
  contribution_amount     decimal(12,2) not null default 0,
  contribution_frequency  public.app_contribution_frequency not null default 'monthly',
  custom_interval_days    int,
  linked_account_id       uuid references public.accounts(id) on delete set null,
  priority                int not null default 0,
  status                  public.app_goal_status not null default 'active',
  created_at              timestamptz not null default now(),
  completed_at            timestamptz
);
comment on table public.savings_goals is 'User savings goals with contribution schedules';

-- --------------------------------------------------------------------------
-- goal_contributions — individual contributions toward a goal
-- --------------------------------------------------------------------------
create table public.goal_contributions (
  id         uuid primary key default gen_random_uuid(),
  goal_id    uuid not null references public.savings_goals(id) on delete cascade,
  amount     decimal(12,2) not null,
  date       date not null,
  type       public.app_contribution_type not null default 'manual',
  notes      text,
  created_at timestamptz not null default now()
);
comment on table public.goal_contributions is 'Individual contributions toward a savings goal';

-- --------------------------------------------------------------------------
-- subscriptions — recurring subscription tracker
-- --------------------------------------------------------------------------
create table public.subscriptions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  name              text not null,
  amount            decimal(12,2) not null,
  frequency         public.app_subscription_frequency not null default 'monthly',
  next_charge_date  date not null,
  category_id       uuid references public.categories(id) on delete set null,
  cancel_url        text,
  created_at        timestamptz not null default now()
);
comment on table public.subscriptions is 'Tracked recurring subscriptions';

-- --------------------------------------------------------------------------
-- investments — individual holdings inside an investment account
-- --------------------------------------------------------------------------
create table public.investments (
  id            uuid primary key default gen_random_uuid(),
  account_id    uuid not null references public.accounts(id) on delete cascade,
  symbol        text not null,
  name          text not null,
  shares        decimal(12,6) not null default 0,
  cost_basis    decimal(12,2) not null default 0,
  current_price decimal(12,2) not null default 0,
  asset_type    public.app_asset_type not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
comment on table public.investments is 'Individual investment holdings within an account';

-- --------------------------------------------------------------------------
-- net_worth_snapshots — periodic net worth tracking
-- --------------------------------------------------------------------------
create table public.net_worth_snapshots (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  date                date not null,
  total_assets        decimal(12,2) not null default 0,
  total_liabilities   decimal(12,2) not null default 0,
  net_worth           decimal(12,2) not null default 0,
  created_at          timestamptz not null default now()
);
comment on table public.net_worth_snapshots is 'Point-in-time net worth snapshots for trend tracking';

-- --------------------------------------------------------------------------
-- forecasts — financial forecasts / scenarios
-- --------------------------------------------------------------------------
create table public.forecasts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  assumptions jsonb not null default '{}',
  results     jsonb not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.forecasts is 'Financial forecast scenarios with assumptions and results';

-- --------------------------------------------------------------------------
-- ai_conversations — chat history with the AI assistant
-- --------------------------------------------------------------------------
create table public.ai_conversations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  messages   jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.ai_conversations is 'Chat history with the AI financial assistant';

-- --------------------------------------------------------------------------
-- documents — estate planning documents
-- --------------------------------------------------------------------------
create table public.documents (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  type       public.app_document_type not null,
  content    text not null default '',
  status     public.app_document_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.documents is 'Estate planning documents (wills, trusts, POA, etc.)';


-- ============================================================================
-- 3. Indexes
-- ============================================================================

-- user_id indexes (most tables)
create index idx_partners_user_id           on public.partners(user_id);
create index idx_partners_partner_user_id   on public.partners(partner_user_id);
create index idx_accounts_user_id           on public.accounts(user_id);
create index idx_categories_user_id         on public.categories(user_id);
create index idx_category_rules_user_id     on public.category_rules(user_id);
create index idx_merchant_mappings_user_id  on public.merchant_mappings(user_id);
create index idx_persons_user_id            on public.persons(user_id);
create index idx_budgets_user_id            on public.budgets(user_id);
create index idx_savings_goals_user_id      on public.savings_goals(user_id);
create index idx_subscriptions_user_id      on public.subscriptions(user_id);
create index idx_net_worth_snapshots_user_id on public.net_worth_snapshots(user_id);
create index idx_forecasts_user_id          on public.forecasts(user_id);
create index idx_ai_conversations_user_id   on public.ai_conversations(user_id);
create index idx_documents_user_id          on public.documents(user_id);

-- account_id indexes
create index idx_transactions_account_id    on public.transactions(account_id);
create index idx_investments_account_id     on public.investments(account_id);

-- category_id indexes
create index idx_transactions_category_id   on public.transactions(category_id);
create index idx_category_rules_category_id on public.category_rules(category_id);
create index idx_merchant_mappings_category_id on public.merchant_mappings(category_id);
create index idx_budget_items_category_id   on public.budget_items(category_id);
create index idx_subscriptions_category_id  on public.subscriptions(category_id);

-- transaction date & merchant
create index idx_transactions_date          on public.transactions(date);
create index idx_transactions_merchant_name on public.transactions(merchant_name);

-- budget_items → budget
create index idx_budget_items_budget_id     on public.budget_items(budget_id);

-- goal_contributions → goal
create index idx_goal_contributions_goal_id on public.goal_contributions(goal_id);

-- transaction_splits → transaction & person
create index idx_transaction_splits_transaction_id on public.transaction_splits(transaction_id);
create index idx_transaction_splits_person_id      on public.transaction_splits(person_id);

-- net worth date for time-series queries
create index idx_net_worth_snapshots_date   on public.net_worth_snapshots(date);

-- categories parent lookup
create index idx_categories_parent_id       on public.categories(parent_id);


-- ============================================================================
-- 4. Row Level Security (RLS)
-- ============================================================================

-- Enable RLS on every table
alter table public.profiles            enable row level security;
alter table public.partners            enable row level security;
alter table public.accounts            enable row level security;
alter table public.categories          enable row level security;
alter table public.category_rules      enable row level security;
alter table public.merchant_mappings   enable row level security;
alter table public.transactions        enable row level security;
alter table public.persons             enable row level security;
alter table public.transaction_splits  enable row level security;
alter table public.budgets             enable row level security;
alter table public.budget_items        enable row level security;
alter table public.savings_goals       enable row level security;
alter table public.goal_contributions  enable row level security;
alter table public.subscriptions       enable row level security;
alter table public.investments         enable row level security;
alter table public.net_worth_snapshots enable row level security;
alter table public.forecasts           enable row level security;
alter table public.ai_conversations    enable row level security;
alter table public.documents           enable row level security;

-- -----------------------------------------------------------------------
-- Helper: profiles (id = auth.uid)
-- -----------------------------------------------------------------------
create policy "profiles: users can view own profile"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles: users can update own profile"
  on public.profiles for update
  using (id = auth.uid());

-- Insert handled by trigger; no direct user insert needed, but allow it
create policy "profiles: users can insert own profile"
  on public.profiles for insert
  with check (id = auth.uid());

create policy "profiles: users can delete own profile"
  on public.profiles for delete
  using (id = auth.uid());

-- -----------------------------------------------------------------------
-- partners (user_id or partner_user_id = auth.uid)
-- -----------------------------------------------------------------------
create policy "partners: users can view own partnerships"
  on public.partners for select
  using (user_id = auth.uid() or partner_user_id = auth.uid());

create policy "partners: users can create partnerships"
  on public.partners for insert
  with check (user_id = auth.uid());

create policy "partners: users can update own partnerships"
  on public.partners for update
  using (user_id = auth.uid() or partner_user_id = auth.uid());

create policy "partners: users can delete own partnerships"
  on public.partners for delete
  using (user_id = auth.uid());

-- -----------------------------------------------------------------------
-- accounts (user_id = auth.uid)
-- -----------------------------------------------------------------------
create policy "accounts: users can view own accounts"
  on public.accounts for select
  using (user_id = auth.uid());

create policy "accounts: users can create own accounts"
  on public.accounts for insert
  with check (user_id = auth.uid());

create policy "accounts: users can update own accounts"
  on public.accounts for update
  using (user_id = auth.uid());

create policy "accounts: users can delete own accounts"
  on public.accounts for delete
  using (user_id = auth.uid());

-- -----------------------------------------------------------------------
-- categories (user_id = auth.uid OR system defaults where user_id IS NULL)
-- -----------------------------------------------------------------------
create policy "categories: users can view own and system categories"
  on public.categories for select
  using (user_id = auth.uid() or user_id is null);

create policy "categories: users can create own categories"
  on public.categories for insert
  with check (user_id = auth.uid());

create policy "categories: users can update own categories"
  on public.categories for update
  using (user_id = auth.uid());

create policy "categories: users can delete own categories"
  on public.categories for delete
  using (user_id = auth.uid());

-- -----------------------------------------------------------------------
-- category_rules (user_id = auth.uid)
-- -----------------------------------------------------------------------
create policy "category_rules: users can view own rules"
  on public.category_rules for select
  using (user_id = auth.uid());

create policy "category_rules: users can create own rules"
  on public.category_rules for insert
  with check (user_id = auth.uid());

create policy "category_rules: users can update own rules"
  on public.category_rules for update
  using (user_id = auth.uid());

create policy "category_rules: users can delete own rules"
  on public.category_rules for delete
  using (user_id = auth.uid());

-- -----------------------------------------------------------------------
-- merchant_mappings (user_id = auth.uid)
-- -----------------------------------------------------------------------
create policy "merchant_mappings: users can view own mappings"
  on public.merchant_mappings for select
  using (user_id = auth.uid());

create policy "merchant_mappings: users can create own mappings"
  on public.merchant_mappings for insert
  with check (user_id = auth.uid());

create policy "merchant_mappings: users can update own mappings"
  on public.merchant_mappings for update
  using (user_id = auth.uid());

create policy "merchant_mappings: users can delete own mappings"
  on public.merchant_mappings for delete
  using (user_id = auth.uid());

-- -----------------------------------------------------------------------
-- transactions (join through accounts.user_id)
-- -----------------------------------------------------------------------
create policy "transactions: users can view own transactions"
  on public.transactions for select
  using (
    exists (
      select 1 from public.accounts
      where accounts.id = transactions.account_id
        and accounts.user_id = auth.uid()
    )
  );

create policy "transactions: users can create own transactions"
  on public.transactions for insert
  with check (
    exists (
      select 1 from public.accounts
      where accounts.id = transactions.account_id
        and accounts.user_id = auth.uid()
    )
  );

create policy "transactions: users can update own transactions"
  on public.transactions for update
  using (
    exists (
      select 1 from public.accounts
      where accounts.id = transactions.account_id
        and accounts.user_id = auth.uid()
    )
  );

create policy "transactions: users can delete own transactions"
  on public.transactions for delete
  using (
    exists (
      select 1 from public.accounts
      where accounts.id = transactions.account_id
        and accounts.user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------
-- persons (user_id = auth.uid)
-- -----------------------------------------------------------------------
create policy "persons: users can view own contacts"
  on public.persons for select
  using (user_id = auth.uid());

create policy "persons: users can create own contacts"
  on public.persons for insert
  with check (user_id = auth.uid());

create policy "persons: users can update own contacts"
  on public.persons for update
  using (user_id = auth.uid());

create policy "persons: users can delete own contacts"
  on public.persons for delete
  using (user_id = auth.uid());

-- -----------------------------------------------------------------------
-- transaction_splits (join through transaction → account → user)
-- -----------------------------------------------------------------------
create policy "transaction_splits: users can view own splits"
  on public.transaction_splits for select
  using (
    exists (
      select 1 from public.transactions t
      join public.accounts a on a.id = t.account_id
      where t.id = transaction_splits.transaction_id
        and a.user_id = auth.uid()
    )
  );

create policy "transaction_splits: users can create own splits"
  on public.transaction_splits for insert
  with check (
    exists (
      select 1 from public.transactions t
      join public.accounts a on a.id = t.account_id
      where t.id = transaction_splits.transaction_id
        and a.user_id = auth.uid()
    )
  );

create policy "transaction_splits: users can update own splits"
  on public.transaction_splits for update
  using (
    exists (
      select 1 from public.transactions t
      join public.accounts a on a.id = t.account_id
      where t.id = transaction_splits.transaction_id
        and a.user_id = auth.uid()
    )
  );

create policy "transaction_splits: users can delete own splits"
  on public.transaction_splits for delete
  using (
    exists (
      select 1 from public.transactions t
      join public.accounts a on a.id = t.account_id
      where t.id = transaction_splits.transaction_id
        and a.user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------
-- budgets (user_id = auth.uid)
-- -----------------------------------------------------------------------
create policy "budgets: users can view own budgets"
  on public.budgets for select
  using (user_id = auth.uid());

create policy "budgets: users can create own budgets"
  on public.budgets for insert
  with check (user_id = auth.uid());

create policy "budgets: users can update own budgets"
  on public.budgets for update
  using (user_id = auth.uid());

create policy "budgets: users can delete own budgets"
  on public.budgets for delete
  using (user_id = auth.uid());

-- -----------------------------------------------------------------------
-- budget_items (join through budgets.user_id)
-- -----------------------------------------------------------------------
create policy "budget_items: users can view own budget items"
  on public.budget_items for select
  using (
    exists (
      select 1 from public.budgets
      where budgets.id = budget_items.budget_id
        and budgets.user_id = auth.uid()
    )
  );

create policy "budget_items: users can create own budget items"
  on public.budget_items for insert
  with check (
    exists (
      select 1 from public.budgets
      where budgets.id = budget_items.budget_id
        and budgets.user_id = auth.uid()
    )
  );

create policy "budget_items: users can update own budget items"
  on public.budget_items for update
  using (
    exists (
      select 1 from public.budgets
      where budgets.id = budget_items.budget_id
        and budgets.user_id = auth.uid()
    )
  );

create policy "budget_items: users can delete own budget items"
  on public.budget_items for delete
  using (
    exists (
      select 1 from public.budgets
      where budgets.id = budget_items.budget_id
        and budgets.user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------
-- savings_goals (user_id = auth.uid)
-- -----------------------------------------------------------------------
create policy "savings_goals: users can view own goals"
  on public.savings_goals for select
  using (user_id = auth.uid());

create policy "savings_goals: users can create own goals"
  on public.savings_goals for insert
  with check (user_id = auth.uid());

create policy "savings_goals: users can update own goals"
  on public.savings_goals for update
  using (user_id = auth.uid());

create policy "savings_goals: users can delete own goals"
  on public.savings_goals for delete
  using (user_id = auth.uid());

-- -----------------------------------------------------------------------
-- goal_contributions (join through savings_goals.user_id)
-- -----------------------------------------------------------------------
create policy "goal_contributions: users can view own contributions"
  on public.goal_contributions for select
  using (
    exists (
      select 1 from public.savings_goals
      where savings_goals.id = goal_contributions.goal_id
        and savings_goals.user_id = auth.uid()
    )
  );

create policy "goal_contributions: users can create own contributions"
  on public.goal_contributions for insert
  with check (
    exists (
      select 1 from public.savings_goals
      where savings_goals.id = goal_contributions.goal_id
        and savings_goals.user_id = auth.uid()
    )
  );

create policy "goal_contributions: users can update own contributions"
  on public.goal_contributions for update
  using (
    exists (
      select 1 from public.savings_goals
      where savings_goals.id = goal_contributions.goal_id
        and savings_goals.user_id = auth.uid()
    )
  );

create policy "goal_contributions: users can delete own contributions"
  on public.goal_contributions for delete
  using (
    exists (
      select 1 from public.savings_goals
      where savings_goals.id = goal_contributions.goal_id
        and savings_goals.user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------
-- subscriptions (user_id = auth.uid)
-- -----------------------------------------------------------------------
create policy "subscriptions: users can view own subscriptions"
  on public.subscriptions for select
  using (user_id = auth.uid());

create policy "subscriptions: users can create own subscriptions"
  on public.subscriptions for insert
  with check (user_id = auth.uid());

create policy "subscriptions: users can update own subscriptions"
  on public.subscriptions for update
  using (user_id = auth.uid());

create policy "subscriptions: users can delete own subscriptions"
  on public.subscriptions for delete
  using (user_id = auth.uid());

-- -----------------------------------------------------------------------
-- investments (join through accounts.user_id)
-- -----------------------------------------------------------------------
create policy "investments: users can view own investments"
  on public.investments for select
  using (
    exists (
      select 1 from public.accounts
      where accounts.id = investments.account_id
        and accounts.user_id = auth.uid()
    )
  );

create policy "investments: users can create own investments"
  on public.investments for insert
  with check (
    exists (
      select 1 from public.accounts
      where accounts.id = investments.account_id
        and accounts.user_id = auth.uid()
    )
  );

create policy "investments: users can update own investments"
  on public.investments for update
  using (
    exists (
      select 1 from public.accounts
      where accounts.id = investments.account_id
        and accounts.user_id = auth.uid()
    )
  );

create policy "investments: users can delete own investments"
  on public.investments for delete
  using (
    exists (
      select 1 from public.accounts
      where accounts.id = investments.account_id
        and accounts.user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------
-- net_worth_snapshots (user_id = auth.uid)
-- -----------------------------------------------------------------------
create policy "net_worth_snapshots: users can view own snapshots"
  on public.net_worth_snapshots for select
  using (user_id = auth.uid());

create policy "net_worth_snapshots: users can create own snapshots"
  on public.net_worth_snapshots for insert
  with check (user_id = auth.uid());

create policy "net_worth_snapshots: users can update own snapshots"
  on public.net_worth_snapshots for update
  using (user_id = auth.uid());

create policy "net_worth_snapshots: users can delete own snapshots"
  on public.net_worth_snapshots for delete
  using (user_id = auth.uid());

-- -----------------------------------------------------------------------
-- forecasts (user_id = auth.uid)
-- -----------------------------------------------------------------------
create policy "forecasts: users can view own forecasts"
  on public.forecasts for select
  using (user_id = auth.uid());

create policy "forecasts: users can create own forecasts"
  on public.forecasts for insert
  with check (user_id = auth.uid());

create policy "forecasts: users can update own forecasts"
  on public.forecasts for update
  using (user_id = auth.uid());

create policy "forecasts: users can delete own forecasts"
  on public.forecasts for delete
  using (user_id = auth.uid());

-- -----------------------------------------------------------------------
-- ai_conversations (user_id = auth.uid)
-- -----------------------------------------------------------------------
create policy "ai_conversations: users can view own conversations"
  on public.ai_conversations for select
  using (user_id = auth.uid());

create policy "ai_conversations: users can create own conversations"
  on public.ai_conversations for insert
  with check (user_id = auth.uid());

create policy "ai_conversations: users can update own conversations"
  on public.ai_conversations for update
  using (user_id = auth.uid());

create policy "ai_conversations: users can delete own conversations"
  on public.ai_conversations for delete
  using (user_id = auth.uid());

-- -----------------------------------------------------------------------
-- documents (user_id = auth.uid)
-- -----------------------------------------------------------------------
create policy "documents: users can view own documents"
  on public.documents for select
  using (user_id = auth.uid());

create policy "documents: users can create own documents"
  on public.documents for insert
  with check (user_id = auth.uid());

create policy "documents: users can update own documents"
  on public.documents for update
  using (user_id = auth.uid());

create policy "documents: users can delete own documents"
  on public.documents for delete
  using (user_id = auth.uid());


-- ============================================================================
-- 5. Trigger: Auto-create profile on auth.users INSERT
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, created_at, updated_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.email),
    now(),
    now()
  );
  return new;
end;
$$;

comment on function public.handle_new_user() is 'Trigger function: auto-creates a profiles row when a new auth.users row is inserted';

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();


-- ============================================================================
-- 6. updated_at auto-update trigger
-- ============================================================================

create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.update_updated_at() is 'Generic trigger function: sets updated_at to now() on row update';

-- Apply to every table that has an updated_at column
create trigger set_updated_at before update on public.profiles           for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.accounts           for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.transactions       for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.savings_goals      for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.investments        for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.forecasts          for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.ai_conversations   for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.documents          for each row execute function public.update_updated_at();


-- ============================================================================
-- 7. Seed Data — Default Categories
-- ============================================================================
-- System-wide defaults have user_id = NULL so they are visible to all users
-- via the RLS policy that allows selecting categories where user_id IS NULL.

insert into public.categories (user_id, name, icon, color, type) values
  -- Expense categories
  (null, 'Groceries',         '🛒', '#4CAF50', 'expense'),
  (null, 'Dining Out',        '🍽️', '#FF9800', 'expense'),
  (null, 'Transportation',    '🚗', '#2196F3', 'expense'),
  (null, 'Entertainment',     '🎬', '#9C27B0', 'expense'),
  (null, 'Shopping',          '🛍️', '#E91E63', 'expense'),
  (null, 'Utilities',         '💡', '#607D8B', 'expense'),
  (null, 'Health & Fitness',  '💪', '#00BCD4', 'expense'),
  (null, 'Education',         '📚', '#3F51B5', 'expense'),
  (null, 'Travel',            '✈️', '#FF5722', 'expense'),
  (null, 'Subscriptions',     '🔄', '#795548', 'expense'),
  (null, 'Gas & Fuel',        '⛽', '#FFC107', 'expense'),
  (null, 'Insurance',         '🛡️', '#009688', 'expense'),
  (null, 'Rent/Mortgage',     '🏠', '#8BC34A', 'expense'),
  (null, 'Personal Care',     '💆', '#CE93D8', 'expense'),
  (null, 'Gifts & Donations', '🎁', '#F44336', 'expense'),
  (null, 'Investments',       '📈', '#1B5E20', 'expense'),
  (null, 'Other Expenses',    '📦', '#9E9E9E', 'expense'),
  -- Income categories
  (null, 'Salary/Income',     '💰', '#2E7D32', 'income'),
  (null, 'Other Income',      '💵', '#66BB6A', 'income'),
  -- Transfer category
  (null, 'Transfer',          '🔀', '#78909C', 'transfer');


-- ============================================================================
-- Done!
-- ============================================================================
