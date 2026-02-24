"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { learnFromOverride, bulkCategorize } from "@/lib/categorization/engine";
import { categoryTypeEnum, notesSchema, tagsSchema, merchantNameSchema, ruleConditionInputSchema } from "@/lib/validation";
import { normalizeMerchantName } from "@/lib/merchant-utils";

async function getUserAccountIds(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<string[]> {
  const { data } = await supabase
    .from("accounts")
    .select("id")
    .eq("user_id", userId);
  return (data ?? []).map((a) => a.id);
}

export async function getTransactions(filters?: {
  search?: string;
  categoryId?: string;
  accountId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
  view?: "all" | "review" | "excluded";
  sortBy?: "date" | "description" | "category" | "amount" | "account";
  sortDir?: "asc" | "desc";
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const page = filters?.page ?? 1;
  const pageSize = filters?.pageSize ?? 50;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const view = filters?.view ?? "all";

  let query = supabase
    .from("transactions")
    .select(
      `
      id, date, amount, description, merchant_name, original_description, status,
      notes, tags, is_recurring, is_split, user_share_amount, categorized_by,
      category_id, account_id, ignored, review_flagged, review_flagged_reason,
      category_confirmed, category_confidence, recurring_id,
      categories ( id, name, icon, color, type ),
      accounts!account_id!inner ( id, name, institution_name, user_id, account_type ),
      recurring_rules ( frequency )
    `,
      { count: "exact" }
    )
    .eq("accounts.user_id", user.id);

  if (view === "excluded") {
    query = query.eq("ignored", true);
  } else if (view === "review") {
    query = query.eq("ignored", false).eq("review_flagged", true).eq("category_confirmed", false);
  } else {
    // "all" hides excluded by default
    query = query.eq("ignored", false);
  }

  if (filters?.search) {
    query = query.or(
      `description.ilike.%${filters.search}%,merchant_name.ilike.%${filters.search}%`
    );
  }
  if (filters?.categoryId === "uncategorized") {
    query = query.is("category_id", null);
  } else if (filters?.categoryId) {
    query = query.eq("category_id", filters.categoryId);
  }
  if (filters?.accountId) {
    query = query.eq("account_id", filters.accountId);
  }
  if (filters?.startDate) {
    query = query.gte("date", filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte("date", filters.endDate);
  }

  const sortBy = filters?.sortBy ?? "date";
  const sortDir = filters?.sortDir ?? "desc";
  const ascending = sortDir === "asc";

  // Map sort columns to actual DB columns/relations
  if (sortBy === "category") {
    query = query.order("name", { ascending, referencedTable: "categories" });
  } else if (sortBy === "account") {
    query = query.order("name", { ascending, referencedTable: "accounts" });
  } else if (sortBy === "description") {
    query = query.order("merchant_name", { ascending, nullsFirst: false });
  } else if (sortBy === "amount") {
    query = query.order("amount", { ascending });
  } else {
    query = query.order("date", { ascending });
  }

  // Always add secondary sort by date desc for stability (except when already sorting by date)
  if (sortBy !== "date") {
    query = query.order("date", { ascending: false });
  }

  query = query.range(from, to);

   const { data, count, error } = await query;

   if (error) {
     console.error("[getTransactions]", error.message);
     throw new Error("Failed to load data");
   }

   // Batch-lookup cached logo domains for all merchant names
   const transactions = data ?? [];
   const merchantNames = [...new Set(
     transactions
       .map((t) => t.merchant_name)
       .filter((n): n is string => !!n)
   )];

   let domainMap = new Map<string, string | null>();
   if (merchantNames.length > 0) {
     const normalizedNames = merchantNames.map((n) => normalizeMerchantName(n).toLowerCase()).filter(Boolean);
     const { data: cached } = await supabase
       .from("merchant_logo_cache")
       .select("merchant_name, domain")
       .eq("is_valid", true)
       .in("merchant_name", normalizedNames);

     if (cached) {
       for (const row of cached) {
         domainMap.set(row.merchant_name, row.domain);
       }
     }
   }

   const enriched = transactions.map((t) => {
     const normalized = t.merchant_name ? normalizeMerchantName(t.merchant_name).toLowerCase() : null;
     const cachedDomain = normalized ? (domainMap.get(normalized) ?? null) : null;
     return { ...t, cached_logo_domain: cachedDomain };
   });

   return {
     transactions: enriched,
     total: count ?? 0,
     page,
     pageSize,
     totalPages: Math.ceil((count ?? 0) / pageSize),
   };
}

export async function updateTransactionCategory(
  transactionId: string,
  categoryId: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const accountIds = await getUserAccountIds(supabase, user.id);
  if (accountIds.length === 0) return;

  const [{ data: tx }, { data: cat }] = await Promise.all([
    supabase
      .from("transactions")
      .select("merchant_name")
      .eq("id", transactionId)
      .in("account_id", accountIds)
      .single(),
    supabase
      .from("categories")
      .select("type")
      .eq("id", categoryId)
      .single(),
  ]);

  await supabase
    .from("transactions")
    .update({
      category_id: categoryId,
      categorized_by: "manual",
      type: cat?.type ?? null,
      category_confirmed: true,
      review_flagged: false,
      review_flagged_reason: null,
      category_confidence: null,
    })
    .eq("id", transactionId)
    .in("account_id", accountIds);

  if (tx?.merchant_name) {
    await learnFromOverride(user.id, tx.merchant_name, categoryId);
  }

  revalidatePath("/transactions");
  revalidatePath("/");
  revalidatePath("/spending");
}

export async function bulkUpdateCategory(
  transactionIds: string[],
  categoryId: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const accountIds = await getUserAccountIds(supabase, user.id);
  if (accountIds.length === 0) return;

  const { data: cat } = await supabase
    .from("categories")
    .select("type")
    .eq("id", categoryId)
    .single();

  await supabase
    .from("transactions")
    .update({
      category_id: categoryId,
      categorized_by: "manual",
      type: cat?.type ?? null,
      category_confirmed: true,
      review_flagged: false,
      review_flagged_reason: null,
      category_confidence: null,
    })
    .in("id", transactionIds)
    .in("account_id", accountIds);

  revalidatePath("/transactions");
}

export async function runAutoCategorize() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const result = await bulkCategorize(user.id);

  revalidatePath("/transactions");
  return result;
}

export async function getAccounts() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data } = await supabase
    .from("accounts")
    .select("id, name, institution_name, account_type")
    .eq("user_id", user.id)
    .order("name");

  return data ?? [];
}

export async function getCategories() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data } = await supabase
    .from("categories")
    .select("id, name, icon, color, type, parent_id")
    .or(`user_id.eq.${user.id},user_id.is.null`)
    .order("name");

  return data ?? [];
}

export async function updateTransactionNotes(
  transactionId: string,
  notes: string
) {
  const validatedNotes = notesSchema.safeParse(notes);
  if (!validatedNotes.success) throw new Error("Invalid notes");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const accountIds = await getUserAccountIds(supabase, user.id);
  if (accountIds.length === 0) return;

  await supabase
    .from("transactions")
    .update({ notes: validatedNotes.data })
    .eq("id", transactionId)
    .in("account_id", accountIds);

  revalidatePath("/transactions");
  revalidatePath("/");
}

export async function updateTransactionTags(
  transactionId: string,
  tags: string[]
) {
  const validatedTags = tagsSchema.safeParse(tags);
  if (!validatedTags.success) throw new Error("Invalid tags");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const accountIds = await getUserAccountIds(supabase, user.id);
  if (accountIds.length === 0) return;

  await supabase
    .from("transactions")
    .update({ tags: validatedTags.data })
    .eq("id", transactionId)
    .in("account_id", accountIds);

  revalidatePath("/transactions");
  revalidatePath("/");
}

export async function setTransactionRecurring(
  transactionId: string,
  frequency: string | null
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const accountIds = await getUserAccountIds(supabase, user.id);
  if (accountIds.length === 0) return { success: false, recurringId: null };

  const validFrequencies = ["weekly", "biweekly", "monthly", "quarterly", "annual"];

  if (frequency && !validFrequencies.includes(frequency)) {
    throw new Error("Invalid frequency");
  }

  const { data: tx } = await supabase
    .from("transactions")
    .select("id, merchant_name, description, amount, date, recurring_id, account_id, accounts!account_id!inner(user_id)")
    .eq("id", transactionId)
    .eq("accounts.user_id", user.id)
    .single();

  if (!tx) throw new Error("Transaction not found");

  if (!frequency) {
    await supabase
      .from("transactions")
      .update({ recurring_id: null, is_recurring: false })
      .eq("id", transactionId)
      .in("account_id", accountIds);

    revalidatePath("/");
    revalidatePath("/transactions");
    revalidatePath("/spending/recurring");
    return { success: true, recurringId: null };
  }

  const merchantPattern = (tx.merchant_name ?? tx.description ?? "").toLowerCase().trim();
  if (!merchantPattern) throw new Error("No merchant to create recurring rule");

  if (tx.recurring_id) {
    await supabase
      .from("recurring_rules")
      .update({ frequency })
      .eq("id", tx.recurring_id)
      .eq("user_id", user.id);

    revalidatePath("/");
    revalidatePath("/transactions");
    revalidatePath("/spending/recurring");
    return { success: true, recurringId: tx.recurring_id };
  }

  const { data: existingRule } = await supabase
    .from("recurring_rules")
    .select("id")
    .eq("user_id", user.id)
    .ilike("merchant_pattern", merchantPattern)
    .eq("is_active", true)
    .single();

  let ruleId: string;

  if (existingRule) {
    ruleId = existingRule.id;
    await supabase
      .from("recurring_rules")
      .update({ frequency, confirmed: true })
      .eq("id", ruleId);
  } else {
    const txDay = new Date(tx.date + "T00:00:00").getDate();
    const { data: newRule, error: insertError } = await supabase
      .from("recurring_rules")
      .insert({
        user_id: user.id,
        merchant_pattern: merchantPattern,
        merchant_name: tx.merchant_name ?? tx.description,
        expected_amount: Math.abs(tx.amount),
        frequency,
        expected_day: txDay,
        confirmed: true,
        source: "manual",
        is_active: true,
        occurrence_count: 1,
      })
      .select("id")
      .single();

    if (insertError || !newRule) throw new Error(insertError?.message ?? "Failed to create recurring rule");
    ruleId = newRule.id;
  }

  await supabase
    .from("transactions")
    .update({ recurring_id: ruleId, is_recurring: true })
    .eq("id", transactionId)
    .in("account_id", accountIds);

  let matchQuery = supabase
    .from("transactions")
    .select("id, accounts!account_id!inner(user_id)")
    .eq("accounts.user_id", user.id)
    .is("recurring_id", null)
    .neq("id", transactionId)
    .or(`merchant_name.ilike.%${merchantPattern}%,description.ilike.%${merchantPattern}%`);

  const { data: siblings } = await matchQuery.limit(500);
  if (siblings?.length) {
    const siblingIds = siblings.map((s) => s.id);
    for (let i = 0; i < siblingIds.length; i += 100) {
      const chunk = siblingIds.slice(i, i + 100);
      await supabase
        .from("transactions")
        .update({ recurring_id: ruleId, is_recurring: true })
        .in("id", chunk)
        .in("account_id", accountIds);
    }
  }

  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/spending/recurring");
  return { success: true, recurringId: ruleId };
}

export async function getMerchantTransactions(merchantName: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: accounts } = await supabase
    .from("accounts")
    .select("id")
    .eq("user_id", user.id);

  if (!accounts || accounts.length === 0) return [];

  const { data } = await supabase
    .from("transactions")
    .select("id, date, amount, description, merchant_name")
    .in("account_id", accounts.map((a) => a.id))
    .ilike("merchant_name", merchantName)
    .order("date", { ascending: false })
    .limit(100);

  return data ?? [];
}

export async function updateMerchantName(
  transactionId: string,
  merchantName: string
) {
  const validatedName = merchantNameSchema.safeParse(merchantName);
  if (!validatedName.success) throw new Error("Invalid merchant name");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const accountIds = await getUserAccountIds(supabase, user.id);
  if (accountIds.length === 0) return;

  await supabase
    .from("transactions")
    .update({ merchant_name: merchantName })
    .eq("id", transactionId)
    .in("account_id", accountIds);

  revalidatePath("/transactions");
  revalidatePath("/spending");
}

type RuleConditionInput = {
  field: string;
  operator: string;
  value: string;
  value_end?: string | null;
};

export async function createCategoryRule(
  categoryId: string,
  conditions: RuleConditionInput[],
  options?: {
    setIgnored?: boolean | null;
    setMerchantName?: string | null;
    setTags?: string[] | null;
  }
) {
  if (!conditions.length) throw new Error("At least one condition is required");
  for (const cond of conditions) {
    const validatedCond = ruleConditionInputSchema.safeParse(cond);
    if (!validatedCond.success) throw new Error("Invalid rule condition");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const primary = conditions[0];

  const { data: existing } = await supabase
    .from("category_rules")
    .select("id")
    .eq("user_id", user.id)
    .eq("field", primary.field)
    .eq("operator", primary.operator)
    .ilike("value", primary.value)
    .eq("is_active", true)
    .limit(1);

  const payload = {
    category_id: categoryId,
    field: primary.field,
    operator: primary.operator,
    value: primary.value,
    value_end: primary.value_end ?? null,
    conditions: JSON.stringify(conditions),
    set_ignored: options?.setIgnored ?? null,
    set_merchant_name: options?.setMerchantName ?? null,
    set_tags: options?.setTags ?? null,
  };

  if (existing && existing.length > 0) {
    const { error: updateError } = await supabase
      .from("category_rules")
      .update(payload)
      .eq("id", existing[0].id)
      .eq("user_id", user.id);

    if (updateError) {
      return { success: false, error: updateError.message, applied: 0 };
    }
  } else {
    const { error: insertError } = await supabase.from("category_rules").insert({
      user_id: user.id,
      ...payload,
      priority: 0,
      is_active: true,
    });

    if (insertError) {
      return { success: false, error: insertError.message, applied: 0 };
    }
  }

  const accountIds = await getUserAccountIds(supabase, user.id);
  const applied = await applyRuleRetroactively(supabase, user.id, categoryId, conditions, options, accountIds);

  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/spending");
  return { success: true, applied };
}

async function applyRuleRetroactively(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  categoryId: string,
  conditions: RuleConditionInput[],
  options: { setIgnored?: boolean | null; setMerchantName?: string | null; setTags?: string[] | null } | undefined,
  accountIds: string[]
): Promise<number> {
  const { data: cat } = await supabase
    .from("categories")
    .select("type")
    .eq("id", categoryId)
    .single();

  let query = supabase
    .from("transactions")
    .select("id, accounts!account_id!inner ( user_id )")
    .eq("accounts.user_id", userId);

  for (const cond of conditions) {
    query = applyConditionToQuery(query, cond);
  }

  const { data: matches, error: matchError } = await query.limit(1000);
  if (matchError) {
    console.error("[applyRuleRetroactively] match query failed:", matchError.message);
    return 0;
  }
  if (!matches?.length) return 0;

  const ids = matches.map((m) => m.id);
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const payload: Record<string, unknown> = {
      category_id: categoryId,
      categorized_by: "rule",
      type: cat?.type ?? null,
      category_confirmed: true,
      review_flagged: false,
    };
    if (options?.setIgnored !== undefined && options.setIgnored !== null) {
      payload.ignored = options.setIgnored;
    }
    if (options?.setMerchantName !== undefined && options.setMerchantName !== null) {
      payload.merchant_name = options.setMerchantName;
    }
    if (options?.setTags !== undefined && options.setTags !== null) {
      payload.tags = options.setTags;
    }
    const { error: updateError } = await supabase.from("transactions").update(payload).in("id", chunk).in("account_id", accountIds);
    if (updateError) {
      console.error("[applyRuleRetroactively] update failed:", updateError.message);
    }
  }

  return ids.length;
}

function applyConditionToQuery(query: any, cond: RuleConditionInput) {
  const { field, operator, value } = cond;
  const val = value.trim();

  if (field === "amount") {
    const num = Math.abs(parseFloat(val));
    switch (operator) {
      case "equals":
        return query.or(`amount.eq.${num},amount.eq.${-num}`);
      case "greater_than":
        return query.or(`amount.gt.${num},amount.lt.${-num}`);
      case "less_than":
        return query.or(`amount.lt.${num},amount.gt.${-num}`).neq("amount", num).neq("amount", -num);
      case "between": {
        const end = Math.abs(parseFloat(cond.value_end ?? val));
        const lo = Math.min(num, end);
        const hi = Math.max(num, end);
        return query.or(`and(amount.gte.${lo},amount.lte.${hi}),and(amount.gte.${-hi},amount.lte.${-lo})`);
      }
      default:
        return query;
    }
  }

  const isTextPair = field === "merchant_name" || field === "description";

  switch (operator) {
    case "contains":
      if (isTextPair) {
        return query.or(`merchant_name.ilike.%${val}%,description.ilike.%${val}%`);
      }
      return query.ilike(field, `%${val}%`);
    case "equals":
      if (isTextPair) {
        return query.or(`merchant_name.ilike.${val},description.ilike.${val}`);
      }
      return query.ilike(field, val);
    case "starts_with":
      if (isTextPair) {
        return query.or(`merchant_name.ilike.${val}%,description.ilike.${val}%`);
      }
      return query.ilike(field, `${val}%`);
    default:
      return query;
  }
}

export type SplitData = {
  personName: string;
  amount: number;
  splitType: "equal" | "custom";
};

export async function splitTransaction(
  transactionId: string,
  splits: SplitData[],
  hideOriginal: boolean = false
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const accountIds = await getUserAccountIds(supabase, user.id);
  if (accountIds.length === 0) return { success: false };

  const { data: transaction } = await supabase
    .from("transactions")
    .select("amount, account_id")
    .eq("id", transactionId)
    .in("account_id", accountIds)
    .single();

  if (!transaction) throw new Error("Transaction not found");

  const othersTotal = splits.reduce((sum, s) => sum + s.amount, 0);
  const userShare = Math.abs(transaction.amount) - othersTotal;

  await supabase
    .from("transactions")
    .update({
      is_split: true,
      user_share_amount: userShare > 0 ? userShare : 0,
    })
    .eq("id", transactionId)
    .in("account_id", accountIds);

  await supabase
    .from("transaction_splits")
    .delete()
    .eq("transaction_id", transactionId);

  for (const split of splits) {
    const { data: existingPerson } = await supabase
      .from("persons")
      .select("id")
      .eq("user_id", user.id)
      .eq("name", split.personName)
      .single();

    let personId: string;
    if (existingPerson) {
      personId = existingPerson.id;
    } else {
      const { data: newPerson } = await supabase
        .from("persons")
        .insert({ user_id: user.id, name: split.personName })
        .select("id")
        .single();
      if (!newPerson) throw new Error("Failed to create person");
      personId = newPerson.id;
    }

    await supabase.from("transaction_splits").insert({
      transaction_id: transactionId,
      person_id: personId,
      amount: split.amount,
      split_type: split.splitType,
      direction: "owed_to_me" as const,
    });
  }

  revalidatePath("/transactions");
  return { success: true };
}

export async function removeSplit(transactionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const accountIds = await getUserAccountIds(supabase, user.id);
  if (accountIds.length === 0) return { success: false };

  // Verify the transaction belongs to the user before deleting splits
  const { data: tx } = await supabase
    .from("transactions")
    .select("id")
    .eq("id", transactionId)
    .in("account_id", accountIds)
    .single();

  if (!tx) throw new Error("Transaction not found");

  await supabase
    .from("transaction_splits")
    .delete()
    .eq("transaction_id", transactionId);

  await supabase
    .from("transactions")
    .update({ is_split: false, user_share_amount: null })
    .eq("id", transactionId)
    .in("account_id", accountIds);

  revalidatePath("/transactions");
  return { success: true };
}

export async function createCategory(
  name: string,
  type: string,
  icon: string | null = null,
  color: string | null = null,
  parent_id: string | null = null
) {
  const validatedType = categoryTypeEnum.safeParse(type);
  if (!validatedType.success) throw new Error("Invalid category type");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data, error } = await supabase
    .from("categories")
    .insert({
      user_id: user.id,
      name,
      type,
      icon,
      color,
      parent_id
    })
     .select()
     .single();

   if (error) {
     console.error("[createCategory]", error.message);
     throw new Error("Failed to create record");
   }

   revalidatePath("/transactions");
   revalidatePath("/spending/breakdown");
   return data;
}

export async function getPersons() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data } = await supabase
    .from("persons")
    .select("id, name")
    .eq("user_id", user.id)
    .order("name");

  return data ?? [];
}

export async function toggleTransactionIgnored(
  transactionId: string,
  ignored: boolean
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const accountIds = await getUserAccountIds(supabase, user.id);
  if (accountIds.length === 0) return;

  await supabase
    .from("transactions")
    .update({ ignored })
    .eq("id", transactionId)
    .in("account_id", accountIds);

  revalidatePath("/transactions");
  revalidatePath("/spending");
}

export async function confirmTransactionCategory(transactionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const accountIds = await getUserAccountIds(supabase, user.id);
  if (accountIds.length === 0) return;

  await supabase
    .from("transactions")
    .update({
      category_confirmed: true,
      review_flagged: false,
      review_flagged_reason: null,
    })
    .eq("id", transactionId)
    .in("account_id", accountIds);

  revalidatePath("/transactions");
}

export async function bulkMarkReviewed(transactionIds: string[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");
  if (transactionIds.length === 0) return;

  const accountIds = await getUserAccountIds(supabase, user.id);
  if (accountIds.length === 0) return;

  for (let i = 0; i < transactionIds.length; i += 100) {
    const chunk = transactionIds.slice(i, i + 100);
    await supabase
      .from("transactions")
      .update({
        category_confirmed: true,
        review_flagged: false,
        review_flagged_reason: null,
      })
      .in("id", chunk)
      .in("account_id", accountIds);
  }

  revalidatePath("/transactions");
  revalidatePath("/spending");
}

export async function getTransactionViewCounts() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { review: 0, excluded: 0 };

  const { data: accounts } = await supabase
    .from("accounts")
    .select("id")
    .eq("user_id", user.id);

  if (!accounts || accounts.length === 0) return { review: 0, excluded: 0 };

  const accountIds = accounts.map((a) => a.id);

  const [reviewResult, excludedResult] = await Promise.all([
    supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .in("account_id", accountIds)
      .eq("ignored", false)
      .eq("review_flagged", true)
      .eq("category_confirmed", false),
    supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .in("account_id", accountIds)
      .eq("ignored", true),
  ]);

  return {
    review: reviewResult.count ?? 0,
    excluded: excludedResult.count ?? 0,
  };
}

export async function checkRuleExists(merchantName: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data } = await supabase
    .from("category_rules")
    .select("id")
    .eq("user_id", user.id)
    .eq("field", "merchant_name")
    .ilike("value", merchantName)
    .eq("is_active", true)
    .limit(1);

  return (data?.length ?? 0) > 0;
}

export async function previewRuleMatches(
  conditions: RuleConditionInput[]
) {
  if (!conditions.length || !conditions[0].value?.trim()) return { count: 0, samples: [] };
  for (const cond of conditions) {
    const validatedCond = ruleConditionInputSchema.safeParse(cond);
    if (!validatedCond.success) throw new Error("Invalid rule condition");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  let query = supabase
    .from("transactions")
    .select(
      "id, description, merchant_name, amount, date, accounts!account_id!inner ( user_id )",
      { count: "exact" }
    )
    .eq("accounts.user_id", user.id);

  for (const cond of conditions) {
    query = applyConditionToQuery(query, cond);
  }

  query = query.order("date", { ascending: false }).limit(5);

  const { data, count } = await query;

  return {
    count: count ?? 0,
    samples: (data ?? []).map((t) => ({
      id: t.id,
      description: t.description,
      merchant_name: t.merchant_name,
      amount: t.amount,
      date: t.date,
    })),
  };
}
