-- Phase 1 — Taxonomy Migration
-- Updates flat system categories to hierarchical taxonomy per Budget Engine Spec §12.
-- All references use name + user_id IS NULL to find UUIDs. No hardcoded IDs.

-- 1. Insert 5 parent groups + income/transfer parents
INSERT INTO public.categories (user_id, name, icon, color, type, parent_id)
VALUES
  (NULL, 'Essentials',        '✅', '#10B981', 'expense', NULL),
  (NULL, 'Business & Career', '🧠', '#6366F1', 'expense', NULL),
  (NULL, 'Lifestyle',         '🌿', '#8B5CF6', 'expense', NULL),
  (NULL, 'Relationships',     '🤝', '#EC4899', 'expense', NULL),
  (NULL, 'Fun & Joy',         '🌴', '#F59E0B', 'expense', NULL)
ON CONFLICT DO NOTHING;

-- 2. Reparent + rename existing categories

-- Groceries → Essentials
UPDATE public.categories
  SET name = 'Groceries & Food Staples', icon = '🍎',
      parent_id = (SELECT id FROM public.categories WHERE name = 'Essentials' AND user_id IS NULL AND parent_id IS NULL)
  WHERE name = 'Groceries' AND user_id IS NULL;

-- Rent/Mortgage → Housing (Essentials)
UPDATE public.categories
  SET name = 'Housing', icon = '🏠',
      parent_id = (SELECT id FROM public.categories WHERE name = 'Essentials' AND user_id IS NULL AND parent_id IS NULL)
  WHERE name = 'Rent/Mortgage' AND user_id IS NULL;

-- Transportation → Transport (Essentials)
UPDATE public.categories
  SET name = 'Transport', icon = '🚗',
      parent_id = (SELECT id FROM public.categories WHERE name = 'Essentials' AND user_id IS NULL AND parent_id IS NULL)
  WHERE name = 'Transportation' AND user_id IS NULL;

-- Insurance → Healthcare & Insurance (Essentials)
UPDATE public.categories
  SET name = 'Healthcare & Insurance', icon = '🩺',
      parent_id = (SELECT id FROM public.categories WHERE name = 'Essentials' AND user_id IS NULL AND parent_id IS NULL)
  WHERE name = 'Insurance' AND user_id IS NULL;

-- Investments → Financial Health (Essentials)
UPDATE public.categories
  SET name = 'Financial Health', icon = '💰',
      parent_id = (SELECT id FROM public.categories WHERE name = 'Essentials' AND user_id IS NULL AND parent_id IS NULL)
  WHERE name = 'Investments' AND user_id IS NULL;

-- Education → Education & Tools (Business & Career)
UPDATE public.categories
  SET name = 'Education & Tools', icon = '🧾',
      parent_id = (SELECT id FROM public.categories WHERE name = 'Business & Career' AND user_id IS NULL AND parent_id IS NULL)
  WHERE name = 'Education' AND user_id IS NULL;

-- Shopping → Shopping & Indulgence (Lifestyle)
UPDATE public.categories
  SET name = 'Shopping & Indulgence', icon = '🛍️',
      parent_id = (SELECT id FROM public.categories WHERE name = 'Lifestyle' AND user_id IS NULL AND parent_id IS NULL)
  WHERE name = 'Shopping' AND user_id IS NULL;

-- Subscriptions → Subscriptions (Lifestyle)
UPDATE public.categories
  SET parent_id = (SELECT id FROM public.categories WHERE name = 'Lifestyle' AND user_id IS NULL AND parent_id IS NULL),
      icon = '📺'
  WHERE name = 'Subscriptions' AND user_id IS NULL;

-- Personal Care → Personal Care & Beauty (Lifestyle)
UPDATE public.categories
  SET name = 'Personal Care & Beauty', icon = '🧴',
      parent_id = (SELECT id FROM public.categories WHERE name = 'Lifestyle' AND user_id IS NULL AND parent_id IS NULL)
  WHERE name = 'Personal Care' AND user_id IS NULL;

-- Health & Fitness → Healthcare items go to Healthcare & Insurance, rename this to Fitness & Wellness (Lifestyle)
-- We keep the existing ID for "Health & Fitness" and rename it to "Fitness & Wellness" under Lifestyle.
-- Medical transactions will need user review to move to Healthcare & Insurance.
UPDATE public.categories
  SET name = 'Fitness & Wellness', icon = '🧘',
      parent_id = (SELECT id FROM public.categories WHERE name = 'Lifestyle' AND user_id IS NULL AND parent_id IS NULL)
  WHERE name = 'Health & Fitness' AND user_id IS NULL;

-- Gifts & Donations → Gifts & Celebrations (Relationships)
-- Donation transactions flagged for review
UPDATE public.categories
  SET name = 'Gifts & Celebrations', icon = '🎁',
      parent_id = (SELECT id FROM public.categories WHERE name = 'Relationships' AND user_id IS NULL AND parent_id IS NULL)
  WHERE name = 'Gifts & Donations' AND user_id IS NULL;

-- Travel → Travel & Experiences (Fun & Joy)
UPDATE public.categories
  SET name = 'Travel & Experiences', icon = '✈️',
      parent_id = (SELECT id FROM public.categories WHERE name = 'Fun & Joy' AND user_id IS NULL AND parent_id IS NULL)
  WHERE name = 'Travel' AND user_id IS NULL;

-- 3. Merge categories that map to the same destination

-- Dining Out → Entertainment & Going Out (Fun & Joy)
UPDATE public.categories
  SET name = 'Entertainment & Going Out', icon = '🥂',
      parent_id = (SELECT id FROM public.categories WHERE name = 'Fun & Joy' AND user_id IS NULL AND parent_id IS NULL)
  WHERE name = 'Dining Out' AND user_id IS NULL;

-- Entertainment transactions → merge into "Entertainment & Going Out" (was "Dining Out")
UPDATE public.transactions
  SET category_id = (SELECT id FROM public.categories WHERE name = 'Entertainment & Going Out' AND user_id IS NULL)
  WHERE category_id = (SELECT id FROM public.categories WHERE name = 'Entertainment' AND user_id IS NULL);

UPDATE public.budget_items
  SET category_id = (SELECT id FROM public.categories WHERE name = 'Entertainment & Going Out' AND user_id IS NULL)
  WHERE category_id = (SELECT id FROM public.categories WHERE name = 'Entertainment' AND user_id IS NULL);

DELETE FROM public.categories WHERE name = 'Entertainment' AND user_id IS NULL;

-- Utilities transactions → merge into Housing
UPDATE public.transactions
  SET category_id = (SELECT id FROM public.categories WHERE name = 'Housing' AND user_id IS NULL)
  WHERE category_id = (SELECT id FROM public.categories WHERE name = 'Utilities' AND user_id IS NULL);

UPDATE public.budget_items
  SET category_id = (SELECT id FROM public.categories WHERE name = 'Housing' AND user_id IS NULL)
  WHERE category_id = (SELECT id FROM public.categories WHERE name = 'Utilities' AND user_id IS NULL);

DELETE FROM public.categories WHERE name = 'Utilities' AND user_id IS NULL;

-- Gas & Fuel transactions → merge into Transport
UPDATE public.transactions
  SET category_id = (SELECT id FROM public.categories WHERE name = 'Transport' AND user_id IS NULL)
  WHERE category_id = (SELECT id FROM public.categories WHERE name = 'Gas & Fuel' AND user_id IS NULL);

UPDATE public.budget_items
  SET category_id = (SELECT id FROM public.categories WHERE name = 'Transport' AND user_id IS NULL)
  WHERE category_id = (SELECT id FROM public.categories WHERE name = 'Gas & Fuel' AND user_id IS NULL);

DELETE FROM public.categories WHERE name = 'Gas & Fuel' AND user_id IS NULL;

-- 4. Insert new subcategories that have no existing mapping

INSERT INTO public.categories (user_id, name, icon, color, type, parent_id)
VALUES
  -- Essentials: Debt & Loans
  (NULL, 'Debt & Loans', '💳', '#EF4444',  'expense',
    (SELECT id FROM public.categories WHERE name = 'Essentials' AND user_id IS NULL AND parent_id IS NULL)),
  -- Essentials: Legal & Admin
  (NULL, 'Legal & Admin', '⚖️', '#6B7280', 'expense',
    (SELECT id FROM public.categories WHERE name = 'Essentials' AND user_id IS NULL AND parent_id IS NULL)),
  -- Business & Career: Business Operations
  (NULL, 'Business Operations', '💼', '#4F46E5', 'expense',
    (SELECT id FROM public.categories WHERE name = 'Business & Career' AND user_id IS NULL AND parent_id IS NULL)),
  -- Business & Career: Creative Work
  (NULL, 'Creative Work', '🎧', '#7C3AED', 'expense',
    (SELECT id FROM public.categories WHERE name = 'Business & Career' AND user_id IS NULL AND parent_id IS NULL)),
  -- Relationships: Family Support
  (NULL, 'Family Support', '👩‍👧', '#F472B6', 'expense',
    (SELECT id FROM public.categories WHERE name = 'Relationships' AND user_id IS NULL AND parent_id IS NULL)),
  -- Relationships: Donations & Giving
  (NULL, 'Donations & Giving', '🫱🏽‍🫲🏼', '#FB7185', 'expense',
    (SELECT id FROM public.categories WHERE name = 'Relationships' AND user_id IS NULL AND parent_id IS NULL)),
  -- Fun & Joy: Hobbies
  (NULL, 'Hobbies', '🎨', '#FBBF24', 'expense',
    (SELECT id FROM public.categories WHERE name = 'Fun & Joy' AND user_id IS NULL AND parent_id IS NULL)),
  -- Fun & Joy: Recreation
  (NULL, 'Recreation', '🌳', '#34D399', 'expense',
    (SELECT id FROM public.categories WHERE name = 'Fun & Joy' AND user_id IS NULL AND parent_id IS NULL))
ON CONFLICT DO NOTHING;

-- 5. Flag ambiguous transactions for review

-- Gifts & Donations transactions: user needs to confirm Gifts vs Donations
UPDATE public.transactions
  SET review_flagged = true
  WHERE category_id = (SELECT id FROM public.categories WHERE name = 'Gifts & Celebrations' AND user_id IS NULL)
    AND review_flagged = false;

-- Health & Fitness → Fitness & Wellness: medical transactions may need to move to Healthcare & Insurance
UPDATE public.transactions
  SET review_flagged = true
  WHERE category_id = (SELECT id FROM public.categories WHERE name = 'Fitness & Wellness' AND user_id IS NULL)
    AND review_flagged = false;

-- 6. Update Other Expenses to be hidden from taxonomy but preserved for history
UPDATE public.categories
  SET excluded_from_budget = true
  WHERE name = 'Other Expenses' AND user_id IS NULL;

-- 7. Update DEFAULT_PATTERNS references: update emoji column to match new taxonomy
UPDATE public.categories SET emoji = icon WHERE user_id IS NULL AND emoji IS NULL;
