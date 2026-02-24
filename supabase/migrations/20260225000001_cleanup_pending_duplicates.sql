-- Cleanup: delete pending transactions that have a matching cleared counterpart
-- Pending txns from SimpleFIN that were also imported as cleared from CSV.
-- Match criteria: same account, same amount, date within ±2 days.

delete from public.transactions
where id in (
  select p.id
  from public.transactions p
  join public.transactions c
    on c.account_id = p.account_id
    and c.amount = p.amount
    and c.id != p.id
    and c.status is distinct from 'pending'
    and abs(c.date - p.date) <= 2
  where p.status = 'pending'
);
