UPDATE public.categories
  SET name = 'Finance'
  WHERE name = 'Financial Wellness' AND user_id IS NULL;
