/**
 * Maps external category names (e.g. Monarch Money) to our internal category names.
 * Used by both the import preview UI and the server action.
 */
export const EXTERNAL_CATEGORY_MAP: Record<string, string> = {
  // Monarch → our categories
  groceries: "Groceries",
  "drinks & dining": "Dining Out & Delivery",
  "dining out": "Dining Out & Delivery",
  "auto & transport": "Transportation",
  transportation: "Transportation",
  shopping: "Shopping & Indulgence",
  entertainment: "Entertainment & Going Out",
  "travel & vacation": "Travel & Experiences",
  travel: "Travel & Experiences",
  healthcare: "Healthcare & Insurance",
  "health & fitness": "Fitness & Wellness",
  "personal care": "Personal Care & Beauty",
  education: "Education & Tools",
  "childcare & education": "Education & Tools",
  household: "Housing",
  housing: "Housing",
  financial: "Money Management",
  finance: "Finance",
  business: "Business Operations",
  gifts: "Gifts & Celebrations",
  taxes: "Legal & Admin",
  other: "Other Expenses",
  income: "Income",
  paycheck: "Paycheck",
  interest: "Interest",
  transfer: "Transfer",
  "credit card payment": "Credit Card Payment",
  subscriptions: "Subscriptions",
  expense: "Other Expenses",
}

export function mapCategoryName(externalName: string): string | null {
  const key = externalName.toLowerCase().trim()
  return EXTERNAL_CATEGORY_MAP[key] ?? null
}
