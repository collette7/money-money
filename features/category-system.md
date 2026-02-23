# Category System

Hierarchical category taxonomy with three types, drag-and-drop ordering, and a unified picker component.

## Category Types

| Type | Description | Amount Sign |
|------|-------------|-------------|
| `expense` | Money going out (groceries, rent, subscriptions) | Negative |
| `income` | Money coming in (salary, dividends, refunds) | Positive |
| `transfer` | Money between own accounts | Either (paired) |

## Hierarchy

- **Parent categories**: Top-level groupings (e.g., "Essentials", "Lifestyle")
- **Subcategories**: Children linked via `parent_id` (e.g., "Groceries" under "Essentials")
- **System categories**: `user_id = NULL`, seeded by migrations, shared across all users
- **User categories**: `user_id` set, created by a specific user

## Category Editor (`/spending/breakdown/edit`)

Four sections:
1. **Expense categories** — drag-and-drop reorderable
2. **Income categories** — drag-and-drop reorderable
3. **Transfer categories** — typically just "Transfer"
4. **Excluded categories** — `excluded_from_budget = true`, hidden from budget calculations

Each category has: name, emoji icon, color, type, optional parent.

## CategoryPicker Component

`src/components/category-picker.tsx` — the ONLY category selection component in the app.

### Used In
- Transaction detail sheet
- Transaction list inline edit
- Rule dialog (category assignment)
- Split transaction dialog
- Rules list (settings page)

### Features
- Searchable (Command/cmdk pattern)
- Grouped by type: Expense, Income, Transfer
- Hierarchical indent for subcategories
- Trackpad/scroll-wheel scrollable everywhere
- Optional "Create new" action

### Props
```typescript
interface CategoryPickerProps {
  categories: CategoryPickerItem[]
  selectedId?: string | null
  onSelect: (category: CategoryPickerItem) => void
  onCreateNew?: () => void
  className?: string
}
```

## Convention

**Never create a new category dropdown.** Always use `<CategoryPicker />`.

The app previously had 5 different category selector implementations. These were consolidated into the single `CategoryPicker` component. All old implementations were deleted.

## Key Files

| File | Purpose |
|------|---------|
| `src/components/category-picker.tsx` | Unified category picker component |
| `src/components/category-form-dialog.tsx` | Category CRUD dialog |
| `src/app/(dashboard)/spending/breakdown/edit/` | Category editor page |
| `src/app/(dashboard)/spending/categories/` | Category management |

## Database: `categories`

| Column | Purpose |
|--------|---------|
| `name` | Display name |
| `type` | `expense`, `income`, `transfer` |
| `icon` | Emoji string |
| `color` | Hex color for charts |
| `parent_id` | FK to parent category (null = top-level) |
| `user_id` | Owner (null = system category) |
| `sort_order` | Display ordering |
| `excluded_from_budget` | Hidden from budget calculations |
| `keywords` | Array of matching keywords for default categorization |
