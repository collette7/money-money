-- Add debt tracking fields to accounts table
ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS original_balance numeric(12,2),
ADD COLUMN IF NOT EXISTS interest_rate numeric(5,2),
ADD COLUMN IF NOT EXISTS monthly_payment numeric(12,2);

-- Add comment to explain fields
COMMENT ON COLUMN accounts.original_balance IS 'Original balance when debt was first added (for progress tracking)';
COMMENT ON COLUMN accounts.interest_rate IS 'Annual interest rate percentage (e.g., 19.99 for 19.99% APR)';
COMMENT ON COLUMN accounts.monthly_payment IS 'Monthly payment amount committed to this debt';

-- Set default values for existing credit/loan accounts
UPDATE accounts 
SET 
  original_balance = COALESCE(original_balance, ABS(balance)),
  interest_rate = CASE 
    WHEN account_type = 'credit' THEN 19.99
    WHEN account_type = 'loan' THEN 6.9
    ELSE 0
  END,
  monthly_payment = GREATEST(ABS(balance) * 0.025, 25)
WHERE account_type IN ('credit', 'loan') 
  AND original_balance IS NULL;