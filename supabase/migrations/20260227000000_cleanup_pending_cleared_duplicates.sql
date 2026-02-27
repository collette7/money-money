-- Cleanup: remove pending transactions that have a matching cleared counterpart.
--
-- Root cause: SimpleFIN can return both pending and cleared versions of the
-- same real-world transaction in a single API response (different simplefin_ids).
-- The sync pipeline's fuzzy dedup only checked incoming rows against existing
-- DB rows, not against each other within the same batch. This allowed both
-- versions to be inserted.
--
-- Match criteria: same account, same amount (exact), date within ±2 days,
-- one is pending and the other is cleared.
--
-- Keeps the cleared row. Uses 1:1 matching via DISTINCT ON to avoid false
-- positives when multiple legitimate same-amount transactions exist.

DELETE FROM public.transactions
WHERE id IN (
  SELECT p.id
  FROM public.transactions p
  JOIN (
    -- Each cleared row can "claim" at most one pending duplicate
    SELECT DISTINCT ON (c.id)
      c.id AS cleared_id,
      p.id AS pending_id
    FROM public.transactions p
    JOIN public.transactions c
      ON c.account_id = p.account_id
      AND c.amount = p.amount
      AND ABS(c.date - p.date) <= 2
      AND c.id != p.id
    WHERE p.status = 'pending'
      AND c.status = 'cleared'
    ORDER BY c.id, p.created_at DESC
  ) matches ON matches.pending_id = p.id
);
