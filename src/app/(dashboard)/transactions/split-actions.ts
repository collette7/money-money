"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function getPersons() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data } = await supabase
    .from("persons")
    .select("id, name, email, phone")
    .eq("user_id", user.id)
    .order("name");

  return data ?? [];
}

export async function createPerson(name: string, email?: string, phone?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data, error } = await supabase
    .from("persons")
    .insert({
      user_id: user.id,
      name,
      email: email ?? null,
      phone: phone ?? null,
    })
     .select("id, name")
     .single();

   if (error) {
     console.error("[createPerson]", error.message);
     throw new Error("Failed to create record");
   }
   return data;
}

export async function splitTransaction(
  transactionId: string,
  splits: {
    personId: string;
    amount: number;
    splitType: "equal" | "custom" | "percentage";
    direction: "owed_to_me" | "i_owe";
    notes?: string;
  }[]
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  await supabase.from("transaction_splits").delete().eq("transaction_id", transactionId);

  if (splits.length > 0) {
    const { error } = await supabase.from("transaction_splits").insert(
      splits.map((s) => ({
        transaction_id: transactionId,
        person_id: s.personId,
        amount: s.amount,
        split_type: s.splitType,
        direction: s.direction,
        notes: s.notes ?? null,
        is_settled: false,
       }))
     );

     if (error) {
       console.error("[splitTransaction]", error.message);
       throw new Error("Failed to create record");
     }

     const userShare = splits.reduce((total, s) => {
      return s.direction === "owed_to_me" ? total - s.amount : total;
    }, 0);

    const { data: tx } = await supabase
      .from("transactions")
      .select("amount")
      .eq("id", transactionId)
      .single();

    if (tx) {
      await supabase
        .from("transactions")
        .update({
          is_split: true,
          user_share_amount: Math.abs(tx.amount) + userShare,
        })
        .eq("id", transactionId);
    }
  } else {
    await supabase
      .from("transactions")
      .update({ is_split: false, user_share_amount: null })
      .eq("id", transactionId);
  }

  revalidatePath("/transactions");
}

export async function getTransactionSplits(transactionId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("transaction_splits")
    .select("id, person_id, amount, split_type, direction, is_settled, settled_date, settled_method, notes, persons ( name )")
    .eq("transaction_id", transactionId);

  return data ?? [];
}

export async function settleSplit(
  splitId: string,
  method: "cash" | "venmo" | "zelle" | "other"
) {
  const supabase = await createClient();

  await supabase
    .from("transaction_splits")
    .update({
      is_settled: true,
      settled_date: new Date().toISOString().split("T")[0],
      settled_method: method,
    })
    .eq("id", splitId);

  revalidatePath("/transactions");
}

export async function getSplitSummary() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: splits } = await supabase
    .from("transaction_splits")
    .select("amount, direction, is_settled, person_id, persons ( name )")
    .eq("is_settled", false);

  if (!splits?.length) {
    return { owedToMe: 0, iOwe: 0, byPerson: [] };
  }

  let owedToMe = 0;
  let iOwe = 0;
  const personBalances = new Map<string, { name: string; balance: number }>();

  for (const split of splits) {
    const personName = (split.persons as unknown as { name: string } | null)?.name ?? "Unknown";

    if (split.direction === "owed_to_me") {
      owedToMe += split.amount;
      const existing = personBalances.get(split.person_id) ?? { name: personName, balance: 0 };
      existing.balance += split.amount;
      personBalances.set(split.person_id, existing);
    } else {
      iOwe += split.amount;
      const existing = personBalances.get(split.person_id) ?? { name: personName, balance: 0 };
      existing.balance -= split.amount;
      personBalances.set(split.person_id, existing);
    }
  }

  return {
    owedToMe,
    iOwe,
    byPerson: Array.from(personBalances.entries()).map(([id, data]) => ({
      personId: id,
      ...data,
    })),
  };
}
