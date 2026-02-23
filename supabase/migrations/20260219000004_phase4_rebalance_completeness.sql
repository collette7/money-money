-- Phase 4: Rebalancing Completeness
-- RPCs for goal_pressure and net worth sensitivity signals.

CREATE OR REPLACE FUNCTION public.get_goal_pressure(p_user_id uuid)
RETURNS decimal(5,4)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_monthly_contributions decimal(12,2);
  v_avg_income decimal(12,2);
  v_pressure decimal(5,4);
BEGIN
  SELECT COALESCE(SUM(
    CASE contribution_frequency
      WHEN 'weekly' THEN contribution_amount * 4.33
      WHEN 'biweekly' THEN contribution_amount * 2.17
      WHEN 'monthly' THEN contribution_amount
      WHEN 'custom' THEN
        CASE WHEN custom_interval_days > 0
          THEN contribution_amount * (30.0 / custom_interval_days)
          ELSE contribution_amount
        END
    END
  ), 0)
  INTO v_total_monthly_contributions
  FROM public.savings_goals
  WHERE user_id = p_user_id AND status = 'active';

  SELECT COALESCE(AVG(monthly_income), 0)
  INTO v_avg_income
  FROM (
    SELECT DATE_TRUNC('month', t.date) AS m, SUM(t.amount) AS monthly_income
    FROM public.transactions t
    JOIN public.accounts a ON a.id = t.account_id
    JOIN public.categories c ON c.id = t.category_id
    WHERE a.user_id = p_user_id
      AND c.type = 'income'
      AND t.amount > 0
      AND t.date >= CURRENT_DATE - INTERVAL '6 months'
      AND (t.ignored IS NOT TRUE)
    GROUP BY DATE_TRUNC('month', t.date)
  ) sub;

  IF v_avg_income <= 0 THEN
    RETURN 0;
  END IF;

  v_pressure := LEAST(v_total_monthly_contributions / v_avg_income, 1.0);
  RETURN v_pressure;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_networth_sensitivity(p_user_id uuid)
RETURNS decimal(8,4)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_oldest_nw decimal(12,2);
  v_newest_nw decimal(12,2);
  v_sensitivity decimal(8,4);
BEGIN
  SELECT net_worth INTO v_oldest_nw
  FROM public.net_worth_snapshots
  WHERE user_id = p_user_id
    AND date >= CURRENT_DATE - INTERVAL '90 days'
  ORDER BY date ASC
  LIMIT 1;

  SELECT net_worth INTO v_newest_nw
  FROM public.net_worth_snapshots
  WHERE user_id = p_user_id
  ORDER BY date DESC
  LIMIT 1;

  IF v_oldest_nw IS NULL OR v_newest_nw IS NULL OR v_oldest_nw = 0 THEN
    RETURN 0;
  END IF;

  v_sensitivity := (v_newest_nw - v_oldest_nw) / ABS(v_oldest_nw);
  RETURN v_sensitivity;
END;
$$;
