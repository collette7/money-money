-- Seed default income and transfer categories per Category Types spec.
-- Income and transfer categories are flat (no parent hierarchy).

INSERT INTO public.categories (user_id, name, icon, emoji, color, type, parent_id, sort_order)
VALUES
  (NULL, 'Income',             '💵', '💵', '#10B981', 'income',   NULL, 0),
  (NULL, 'Paycheck',           '💰', '💰', '#059669', 'income',   NULL, 1),
  (NULL, 'Interest',           '🏦', '🏦', '#0D9488', 'income',   NULL, 2),
  (NULL, 'Reimbursement',      '🔄', '🔄', '#14B8A6', 'income',   NULL, 3),
  (NULL, 'Transfer',           '🔁', '🔁', '#6366F1', 'transfer', NULL, 0),
  (NULL, 'Credit Card Payment','💳', '💳', '#4F46E5', 'transfer', NULL, 1),
  (NULL, 'Savings Transfer',   '🏦', '🏦', '#7C3AED', 'transfer', NULL, 2)
ON CONFLICT DO NOTHING;
