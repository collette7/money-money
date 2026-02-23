DROP POLICY IF EXISTS "categories: users can update own categories" ON public.categories;

CREATE POLICY "categories: users can update own and system categories"
  ON public.categories FOR UPDATE
  USING (user_id = auth.uid() OR user_id IS NULL);

DROP POLICY IF EXISTS "categories: users can delete own categories" ON public.categories;

CREATE POLICY "categories: users can delete own and system categories"
  ON public.categories FOR DELETE
  USING (user_id = auth.uid() OR user_id IS NULL);
