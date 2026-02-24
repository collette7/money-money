-- One-time cleanup: remove SimpleFIN-synced duplicates where the same
-- real-world transaction was reported twice with different simplefin_ids
-- (same account, same amount, same description, date within ±2 days).
-- Keep the row with the earlier date (original posting).

DELETE FROM public.transactions
WHERE id IN (
  SELECT dup.id
  FROM public.transactions dup
  JOIN public.transactions keeper
    ON dup.account_id = keeper.account_id
    AND dup.amount = keeper.amount
    AND dup.description = keeper.description
    AND ABS(dup.date - keeper.date) BETWEEN 1 AND 2
    AND dup.id != keeper.id
  WHERE dup.simplefin_id IS NOT NULL
    AND keeper.simplefin_id IS NOT NULL
    -- Keep the earlier date; on tie, keep the lower id for determinism
    AND (dup.date > keeper.date OR (dup.date = keeper.date AND dup.id > keeper.id))
);
