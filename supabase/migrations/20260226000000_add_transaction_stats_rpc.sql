-- RPC: get_transaction_stats
-- Returns aggregate stats for the transactions page stats bar.
-- All aggregation happens in SQL to avoid Supabase's default 1000-row limit.
-- Excludes: ignored transactions, non-cleared status, transfer-category transactions.

create or replace function public.get_transaction_stats(
  p_user_id uuid,
  p_start_date date,
  p_end_date date default null
)
returns table (
  total_count bigint,
  earliest_date date,
  latest_date date,
  total_income numeric,
  total_expenses numeric
)
language sql
security definer
stable
as $$
  select
    count(*)::bigint as total_count,
    min(t.date) as earliest_date,
    max(t.date) as latest_date,
    coalesce(sum(t.amount) filter (
      where c.type = 'income'
    ), 0) as total_income,
    coalesce(abs(sum(t.amount) filter (
      where c.type is distinct from 'income'
        and c.type is distinct from 'transfer'
    )), 0) as total_expenses
  from public.transactions t
  join public.accounts a on a.id = t.account_id
  left join public.categories c on c.id = t.category_id
  where a.user_id = p_user_id
    and p_user_id = auth.uid()
    and t.date >= p_start_date
    and (p_end_date is null or t.date < p_end_date)
    and t.ignored = false
    and t.status = 'cleared';
$$;
