"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { resolveCategory } from "@/lib/transfer-filter";
import { getAISettings, chatCompletion, type AIMessage } from "@/lib/ai/provider";
import {
  FINANCIAL_ADVISOR_SYSTEM,
  CATEGORIZE_SYSTEM,
  BUDGET_SYSTEM,
  buildFinancialContext,
  buildCategorizationPrompt,
  buildBudgetPrompt,
} from "@/lib/ai/prompts";
import { chatMessageSchema } from "@/lib/validation";

async function requireAI(userId: string) {
  const settings = await getAISettings(userId);
  if (!settings) {
    throw new Error("AI not configured. Add your API key in Settings → AI Configuration.");
  }
  return settings;
}

async function getFinancialData(userId: string) {
  const supabase = await createClient();

  const { data: accounts } = await supabase
    .from("accounts")
    .select("name, account_type, balance")
    .eq("user_id", userId);

  const now = new Date();
  const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const nextMonth = now.getMonth() === 11 ? 1 : now.getMonth() + 2;
  const nextYear = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
  const endDate = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

  const { data: txns } = await supabase
    .from("transactions")
    .select("amount, categories ( name, type ), accounts!account_id!inner ( user_id )")
    .eq("accounts.user_id", userId)
    .gte("date", startDate)
    .lt("date", endDate);

  const nonTransferTxns = (txns ?? []).filter((t) => {
    const cat = resolveCategory(t.categories as unknown as { type: string } | { type: string }[] | null);
    return cat?.type !== "transfer";
  });
  const income = nonTransferTxns.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const expenses = nonTransferTxns.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

  const catMap = new Map<string, number>();
  for (const t of nonTransferTxns) {
    if (t.amount >= 0) continue;
    const cat = resolveCategory(t.categories as unknown as { name: string } | { name: string }[] | null);
    catMap.set(cat?.name ?? "Uncategorized", (catMap.get(cat?.name ?? "Uncategorized") ?? 0) + Math.abs(t.amount));
  }

  const { data: goals } = await supabase
    .from("savings_goals")
    .select("name, target_amount, current_amount, deadline")
    .eq("user_id", userId)
    .eq("status", "active");

  return {
    accounts: (accounts ?? []).map((a) => ({ name: a.name, type: a.account_type, balance: a.balance })),
    monthlyIncome: income,
    monthlyExpenses: expenses,
    topCategories: Array.from(catMap.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total),
    goals: (goals ?? []).map((g) => ({
      name: g.name,
      target: g.target_amount,
      current: g.current_amount,
      deadline: g.deadline,
    })),
  };
}

export async function sendChatMessage(conversationId: string | null, message: string) {
  const validatedMsg = chatMessageSchema.safeParse({ message });
  if (!validatedMsg.success) {
    throw new Error("Invalid message");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const settings = await requireAI(user.id);
  const financialData = await getFinancialData(user.id);
  const context = buildFinancialContext(financialData);

  let messages: AIMessage[] = [];
  let convId = conversationId;

  if (convId) {
    const { data: conv } = await supabase
      .from("ai_conversations")
      .select("messages")
      .eq("id", convId)
      .eq("user_id", user.id)
      .single();
    if (conv) {
      messages = conv.messages as AIMessage[];
    }
  }

  if (messages.length === 0) {
    messages.push({ role: "system", content: `${FINANCIAL_ADVISOR_SYSTEM}\n\n${context}` });
  }

  messages.push({ role: "user", content: message });

  let reply: string;
  try {
    reply = await chatCompletion(settings, messages);
  } catch (error) {
    console.error('[AI Chat Error]', {
      provider: settings.provider,
      model: settings.model,
      baseUrl: settings.baseUrl,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw new Error(`Failed to get response from ${settings.provider.toUpperCase()}. ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  messages.push({ role: "assistant", content: reply });

  if (convId) {
    await supabase
      .from("ai_conversations")
      .update({ messages, updated_at: new Date().toISOString() })
      .eq("id", convId);
  } else {
    const { data } = await supabase
      .from("ai_conversations")
      .insert({ user_id: user.id, messages })
      .select("id")
      .single();
    convId = data?.id ?? null;
  }

  return { conversationId: convId, reply };
}

export async function aiCategorize() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const settings = await requireAI(user.id);

  const { count: totalUncategorized } = await supabase
    .from("transactions")
    .select("id, accounts!account_id(user_id)", { count: 'exact', head: true })
    .eq("accounts.user_id", user.id)
    .is("category_id", null);

  if (!totalUncategorized) return { categorized: 0, total: 0 };

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, type")
    .or(`user_id.eq.${user.id},user_id.is.null`);

  if (!categories?.length) return { categorized: 0, total: totalUncategorized };

  const validCatIds = new Set(categories.map((c) => c.id));
  let totalCategorized = 0;
  const batchSize = 50;
  
  for (let offset = 0; offset < totalUncategorized; offset += batchSize) {
    const { data: batch } = await supabase
      .from("transactions")
      .select("id, description, merchant_name, amount, accounts!account_id!inner ( user_id )")
      .eq("accounts.user_id", user.id)
      .is("category_id", null)
      .order("date", { ascending: false })
      .range(offset, offset + batchSize - 1);

    if (!batch?.length) continue;

    const prompt = buildCategorizationPrompt(batch, categories);
    const messages: AIMessage[] = [
      { role: "system", content: CATEGORIZE_SYSTEM },
      { role: "user", content: prompt },
    ];

    try {
      const response = await chatCompletion(settings, messages);
      
      let assignments: { transactionId: string; categoryId: string; confidence: number }[];
      try {
        const cleaned = response.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
        assignments = JSON.parse(cleaned);
      } catch {
        console.error(`Batch ${offset}-${offset + batchSize} failed to parse AI response`);
        continue;
      }

      const validTxIds = new Set(batch.map((t) => t.id));

      for (const a of assignments) {
        if (!validCatIds.has(a.categoryId) || !validTxIds.has(a.transactionId)) continue;
        if (a.confidence < 0.7) continue;

        const catType = categories.find((c) => c.id === a.categoryId)?.type ?? "expense";
        await supabase
          .from("transactions")
          .update({
            category_id: a.categoryId,
            type: catType,
            categorized_by: "ai",
            review_flagged: true,
            review_flagged_reason: "ai_low_confidence",
            category_confirmed: false,
          })
          .eq("id", a.transactionId);
        totalCategorized++;
      }
    } catch (error) {
      console.error(`Batch ${offset}-${offset + batchSize} failed:`, error);
    }
  }

  revalidatePath("/transactions");
  return { categorized: totalCategorized, total: totalUncategorized };
}

export async function aiBudgetRecommendation() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const settings = await requireAI(user.id);

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const startDate = threeMonthsAgo.toISOString().split("T")[0];

  const { data: txns } = await supabase
    .from("transactions")
    .select("amount, category_id, date, categories ( name, type ), accounts!account_id!inner ( user_id )")
    .eq("accounts.user_id", user.id)
    .gte("date", startDate)
    .lt("amount", 0);

  const income = await supabase
    .from("transactions")
    .select("amount, categories ( type ), accounts!account_id!inner ( user_id )")
    .eq("accounts.user_id", user.id)
    .gte("date", startDate)
    .gt("amount", 0);

  const nonTransferIncome = (income.data ?? []).filter((t) => {
    const cat = resolveCategory(t.categories as unknown as { type: string } | { type: string }[] | null);
    return cat?.type !== "transfer";
  });
  const monthlyIncome = nonTransferIncome.reduce((s, t) => s + t.amount, 0) / 3;

  const catSpending = new Map<string, { id: string; name: string; total: number; months: Set<string> }>();
  for (const t of txns ?? []) {
    if (!t.category_id) continue;
    const cat = t.categories as unknown as { name: string; type: string } | null;
    if (!cat || cat.type !== "expense") continue;
    const month = t.date.substring(0, 7);
    const existing = catSpending.get(t.category_id) ?? { id: t.category_id, name: cat.name, total: 0, months: new Set<string>() };
    existing.total += Math.abs(t.amount);
    existing.months.add(month);
    catSpending.set(t.category_id, existing);
  }

  const categoryAverages = Array.from(catSpending.values()).map((c) => ({
    categoryId: c.id,
    name: c.name,
    avgMonthly: c.total / Math.max(c.months.size, 1),
    months: c.months.size,
  }));

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, type")
    .or(`user_id.eq.${user.id},user_id.is.null`);

  const prompt = buildBudgetPrompt(monthlyIncome, categoryAverages, categories ?? []);
  const messages: AIMessage[] = [
    { role: "system", content: BUDGET_SYSTEM },
    { role: "user", content: prompt },
  ];

  const response = await chatCompletion(settings, messages);

  try {
    const cleaned = response.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    throw new Error("AI returned invalid budget format. Try again.");
  }
}

export async function getConversations() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data } = await supabase
    .from("ai_conversations")
    .select("id, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(20);

  return data ?? [];
}

export async function getConversation(conversationId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data } = await supabase
    .from("ai_conversations")
    .select("id, messages, created_at")
    .eq("id", conversationId)
    .eq("user_id", user.id)
    .single();

  return data;
}

export async function deleteConversation(conversationId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { error } = await supabase
    .from("ai_conversations")
    .delete()
    .eq("id", conversationId)
    .eq("user_id", user.id);

  if (error) {
    throw new Error("Failed to delete conversation");
  }

  revalidatePath("/advisor");
  return { success: true };
}
