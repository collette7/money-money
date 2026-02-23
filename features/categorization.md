# Transaction Categorization

Multi-tier automatic categorization engine that assigns categories to transactions using a priority cascade.

## Priority Cascade

Transactions are categorized in this order (first match wins):

| Priority | Method | Source | Confidence |
|----------|--------|--------|------------|
| 1 | **User Rules** | `category_rules` table | 1.0 |
| 2 | **Learned Patterns** | `merchant_mappings` table | 0.8+ |
| 3 | **Default Patterns** | Hardcoded keyword matching | 0.6 |
| 4 | **AI Fallback** | LLM-based categorization | Varies |

### 1. User Rules
- Multi-condition rules: field + operator + value (e.g., "merchant contains Netflix AND amount is exactly 15.99")
- Fields: `merchant`, `description`, `amount`
- Operators: `contains`, `equals`, `starts_with`, `ends_with`, `greater_than`, `less_than`, `between`, `is_exactly`
- Amount comparisons use absolute values (DB stores expenses as negative)
- Side-effects beyond categorization: `set_ignored`, `set_merchant_name`, `set_tags`
- Amount sign (`amountHint`) used as categorization signal — positive amounts bias toward income categories

### 2. Learned Patterns (Merchant Mappings)
- Built from manual categorizations: when a user sets a category, a `merchant_mappings` entry is created/updated
- Confidence threshold: 0.8+ to be used
- Pattern matching: case-insensitive merchant name comparison

### 3. Default Patterns
- Hardcoded keyword → category mappings (e.g., "grocery" → Groceries, "payroll" → Salary)
- Uses `amountHint` from transaction amount sign to pick income vs expense categories

### 4. AI Fallback
- Triggered via "Auto-categorize" button in the advisor page
- Sends uncategorized transactions to configured LLM provider
- Type-aware: assigns expense/income/transfer based on amount sign
- Bulk processing with batch API calls

## Performance: Prefetched Cache

`prefetchCategorizationData()` loads all rules, mappings, and categories in **4 parallel queries** before processing. This data is reused for all transactions in a batch — no per-transaction DB calls.

## Rule Graduation Flow

1. User manually categorizes a transaction
2. Toast appears: "Set a rule for [merchant]?"
3. User clicks → Rule dialog opens, prefilled with transaction data
4. User confirms → Rule created, future transactions auto-categorized

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/categorization/engine.ts` | Core engine: prefetch, cascade, matching |
| `src/app/(dashboard)/transactions/actions.ts` | Server actions for manual categorization |
| `src/components/rule-dialog.tsx` | Rule creation UI |
| `src/app/(dashboard)/advisor/actions.ts` | AI bulk categorization |

## Invariants

- Expenses are ALWAYS negative in the database. 30+ files depend on `amount < 0`.
- `categorized_by` tracks the method: `rule`, `learned`, `default`, `manual`, `ai`
- `category_confidence` stores the match confidence (0.0–1.0)
- `category_confirmed` is true only when user has explicitly verified the assignment
