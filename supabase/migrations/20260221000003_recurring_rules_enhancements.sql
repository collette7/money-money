-- Add confirmed/dismissed workflow, display name, tolerance, custom frequency, and lifecycle fields

ALTER TABLE public.recurring_rules
  ADD COLUMN IF NOT EXISTS confirmed boolean,
  ADD COLUMN IF NOT EXISTS dismissed_at timestamptz,
  ADD COLUMN IF NOT EXISTS merchant_name text,
  ADD COLUMN IF NOT EXISTS amount_tolerance decimal(5,4) DEFAULT 0.15,
  ADD COLUMN IF NOT EXISTS interval_days int,
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS stop_after int,
  ADD COLUMN IF NOT EXISTS occurrence_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'detected';

-- confirmed: null = unreviewed (detection queue), true = user confirmed, false = user dismissed
-- source: 'detected' = auto-detected pattern, 'manual' = user-created rule

COMMENT ON COLUMN public.recurring_rules.confirmed IS 'null=unreviewed, true=confirmed, false=dismissed';
COMMENT ON COLUMN public.recurring_rules.dismissed_at IS 'When user dismissed this pattern';
COMMENT ON COLUMN public.recurring_rules.merchant_name IS 'Display name for the merchant';
COMMENT ON COLUMN public.recurring_rules.amount_tolerance IS 'Fraction tolerance for amount matching (0.15 = 15%)';
COMMENT ON COLUMN public.recurring_rules.interval_days IS 'Custom interval in days (when frequency logic needs override)';
COMMENT ON COLUMN public.recurring_rules.end_date IS 'Stop expecting after this date';
COMMENT ON COLUMN public.recurring_rules.stop_after IS 'Stop expecting after N occurrences';
COMMENT ON COLUMN public.recurring_rules.occurrence_count IS 'Number of matched transactions';
COMMENT ON COLUMN public.recurring_rules.source IS 'detected or manual';

-- Index for fast filtering by confirmed state
CREATE INDEX IF NOT EXISTS idx_recurring_rules_confirmed
  ON public.recurring_rules(user_id, confirmed)
  WHERE confirmed IS NOT NULL;

-- Index for dismissed lookup (prevent re-surfacing dismissed patterns)
CREATE INDEX IF NOT EXISTS idx_recurring_rules_dismissed
  ON public.recurring_rules(user_id, merchant_pattern)
  WHERE confirmed = false;
