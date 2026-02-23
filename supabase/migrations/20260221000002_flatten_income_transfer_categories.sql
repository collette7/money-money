UPDATE public.categories SET parent_id = NULL WHERE id IN (
  '8f62c881-6b75-46b8-bc6c-fffe77b9b22a', -- Paycheck
  '5636c065-ed13-48b8-9d45-6d7e6e0d9900', -- Interest
  'c76ba587-651c-4b32-8151-9f306700e3b3', -- Reimbursement
  'e87fd602-bf0d-4313-870a-a4d057d18b6d', -- Credit Card Payment
  '98c580f4-7c50-4bc9-b3ba-2f11bf7fc951'  -- Savings Transfer
);
