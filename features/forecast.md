# Net Worth Forecasting

Projects future net worth based on historical income/expense trends with confidence bands.

## Page: `/forecast`

- Scenario selector: Conservative, Realistic, Optimistic
- Horizon selector: 1, 3, 6, 12 months
- Area chart with confidence bands (upper/lower shaded region)
- Summary: projected net worth, change amount, change percentage

## Engine: `src/lib/forecast/engine.ts`

### Input
- Last 6 months of transactions (excluding transfers)
- Recurring transaction rules
- Current net worth, assets, liabilities

### Process

1. **Analyze historical data** (last 3 months):
   - Average monthly income (amount > 0 AND category.type = 'income')
   - Average monthly expenses (amount < 0)
   - Category-level spending breakdown
   - Monthly volatility (standard deviation of monthly totals)

2. **Apply scenario multipliers**:
   | Scenario | Income | Expenses | Growth |
   |----------|--------|----------|--------|
   | Conservative | ×0.95 | ×1.10 | -2%/yr |
   | Realistic | ×1.00 | ×1.00 | +1%/yr |
   | Optimistic | ×1.05 | ×0.95 | +3%/yr |

3. **Generate forecast points** (month by month):
   - Month 0: "today" anchor (confidence=1, no spread)
   - Each subsequent month: `netWorth = (previous + netCashFlow) × growthFactor`
   - Asset/liability split maintained using current ratio
   - Confidence decays: starts at 0.95, -0.05/month, floored at 0.50
   - Confidence bands: `spread = (1 - confidence) × |netWorth| × 0.5`

### Transfer-Aware Filtering

The forecast queries exclude:
- Transactions with `to_account_id IS NOT NULL` (known transfers)
- Transfer-category transactions
- Positive credit card amounts (payments, not income)

This prevents double-counting inter-account transfers as both income and expense.

## Fallback Path

If the engine fails or returns no points, `actions.ts` generates a flat projection at current net worth with dummy confidence bands.

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/forecast/engine.ts` | ForecastEngine class, all computation |
| `src/app/(dashboard)/forecast/actions.ts` | Server action, data fetching, filtering |
| `src/app/(dashboard)/forecast/use-forecast.ts` | Client hook, percentage calculations |
| `src/app/(dashboard)/forecast/page.tsx` | Chart rendering |

## Guardrails
- Divide-by-zero protection: percentage change capped at ±999%
- Minimum net worth threshold ($100) before computing percentages
- Month-0 anchor ensures chart always has a starting point
