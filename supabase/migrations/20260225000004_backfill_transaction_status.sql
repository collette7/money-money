-- Backfill NULL status to 'cleared' for CSV-imported transactions
-- CSV imports didn't set status, causing them to be excluded from
-- spending queries that filter on status = 'cleared'
UPDATE transactions SET status = 'cleared' WHERE status IS NULL;

-- Set default so future inserts without explicit status get 'cleared'
ALTER TABLE transactions ALTER COLUMN status SET DEFAULT 'cleared';
