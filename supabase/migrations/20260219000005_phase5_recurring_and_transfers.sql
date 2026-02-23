DO $$ BEGIN
  CREATE TYPE public.app_recurring_frequency AS ENUM ('weekly', 'biweekly', 'monthly', 'quarterly', 'annual');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.recurring_rules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  merchant_pattern text NOT NULL,
  category_id     uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  expected_amount decimal(12,2),
  frequency       public.app_recurring_frequency NOT NULL DEFAULT 'monthly',
  expected_day    int CHECK (expected_day BETWEEN 1 AND 31),
  next_expected   date,
  is_active       boolean NOT NULL DEFAULT true,
  last_matched_at timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recurring_rules_user_id ON public.recurring_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_rules_merchant ON public.recurring_rules(user_id, merchant_pattern);

ALTER TABLE public.recurring_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recurring_rules: users can view own rules"
ON public.recurring_rules FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "recurring_rules: users can create own rules"
ON public.recurring_rules FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "recurring_rules: users can update own rules"
ON public.recurring_rules FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "recurring_rules: users can delete own rules"
ON public.recurring_rules FOR DELETE
USING (user_id = auth.uid());

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS to_account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_to_account ON public.transactions(to_account_id)
  WHERE to_account_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_recurring_id ON public.transactions(recurring_id)
  WHERE recurring_id IS NOT NULL;

ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS fk_transactions_recurring_rules;

DO $$ BEGIN
  ALTER TABLE public.transactions
    ADD CONSTRAINT fk_transactions_recurring_rules
    FOREIGN KEY (recurring_id) REFERENCES public.recurring_rules(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.update_recurring_rules_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recurring_rules_updated_at ON public.recurring_rules;
CREATE TRIGGER trg_recurring_rules_updated_at
  BEFORE UPDATE ON public.recurring_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_recurring_rules_timestamp();
