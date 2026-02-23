"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const goalInputSchema = z.object({
  name: z.string().min(1).max(100),
  targetAmount: z.number().positive().finite(),
  currentAmount: z.number().min(0).finite(),
  contributionAmount: z.number().min(0).finite(),
});

export async function getGoals() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data } = await supabase
    .from("savings_goals")
    .select(
      `
      id, name, icon, color, target_amount, current_amount,
      deadline, contribution_amount, contribution_frequency,
      custom_interval_days, linked_account_id, priority,
      status, created_at, completed_at
    `
    )
    .eq("user_id", user.id)
    .order("priority", { ascending: true });

  return data ?? [];
}

export async function createGoal(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const validated = goalInputSchema.safeParse({
    name: formData.get("name"),
    targetAmount: parseFloat(formData.get("targetAmount") as string),
    currentAmount: parseFloat((formData.get("currentAmount") as string) || "0"),
    contributionAmount: parseFloat((formData.get("contributionAmount") as string) || "0"),
  });
  if (!validated.success) {
    throw new Error("Invalid goal input");
  }

  const { error } = await supabase.from("savings_goals").insert({
    user_id: user.id,
    name: validated.data.name,
    target_amount: validated.data.targetAmount,
    current_amount: validated.data.currentAmount,
    deadline: (formData.get("deadline") as string) || null,
    contribution_amount: validated.data.contributionAmount,
    contribution_frequency:
      (formData.get("contributionFrequency") as string) || "monthly",
    icon: (formData.get("icon") as string) || null,
    color: (formData.get("color") as string) || null,
     status: "active",
   });

   if (error) {
     console.error("[createGoal]", error.message);
     throw new Error("Failed to create record");
   }

   revalidatePath("/goals");
}

const goalUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  target_amount: z.number().positive().finite().optional(),
  current_amount: z.number().min(0).finite().optional(),
  contribution_amount: z.number().min(0).finite().optional(),
  contribution_frequency: z.string().max(50).optional(),
  deadline: z.string().max(50).nullable().optional(),
  icon: z.string().max(50).nullable().optional(),
  color: z.string().max(50).nullable().optional(),
  status: z.enum(["active", "completed", "paused"]).optional(),
  priority: z.number().int().min(0).max(1000).optional(),
}).strict();

export async function updateGoal(goalId: string, updates: Record<string, unknown>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const validated = goalUpdateSchema.safeParse(updates);
  if (!validated.success) {
    throw new Error("Invalid goal update");
  }

  await supabase.from("savings_goals").update(validated.data).eq("id", goalId).eq("user_id", user.id);

  revalidatePath("/goals");
}

export async function addContribution(
  goalId: string,
  amount: number,
  type: "scheduled" | "manual" | "extra" = "manual",
  notes?: string
) {
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000_000) {
    throw new Error("Invalid contribution amount");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: goal } = await supabase
    .from("savings_goals")
    .select("id, current_amount, target_amount")
    .eq("id", goalId)
    .eq("user_id", user.id)
    .single();

  if (!goal) throw new Error("Goal not found");

  await supabase.from("goal_contributions").insert({
    goal_id: goalId,
    amount,
    date: new Date().toISOString().split("T")[0],
    type,
    notes: notes ?? null,
  });

  if (goal) {
    const newAmount = goal.current_amount + amount;
    const updates: Record<string, unknown> = { current_amount: newAmount };

    if (newAmount >= goal.target_amount) {
      updates.status = "completed";
      updates.completed_at = new Date().toISOString();
    }

    await supabase.from("savings_goals").update(updates).eq("id", goalId).eq("user_id", user.id);
  }

  revalidatePath("/goals");
}

export async function deleteGoal(goalId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  await supabase.from("savings_goals").delete().eq("id", goalId).eq("user_id", user.id);

  revalidatePath("/goals");
}

export async function getGoalContributions(goalId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: goal } = await supabase
    .from("savings_goals")
    .select("id")
    .eq("id", goalId)
    .eq("user_id", user.id)
    .single();

  if (!goal) return [];

  const { data } = await supabase
    .from("goal_contributions")
    .select("id, amount, date, type, notes, created_at")
    .eq("goal_id", goalId)
    .order("date", { ascending: false });

  return data ?? [];
}
