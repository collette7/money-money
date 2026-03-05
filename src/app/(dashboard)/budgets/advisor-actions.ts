"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAISettings, chatCompletion, type AIMessage } from "@/lib/ai/provider";
import {
  BUDGET_ADVISOR_SYSTEM,
  buildBudgetAdvisorContext,
  type BudgetAdvisorContext,
} from "@/lib/ai/prompts";
import { chatMessageSchema } from "@/lib/validation";
import { getHierarchicalBudget, getDailyBudgetPace, getMonthlyIncomeEstimate } from "./actions";

export async function sendBudgetAdvisorMessage(
  conversationId: string | null,
  message: string,
  month: number,
  year: number
) {
  const validatedMsg = chatMessageSchema.safeParse({ message });
  if (!validatedMsg.success) throw new Error("Invalid message");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const settings = await getAISettings(user.id);
  if (!settings) {
    throw new Error("AI not configured. Add your API key in Settings → AI Configuration.");
  }

  const [categories, paceData, incomeEstimate, goals, accounts] = await Promise.all([
    getHierarchicalBudget(month, year),
    getDailyBudgetPace(month, year).catch(() => null),
    getMonthlyIncomeEstimate().catch(() => ({ average: 0, months: 0 })),
    supabase
      .from("savings_goals")
      .select("name, target_amount, current_amount, contribution_amount, deadline")
      .eq("user_id", user.id)
      .eq("status", "active")
      .then(({ data }) => data ?? []),
    supabase
      .from("accounts")
      .select("account_type, balance")
      .eq("user_id", user.id)
      .then(({ data }) => data ?? []),
  ]);

  const totalAssets = accounts
    .filter((a) => ["checking", "savings", "investment"].includes(a.account_type))
    .reduce((s, a) => s + a.balance, 0);
  const totalLiabilities = accounts
    .filter((a) => ["credit", "loan"].includes(a.account_type))
    .reduce((s, a) => s + Math.abs(a.balance), 0);

  const budgetItems = categories
    .filter((c) => c.budget_amount > 0)
    .map((c) => ({
      category: c.name,
      limit: c.budget_amount,
      spent: c.spent_amount,
      rollover: c.rollover_amount,
    }));

  const totalBudget = budgetItems.reduce((s, i) => s + i.limit, 0);
  const totalSpent = budgetItems.reduce((s, i) => s + i.spent, 0);

  const now = new Date();
  const daysInMonth = new Date(year, month, 0).getDate();
  const currentDay = year === now.getFullYear() && month === now.getMonth() + 1
    ? now.getDate()
    : daysInMonth;

  const advisorCtx: BudgetAdvisorContext = {
    monthlyIncome: incomeEstimate.average,
    totalBudget,
    totalSpent,
    daysInMonth,
    currentDay,
    budgetItems,
    goals: goals.map((g) => ({
      name: g.name,
      target: g.target_amount,
      current: g.current_amount,
      monthlyContribution: g.contribution_amount,
      deadline: g.deadline,
    })),
    netWorth: totalAssets - totalLiabilities,
    totalDebt: totalLiabilities,
    paceStatus: paceData?.status,
    projectedMonthEnd: paceData?.projectedMonthEnd,
    freeToSpend: paceData?.freeToSpend,
  };

  const context = buildBudgetAdvisorContext(advisorCtx);

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
    messages.push({ role: "system", content: `${BUDGET_ADVISOR_SYSTEM}\n\n${context}` });
  }

  messages.push({ role: "user", content: message });

  let reply: string;
  try {
    reply = await chatCompletion(settings, messages, { retries: 1, timeoutMs: 45_000 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to get AI response. ${msg}`);
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
