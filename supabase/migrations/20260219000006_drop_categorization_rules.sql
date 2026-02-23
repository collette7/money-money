-- Drop orphaned categorization_rules table
-- This table was created in 20240215000000_add_budgets_and_rules.sql but is not
-- used by the categorization engine or any application code.
-- The active rules table is category_rules (from 00001_initial_schema.sql).

DROP TABLE IF EXISTS public.categorization_rules CASCADE;
