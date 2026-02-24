create table public.merchant_logo_cache (
  id uuid primary key default gen_random_uuid(),
  merchant_name text not null,           -- normalized merchant name
  domain text,                            -- resolved domain (null if no match)
  logo_url text,                          -- full Logo.dev URL that works (null if none)
  is_valid boolean not null default false, -- whether Logo.dev returned a valid logo
  checked_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Unique on normalized merchant name (global cache, not per-user)
create unique index idx_merchant_logo_cache_name on public.merchant_logo_cache(merchant_name);

-- No RLS needed - this is a global cache readable by all authenticated users
alter table public.merchant_logo_cache enable row level security;
create policy "merchant_logo_cache: authenticated users can read"
  on public.merchant_logo_cache for select
  using (auth.role() = 'authenticated');
create policy "merchant_logo_cache: authenticated users can insert"
  on public.merchant_logo_cache for insert
  with check (auth.role() = 'authenticated');
create policy "merchant_logo_cache: authenticated users can update"
  on public.merchant_logo_cache for update
  using (auth.role() = 'authenticated');
