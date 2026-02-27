import { createClient } from "@/lib/supabase/server";
import {
  fetchAccounts,
  type SimpleFinAccount,
  type SimpleFinTransaction,
} from "./client";
import { decrypt, encrypt } from "@/lib/encryption";
import {
  prefetchCategorizationData,
  categorizeTransactionWithCache,
  type PrefetchedData,
} from "@/lib/categorization/engine";

const LOG_PREFIX = "[SimpleFIN Sync]";
export async function syncSimpleFinAccounts(userId: string, initialLookbackDays?: number) {
  const supabase = await createClient();

  const { data: accounts, error } = await supabase
    .from("accounts")
    .select("id, simplefin_account_id, simplefin_access_url, last_synced")
    .eq("user_id", userId)
    .eq("sync_method", "simplefin")
    .not("simplefin_access_url", "is", null);

  if (error || !accounts?.length) {
    return { synced: 0, errors: error ? [error.message] : [] };
  }


  const results: { accountId: string; transactions: number; error?: string }[] =
    [];

  const accessUrlGroups = new Map<string, typeof accounts>();
  for (const account of accounts) {
    const url = account.simplefin_access_url;
    if (!accessUrlGroups.has(url)) {
      accessUrlGroups.set(url, []);
    }
    accessUrlGroups.get(url)!.push(account);
  }

  for (const [encryptedAccessUrl, groupAccounts] of accessUrlGroups) {
    const MAX_SIMPLEFIN_DAYS = 360;
    // Always re-fetch at least this many days to catch retroactively posted transactions.
    // Dedup by simplefin_id makes overlapping fetches harmless.
    const SAFETY_BUFFER_DAYS = 3;
    const fallbackDate = new Date();
    fallbackDate.setDate(fallbackDate.getDate() - 90);

    const { count: existingTxCount } = await supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .in("account_id", groupAccounts.map((a) => a.id));

    const isFirstSync = (existingTxCount ?? 0) === 0;

    let oldestSync: Date;
    if (isFirstSync && initialLookbackDays) {
      oldestSync = new Date();
      oldestSync.setDate(oldestSync.getDate() - initialLookbackDays);
    } else if (isFirstSync) {
      oldestSync = new Date();
      oldestSync.setFullYear(oldestSync.getFullYear() - 5);
    } else {
      const rawOldestSync = groupAccounts.reduce((oldest, acc) => {
        if (!acc.last_synced) return fallbackDate;
        const syncDate = new Date(acc.last_synced);
        return syncDate < oldest ? syncDate : oldest;
      }, new Date());
      // Apply safety buffer — go back N days before last_synced to catch
      // transactions that posted retroactively at the institution.
      oldestSync = new Date(rawOldestSync);
      oldestSync.setDate(oldestSync.getDate() - SAFETY_BUFFER_DAYS);
    }

    let accessUrl: string;
    try {
      accessUrl = decrypt(encryptedAccessUrl);
    } catch {
      for (const acc of groupAccounts) {
        results.push({
          accountId: acc.id,
          transactions: 0,
          error: "Failed to decrypt access URL. Re-link your account.",
        });
      }
      continue;
    }

    try {
      const now = new Date();
      const daysDiff = Math.ceil((now.getTime() - oldestSync.getTime()) / (1000 * 60 * 60 * 24));
      const needsChunking = daysDiff > MAX_SIMPLEFIN_DAYS;

      const chunks: { start: Date; end: Date }[] = [];
      if (needsChunking) {
        let chunkEnd = new Date(now);
        while (chunkEnd > oldestSync) {
          const chunkStart = new Date(chunkEnd);
          chunkStart.setDate(chunkStart.getDate() - MAX_SIMPLEFIN_DAYS);
          if (chunkStart < oldestSync) chunkStart.setTime(oldestSync.getTime());
          chunks.push({ start: chunkStart, end: chunkEnd });
          chunkEnd = new Date(chunkStart);
        }
      } else {
        chunks.push({ start: oldestSync, end: now });
      }

      const accTxCounts = new Map<string, number>();
      let lastAccountSet: Awaited<ReturnType<typeof fetchAccounts>> | null = null;

      for (const chunk of chunks) {
        const accountSet = await fetchAccounts(accessUrl, {
          startDate: chunk.start,
          endDate: needsChunking ? chunk.end : undefined,
          pending: true,
        });


        if (accountSet.errors.length > 0) {
          for (const acc of groupAccounts) {
            results.push({
              accountId: acc.id,
              transactions: 0,
              error: accountSet.errors.join(", "),
            });
          }
          continue;
        }

        if (!lastAccountSet) lastAccountSet = accountSet;

        for (const acc of groupAccounts) {
          const sfAccount = accountSet.accounts.find(
            (a) => a.id === acc.simplefin_account_id
          );
          if (!sfAccount) {
            continue;
          }

          const txCount = await upsertTransactions(
            supabase,
            acc.id,
            userId,
            sfAccount.transactions ?? []
          );
          accTxCounts.set(acc.id, (accTxCounts.get(acc.id) ?? 0) + txCount);
        }
      }

      for (const acc of groupAccounts) {
        const sfAccount = lastAccountSet?.accounts.find(
          (a) => a.id === acc.simplefin_account_id
        );

        if (!sfAccount) {
          if (!results.some((r) => r.accountId === acc.id)) {
            results.push({
              accountId: acc.id,
              transactions: 0,
              error: "Account not found in SimpleFIN response",
            });
          }
          continue;
        }

        const updatePayload: Record<string, unknown> = {
          balance: parseFloat(sfAccount.balance),
          last_synced: new Date().toISOString(),
        };
        if (sfAccount.org.domain || sfAccount.org.url) {
          updatePayload.institution_domain = sfAccount.org.domain || sfAccount.org.url
        }
        await supabase
          .from("accounts")
          .update(updatePayload)
          .eq("id", acc.id);

        if (!results.some((r) => r.accountId === acc.id)) {
          results.push({ accountId: acc.id, transactions: accTxCounts.get(acc.id) ?? 0 });
        }
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown sync error";
      for (const acc of groupAccounts) {
        if (!results.some((r) => r.accountId === acc.id)) {
          results.push({ accountId: acc.id, transactions: 0, error: message });
        }
      }
    }
  }

  await createNetWorthSnapshot(supabase, userId);

  return {
    synced: results.filter((r) => !r.error).length,
    errors: results.filter((r) => r.error).map((r) => r.error!),
    details: results,
  };
}

async function upsertTransactions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  accountId: string,
  userId: string,
  transactions: SimpleFinTransaction[]
) {
  if (transactions.length === 0) {
    return 0;
  }

  const rows = transactions.map((tx) => ({
    account_id: accountId,
    date: new Date((tx.transacted_at || tx.posted) * 1000)
      .toISOString()
      .split("T")[0],
    amount: parseFloat(tx.amount),
    description: tx.description,
    original_description: tx.description,
    merchant_name: extractMerchantName(tx.description),
    is_recurring: false,
    tags: [] as string[],
    is_split: false,
    simplefin_id: tx.id,
    status: tx.pending ? "pending" : "cleared",
    review_flagged: true,
    review_flagged_reason: "new_import",
    category_confirmed: false,
  }));

  // Layer 0: Within-batch dedup — when SimpleFIN returns both pending and
  // cleared versions of the same transaction in one response, keep only cleared.
  // Match: same amount (cents) + same date.
  const batchDeduped = (() => {
    const grouped = new Map<string, typeof rows>();
    for (const row of rows) {
      const key = `${Math.round(row.amount * 100)}|${row.date}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(row);
    }
    const result: typeof rows = [];
    let dropped = 0;
    for (const group of grouped.values()) {
      if (group.length <= 1) {
        result.push(...group);
        continue;
      }
      const cleared = group.filter((r) => r.status !== "pending");
      const pending = group.filter((r) => r.status === "pending");
      if (cleared.length > 0 && pending.length > 0) {
        result.push(...cleared);
        // Keep excess pending rows (more pending than cleared = some are legit)
        const excess = pending.slice(cleared.length);
        result.push(...excess);
        dropped += pending.length - excess.length;
      } else {
        result.push(...group);
      }
    }
    if (dropped > 0) {
      console.log(
        LOG_PREFIX,
        `[upsert] account=${accountId}: batch-deduped ${dropped} pending txn(s) with cleared counterparts`
      );
    }
    return result;
  })();

  const { data: existing } = await supabase
    .from("transactions")
    .select("simplefin_id")
    .eq("account_id", accountId)
    .in(
      "simplefin_id",
      batchDeduped.map((r) => r.simplefin_id)
    );

  const existingIds = new Set(existing?.map((e) => e.simplefin_id) ?? []);
  const newRows = batchDeduped.filter((r) => !existingIds.has(r.simplefin_id));

  if (newRows.length === 0) {
    return 0;
  }

  // Layer 2: Fuzzy dedup — catch same transaction with changed simplefin_id
  // (pending→posted ID change, description update, etc.)
  // Match: same account + same amount (cents) + date within ±2 days.
  // When matched, update the existing row instead of inserting a duplicate.
  const fuzzyMatchedSfIds = new Set<string>();

  const newDates = newRows.map((r) => new Date(r.date + "T00:00:00").getTime());
  const minDate = new Date(Math.min(...newDates));
  const maxDate = new Date(Math.max(...newDates));
  minDate.setDate(minDate.getDate() - 2);
  maxDate.setDate(maxDate.getDate() + 2);

  const { data: candidates } = await supabase
    .from("transactions")
    .select("id, date, amount, simplefin_id")
    .eq("account_id", accountId)
    .gte("date", minDate.toISOString().split("T")[0])
    .lte("date", maxDate.toISOString().split("T")[0]);

  if (candidates && candidates.length > 0) {
    const matchedExistingIds = new Set<string>();

    for (const row of newRows) {
      const rAmt = Math.round(parseFloat(String(row.amount)) * 100);
      const rDate = new Date(row.date + "T00:00:00").getTime();

      for (const c of candidates) {
        if (matchedExistingIds.has(c.id)) continue;
        // Skip if same simplefin_id — already handled by Layer 1
        if (c.simplefin_id === row.simplefin_id) continue;

        const cAmt = Math.round(c.amount * 100);
        const cDate = new Date(c.date + "T00:00:00").getTime();

        if (rAmt === cAmt && Math.abs(rDate - cDate) <= 2 * 86400000) {
          // Match — update existing row's bank-controlled fields only.
          // Preserves user data (category, tags, recurring, review status).
          await supabase
            .from("transactions")
            .update({
              simplefin_id: row.simplefin_id,
              description: row.description,
              original_description: row.original_description,
              status: row.status,
            })
            .eq("id", c.id);

          fuzzyMatchedSfIds.add(row.simplefin_id);
          matchedExistingIds.add(c.id);
          break; // one match per new row
        }
      }
    }

    if (fuzzyMatchedSfIds.size > 0) {
      console.log(
        LOG_PREFIX,
        `[upsert] account=${accountId}: fuzzy-deduped ${fuzzyMatchedSfIds.size} transaction(s)`
      );
    }
  }

  const trulyNewRows = newRows.filter((r) => !fuzzyMatchedSfIds.has(r.simplefin_id));

  if (trulyNewRows.length === 0) {
    return 0;
  }

  const { error, data: inserted } = await supabase
    .from("transactions")
    .insert(trulyNewRows)
    .select("id, merchant_name, description, amount, account_id");

  if (error) {
    console.error(LOG_PREFIX, `[upsert] account=${accountId}: INSERT FAILED —`, error.message);
    throw new Error(`Failed to insert transactions: ${error.message}`);
  }

  // Layer 3: Post-insert pending cleanup — delete stale pending transactions
  // when cleared counterparts were just inserted. Catches cross-sync dupes
  // where pending was inserted in a prior sync and cleared arrives now.
  const clearedInserted = trulyNewRows.filter((r) => r.status === "cleared");
  if (clearedInserted.length > 0) {
    const cDates = clearedInserted.map((r) => new Date(r.date + "T00:00:00").getTime());
    const cMin = new Date(Math.min(...cDates));
    cMin.setDate(cMin.getDate() - 2);
    const cMax = new Date(Math.max(...cDates));
    cMax.setDate(cMax.getDate() + 2);

    const { data: pendingInRange } = await supabase
      .from("transactions")
      .select("id, amount, date, simplefin_id")
      .eq("account_id", accountId)
      .eq("status", "pending")
      .gte("date", cMin.toISOString().split("T")[0])
      .lte("date", cMax.toISOString().split("T")[0]);

    if (pendingInRange && pendingInRange.length > 0) {
      const toDelete: string[] = [];
      const usedClearedIdx = new Set<number>();

      for (const p of pendingInRange) {
        const pAmt = Math.round(p.amount * 100);
        const pDate = new Date(p.date + "T00:00:00").getTime();

        for (let i = 0; i < clearedInserted.length; i++) {
          if (usedClearedIdx.has(i)) continue;
          const cAmt = Math.round(parseFloat(String(clearedInserted[i].amount)) * 100);
          const cDate = new Date(clearedInserted[i].date + "T00:00:00").getTime();

          if (pAmt === cAmt && Math.abs(pDate - cDate) <= 2 * 86400000) {
            toDelete.push(p.id);
            usedClearedIdx.add(i);
            break;
          }
        }
      }

      if (toDelete.length > 0) {
        await supabase
          .from("transactions")
          .delete()
          .in("id", toDelete);
        console.log(
          LOG_PREFIX,
          `[upsert] account=${accountId}: cleaned up ${toDelete.length} pending dupe(s) replaced by cleared counterparts`
        );
      }
    }
  }

  if (inserted?.length) {
    await categorizeNewTransactions(supabase, userId, inserted);

    const { matchRecurringOnImport } = await import("@/lib/recurring/actions");
    await matchRecurringOnImport(userId, inserted.map((t) => t.id));

    const { detectTransfersForNewTransactions } = await import(
      "@/lib/transfers/detector"
    );
    await detectTransfersForNewTransactions(
      userId,
      inserted.map((t) => t.id)
    );

    // Fire-and-forget: validate merchant logos for new transactions
    const merchantNames = [...new Set(
      inserted
        .map((t) => t.merchant_name)
        .filter((n): n is string => !!n)
    )]
    if (merchantNames.length > 0) {
      import("@/lib/merchant-logo-cache").then(({ batchValidateMerchants }) => {
        batchValidateMerchants(merchantNames).then((results) => {
          const validCount = [...results.values()].filter((r) => r.isValid).length
        }).catch((err) => {
          console.error(LOG_PREFIX, "[logo-cache] Batch validation failed:", err instanceof Error ? err.message : err)
        })
      }).catch(() => {
        // Import failure should not block sync
      })
    }
  }

  return trulyNewRows.length;
}

async function categorizeNewTransactions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  transactions: Array<{
    id: string;
    merchant_name: string | null;
    description: string;
    amount: number;
    account_id: string;
  }>
) {
  let cache: PrefetchedData;
  try {
    cache = await prefetchCategorizationData(userId);
  } catch {
    return;
  }

  const updates: Array<{
    id: string;
    category_id: string;
    categorized_by: string;
    type: string | null;
    category_confirmed: boolean;
    category_confidence: number | null;
    set_ignored: boolean | null;
    set_merchant_name: string | null;
    set_tags: string[] | null;
  }> = [];

  for (const tx of transactions) {
    try {
      const result = categorizeTransactionWithCache(tx, cache);
      if (result) {
        updates.push({
          id: tx.id,
          category_id: result.categoryId,
          categorized_by: result.method,
          type: cache.categoryTypes.get(result.categoryId) ?? null,
          category_confirmed: result.method === "rule",
          category_confidence: result.confidence ?? null,
          set_ignored: result.setIgnored ?? null,
          set_merchant_name: result.setMerchantName ?? null,
          set_tags: result.setTags ?? null,
        });
      }
    } catch {
      // categorization failure should not block import
    }
  }

  for (let i = 0; i < updates.length; i += 50) {
    const chunk = updates.slice(i, i + 50);
    await Promise.all(
      chunk.map((u) => {
        const isRuleMatch = u.category_confirmed;
        const payload: Record<string, unknown> = {
          category_id: u.category_id,
          categorized_by: u.categorized_by,
          type: u.type,
          category_confidence: u.category_confidence,
          category_confirmed: isRuleMatch,
          review_flagged: !isRuleMatch,
          review_flagged_reason: isRuleMatch ? null : "new_import",
        };
        if (u.set_ignored !== null) payload.ignored = u.set_ignored;
        if (u.set_merchant_name !== null) payload.merchant_name = u.set_merchant_name;
        if (u.set_tags !== null) payload.tags = u.set_tags;
        return supabase.from("transactions").update(payload).eq("id", u.id);
      })
    );
  }
}

function extractMerchantName(description: string): string {
  return description
    .replace(/<[^>]*>/g, "")
    .replace(/&[a-zA-Z0-9#]+;/g, "")
    .replace(/\b(POS|DEBIT|CREDIT|PURCHASE|PAYMENT|ACH|TRANSFER)\b/gi, "")
    .replace(/\d{2,}/g, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 200);
}

export async function importSimpleFinAccounts(
  userId: string,
  accessUrl: string
): Promise<SimpleFinAccount[]> {
  const accountSet = await fetchAccounts(accessUrl, { balancesOnly: true });

  if (accountSet.errors.length > 0) {
    throw new Error(accountSet.errors.join(", "));
  }

  return accountSet.accounts;
}

async function createNetWorthSnapshot(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const { data: accounts } = await supabase
    .from("accounts")
    .select("account_type, balance")
    .eq("user_id", userId);

  if (!accounts?.length) return;

  const assetTypes = ["checking", "savings", "investment"];
  const liabilityTypes = ["credit", "loan"];

  const totalAssets = accounts
    .filter((a) => assetTypes.includes(a.account_type))
    .reduce((sum, a) => sum + (a.balance ?? 0), 0);

  const totalLiabilities = accounts
    .filter((a) => liabilityTypes.includes(a.account_type))
    .reduce((sum, a) => sum + Math.abs(a.balance ?? 0), 0);

  const today = new Date().toISOString().split("T")[0];

  await supabase.from("net_worth_snapshots").upsert(
    {
      user_id: userId,
      date: today,
      total_assets: totalAssets,
      total_liabilities: totalLiabilities,
      net_worth: totalAssets - totalLiabilities,
    },
    { onConflict: "user_id,date" }
  );
}
