-- Reparent income & transfer subcategories under their parent,
-- then merge/remove old duplicates from initial schema seed.

-- ── 1. Reparent new subcategories under "Income" parent ──

UPDATE public.categories SET parent_id = '63dba66d-106c-406f-9da6-e4d20a5be097', sort_order = 1
WHERE id = '8f62c881-6b75-46b8-bc6c-fffe77b9b22a'; -- Paycheck

UPDATE public.categories SET parent_id = '63dba66d-106c-406f-9da6-e4d20a5be097', sort_order = 2
WHERE id = '5636c065-ed13-48b8-9d45-6d7e6e0d9900'; -- Interest

UPDATE public.categories SET parent_id = '63dba66d-106c-406f-9da6-e4d20a5be097', sort_order = 3
WHERE id = 'c76ba587-651c-4b32-8151-9f306700e3b3'; -- Reimbursement

-- ── 2. Reparent new subcategories under "Transfer" parent (🔁) ──

UPDATE public.categories SET parent_id = 'f784d635-e3c6-45bc-a807-e4c88fbb03d1', sort_order = 1
WHERE id = 'e87fd602-bf0d-4313-870a-a4d057d18b6d'; -- Credit Card Payment

UPDATE public.categories SET parent_id = 'f784d635-e3c6-45bc-a807-e4c88fbb03d1', sort_order = 2
WHERE id = '98c580f4-7c50-4bc9-b3ba-2f11bf7fc951'; -- Savings Transfer

-- ── 3. Merge old "Salary/Income" → move refs to "Paycheck", then delete ──

UPDATE public.transactions SET category_id = '8f62c881-6b75-46b8-bc6c-fffe77b9b22a'
WHERE category_id = 'f5c14f3d-183f-447c-8b63-e63ee3b89f90';

UPDATE public.budget_items SET category_id = '8f62c881-6b75-46b8-bc6c-fffe77b9b22a'
WHERE category_id = 'f5c14f3d-183f-447c-8b63-e63ee3b89f90';

UPDATE public.category_rules SET category_id = '8f62c881-6b75-46b8-bc6c-fffe77b9b22a'
WHERE category_id = 'f5c14f3d-183f-447c-8b63-e63ee3b89f90';

UPDATE public.subscriptions SET category_id = '8f62c881-6b75-46b8-bc6c-fffe77b9b22a'
WHERE category_id = 'f5c14f3d-183f-447c-8b63-e63ee3b89f90';

DELETE FROM public.categories WHERE id = 'f5c14f3d-183f-447c-8b63-e63ee3b89f90';

-- ── 4. Merge old "Other Income" → move refs to "Income" parent, then delete ──

UPDATE public.transactions SET category_id = '63dba66d-106c-406f-9da6-e4d20a5be097'
WHERE category_id = '69131d11-d624-420b-ad91-698873325bb3';

UPDATE public.budget_items SET category_id = '63dba66d-106c-406f-9da6-e4d20a5be097'
WHERE category_id = '69131d11-d624-420b-ad91-698873325bb3';

UPDATE public.category_rules SET category_id = '63dba66d-106c-406f-9da6-e4d20a5be097'
WHERE category_id = '69131d11-d624-420b-ad91-698873325bb3';

UPDATE public.subscriptions SET category_id = '63dba66d-106c-406f-9da6-e4d20a5be097'
WHERE category_id = '69131d11-d624-420b-ad91-698873325bb3';

DELETE FROM public.categories WHERE id = '69131d11-d624-420b-ad91-698873325bb3';

-- ── 5. Merge old "Transfer" (📌) → move refs to new "Transfer" (🔁), then delete ──

UPDATE public.transactions SET category_id = 'f784d635-e3c6-45bc-a807-e4c88fbb03d1'
WHERE category_id = 'e2cee308-b7c0-4542-b350-5f8e1bfddefa';

UPDATE public.budget_items SET category_id = 'f784d635-e3c6-45bc-a807-e4c88fbb03d1'
WHERE category_id = 'e2cee308-b7c0-4542-b350-5f8e1bfddefa';

UPDATE public.category_rules SET category_id = 'f784d635-e3c6-45bc-a807-e4c88fbb03d1'
WHERE category_id = 'e2cee308-b7c0-4542-b350-5f8e1bfddefa';

UPDATE public.subscriptions SET category_id = 'f784d635-e3c6-45bc-a807-e4c88fbb03d1'
WHERE category_id = 'e2cee308-b7c0-4542-b350-5f8e1bfddefa';

DELETE FROM public.categories WHERE id = 'e2cee308-b7c0-4542-b350-5f8e1bfddefa';
