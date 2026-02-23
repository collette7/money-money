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
