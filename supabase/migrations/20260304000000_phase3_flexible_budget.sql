ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS enable_rollover BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE public.budgets
  ADD COLUMN IF NOT EXISTS total_budget_limit DECIMAL(12,2) DEFAULT NULL;

CREATE OR REPLACE FUNCTION public.calculate_rollover(
  p_user_id uuid,
  p_month   int,
  p_year    int
)
RETURNS TABLE (
  category_id     uuid,
  rollover_amount decimal(12,2)
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_prev_month int;
  v_prev_year  int;
  v_start_date date;
  v_end_date   date;
  v_budget_id  uuid;
BEGIN
  IF p_month = 1 THEN
    v_prev_month := 12;
    v_prev_year  := p_year - 1;
  ELSE
    v_prev_month := p_month - 1;
    v_prev_year  := p_year;
  END IF;

  v_start_date := make_date(v_prev_year, v_prev_month, 1);
  v_end_date   := make_date(v_prev_year, v_prev_month, 1) + interval '1 month';

  SELECT b.id INTO v_budget_id
    FROM public.budgets b
   WHERE b.user_id = p_user_id
     AND b.month   = v_prev_month
     AND b.year    = v_prev_year
   LIMIT 1;

  IF v_budget_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT bi.category_id,
         CASE
           WHEN c.enable_rollover THEN
             bi.limit_amount + bi.rollover_amount
               - COALESCE(
                   (SELECT ABS(SUM(t.amount))
                      FROM public.transactions t
                      JOIN public.accounts a ON a.id = t.account_id
                     WHERE a.user_id   = p_user_id
                       AND t.category_id = bi.category_id
                       AND t.date      >= v_start_date
                       AND t.date      <  v_end_date
                       AND t.amount    <  0
                       AND t.status    =  'cleared'
                       AND t.ignored   IS NOT TRUE
                   ), 0)
           ELSE 0::decimal(12,2)
         END AS rollover_amount
    FROM public.budget_items bi
    JOIN public.categories c ON c.id = bi.category_id
   WHERE bi.budget_id = v_budget_id;
END;
$$;
