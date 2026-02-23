# Budget Engine & Rebalancing

Monthly budget management with intelligent rebalancing based on spending patterns.

## Budget Modes

| Mode | Behavior |
|------|----------|
| **Independent** | Each category has its own fixed limit. No interaction between categories. |
| **Pooled** | Categories share a total budget. Underspend in one offsets overspend in another. |
| **Strict Pooled** | Like pooled, but overspending in any single category triggers an alert. |

## Budget Structure

- **Budget** (`budgets` table): Monthly container with total amount and mode
- **Budget Items** (`budget_items` table): Per-category spending limits within a budget
- Only **expense categories** are budgeted. Income is the target total. Transfers are excluded.

## Rebalancing Engine (`src/lib/rebalance/engine.ts`)

### Inputs
- Current budget items (category → limit)
- Actual spending by category (last 3 months)
- Monthly income (for computing target total)
- Goal pressure and net worth sensitivity (optional tuning)

### Process

1. **Calculate target weights**: Based on actual spending ratios across recent months
2. **Apply 50/30/20 fallback**: If insufficient spending history, uses:
   - 50% Needs (housing, groceries, utilities, insurance, healthcare)
   - 30% Wants (dining, entertainment, shopping, travel, subscriptions)
   - 20% Savings (everything else)
3. **Compute drift**: `driftRatio = (actual - target) / target` for each category
4. **Generate suggestions**: New budget amounts that reduce drift toward target weights
5. **Drift alerts**: Flag categories where projected month-end spend exceeds budget
   - Warning: projected > 90% of limit
   - Critical: projected > 100% of limit

### Outputs

| Field | Description |
|-------|-------------|
| `suggestions[]` | Per-category: current, suggested, drift%, change$, explanation |
| `driftAlerts[]` | Categories at risk of overspending |
| `slackByParent[]` | Unused budget per parent category (pooled mode) |
| `goalPressure` | How aggressively to save (affects suggestions) |
| `networthSensitivity` | How much net worth trends affect suggestions |
| `incomeCV` | Coefficient of variation in income (stability indicator) |

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/rebalance/engine.ts` | Core rebalancing algorithm |
| `src/app/(dashboard)/budgets/actions.ts` | Server actions for budget CRUD + rebalance |
| `src/app/(dashboard)/spending/breakdown/` | Budget UI with gauges and progress bars |
