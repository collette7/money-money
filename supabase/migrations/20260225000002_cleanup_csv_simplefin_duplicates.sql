-- One-time cleanup: remove CSV-imported duplicates where a SimpleFIN-synced
-- counterpart exists (same account, same amount, date within ±2 days).
--
-- Pattern: CSV rows have simplefin_id IS NULL; SimpleFIN rows have simplefin_id set.
-- When both exist for the same real-world transaction, keep the SimpleFIN version
-- (richer metadata, ongoing sync).

DELETE FROM public.transactions
WHERE id IN (
  SELECT csv.id
  FROM public.transactions csv
  JOIN public.transactions sf
    ON csv.account_id = sf.account_id
    AND csv.amount = sf.amount
    AND ABS(csv.date - sf.date) <= 2
    AND csv.id != sf.id
  WHERE csv.simplefin_id IS NULL
    AND sf.simplefin_id IS NOT NULL
);
