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
    and t.date >= p_start_date
    and t.date < p_end_date
    and t.category_id is not null
    and c.type != 'transfer'
  group by t.category_id;
$$;

create or replace function public.get_net_worth_history(
  p_user_id uuid,
  p_months int default 12
)
returns table (snapshot_date date, total_assets numeric, total_liabilities numeric, net_worth numeric)
language sql
security definer
stable
as $$
  select date, total_assets, total_liabilities, net_worth
  from public.net_worth_snapshots
  where user_id = p_user_id
    and date >= (current_date - (p_months || ' months')::interval)::date
  order by date asc;
$$;

create or replace function public.detect_recurring_transactions(
  p_user_id uuid,
  p_min_occurrences int default 3
)
returns table (
  merchant_name text,
  avg_amount numeric,
  occurrences bigint,
  avg_interval_days numeric,
  last_date date,
  estimated_frequency text
)
language sql
security definer
stable
as $$
  with merchant_txns as (
    select
      t.merchant_name,
      t.amount,
      t.date,
      lag(t.date) over (partition by t.merchant_name order by t.date) as prev_date
    from public.transactions t
    join public.accounts a on a.id = t.account_id
    where a.user_id = p_user_id
      and t.merchant_name is not null
      and t.merchant_name != ''
      and t.amount < 0
      and t.date >= (current_date - interval '6 months')::date
  ),
  merchant_stats as (
    select
      merchant_name,
      round(avg(amount), 2) as avg_amount,
      count(*) as occurrences,
      round(avg(date - prev_date), 1) as avg_interval_days,
      max(date) as last_date
    from merchant_txns
    where prev_date is not null
    group by merchant_name
    having count(*) >= p_min_occurrences
  )
  select
    merchant_name,
    avg_amount,
    occurrences,
    avg_interval_days,
    last_date,
    case
      when avg_interval_days between 5 and 9 then 'weekly'
      when avg_interval_days between 12 and 17 then 'biweekly'
      when avg_interval_days between 25 and 35 then 'monthly'
      when avg_interval_days between 80 and 100 then 'quarterly'
      when avg_interval_days between 350 and 380 then 'yearly'
      else 'irregular'
    end as estimated_frequency
  from merchant_stats
  order by occurrences desc;
$$;
