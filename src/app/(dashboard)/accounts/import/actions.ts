"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/audit-log";
import { mapCategoryName } from "@/lib/category-map";

interface TransactionInput {
  date: string;
  amount: number;
  description: string;
  merchantName?: string;
  originalDescription?: string;
  categoryName?: string;
  accountName?: string;
  type?: string;
  tags?: string[];
  notes?: string;
}

interface NewAccountData {
  name: string;
  type: string;
  institution: string;
}

// ---------------------------------------------------------------------------
// Account matching: parse "SoFi - SoFi Checking (6275)" → match by last4 + institution
// ---------------------------------------------------------------------------

interface DBAccount {
  id: string;
  name: string;
  institution_name: string | null;
  account_type: string | null;
}

function parseCSVAccountName(raw: string): {
  institution: string;
  accountName: string;
  last4: string | null;
} {
  // Format: "Institution - Account Name (XXXX)" or "Institution - Account Name"
  const last4Match = raw.match(/\((\d{4})\)\s*$/);
  const last4 = last4Match ? last4Match[1] : null;
  const withoutLast4 = raw.replace(/\s*\(\d{4}\)\s*$/, "").trim();

  const dashIdx = withoutLast4.indexOf(" - ");
  if (dashIdx > 0) {
    return {
      institution: withoutLast4.slice(0, dashIdx).trim(),
      accountName: withoutLast4.slice(dashIdx + 3).trim(),
      last4,
    };
  }
  return { institution: withoutLast4, accountName: withoutLast4, last4 };
}

function matchAccount(
  csvAccountName: string,
  dbAccounts: DBAccount[]
): DBAccount | null {
  const parsed = parseCSVAccountName(csvAccountName);

  // Best match: last4 digits + institution
  if (parsed.last4) {
    const match = dbAccounts.find(
      (a) =>
        a.name.includes(parsed.last4!) &&
        (a.institution_name ?? "")
          .toLowerCase()
          .includes(parsed.institution.toLowerCase())
    );
    if (match) return match;

    // Fallback: last4 only (cross-institution edge case)
    const last4Only = dbAccounts.find((a) => a.name.includes(parsed.last4!));
    if (last4Only) return last4Only;
  }

  // Fuzzy: institution + account name keywords
  const instLower = parsed.institution.toLowerCase();
  const nameLower = parsed.accountName.toLowerCase();
  const match = dbAccounts.find((a) => {
    const dbInst = (a.institution_name ?? "").toLowerCase();
    const dbName = a.name.toLowerCase();
    return (
      (dbInst.includes(instLower) || instLower.includes(dbInst)) &&
      (dbName.includes(nameLower) ||
        nameLower.includes(dbName) ||
        // Handle keyword overlap: "Checking", "Savings", "Credit", "Platinum"
        nameLower.split(/\s+/).some((w) => w.length > 3 && dbName.includes(w)))
    );
  });

  return match ?? null;
}

// ---------------------------------------------------------------------------
// Category modes
// ---------------------------------------------------------------------------

export type CategoryMode = "map" | "keep" | "skip";

// ---------------------------------------------------------------------------
// Dedup: composite key (account_id, date, amount, description)
// ---------------------------------------------------------------------------

function dedupKey(
  accountId: string,
  date: string,
  amount: number,
  description: string
): string {
  // Round amount to 2 decimals to avoid float issues
  return `${accountId}|${date}|${Math.round(amount * 100)}|${description.toLowerCase().trim()}`;
}

// ---------------------------------------------------------------------------
// Main import function
// ---------------------------------------------------------------------------

export async function importTransactions(payload: {
  accountId: string | null;
  newAccountData: NewAccountData | null;
  transactions: TransactionInput[];
  skipDuplicates?: boolean;
  categoryMode?: CategoryMode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const skipDuplicates = payload.skipDuplicates ?? true;

  // Load user's accounts
  const { data: dbAccounts } = await supabase
    .from("accounts")
    .select("id, name, institution_name, account_type")
    .eq("user_id", user.id);
  const accounts: DBAccount[] = dbAccounts ?? [];

  // Load user's categories for mapping
  const { data: dbCategories } = await supabase
    .from("categories")
    .select("id, name, type")
    .or(`user_id.eq.${user.id},user_id.is.null`);
  const categories = dbCategories ?? [];
  const categoryByName = new Map(
    categories.map((c) => [c.name.toLowerCase(), c])
  );

  // Determine if this is multi-account (transactions have accountName) or single-account
  const hasAccountColumn = payload.transactions.some((tx) => tx.accountName);

  // For single-account mode, resolve the target account
  let singleAccountId = payload.accountId;
  if (!hasAccountColumn) {
    if (!singleAccountId && payload.newAccountData) {
      const { data: newAccount, error: accountError } = await supabase
        .from("accounts")
        .insert({
          user_id: user.id,
          name: payload.newAccountData.name,
          account_type: payload.newAccountData.type,
          institution_name: payload.newAccountData.institution,
          balance: 0,
          currency: "USD",
          sync_method: "manual",
          last_synced: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (accountError || !newAccount) {
        return { success: false, error: "Failed to create account", inserted: 0, skipped: 0 };
      }
      singleAccountId = newAccount.id;
    }
    if (!singleAccountId) {
      return { success: false, error: "No account specified", inserted: 0, skipped: 0 };
    }
  }

  // Route each transaction to an account
  const accountCache = new Map<string, string | null>();
  const unmatchedAccounts = new Set<string>();

  function resolveAccountId(tx: TransactionInput): string | null {
    if (!hasAccountColumn) return singleAccountId;

    const csvName = tx.accountName ?? "";
    if (!csvName) return singleAccountId;

    if (accountCache.has(csvName)) return accountCache.get(csvName)!;

    const matched = matchAccount(csvName, accounts);
    const id = matched?.id ?? null;
    accountCache.set(csvName, id);
    if (!id) unmatchedAccounts.add(csvName);
    return id;
  }

  // Resolve category based on mode
  const categoryMode = payload.categoryMode ?? "map";

  // "keep" mode: auto-create missing categories so they appear in Edit Categories
  if (categoryMode === "keep") {
    const missingNames = new Map<string, string>(); // lowercase → original casing
    for (const tx of payload.transactions) {
      if (!tx.categoryName) continue;
      const key = tx.categoryName.toLowerCase().trim();
      if (!categoryByName.has(key) && !missingNames.has(key)) {
        missingNames.set(key, tx.categoryName.trim());
      }
    }

    if (missingNames.size > 0) {
      // Infer category type from the first transaction that uses each category
      const typeByName = new Map<string, string>();
      for (const tx of payload.transactions) {
        if (!tx.categoryName) continue;
        const key = tx.categoryName.toLowerCase().trim();
        if (missingNames.has(key) && !typeByName.has(key) && tx.type) {
          const t = tx.type.toLowerCase();
          if (t === "income") typeByName.set(key, "income");
          else if (t === "transfer") typeByName.set(key, "transfer");
          else typeByName.set(key, "expense");
        }
      }

      const newCats = [...missingNames.entries()].map(([key, name]) => ({
        user_id: user.id,
        name,
        type: typeByName.get(key) ?? "expense",
      }));

      const { data: created } = await supabase
        .from("categories")
        .insert(newCats)
        .select("id, name, type");

      if (created) {
        for (const c of created) {
          categoryByName.set(c.name.toLowerCase(), c);
        }
      }
    }
  }

  function resolveCategoryId(tx: TransactionInput): string | null {
    if (!tx.categoryName) return null;

    if (categoryMode === "skip") return null;

    if (categoryMode === "keep") {
      // Direct match — includes newly auto-created categories
      const cat = categoryByName.get(tx.categoryName.toLowerCase().trim());
      return cat?.id ?? null;
    }

    // "map" mode: translate external name → our internal name
    const ourName = mapCategoryName(tx.categoryName);
    if (!ourName) return null;
    const cat = categoryByName.get(ourName.toLowerCase());
    return cat?.id ?? null;
  }

  // Build rows with account routing + category mapping
  const rows: Array<{
    account_id: string;
    date: string;
    amount: number;
    description: string;
    original_description: string;
    merchant_name: string;
    category_id: string | null;
    type: string | null;
    is_recurring: boolean;
    tags: string[];
    notes: string | null;
    is_split: boolean;
    categorized_by: string | null;
    status: string;
  }> = [];

  let skippedNoAccount = 0;

  for (const tx of payload.transactions) {
    const accountId = resolveAccountId(tx);
    if (!accountId) {
      skippedNoAccount++;
      continue;
    }

    const categoryId = resolveCategoryId(tx);
    const catRecord = categoryId
      ? categories.find((c) => c.id === categoryId)
      : null;

    // Use merchantName if provided, otherwise clean up description
    const merchantName =
      tx.merchantName ??
      tx.description
        .replace(
          /\b(POS|DEBIT|CREDIT|PURCHASE|PAYMENT|ACH|TRANSFER)\b/gi,
          ""
        )
        .replace(/\d{2,}/g, "")
        .replace(/\s{2,}/g, " ")
        .trim();

    rows.push({
      account_id: accountId,
      date: tx.date,
      amount: tx.amount,
      description: tx.originalDescription ?? tx.description,
      original_description: tx.originalDescription ?? tx.description,
      merchant_name: merchantName,
      category_id: categoryId,
      type: catRecord?.type ?? null,
      is_recurring: false,
      tags: tx.tags ?? [],
      notes: tx.notes ?? null,
      is_split: false,
      categorized_by: categoryId ? "manual" : null,
      status: "cleared",
    });
  }

  // Log unmatched accounts but allow partial import
  const unmatchedCount = skippedNoAccount;

  // Dedup: load existing transactions for affected accounts + date range
  let skippedDupes = 0;
  let finalRows = rows;

  if (skipDuplicates && rows.length > 0) {
    const affectedAccountIds = [...new Set(rows.map((r) => r.account_id))];
    const dates = rows.map((r) => r.date).sort();
    const minDate = dates[0];
    const maxDate = dates[dates.length - 1];

    // Expand date range by ±2 days for fuzzy matching against SimpleFIN txns
    const padDate = (d: string, days: number) => {
      const dt = new Date(d + "T00:00:00");
      dt.setDate(dt.getDate() + days);
      return dt.toISOString().split("T")[0];
    };
    const fuzzyMinDate = padDate(minDate, -2);
    const fuzzyMaxDate = padDate(maxDate, 2);

    // Phase 1: Exact-match dedup (same account, date, amount, description)
    const existingKeys = new Set<string>();
    for (const accId of affectedAccountIds) {
      const { data: existing } = await supabase
        .from("transactions")
        .select("date, amount, description, original_description")
        .eq("account_id", accId)
        .gte("date", minDate)
        .lte("date", maxDate);

      if (existing) {
        for (const ex of existing) {
          // Check against both description and original_description
          existingKeys.add(
            dedupKey(accId, ex.date, ex.amount, ex.description ?? "")
          );
          if (ex.original_description && ex.original_description !== ex.description) {
            existingKeys.add(
              dedupKey(accId, ex.date, ex.amount, ex.original_description)
            );
          }
        }
      }
    }

    // Phase 2: Fuzzy dedup against SimpleFIN-synced transactions
    // CSV descriptions differ from SimpleFIN (e.g. "Uber" vs "Uber Trip help.uber.com CA").
    // Match by account + amount + date ±2 days where simplefin_id is set.
    type SFTxn = { date: string; amount: number };
    const sfTxnsByAccount = new Map<string, SFTxn[]>();
    for (const accId of affectedAccountIds) {
      const { data: sfExisting } = await supabase
        .from("transactions")
        .select("date, amount")
        .eq("account_id", accId)
        .not("simplefin_id", "is", null)
        .gte("date", fuzzyMinDate)
        .lte("date", fuzzyMaxDate);

      if (sfExisting && sfExisting.length > 0) {
        sfTxnsByAccount.set(accId, sfExisting);
      }
    }

    finalRows = rows.filter((r) => {
      // Phase 1: exact key match
      const key = dedupKey(
        r.account_id,
        r.date,
        r.amount,
        r.original_description
      );
      const key2 = dedupKey(
        r.account_id,
        r.date,
        r.amount,
        r.description
      );
      if (existingKeys.has(key) || existingKeys.has(key2)) {
        skippedDupes++;
        return false;
      }

      // Phase 2: fuzzy match against SimpleFIN transactions
      const sfTxns = sfTxnsByAccount.get(r.account_id);
      if (sfTxns) {
        const csvAmt = Math.round(r.amount * 100);
        const csvDate = new Date(r.date + "T00:00:00").getTime();
        const hasSFMatch = sfTxns.some((sf) => {
          const sfAmt = Math.round(sf.amount * 100);
          const sfDate = new Date(sf.date + "T00:00:00").getTime();
          return csvAmt === sfAmt && Math.abs(csvDate - sfDate) <= 2 * 86400000;
        });
        if (hasSFMatch) {
          skippedDupes++;
          return false;
        }
      }

      return true;
    });
  }

  // Insert in batches
  const BATCH_SIZE = 500;
  let inserted = 0;

  for (let i = 0; i < finalRows.length; i += BATCH_SIZE) {
    const batch = finalRows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("transactions").insert(batch);

    if (error) {
      return {
        success: false,
        error: `Failed to insert batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`,
        inserted,
        skipped: skippedDupes,
      };
    }

    inserted += batch.length;
  }

  // Clean up pending transactions that now have a matching cleared counterpart.
  // Pending txns from SimpleFIN often have slightly different dates (±2 days).
  const affectedAccountIds = [...new Set(finalRows.map((r) => r.account_id))];
  let resolvedPending = 0;
  if (inserted > 0) {
    for (const accId of affectedAccountIds) {
      const { data: pendingTxns } = await supabase
        .from("transactions")
        .select("id, date, amount")
        .eq("account_id", accId)
        .eq("status", "pending");

      if (pendingTxns && pendingTxns.length > 0) {
        // Build a set of (amount, date) from newly inserted cleared rows for fast lookup
        const clearedLookup = new Map<number, string[]>();
        for (const r of finalRows.filter((r) => r.account_id === accId)) {
          const key = Math.round(r.amount * 100);
          if (!clearedLookup.has(key)) clearedLookup.set(key, []);
          clearedLookup.get(key)!.push(r.date);
        }

        const toDelete: string[] = [];
        for (const p of pendingTxns) {
          const key = Math.round(p.amount * 100);
          const matchDates = clearedLookup.get(key);
          if (!matchDates) continue;
          // Check if any cleared transaction is within ±2 days
          const pDate = new Date(p.date + "T00:00:00").getTime();
          const hasMatch = matchDates.some((d) => {
            const cDate = new Date(d + "T00:00:00").getTime();
            return Math.abs(cDate - pDate) <= 2 * 86400000;
          });
          if (hasMatch) toDelete.push(p.id);
        }

        if (toDelete.length > 0) {
          await supabase.from("transactions").delete().in("id", toDelete);
          resolvedPending += toDelete.length;
        }
      }
    }
  }

  // Update last_synced for affected accounts
  for (const accId of affectedAccountIds) {
    await supabase
      .from("accounts")
      .update({ last_synced: new Date().toISOString() })
      .eq("id", accId);
  }

  await createAuditLog({
    action: "transaction.import",
    entityType: "account",
    entityId: affectedAccountIds[0] ?? singleAccountId ?? "multi",
    metadata: {
      transactionsImported: inserted,
      duplicatesSkipped: skippedDupes,
      skippedNoAccount,
      newAccount: !!payload.newAccountData,
      multiAccount: hasAccountColumn,
      accountsAffected: affectedAccountIds.length,
      success: true,
    },
  });

  revalidatePath("/accounts");
  revalidatePath("/transactions");
  revalidatePath("/spending");

  return {
    success: true,
    inserted,
    skipped: skippedDupes,
    resolvedPending,
    skippedNoAccount: unmatchedCount,
    unmatchedAccounts: [...unmatchedAccounts],
    accountId: singleAccountId ?? affectedAccountIds[0],
  };
}

export async function getAccounts() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data } = await supabase
    .from("accounts")
    .select("id, name, institution_name, account_type")
    .eq("user_id", user.id)
    .order("name");

  return data ?? [];
}
