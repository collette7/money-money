import { createClient } from "@/lib/supabase/server";

const DATE_TOLERANCE_DAYS = 3;

type UnlinkedTransaction = {
  id: string;
  account_id: string;
  amount: number;
  date: string;
  to_account_id: string | null;
  category_id: string | null;
  type: string | null;
};

export type TransferPair = {
  outflowId: string;
  inflowId: string;
  outflowAccountId: string;
  inflowAccountId: string;
  amount: number;
  date: string;
};

function daysBetween(a: string, b: string): number {
  const da = new Date(a + "T00:00:00").getTime();
  const db = new Date(b + "T00:00:00").getTime();
  return Math.abs(da - db) / (1000 * 60 * 60 * 24);
}

export function detectTransferPairs(
  transactions: UnlinkedTransaction[]
): TransferPair[] {
  const pairs: TransferPair[] = [];
  const matched = new Set<string>();

  const negatives = transactions.filter((t) => t.amount < 0);
  const positives = transactions.filter((t) => t.amount > 0);

  for (const outflow of negatives) {
    if (matched.has(outflow.id)) continue;
    const absAmount = Math.abs(outflow.amount);

    let bestMatch: UnlinkedTransaction | null = null;
    let bestGap = Infinity;

    for (const inflow of positives) {
      if (matched.has(inflow.id)) continue;
      if (inflow.account_id === outflow.account_id) continue;
      if (Math.abs(inflow.amount - absAmount) > 0.01) continue;

      const gap = daysBetween(outflow.date, inflow.date);
      if (gap > DATE_TOLERANCE_DAYS) continue;

      if (gap < bestGap) {
        bestGap = gap;
        bestMatch = inflow;
      }
    }

    if (bestMatch) {
      matched.add(outflow.id);
      matched.add(bestMatch.id);
      pairs.push({
        outflowId: outflow.id,
        inflowId: bestMatch.id,
        outflowAccountId: outflow.account_id,
        inflowAccountId: bestMatch.account_id,
        amount: absAmount,
        date: outflow.date,
      });
    }
  }

  return pairs;
}

export async function detectAndLinkTransfers(userId: string): Promise<number> {
  const supabase = await createClient();

  const { data: accounts } = await supabase
    .from("accounts")
    .select("id")
    .eq("user_id", userId);

  if (!accounts || accounts.length < 2) return 0;

  const accountIds = accounts.map((a) => a.id);

  const { data: transferCats } = await supabase
    .from("categories")
    .select("id")
    .eq("type", "transfer")
    .eq("name", "Transfer")
    .limit(1);

  const transferCategoryId = transferCats?.[0]?.id ?? null;

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const startDate = sixMonthsAgo.toISOString().split("T")[0];

  const { data: transactions } = await supabase
    .from("transactions")
    .select("id, account_id, amount, date, to_account_id, category_id, type")
    .in("account_id", accountIds)
    .is("to_account_id", null)
    .gte("date", startDate)
    .order("date", { ascending: false });

  if (!transactions || transactions.length === 0) return 0;

  const pairs = detectTransferPairs(transactions as UnlinkedTransaction[]);

  for (const pair of pairs) {
    const outflowUpdate: Record<string, unknown> = {
      to_account_id: pair.inflowAccountId,
    };
    const inflowUpdate: Record<string, unknown> = {
      to_account_id: pair.outflowAccountId,
    };

    if (transferCategoryId) {
      outflowUpdate.category_id = transferCategoryId;
      outflowUpdate.type = "transfer";
      outflowUpdate.categorized_by = "default";
      outflowUpdate.review_flagged = false;
      inflowUpdate.category_id = transferCategoryId;
      inflowUpdate.type = "transfer";
      inflowUpdate.categorized_by = "default";
      inflowUpdate.review_flagged = false;
    }

    await Promise.all([
      supabase.from("transactions").update(outflowUpdate).eq("id", pair.outflowId).in("account_id", accountIds),
      supabase.from("transactions").update(inflowUpdate).eq("id", pair.inflowId).in("account_id", accountIds),
    ]);
  }

  return pairs.length;
}

export async function detectTransfersForNewTransactions(
  userId: string,
  newTransactionIds: string[]
): Promise<number> {
  if (newTransactionIds.length === 0) return 0;

  const supabase = await createClient();

  const { data: newTxs } = await supabase
    .from("transactions")
    .select("id, account_id, amount, date, to_account_id, category_id, type")
    .in("id", newTransactionIds);

  if (!newTxs || newTxs.length === 0) return 0;

  const newAccountIds = new Set(newTxs.map((t) => t.account_id as string));

  const { data: accounts } = await supabase
    .from("accounts")
    .select("id")
    .eq("user_id", userId);

  if (!accounts || accounts.length < 2) return 0;

  const otherAccountIds = accounts
    .map((a) => a.id)
    .filter((id) => !newAccountIds.has(id));

  if (otherAccountIds.length === 0 && newAccountIds.size < 2) return 0;

  const dates = newTxs.map((t) => t.date as string);
  const minDate = new Date(
    Math.min(...dates.map((d) => new Date(d + "T00:00:00").getTime()))
  );
  minDate.setDate(minDate.getDate() - DATE_TOLERANCE_DAYS);
  const maxDate = new Date(
    Math.max(...dates.map((d) => new Date(d + "T00:00:00").getTime()))
  );
  maxDate.setDate(maxDate.getDate() + DATE_TOLERANCE_DAYS);

  const allAccountIds = accounts.map((a) => a.id);

  const { data: candidates } = await supabase
    .from("transactions")
    .select("id, account_id, amount, date, to_account_id, category_id, type")
    .in("account_id", allAccountIds)
    .is("to_account_id", null)
    .gte("date", minDate.toISOString().split("T")[0])
    .lte("date", maxDate.toISOString().split("T")[0]);

  if (!candidates || candidates.length === 0) return 0;

  const { data: transferCats } = await supabase
    .from("categories")
    .select("id")
    .eq("type", "transfer")
    .eq("name", "Transfer")
    .limit(1);

  const transferCategoryId = transferCats?.[0]?.id ?? null;

  const pairs = detectTransferPairs(candidates as UnlinkedTransaction[]);

  const relevantPairs = pairs.filter(
    (p) =>
      newTransactionIds.includes(p.outflowId) ||
      newTransactionIds.includes(p.inflowId)
  );

  for (const pair of relevantPairs) {
    const outflowUpdate: Record<string, unknown> = {
      to_account_id: pair.inflowAccountId,
    };
    const inflowUpdate: Record<string, unknown> = {
      to_account_id: pair.outflowAccountId,
    };

    if (transferCategoryId) {
      outflowUpdate.category_id = transferCategoryId;
      outflowUpdate.type = "transfer";
      outflowUpdate.categorized_by = "default";
      outflowUpdate.review_flagged = false;
      inflowUpdate.category_id = transferCategoryId;
      inflowUpdate.type = "transfer";
      inflowUpdate.categorized_by = "default";
      inflowUpdate.review_flagged = false;
    }

    const allAccountIds = accounts.map((a) => a.id);
    await Promise.all([
      supabase.from("transactions").update(outflowUpdate).eq("id", pair.outflowId).in("account_id", allAccountIds),
      supabase.from("transactions").update(inflowUpdate).eq("id", pair.inflowId).in("account_id", allAccountIds),
    ]);
  }

  return relevantPairs.length;
}
