-- ============================================================================
-- Backfill net_worth_snapshots from transaction history
-- ============================================================================
-- Reconstructs daily net worth using:
--   account.opening_balance + cumulative sum of transactions up to each date
-- Generates one snapshot per user per day (for every day that has a transaction).
-- Also adds the missing UNIQUE constraint on (user_id, date) for upserts.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Clean up any duplicate snapshots before adding unique constraint
-- --------------------------------------------------------------------------
DELETE FROM public.net_worth_snapshots a
USING public.net_worth_snapshots b
WHERE a.id > b.id
  AND a.user_id = b.user_id
  AND a.date = b.date;

-- --------------------------------------------------------------------------
-- 2. Add unique constraint on (user_id, date) — required for upsert
-- --------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'net_worth_snapshots_user_date_unique'
  ) THEN
    ALTER TABLE public.net_worth_snapshots
      ADD CONSTRAINT net_worth_snapshots_user_date_unique UNIQUE (user_id, date);
  END IF;
END $$;

-- --------------------------------------------------------------------------
-- 3. Backfill historical net worth snapshots
-- --------------------------------------------------------------------------
-- For each user, for each date that has transactions, compute:
--   per-account balance = opening_balance + sum(txns up to that date)
--   total_assets = sum of asset account balances
--   total_liabilities = abs(sum of liability account balances)
--   net_worth = total_assets - total_liabilities
--
-- Uses ON CONFLICT to avoid overwriting any manually-created snapshots.
-- --------------------------------------------------------------------------
WITH
-- Get all distinct transaction dates per user
user_dates AS (
  SELECT DISTINCT a.user_id, t.date
  FROM public.transactions t
  JOIN public.accounts a ON a.id = t.account_id
  WHERE t.status = 'cleared'
    AND t.ignored = false
),
-- For each user+date+account, compute the running balance
account_balances AS (
  SELECT
    ud.user_id,
    ud.date,
    acc.id AS account_id,
    acc.account_type,
    acc.opening_balance + COALESCE(
      (SELECT SUM(t.amount)
       FROM public.transactions t
       WHERE t.account_id = acc.id
         AND t.date <= ud.date
         AND t.status = 'cleared'
         AND t.ignored = false),
      0
    ) AS balance_on_date
  FROM user_dates ud
  JOIN public.accounts acc ON acc.user_id = ud.user_id
),
-- Aggregate per user+date into assets and liabilities
daily_net_worth AS (
  SELECT
    user_id,
    date,
    COALESCE(SUM(
      CASE WHEN account_type IN ('checking', 'savings', 'investment')
        THEN balance_on_date ELSE 0 END
    ), 0) AS total_assets,
    COALESCE(SUM(
      CASE WHEN account_type IN ('credit', 'loan')
        THEN ABS(balance_on_date) ELSE 0 END
    ), 0) AS total_liabilities
  FROM account_balances
  GROUP BY user_id, date
)
INSERT INTO public.net_worth_snapshots (user_id, date, total_assets, total_liabilities, net_worth)
SELECT
  user_id,
  date,
  total_assets,
  total_liabilities,
  total_assets - total_liabilities
FROM daily_net_worth
ON CONFLICT ON CONSTRAINT net_worth_snapshots_user_date_unique
DO NOTHING;
