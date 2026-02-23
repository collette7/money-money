ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS review_flagged_reason TEXT;

UPDATE public.transactions
  SET review_flagged_reason = 'migration'
  WHERE review_flagged = true AND category_confirmed = false AND review_flagged_reason IS NULL;

UPDATE public.transactions
  SET review_flagged = true,
      review_flagged_reason = 'new_import',
      category_confirmed = false
  WHERE review_flagged = false
    AND category_confirmed = false
    AND categorized_by IS NULL
    AND category_id IS NULL;
