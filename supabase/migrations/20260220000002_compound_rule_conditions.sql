-- Add compound conditions support to category_rules.
-- conditions JSONB stores an array of {field, operator, value, value_end?} objects.
-- When non-empty, the engine uses conditions (AND logic) instead of the legacy single field/operator/value columns.
-- Also adds rule action columns for visibility and merchant rename.

-- Compound conditions column
ALTER TABLE public.category_rules
  ADD COLUMN IF NOT EXISTS conditions JSONB NOT NULL DEFAULT '[]';

-- Rule action: set transaction visibility (null = unchanged)
ALTER TABLE public.category_rules
  ADD COLUMN IF NOT EXISTS set_ignored BOOLEAN DEFAULT NULL;

-- Rule action: rename merchant (null = no change)
ALTER TABLE public.category_rules
  ADD COLUMN IF NOT EXISTS set_merchant_name TEXT DEFAULT NULL;

COMMENT ON COLUMN public.category_rules.conditions IS 'Array of {field, operator, value, value_end?} objects. All must match (AND logic).';
COMMENT ON COLUMN public.category_rules.set_ignored IS 'Rule action: set transaction ignored flag. NULL = unchanged.';
COMMENT ON COLUMN public.category_rules.set_merchant_name IS 'Rule action: rename merchant. NULL = no change.';

-- Migrate existing rules: populate conditions from legacy columns.
-- Only migrate rules that don't already have conditions set.
UPDATE public.category_rules
SET conditions = jsonb_build_array(
  jsonb_strip_nulls(
    jsonb_build_object(
      'field', field::text,
      'operator', operator::text,
      'value', value,
      'value_end', value_end
    )
  )
)
WHERE conditions = '[]'::jsonb;
