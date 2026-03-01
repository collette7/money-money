-- Cleanup: remove CSV-imported transactions that have a matching SimpleFIN
-- counterpart. These dupes arise when the same transaction was imported via
-- CSV (simplefin_id IS NULL) and later synced via SimpleFIN (simplefin_id
-- IS NOT NULL).
--
-- Previous cleanups required both rows to have simplefin_id, missing this
-- pattern entirely.
--
-- Match: same account, same amount (exact), date within ±2 days.
-- Keeps the SimpleFIN version (has external ID for future dedup).
-- Uses 1:1 matching via DISTINCT ON to avoid false positives.

DELETE FROM public.transactions
WHERE id IN (
  SELECT csv_row.id
  FROM (
    SELECT DISTINCT ON (sf.id)
      sf.id   AS sf_id,
      csv.id  AS csv_id
    FROM public.transactions csv
    JOIN public.transactions sf
      ON sf.account_id = csv.account_id
      AND sf.amount = csv.amount
      AND ABS(sf.date - csv.date) <= 2
      AND sf.id != csv.id
    WHERE csv.simplefin_id IS NULL
      AND sf.simplefin_id IS NOT NULL
    ORDER BY sf.id, csv.created_at ASC
  ) matched
  JOIN public.transactions csv_row ON csv_row.id = matched.csv_id
);
