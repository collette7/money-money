-- ============================================================================
-- Phase 1 — Budget Engine Foundation
-- ============================================================================
-- Adds transaction classification columns, account asset typing,
-- extends categorized_by enum, and backfills existing data.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Add 'ai' to app_categorized_by enum
-- --------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'ai'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_categorized_by')
  ) THEN
    ALTER TYPE public.app_categorized_by ADD VALUE 'ai';
  END IF;
END $$;

-- --------------------------------------------------------------------------
-- 2. Transaction columns — type, status, ignored, categorization metadata
-- --------------------------------------------------------------------------
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS type public.app_category_type,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'cleared',
  ADD COLUMN IF NOT EXISTS ignored BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS category_confirmed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS review_flagged BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS category_confidence DECIMAL(3,2),
  ADD COLUMN IF NOT EXISTS recurring_id UUID;

-- Check constraint for status values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'transactions_status_check'
  ) THEN
    ALTER TABLE public.transactions
      ADD CONSTRAINT transactions_status_check
      CHECK (status IN ('pending', 'cleared'));
  END IF;
END $$;

-- Index for common filters: ignored, status, review queue
CREATE INDEX IF NOT EXISTS idx_transactions_ignored ON public.transactions(ignored) WHERE ignored = true;
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_transactions_review ON public.transactions(review_flagged) WHERE review_flagged = true;
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);

COMMENT ON COLUMN public.transactions.type IS 'income | expense | transfer — derived from category.type on write, NULL if uncategorized';
COMMENT ON COLUMN public.transactions.status IS 'pending | cleared — pending excluded from budget/net worth calculations';
COMMENT ON COLUMN public.transactions.ignored IS 'Eye toggle — excluded from all calculations when true';
COMMENT ON COLUMN public.transactions.category_confirmed IS 'User has verified this categorization';
COMMENT ON COLUMN public.transactions.review_flagged IS 'Needs user review (low confidence or ambiguous)';
COMMENT ON COLUMN public.transactions.category_confidence IS '0.00-1.00 confidence score, NULL for manual/rule';
COMMENT ON COLUMN public.transactions.recurring_id IS 'Links to recurring_rules table (Phase 5)';

-- --------------------------------------------------------------------------
-- 3. Account columns — asset_type, opening_balance
-- --------------------------------------------------------------------------
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS asset_type TEXT,
  ADD COLUMN IF NOT EXISTS opening_balance DECIMAL(12,2) NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'accounts_asset_type_check'
  ) THEN
    ALTER TABLE public.accounts
      ADD CONSTRAINT accounts_asset_type_check
      CHECK (asset_type IN ('asset', 'liability'));
  END IF;
END $$;

COMMENT ON COLUMN public.accounts.asset_type IS 'asset | liability — derived from account_type';
COMMENT ON COLUMN public.accounts.opening_balance IS 'Starting balance for transaction-based balance calculation';

-- --------------------------------------------------------------------------
-- 4. Backfill transaction.type from categories.type
-- --------------------------------------------------------------------------
UPDATE public.transactions t
  SET type = c.type
  FROM public.categories c
  WHERE t.category_id = c.id
    AND t.type IS NULL;

-- --------------------------------------------------------------------------
-- 5. Backfill accounts.asset_type from account_type
-- --------------------------------------------------------------------------
UPDATE public.accounts
  SET asset_type = CASE
    WHEN account_type IN ('checking', 'savings', 'investment') THEN 'asset'
    WHEN account_type IN ('credit', 'loan') THEN 'liability'
  END
  WHERE asset_type IS NULL;

-- --------------------------------------------------------------------------
-- 6. Mark existing manually-categorized transactions as confirmed
-- --------------------------------------------------------------------------
UPDATE public.transactions
  SET category_confirmed = true
  WHERE categorized_by = 'manual'
    AND category_id IS NOT NULL;

-- Mark rule-categorized as confirmed (user created the rule = implicit confirmation)
UPDATE public.transactions
  SET category_confirmed = true
  WHERE categorized_by = 'rule'
    AND category_id IS NOT NULL;

-- --------------------------------------------------------------------------
-- 7. Update get_category_spending RPC to respect ignored + status
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_category_spending(
  p_user_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (category_id uuid, total numeric)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    t.category_id,
    sum(t.amount) AS total
  FROM public.transactions t
  JOIN public.accounts a ON a.id = t.account_id
  JOIN public.categories c ON c.id = t.category_id
  WHERE a.user_id = p_user_id
    AND t.date >= p_start_date
    AND t.date < p_end_date
    AND t.category_id IS NOT NULL
    AND c.type != 'transfer'
    AND t.status = 'cleared'
    AND t.ignored = false
  GROUP BY t.category_id;
$$;

-- --------------------------------------------------------------------------
-- Done — Phase 1 foundation
-- --------------------------------------------------------------------------
