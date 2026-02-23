"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/audit-log";

interface TransactionInput {
  date: string;
  amount: number;
  description: string;
  category?: string;
}

interface NewAccountData {
  name: string;
  type: string;
  institution: string;
}

export async function importTransactions(payload: {
  accountId: string | null;
  newAccountData: NewAccountData | null;
  transactions: TransactionInput[];
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  let accountId = payload.accountId;

  if (!accountId && payload.newAccountData) {
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
      return { success: false, error: "Failed to create account" };
    }

    accountId = newAccount.id;
  }

  if (!accountId) {
    return { success: false, error: "No account specified" };
  }

  const rows = payload.transactions.map((tx) => ({
    account_id: accountId,
    date: tx.date,
    amount: tx.amount,
    description: tx.description,
    original_description: tx.description,
    merchant_name: tx.description
      .replace(/\b(POS|DEBIT|CREDIT|PURCHASE|PAYMENT|ACH|TRANSFER)\b/gi, "")
      .replace(/\d{2,}/g, "")
      .replace(/\s{2,}/g, " ")
      .trim(),
    category: tx.category || null,
    is_recurring: false,
    tags: [] as string[],
    is_split: false,
  }));

  const BATCH_SIZE = 500;
  let inserted = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("transactions").insert(batch);

    if (error) {
      return {
        success: false,
        error: `Failed to insert batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`,
        inserted,
      };
    }

    inserted += batch.length;
  }

  const totalAmount = payload.transactions.reduce((sum, tx) => sum + tx.amount, 0);
  await supabase
    .from("accounts")
    .update({
      balance: totalAmount,
      last_synced: new Date().toISOString(),
    })
    .eq("id", accountId);

  await createAuditLog({
    action: "transaction.import",
    entityType: "account",
    entityId: accountId,
    metadata: {
      transactionsImported: inserted,
      newAccount: !!payload.newAccountData,
      totalAmount,
      success: true
    }
  });

  revalidatePath("/accounts");
  revalidatePath("/transactions");

  return { success: true, inserted, accountId };
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
