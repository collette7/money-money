ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS emoji TEXT,
ADD COLUMN IF NOT EXISTS excluded_from_budget BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS public.categorization_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('merchant', 'description', 'amount_range')),
  pattern TEXT NOT NULL,
  min_amount DECIMAL(10,2),
  max_amount DECIMAL(10,2),
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT amount_range_check CHECK (
    (rule_type != 'amount_range') OR 
    (min_amount IS NOT NULL AND max_amount IS NOT NULL AND min_amount <= max_amount)
  )
);

CREATE INDEX idx_rules_user_enabled ON public.categorization_rules(user_id, enabled);
CREATE INDEX idx_rules_pattern ON public.categorization_rules(pattern);
CREATE INDEX idx_categories_parent ON public.categories(parent_id);

ALTER TABLE public.categorization_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rules" ON public.categorization_rules
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rules" ON public.categorization_rules
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rules" ON public.categorization_rules
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own rules" ON public.categorization_rules
  FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_rules_updated_at BEFORE UPDATE ON public.categorization_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

UPDATE public.categories SET emoji = CASE 
  WHEN LOWER(name) LIKE '%food%' OR LOWER(name) LIKE '%dining%' THEN '🍔'
  WHEN LOWER(name) LIKE '%groceries%' THEN '🥑'
  WHEN LOWER(name) LIKE '%transport%' OR LOWER(name) LIKE '%car%' THEN '🚗'
  WHEN LOWER(name) LIKE '%home%' OR LOWER(name) LIKE '%house%' THEN '🏠'
  WHEN LOWER(name) LIKE '%rent%' THEN '🔑'
  WHEN LOWER(name) LIKE '%utilities%' THEN '🏘️'
  WHEN LOWER(name) LIKE '%shopping%' THEN '🛍️'
  WHEN LOWER(name) LIKE '%entertainment%' THEN '🎬'
  WHEN LOWER(name) LIKE '%health%' OR LOWER(name) LIKE '%medical%' THEN '⚕️'
  WHEN LOWER(name) LIKE '%education%' THEN '📚'
  WHEN LOWER(name) LIKE '%work%' OR LOWER(name) LIKE '%business%' THEN '💼'
  WHEN LOWER(name) LIKE '%subscription%' THEN '💳'
  WHEN LOWER(name) LIKE '%other%' THEN '🏷️'
  ELSE '📌'
END
WHERE emoji IS NULL;