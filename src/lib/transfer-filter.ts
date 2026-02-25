import { createClient } from "@/lib/supabase/server";

let cachedTransferCategoryIds: string[] | null = null;

export async function getTransferCategoryIds(): Promise<string[]> {
  if (cachedTransferCategoryIds) return cachedTransferCategoryIds;

  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("id")
    .eq("type", "transfer");

  cachedTransferCategoryIds = (data || []).map(c => c.id);
  return cachedTransferCategoryIds;
}

export function excludeTransfers<T extends { category_id?: string | null }>(
  transactions: T[],
  transferCategoryIds: string[]
): T[] {
  if (transferCategoryIds.length === 0) return transactions;
  return transactions.filter(
    tx => !tx.category_id || !transferCategoryIds.includes(tx.category_id)
  );
}

export function isTransferCategory(
  categories: { type?: string } | null | undefined
): boolean {
  return categories?.type === "transfer";
}

/**
 * Supabase joins return categories as either a single object or an array
 * depending on the relationship. This normalizes both shapes to a single
 * object (or null), eliminating the repeated `as unknown as ... | ...[]`
 * casting across every consumer.
 */
export function resolveCategory<T>(
  raw: T | T[] | null | undefined
): T | null {
  if (raw == null) return null;
  if (Array.isArray(raw)) return raw[0] ?? null;
  return raw;
}

export function isTransferTx(tx: { categories?: unknown }): boolean {
  const cat = resolveCategory(tx.categories as { type?: string } | { type?: string }[] | null);
  return cat?.type === "transfer";
}

// ---------------------------------------------------------------------------
// Category-only transfer exclusion (for aggregate stats / dashboard totals)
// ---------------------------------------------------------------------------
// Simple approach: exclude any transaction whose category type is "transfer".
// Used for spending totals, income totals, charts, and other aggregate views.
// For individual transaction display, use the matched-pair approach above.
// ---------------------------------------------------------------------------

/**
 * Exclude transactions categorized as "transfer" by category type.
 * This is the simple, reliable approach for aggregate stats.
 * Unlike matched-pair detection, this won't accidentally exclude
 * legitimate income/expenses that happen to have matching amounts.
 */
export function excludeTransfersByCategory<
  T extends { categories?: unknown }
>(transactions: T[]): T[] {
  return transactions.filter((tx) => !isTransferTx(tx));
}

// ---------------------------------------------------------------------------
// Matched-pair confirmed transfer detection
// ---------------------------------------------------------------------------
// Strategy: category labels alone are unreliable (Zelle payments, bill.com,
// etc. often get labeled "Transfer" when they're real expenses). We use
// matched pairs to CONFIRM transfers:
//
//  1. Find transactions labeled as "transfer" category
//  2. For each, look for a matching counterpart in a DIFFERENT account
//     (same |amount|, opposite sign, date ±2 days)
//  3. If pair found → CONFIRMED transfer, exclude BOTH sides
//  4. If no pair found → probably miscategorized, KEEP it
//  5. Non-transfer-labeled transactions are never excluded
// ---------------------------------------------------------------------------

export interface TransferCandidate {
  amount: number;
  date: string;
  account_id: string;
}

const TWO_DAYS_MS = 2 * 86_400_000;

/**
 * Finds confirmed transfer pairs. Only considers pairs where at least one
 * side is categorized as "transfer". Returns indices of BOTH sides.
 */
function findConfirmedTransferIndices<
  T extends TransferCandidate & { categories?: unknown }
>(transactions: T[]): Set<number> {
  // Group ALL transactions by |amount| in cents for fast lookup
  const byAmountCents = new Map<number, number[]>();
  for (let i = 0; i < transactions.length; i++) {
    const key = Math.round(Math.abs(transactions[i].amount) * 100);
    const arr = byAmountCents.get(key);
    if (arr) arr.push(i);
    else byAmountCents.set(key, [i]);
  }

  const confirmed = new Set<number>();

  for (const indices of byAmountCents.values()) {
    if (indices.length < 2) continue;

    // For each transfer-labeled transaction, find its counterpart
    for (let a = 0; a < indices.length; a++) {
      const i = indices[a];
      if (confirmed.has(i)) continue;
      if (!isTransferTx(transactions[i])) continue; // only start from labeled transfers

      for (let b = 0; b < indices.length; b++) {
        if (a === b) continue;
        const j = indices[b];
        if (confirmed.has(j)) continue;
        const other = transactions[j];
        // Protect income-category transactions from being swallowed as counterparts.
        // A $3,267 paycheck should NOT match a $3,267 savings transfer.
        const otherCat = resolveCategory(
          other.categories as { type?: string } | { type?: string }[] | null
        );
        if (otherCat?.type === "income") continue;

        const tx = transactions[i];
        if (tx.account_id === other.account_id) continue;
        if (Math.sign(tx.amount) === Math.sign(other.amount)) continue;
        const diff = Math.abs(
          new Date(tx.date + "T00:00:00").getTime() -
          new Date(other.date + "T00:00:00").getTime()
        );
        if (diff <= TWO_DAYS_MS) {
          confirmed.add(i);
          confirmed.add(j); // exclude counterpart too, even if not labeled
          break;
        }
      }
    }
  }

  return confirmed;
}

/**
 * Excludes only CONFIRMED transfers (labeled + matched pair).
 * Transfer-labeled transactions WITHOUT a matching pair are kept
 * (they're likely miscategorized expenses like Zelle, bill.com, etc.).
 */
export function excludeAllTransfers<
  T extends TransferCandidate & { categories?: unknown }
>(transactions: T[]): T[] {
  const confirmedIndices = findConfirmedTransferIndices(transactions);
  return transactions.filter((_, i) => !confirmedIndices.has(i));
}
