"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { claimAccessUrl, fetchAccounts } from "@/lib/simplefin/client";
import { syncSimpleFinAccounts } from "@/lib/simplefin/sync";
import { encrypt } from "@/lib/encryption";
import { simpleFinTokenSchema, paymentDueDaySchema } from "@/lib/validation";
import { createAuditLog } from "@/lib/audit-log";
// import { autoDetectSubscriptions } from "../subscriptions/actions";

function accountTypeFromName(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("checking")) return "checking";
  if (lower.includes("saving")) return "savings";
  if (lower.includes("credit")) return "credit";
  if (lower.includes("invest") || lower.includes("brokerage") || lower.includes("401k") || lower.includes("ira"))
    return "investment";
  if (lower.includes("loan") || lower.includes("mortgage")) return "loan";
  return "checking";
}

export async function connectSimpleFin(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const result = simpleFinTokenSchema.safeParse({
    token: formData.get("token"),
    lookback: formData.get("lookback") || "90",
  });

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const errorMsg = errors.token?.[0] || errors.lookback?.[0] || "Invalid input";
    redirect(`/accounts/connect?error=${encodeURIComponent(errorMsg)}`);
  }

  const { token: setupToken, lookback: lookbackDays } = result.data;

  let accessUrl: string;
  try {
    accessUrl = await claimAccessUrl(setupToken);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to claim token";
    redirect(`/accounts/connect?error=${encodeURIComponent(msg)}`);
  }

  let sfAccounts;
  try {
    const accountSet = await fetchAccounts(accessUrl, { balancesOnly: true });
    if (accountSet.errors.length > 0) {
      redirect(
        `/accounts/connect?error=${encodeURIComponent(accountSet.errors.join(", "))}`
      );
    }
    sfAccounts = accountSet.accounts;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to fetch accounts";
    redirect(`/accounts/connect?error=${encodeURIComponent(msg)}`);
  }

  for (const sfAccount of sfAccounts) {
    const { error } = await supabase.from("accounts").insert({
      user_id: user.id,
      institution_name: sfAccount.org.name || sfAccount.org.domain || "Unknown",
      institution_domain: sfAccount.org.domain || sfAccount.org.url || null,
      account_type: accountTypeFromName(sfAccount.name),
      name: sfAccount.name,
      balance: parseFloat(sfAccount.balance),
      currency: sfAccount.currency,
      sync_method: "simplefin",
      simplefin_access_url: encrypt(accessUrl),
      simplefin_account_id: sfAccount.id,
    });

    if (error) {
      console.error("Failed to insert account:", error);
    }
  }

  await createAuditLog({
    action: "account.connect",
    entityType: "account",
    metadata: {
      accountsConnected: sfAccounts.length,
      institutions: [...new Set(sfAccounts.map(a => a.org.name || a.org.domain))],
      lookbackDays,
      success: true
    }
  });

  // Auto-sync transactions immediately after connecting accounts
  try {
    await syncSimpleFinAccounts(user.id, lookbackDays);
  } catch {
    // Non-blocking — accounts are connected, sync can be retried manually
  }

  revalidatePath("/accounts");
  revalidatePath("/transactions");
  redirect("/accounts");
}

export async function syncAccounts() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const result = await syncSimpleFinAccounts(user.id);
  
  await createAuditLog({
    action: "account.sync",
    metadata: {
      accountsSynced: result.synced,
      errors: result.errors,
      success: result.errors.length === 0
    }
  });

  // Auto-detect recurring charges as subscriptions
  // try {
  //   await autoDetectSubscriptions();
  // } catch {
  //   // Non-blocking
  // }

  revalidatePath("/accounts");
  revalidatePath("/transactions");
  revalidatePath("/subscriptions");

  const totalTransactions = result.details
    ? result.details.reduce((sum, d) => sum + d.transactions, 0)
    : 0;
  const accountCount = result.details ? result.details.length : result.synced;

  return {
    success: result.errors.length === 0,
    accounts: accountCount,
    transactions: totalTransactions,
    error:
      result.errors.length > 0
        ? `Failed to sync: ${result.errors.join(", ")}`
        : null,
  };
}

const AUTO_SYNC_COOLDOWN_MS = 3 * 60 * 60 * 1000;

export async function autoSyncIfNeeded(): Promise<{
  synced: boolean;
  reason: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { synced: false, reason: "not_authenticated" };

  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, last_synced")
    .eq("user_id", user.id)
    .eq("sync_method", "simplefin")
    .not("simplefin_access_url", "is", null);

  if (!accounts || accounts.length === 0) {
    return { synced: false, reason: "no_simplefin_accounts" };
  }

  const mostRecentSync = accounts.reduce<Date | null>((latest, acc) => {
    if (!acc.last_synced) return latest;
    const d = new Date(acc.last_synced);
    return !latest || d > latest ? d : latest;
  }, null);

  if (mostRecentSync) {
    const elapsed = Date.now() - mostRecentSync.getTime();
    if (elapsed < AUTO_SYNC_COOLDOWN_MS) {
      return { synced: false, reason: "cooldown" };
    }
  }

  try {
    await syncSimpleFinAccounts(user.id);
    revalidatePath("/accounts");
    revalidatePath("/transactions");
    revalidatePath("/spending");
    return { synced: true, reason: "success" };
  } catch {
    return { synced: false, reason: "sync_failed" };
  }
}

export async function deleteAccount(accountId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  await supabase.from("accounts").delete().eq("id", accountId).eq("user_id", user.id);

  revalidatePath("/accounts");
}

export async function updatePaymentDueDay(accountId: string, day: number | null) {
  const validatedDay = paymentDueDaySchema.safeParse(day);
  if (!validatedDay.success) throw new Error("Invalid payment due day");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  await supabase
    .from("accounts")
    .update({ payment_due_day: day })
    .eq("id", accountId)
    .eq("user_id", user.id);

  revalidatePath("/spending/recurring");
}
