"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updateCategories(
  updates: Array<{
    id: string;
    name: string;
    emoji: string | null;
    color: string | null;
    parent_id: string | null;
    excluded_from_budget: boolean;
    sort_order: number;
  }>
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  for (const update of updates) {
    const { error } = await supabase
      .from("categories")
      .update({
        name: update.name,
        emoji: update.emoji,
        color: update.color,
        parent_id: update.parent_id,
        excluded_from_budget: update.excluded_from_budget,
        sort_order: update.sort_order,
      })
      .eq("id", update.id)
      .or(`user_id.eq.${user.id},user_id.is.null`);

    if (error) throw new Error(`Failed to update category ${update.id}: ${error.message}`);
  }

  revalidatePath("/spending/breakdown");
  return { updated: updates.length };
}

export async function deleteCategory(categoryId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  await supabase
    .from("categories")
    .update({ parent_id: null })
    .eq("parent_id", categoryId)
    .or(`user_id.eq.${user.id},user_id.is.null`);

  const { data: userAccounts } = await supabase
    .from("accounts")
    .select("id")
    .eq("user_id", user.id);

  if (userAccounts && userAccounts.length > 0) {
    const accountIds = userAccounts.map((a) => a.id);
    await supabase
      .from("transactions")
      .update({ category_id: null })
      .eq("category_id", categoryId)
      .in("account_id", accountIds);
  }

  await supabase
    .from("budget_items")
    .delete()
    .eq("category_id", categoryId);

   const { error } = await supabase
     .from("categories")
     .delete()
     .eq("id", categoryId)
     .or(`user_id.eq.${user.id},user_id.is.null`);

   if (error) {
     console.error("[deleteCategory]", error.message);
     throw new Error("Failed to delete record");
   }

   revalidatePath("/spending/breakdown");
   return { deleted: true };
}

export async function toggleCategoryRollover(categoryId: string, enabled: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

   const { error } = await supabase
     .from("categories")
     .update({ enable_rollover: enabled })
     .eq("id", categoryId)
     .or(`user_id.eq.${user.id},user_id.is.null`);

   if (error) {
     console.error("[toggleCategoryRollover]", error.message);
     throw new Error("Failed to update record");
   }

   const { error: childrenError } = await supabase
     .from("categories")
     .update({ enable_rollover: enabled })
     .eq("parent_id", categoryId)
     .or(`user_id.eq.${user.id},user_id.is.null`);

   if (childrenError) {
     console.error("[toggleCategoryRollover]", childrenError.message);
     throw new Error("Failed to update record");
   }

   revalidatePath("/spending/breakdown");
}

export async function toggleCategoryExclusion(categoryId: string, excluded: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

   const { error } = await supabase
     .from("categories")
     .update({ excluded_from_budget: excluded })
     .eq("id", categoryId)
     .or(`user_id.eq.${user.id},user_id.is.null`);

   if (error) {
     console.error("[toggleCategoryExclusion]", error.message);
     throw new Error("Failed to update record");
   }

   const { error: childrenError } = await supabase
     .from("categories")
     .update({ excluded_from_budget: excluded })
     .eq("parent_id", categoryId)
     .or(`user_id.eq.${user.id},user_id.is.null`);

   if (childrenError) {
     console.error("[toggleCategoryExclusion]", childrenError.message);
     throw new Error("Failed to update record");
   }

   revalidatePath("/spending/breakdown");
}
