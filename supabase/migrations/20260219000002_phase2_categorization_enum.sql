-- Phase 2: Consolidate categorized_by enum values (learned+default → auto)
-- Postgres enums can't remove values, so we migrate the data then leave old values dormant.

UPDATE public.transactions SET categorized_by = 'learned'
  WHERE categorized_by = 'default';

-- 'default' values are now 'learned' (both map to spec's 'auto')
-- The enum retains 'default' but it's no longer used.
-- App layer treats 'learned' and 'default' as equivalent to 'auto'.
