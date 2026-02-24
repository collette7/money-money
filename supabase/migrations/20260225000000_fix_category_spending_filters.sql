-- Fix get_category_spending: exclude ignored transactions and pending status
-- The secure RPC migration (20260222) accidentally dropped the ignored/status filters
-- that were added in phase1 (20260219).

create or replace function public.get_category_spending(
  p_user_id uuid,
  p_start_date date,
  p_end_date date
)
returns table (category_id uuid, total numeric)
language sql
security definer
stable
as $$
  select
    t.category_id,
    sum(t.amount) as total
  from public.transactions t
  join public.accounts a on a.id = t.account_id
  join public.categories c on c.id = t.category_id
  where a.user_id = p_user_id
    and p_user_id = auth.uid()
    and t.date >= p_start_date
    and t.date < p_end_date
    and t.category_id is not null
    and c.type != 'transfer'
    and t.ignored = false
    and (t.status is null or t.status = 'cleared')
  group by t.category_id;
$$;
