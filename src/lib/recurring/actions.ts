"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { RecurringFrequency, RecurringSource } from "@/types/database";
import {
  matchTransactionToRule,
  computeNextExpected,
  detectRecurringPattern,
  type RecurringRuleMatch,
  type TransactionCandidate,
} from "./matcher";
import { recurringRuleInputSchema } from "@/lib/validation";

export async function getRecurringRules() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data } = await supabase
    .from("recurring_rules")
    .select("*, categories(id, name, icon, color)")
    .eq("user_id", user.id)
    .order("merchant_pattern");

  return data ?? [];
}

export async function createRecurringRule(input: {
  merchantPattern: string;
  merchantName?: string | null;
  categoryId?: string | null;
  expectedAmount?: number | null;
  frequency?: RecurringFrequency;
  expectedDay?: number | null;
  confirmed?: boolean | null;
  source?: RecurringSource;
  nextExpected?: string | null;
  occurrenceCount?: number;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const validatedRule = recurringRuleInputSchema.safeParse({
    expectedAmount: input.expectedAmount ?? undefined,
    expectedDay: input.expectedDay ?? undefined,
  });
  if (!validatedRule.success) throw new Error("Invalid recurring rule input");

  const { data, error } = await supabase
    .from("recurring_rules")
    .insert({
      user_id: user.id,
      merchant_pattern: input.merchantPattern,
      merchant_name: input.merchantName ?? null,
      category_id: input.categoryId ?? null,
      expected_amount: input.expectedAmount ?? null,
      frequency: input.frequency ?? "monthly",
      expected_day: input.expectedDay ?? null,
      confirmed: input.confirmed ?? null,
      source: input.source ?? "manual",
      next_expected: input.nextExpected ?? null,
      occurrence_count: input.occurrenceCount ?? 0,
      is_active: true,
    })
    .select("id")
     .single();

   if (error) {
     console.error("[createRecurringRule]", error.message);
     throw new Error("Failed to create record");
   }

   revalidatePath("/spending/recurring");
   return data;
}

export async function updateRecurringRule(
  ruleId: string,
  updates: {
    merchantPattern?: string;
    merchantName?: string | null;
    categoryId?: string | null;
    expectedAmount?: number | null;
    frequency?: RecurringFrequency;
    expectedDay?: number | null;
    nextExpected?: string | null;
    isActive?: boolean;
    confirmed?: boolean | null;
    endDate?: string | null;
    stopAfter?: number | null;
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const validatedRule = recurringRuleInputSchema.safeParse({
    expectedAmount: updates.expectedAmount ?? undefined,
    expectedDay: updates.expectedDay ?? undefined,
  });
  if (!validatedRule.success) throw new Error("Invalid recurring rule input");

  const dbUpdates: Record<string, unknown> = {};
  if (updates.merchantPattern !== undefined) dbUpdates.merchant_pattern = updates.merchantPattern;
  if (updates.merchantName !== undefined) dbUpdates.merchant_name = updates.merchantName;
  if (updates.categoryId !== undefined) dbUpdates.category_id = updates.categoryId;
  if (updates.expectedAmount !== undefined) dbUpdates.expected_amount = updates.expectedAmount;
  if (updates.frequency !== undefined) dbUpdates.frequency = updates.frequency;
  if (updates.expectedDay !== undefined) dbUpdates.expected_day = updates.expectedDay;
  if (updates.nextExpected !== undefined) dbUpdates.next_expected = updates.nextExpected;
  if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
  if (updates.confirmed !== undefined) dbUpdates.confirmed = updates.confirmed;
  if (updates.endDate !== undefined) dbUpdates.end_date = updates.endDate;
  if (updates.stopAfter !== undefined) dbUpdates.stop_after = updates.stopAfter;

  await supabase
    .from("recurring_rules")
    .update(dbUpdates)
    .eq("id", ruleId)
    .eq("user_id", user.id);

  revalidatePath("/spending/recurring");
}

export async function deleteRecurringRule(ruleId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: accounts } = await supabase
    .from("accounts")
    .select("id")
    .eq("user_id", user.id);
  const accountIds = (accounts ?? []).map((a) => a.id);

  if (accountIds.length > 0) {
    await supabase
      .from("transactions")
      .update({ recurring_id: null })
      .eq("recurring_id", ruleId)
      .in("account_id", accountIds);
  }

  await supabase
    .from("recurring_rules")
    .delete()
    .eq("id", ruleId)
    .eq("user_id", user.id);

  revalidatePath("/spending/recurring");
}

export async function matchRecurringOnImport(userId: string, transactionIds: string[]) {
  if (transactionIds.length === 0) return { matched: 0 };

  const supabase = await createClient();

  const { data: rules } = await supabase
    .from("recurring_rules")
    .select("id, merchant_pattern, category_id, expected_amount, frequency, expected_day")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (!rules || rules.length === 0) return { matched: 0 };

  const ruleMatches: RecurringRuleMatch[] = rules.map((r) => ({
    ruleId: r.id,
    merchantPattern: r.merchant_pattern,
    categoryId: r.category_id,
    expectedAmount: r.expected_amount ? Number(r.expected_amount) : null,
    frequency: r.frequency as RecurringFrequency,
    expectedDay: r.expected_day,
  }));

  const { data: transactions } = await supabase
    .from("transactions")
    .select("id, merchant_name, description, amount, date, is_recurring, recurring_id")
    .in("id", transactionIds);

  if (!transactions) return { matched: 0 };

  let matched = 0;

  for (const tx of transactions) {
    const candidate: TransactionCandidate = {
      id: tx.id,
      merchantName: tx.merchant_name,
      description: tx.description,
      amount: tx.amount,
      date: tx.date,
      isRecurring: tx.is_recurring,
      recurringId: tx.recurring_id,
    };

    const rule = matchTransactionToRule(candidate, ruleMatches);
    if (!rule) continue;

    const nextExpected = computeNextExpected(tx.date, rule.frequency, rule.expectedDay);

    await supabase
      .from("transactions")
      .update({
        recurring_id: rule.ruleId,
        is_recurring: true,
        category_id: rule.categoryId ?? undefined,
      })
      .eq("id", tx.id);

    await supabase
      .from("recurring_rules")
      .update({
        last_matched_at: new Date().toISOString(),
        next_expected: nextExpected,
      })
      .eq("id", rule.ruleId)
      .eq("user_id", userId);

    matched++;
  }

  return { matched };
}

export async function linkTransferAccounts(
  transactionId: string,
  toAccountId: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: accounts } = await supabase
    .from("accounts")
    .select("id")
    .eq("user_id", user.id);
  const accountIds = (accounts ?? []).map((a) => a.id);
  if (accountIds.length === 0) return;

  await supabase
    .from("transactions")
    .update({ to_account_id: toAccountId })
    .eq("id", transactionId)
    .in("account_id", accountIds);

  revalidatePath("/transactions");
}

export async function confirmRecurringPattern(input: {
  merchantName: string;
  merchantPattern: string;
  expectedAmount: number;
  frequency: RecurringFrequency;
  expectedDay: number;
  categoryId?: string | null;
  occurrenceCount?: number;
}) {
  const validatedRule = recurringRuleInputSchema.safeParse({
    expectedAmount: input.expectedAmount,
    expectedDay: input.expectedDay,
  });
  if (!validatedRule.success) throw new Error("Invalid recurring pattern input");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const lastDate = new Date().toISOString().split("T")[0];
  const nextExpected = computeNextExpected(lastDate, input.frequency, input.expectedDay);

  const { data, error } = await supabase
    .from("recurring_rules")
    .insert({
      user_id: user.id,
      merchant_pattern: input.merchantPattern,
      merchant_name: input.merchantName,
      category_id: input.categoryId ?? null,
      expected_amount: input.expectedAmount,
      frequency: input.frequency,
      expected_day: input.expectedDay,
      next_expected: nextExpected,
      confirmed: true,
      source: "detected" as const,
      occurrence_count: input.occurrenceCount ?? 0,
      is_active: true,
    })
     .select("id")
     .single();

   if (error) {
     console.error("[confirmRecurringPattern]", error.message);
     throw new Error("Failed to create record");
   }

   revalidatePath("/spending/recurring");
   return data;
}

export async function dismissRecurringPattern(input: {
  merchantName: string;
  merchantPattern: string;
  expectedAmount: number;
  frequency: RecurringFrequency;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data, error } = await supabase
    .from("recurring_rules")
    .insert({
      user_id: user.id,
      merchant_pattern: input.merchantPattern,
      merchant_name: input.merchantName,
      expected_amount: input.expectedAmount,
      frequency: input.frequency,
      confirmed: false,
      dismissed_at: new Date().toISOString(),
      source: "detected" as const,
      is_active: false,
    })
     .select("id")
     .single();

   if (error) {
     console.error("[dismissRecurringPattern]", error.message);
     throw new Error("Failed to create record");
   }

   revalidatePath("/spending/recurring");
   return data;
}

export async function undoDismissRecurringPattern(ruleId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  await supabase
    .from("recurring_rules")
    .delete()
    .eq("id", ruleId)
    .eq("user_id", user.id);

  revalidatePath("/spending/recurring");
}

export async function getConfirmedRecurringRules() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data } = await supabase
    .from("recurring_rules")
    .select("*, categories(id, name, icon, color, type)")
    .eq("user_id", user.id)
    .eq("confirmed", true)
    .eq("is_active", true)
    .order("next_expected");

  return data ?? [];
}

export async function getDismissedMerchantPatterns() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data } = await supabase
    .from("recurring_rules")
    .select("merchant_pattern")
    .eq("user_id", user.id)
    .eq("confirmed", false);

  return new Set((data ?? []).map(r => r.merchant_pattern.toLowerCase()));
}

export async function getUpcomingBills() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: rules } = await supabase
    .from("recurring_rules")
    .select("*, categories(id, name, icon, color)")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .not("next_expected", "is", null)
    .order("next_expected");

  const today = new Date();
  const thirtyDaysOut = new Date();
  thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);

  return (rules ?? []).filter((r) => {
    if (!r.next_expected) return false;
    const d = new Date(r.next_expected);
    return d >= today && d <= thirtyDaysOut;
  });
}
