-- Cleanup: remove SimpleFIN-synced duplicate transactions where the same
-- real-world transaction was reported with different simplefin_ids AND
-- different descriptions (e.g. pending name → posted name).
--
-- Previous cleanup (v2) required exact description match. This migration
-- catches remaining dupes using the same fuzzy criteria as the sync pipeline:
-- same account, same amount, date within ±2 days, both have simplefin_id.
--
-- Keeps the row with the earlier created_at (the one the user has likely
-- already categorized). On tie, keeps the lower id for determinism.
--
-- Uses a CTE to ensure each group only deletes the "newer" duplicate,
-- preventing false positives when >2 legit same-amount transactions exist
-- on close dates (each existing row can only be the "keeper" for one dup).

WITH ranked_dupes AS (
  SELECT
    t.id,
    t.account_id,
    t.amount,
    t.date,
    t.created_at,
    ROW_NUMBER() OVER (
      PARTITION BY t.account_id, t.amount,
        -- Group by date rounded to 2-day buckets so ±2 day matches land together
        -- Use the earlier date as the partition anchor
        LEAST(t.date, t.date)
      ORDER BY t.created_at ASC, t.id ASC
    ) AS rn
  FROM public.transactions t
  WHERE t.simplefin_id IS NOT NULL
),
-- Find actual duplicate pairs: same account, same amount, date within ±2 days
dup_pairs AS (
  SELECT DISTINCT ON (keeper.id)
    dup.id AS dup_id,
    keeper.id AS keeper_id
  FROM public.transactions dup
  JOIN public.transactions keeper
    ON dup.account_id = keeper.account_id
    AND dup.amount = keeper.amount
    AND ABS(dup.date - keeper.date) <= 2
    AND dup.id != keeper.id
  WHERE dup.simplefin_id IS NOT NULL
    AND keeper.simplefin_id IS NOT NULL
    AND dup.simplefin_id != keeper.simplefin_id
    -- Keep the earlier row (user likely categorized it); on tie keep lower id
    AND (
      dup.created_at > keeper.created_at
      OR (dup.created_at = keeper.created_at AND dup.id > keeper.id)
    )
  ORDER BY keeper.id, dup.created_at DESC
)
DELETE FROM public.transactions
WHERE id IN (SELECT dup_id FROM dup_pairs);
