-- Phase 3: Budget Depth
-- Adds: budget mode (independent/pooled/strict_pooled), period support,
-- rollover tracking, and sub-budget override flag.

-- =========================================================================
-- 1. Enum: budget mode
-- =========================================================================
DO $$ BEGIN
  CREATE TYPE public.app_budget_mode AS ENUM ('independent', 'pooled', 'strict_pooled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =========================================================================
-- 2. Enum: budget period
-- =========================================================================
DO $$ BEGIN
  CREATE TYPE public.app_budget_period AS ENUM ('weekly', 'monthly', 'annual');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =========================================================================
-- 3. Alter budgets table — add mode + period
-- =========================================================================
ALTER TABLE public.budgets
  ADD COLUMN IF NOT EXISTS mode   public.app_budget_mode   NOT NULL DEFAULT 'independent',
  ADD COLUMN IF NOT EXISTS period public.app_budget_period  NOT NULL DEFAULT 'monthly';

COMMENT ON COLUMN public.budgets.mode IS
  'How sub-budgets within parent categories interact: independent (each standalone), pooled (slack shared), strict_pooled (no overspend even with slack)';
COMMENT ON COLUMN public.budgets.period IS
  'Budget time period: weekly, monthly, or annual';

-- =========================================================================
-- 4. Alter budget_items — add rollover + override flag
-- =========================================================================
ALTER TABLE public.budget_items
  ADD COLUMN IF NOT EXISTS rollover_amount decimal(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_override     boolean       NOT NULL DEFAULT false;

COMMENT ON COLUMN public.budget_items.rollover_amount IS
  'Carried forward from prior period: positive = unspent surplus, negative = overspend debt';
COMMENT ON COLUMN public.budget_items.is_override IS
  'True if user manually set this limit (vs auto-inherited from parent budget)';

-- =========================================================================
-- 5. RPC: calculate_rollover — returns rollover amounts for each budget item
--    Given a target month/year, looks at the prior period's budget and
--    actual spending to compute what rolls forward.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.calculate_rollover(
  p_user_id uuid,
  p_month   int,
  p_year    int
)
RETURNS TABLE (
  category_id     uuid,
  rollover_amount decimal(12,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prev_month int;
  v_prev_year  int;
  v_prev_start date;
  v_prev_end   date;
BEGIN
  -- Calculate previous month
  IF p_month = 1 THEN
    v_prev_month := 12;
    v_prev_year  := p_year - 1;
  ELSE
    v_prev_month := p_month - 1;
    v_prev_year  := p_year;
  END IF;

  v_prev_start := make_date(v_prev_year, v_prev_month, 1);
  v_prev_end   := make_date(p_year, p_month, 1);

  RETURN QUERY
  SELECT
    bi.category_id,
    -- rollover = limit + prior_rollover - spent  (positive = surplus, negative = overspend)
    (bi.limit_amount + bi.rollover_amount - COALESCE(ABS(s.total), 0))::decimal(12,2) AS rollover_amount
  FROM public.budget_items bi
  JOIN public.budgets b ON b.id = bi.budget_id
  LEFT JOIN LATERAL (
    SELECT SUM(t.amount) AS total
    FROM public.transactions t
    JOIN public.accounts a ON a.id = t.account_id
    WHERE a.user_id = p_user_id
      AND t.category_id = bi.category_id
      AND t.date >= v_prev_start
      AND t.date < v_prev_end
      AND t.amount < 0  -- expenses only
      AND (t.ignored IS NOT TRUE)
      AND (t.status = 'cleared' OR t.status IS NULL)
  ) s ON true
  WHERE b.user_id = p_user_id
    AND b.month = v_prev_month
    AND b.year  = v_prev_year;
END;
$$;

-- =========================================================================
-- 6. RPC: get_pooled_slack — returns available slack per parent category
--    For pooled mode: sum of (limit + rollover - spent) across siblings
--    that are under-budget, capped at 0 (don't count overspenders).
-- =========================================================================
CREATE OR REPLACE FUNCTION public.get_pooled_slack(
  p_user_id uuid,
  p_month   int,
  p_year    int
)
RETURNS TABLE (
  parent_category_id uuid,
  slack_amount       decimal(12,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start date;
  v_end   date;
BEGIN
  v_start := make_date(p_year, p_month, 1);
  IF p_month = 12 THEN
    v_end := make_date(p_year + 1, 1, 1);
  ELSE
    v_end := make_date(p_year, p_month + 1, 1);
  END IF;

  RETURN QUERY
  SELECT
    c.parent_id AS parent_category_id,
    SUM(
      GREATEST(
        bi.limit_amount + bi.rollover_amount - COALESCE(ABS(spent.total), 0),
        0
      )
    )::decimal(12,2) AS slack_amount
  FROM public.budget_items bi
  JOIN public.budgets b ON b.id = bi.budget_id
  JOIN public.categories c ON c.id = bi.category_id
  LEFT JOIN LATERAL (
    SELECT SUM(t.amount) AS total
    FROM public.transactions t
    JOIN public.accounts a ON a.id = t.account_id
    WHERE a.user_id = p_user_id
      AND t.category_id = bi.category_id
      AND t.date >= v_start
      AND t.date < v_end
      AND t.amount < 0
      AND (t.ignored IS NOT TRUE)
      AND (t.status = 'cleared' OR t.status IS NULL)
  ) spent ON true
  WHERE b.user_id = p_user_id
    AND b.month = p_month
    AND b.year  = p_year
    AND c.parent_id IS NOT NULL
  GROUP BY c.parent_id;
END;
$$;
