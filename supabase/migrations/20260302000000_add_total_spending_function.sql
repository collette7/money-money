-- Add function to get total spending including uncategorized transactions
-- This complements get_category_spending by including ALL expense transactions

create or replace function public.get_total_spending(
  p_user_id uuid,
  p_start_date date,
  p_end_date date
)
returns numeric
language sql
security definer
stable
as $$
  select
    coalesce(sum(abs(t.amount)), 0) as total
  from public.transactions t
  join public.accounts a on a.id = t.account_id
  left join public.categories c on c.id = t.category_id
  where a.user_id = p_user_id
    and p_user_id = auth.uid()
    and t.date >= p_start_date
    and t.date < p_end_date
    and t.amount < 0  -- Only expenses
    and t.ignored = false
    and (t.status is null or t.status = 'cleared')
    -- Exclude transfers even if uncategorized
    and (c.type != 'transfer' or c.type is null);
$$;

-- Also add a function to get uncategorized spending separately
create or replace function public.get_uncategorized_spending(
  p_user_id uuid,  
  p_start_date date,
  p_end_date date
)
returns numeric
language sql
security definer
stable
as $$
  select
    coalesce(sum(abs(t.amount)), 0) as total
  from public.transactions t
  join public.accounts a on a.id = t.account_id
  where a.user_id = p_user_id
    and p_user_id = auth.uid()
    and t.date >= p_start_date
    and t.date < p_end_date
    and t.amount < 0  -- Only expenses
    and t.category_id is null
    and t.ignored = false
    and (t.status is null or t.status = 'cleared');
$$;