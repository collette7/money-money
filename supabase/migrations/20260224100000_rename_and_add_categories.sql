-- Rename and add default expense categories per updated taxonomy.

-- 1. Renames
UPDATE public.categories
  SET name = 'Money Management'
  WHERE name = 'Financial Health' AND user_id IS NULL;

UPDATE public.categories
  SET name = 'Groceries'
  WHERE name = 'Groceries & Food Staples' AND user_id IS NULL;

UPDATE public.categories
  SET name = 'Transportation'
  WHERE name = 'Transport' AND user_id IS NULL;

-- 2. New subcategories
INSERT INTO public.categories (user_id, name, icon, emoji, color, type, parent_id)
VALUES
  (NULL, 'Dining Out & Delivery', '🍽️', '🍽️', '#FF9800', 'expense',
    (SELECT id FROM public.categories WHERE name = 'Essentials' AND user_id IS NULL AND parent_id IS NULL)),
  (NULL, 'Financial Wellness', '💰', '💰', '#4338CA', 'expense',
    (SELECT id FROM public.categories WHERE name = 'Business & Career' AND user_id IS NULL AND parent_id IS NULL))
ON CONFLICT DO NOTHING;
