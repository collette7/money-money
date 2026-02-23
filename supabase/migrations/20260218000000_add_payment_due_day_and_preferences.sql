ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS payment_due_day INTEGER CHECK (payment_due_day >= 1 AND payment_due_day <= 31);

COMMENT ON COLUMN public.accounts.payment_due_day IS 'Day of month payment is due (1-31). NULL means not set.';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferences JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.profiles.preferences IS 'User preferences (watched_symbols, etc.)';
