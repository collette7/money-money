alter table public.accounts
  add column if not exists institution_domain text;
