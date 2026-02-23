alter table public.accounts
  add column if not exists simplefin_access_url text,
  add column if not exists simplefin_account_id text;

alter table public.transactions
  add column if not exists simplefin_id text;

create unique index if not exists idx_transactions_simplefin_id
  on public.transactions (account_id, simplefin_id)
  where simplefin_id is not null;
