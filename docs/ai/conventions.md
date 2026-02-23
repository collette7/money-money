# Code Conventions

## File Organization

- **Server actions**: `src/app/(dashboard)/<feature>/actions.ts` — one per feature area
- **Page components**: `src/app/(dashboard)/<feature>/page.tsx` — async server components
- **Client components**: Same directory as page, or `src/components/` if shared
- **Hooks**: Co-located with their component as `use-<name>.ts` — one hook per component
- **Business logic**: `src/lib/<domain>/` — pure logic, no React
- **Types**: `src/types/database.ts` — all DB entity types in one file
- **UI primitives**: `src/components/ui/` — shadcn/ui managed, do not hand-edit

## Naming Patterns

- Server action files: `actions.ts` (always)
- Page files: `page.tsx` (Next.js convention)
- Layout files: `layout.tsx`
- Component files: `kebab-case.tsx` (e.g. `transaction-detail-sheet.tsx`)
- Hook files: `use-<component-name>.ts` (e.g. `use-transaction-list.ts`) — co-located with component
- Type files: `database.ts` (single file for all DB types)
- Lib files: `kebab-case.ts`

## Server Action Pattern

Every server action follows this structure:
```typescript
export async function actionName(params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  
  // ... Supabase query/mutation ...
  
  revalidatePath("/relevant-path");
}
```

Rules:
- Always `"use server"` at top of file
- Always auth check with redirect
- Always `createClient()` from `@/lib/supabase/server`
- Revalidate affected paths after mutations
- Revalidate ALL paths that display the affected data (not just the current page)
- No try/catch in most actions — errors propagate to error boundaries

## Component Pattern

- Server components: Default. Fetch data, pass as props.
- Client components: Only when interactivity needed. Marked with `"use client"`.
- Data flow: Server component fetches → passes props → client component renders/interacts → calls server action

## Hook Extraction Pattern (ENFORCED)

Components are responsible for UI and calling hooks. Hooks own all state, effects, and derived logic.

**Rule**: No `useState`, `useEffect`, `useTransition`, `useCallback` for business logic in component files. Only pure UI state (e.g. `isDropdownOpen`) is allowed in components.

**Hook file**: Co-located with the component, named `use-<component-name>.ts`.
**Hook function**: Named `use<ComponentName>()`, returns a flat object.

```typescript
// use-patient-form.ts
export function usePatientForm(patientId: string) {
  const [form, setForm] = useState<PatientForm>(defaultForm)
  const mutation = useMutation(...)
  const handleSubmit = () => mutation.mutate(form)
  return { form, isLoading, handleSubmit, handleChange }
}

// patient-form.tsx
export function PatientForm({ patientId }: Props) {
  const { form, isLoading, handleSubmit, handleChange } = usePatientForm(patientId)
  if (isLoading) return <Spinner />
  return <form onSubmit={handleSubmit}>...</form>
}
```

**Existing hook extractions**:

| Component | Hook | Location |
|-----------|------|----------|
| transaction-list.tsx | use-transaction-list.ts | transactions/ |
| transaction-detail-sheet.tsx | use-transaction-detail.ts | components/ |
| chat-ui.tsx | use-chat-ui.ts | advisor/ |
| settings-form.tsx | use-settings-form.ts | settings/ |
| category-selector.tsx | use-category-selector.ts | transactions/ |
| rule-dialog.tsx | use-rule-dialog.ts | components/ |
| split-transaction-dialog.tsx | use-split-transaction-dialog.ts | components/ |

**When adding new interactive components**: Always create the hook first, then the component.

## Shared Components (ENFORCED)

### CategoryPicker
`src/components/category-picker.tsx` — the ONLY category selection component. Used in:
- Transaction detail sheet
- Transaction list inline edit
- Rule dialog (category assignment)
- Split transaction dialog
- Rules list (settings page)

Features: searchable, grouped by type (Expense/Income/Transfer), hierarchical indent for subcategories, trackpad-scrollable everywhere.

**Rule**: Never create a new category dropdown. Always use `<CategoryPicker />`.

## Supabase Query Pattern

- Direct `.from("table").select("columns").eq("field", value)` — no ORM
- Joins use Supabase select syntax: `categories ( id, name, icon, color, type )`
- **CRITICAL**: When joining transactions → accounts, ALWAYS use `accounts!account_id!inner`:
  - `!account_id` specifies the FK (transactions has both `account_id` and `to_account_id` referencing accounts)
  - `!inner` forces inner join (without it, Supabase returns all rows and nullifies non-matching join data)
  - Wrong: `accounts!inner ( user_id )` — ambiguous FK, returns empty results
  - Wrong: `accounts!account_id ( user_id )` — left join, leaks unfiltered rows
  - Right: `accounts!account_id!inner ( user_id )` — correct FK + inner join
- RLS handles auth — but actions still verify `user_id` for defense-in-depth
- Supabase returns arrays for joins that could be one-to-many. Use `resolveCategory()` from `lib/transfer-filter.ts` to normalize.

## Category System

- Categories have `user_id` (user-created) or `NULL` (system defaults)
- Hierarchical: `parent_id` links subcategory → parent
- Three types: `income`, `expense`, `transfer`
- System categories are seeded in migrations — queried with `or(user_id.eq.${userId},user_id.is.null)`
- `sort_order` controls display order within each type section
- `excluded_from_budget` hides category from budget calculations
- Editor at `/spending/breakdown/edit` shows 4 collapsible sections: Expenses, Income, Transfers, Excluded
- Default expense categories are hierarchical (e.g., Essentials → Housing, Transport, Groceries)
- Default income categories: Income, Paycheck, Interest, Reimbursement (flat)
- Default transfer categories: Transfer, Credit Card Payment, Savings Transfer (flat)

## Emoji Picker

- Uses `@emoji-mart/react` with `@emoji-mart/data` for full native emoji selection
- Wrapped in a Radix `Popover` — click emoji button to open picker
- Returns `emoji.native` (native Unicode emoji, not shortcodes)

## Merchant Logos

- Logo.dev API (`https://img.logo.dev/{domain}?token=...&size=64`) for institution logos
- Free tier, no API key required for basic usage
- `lib/account-utils.ts` → `getInstitutionLogoUrl()` builds the URL from `institution_domain`
- Fallback to generic icon if domain is missing or image fails to load

## Transaction Amount Convention

- **Negative** = expense/debit
- **Positive** = income/credit
- 30+ files depend on this. NEVER change.
- `type` column is derived from `category.type` on write
- Display: `Math.abs(amount)` with color/sign prefix

## Categorization Priority

1. User rules (`category_rules` table) — highest priority, multi-condition support, can set tags/ignored/merchant_name
2. Learned patterns (`merchant_mappings` table) — from manual overrides, confidence-weighted
3. Default patterns (hardcoded in `lib/categorization/engine.ts`) — keyword matching for all 3 category types
4. AI categorization (`advisor/actions.ts` → `aiCategorize()`) — user-triggered, uses configured AI provider

## Styling Conventions

- Tailwind CSS 4 utility classes
- `cn()` helper from `lib/utils.ts` for conditional classes
- Color tokens via CSS variables in `globals.css`
- Dark mode: `dark:` prefix classes
- Spacing: Tailwind scale (p-4, gap-2, etc.)
- Typography: `text-xs` through `text-4xl`, `font-medium`/`font-semibold`
- Icons: Lucide React, `size-3.5` to `size-6`

## Form Handling

- No react-hook-form — forms use native React state (useState)
- Validation: Zod schemas in `lib/validation.ts`
- Server actions receive typed parameters, not FormData (except auth)
- Optimistic updates via `useOptimistic` in some components

## Error Handling

- Server actions: Errors propagate (no try/catch)
- Client components: try/catch around server action calls, console.error
- No global error boundary configured
- Radix Toast for rule graduation prompts and AI categorization results

## Cache Invalidation

- `revalidatePath("/transactions")` — after any transaction mutation
- `revalidatePath("/")` — after transaction mutations that affect home page (category, tags, notes changes)
- `revalidatePath("/spending")` — after category or spending-related changes
- `revalidatePath("/spending/breakdown")` — after budget mutations
- `revalidatePath("/spending/recurring")` — after recurring toggle
- `revalidatePath("/portfolio")` — after portfolio mutations
- `revalidatePath("/", "layout")` — after auth changes (full layout)

## URL-Driven State

Transaction filters use URL search params:
- `?search=`, `?categoryId=`, `?accountId=`, `?startDate=`, `?endDate=`, `?page=`, `?view=`
- Updated via `router.push(pathname + "?" + params.toString())`
- Read via `useSearchParams()` in client components

## Import Conventions

- Path alias: `@/` maps to `src/`
- Server action imports: `import { fn } from "@/app/(dashboard)/<feature>/actions"`
- UI components: `import { Button } from "@/components/ui/button"`
- Utilities: `import { cn } from "@/lib/utils"`
