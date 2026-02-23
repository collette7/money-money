import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const month = parseInt(searchParams.get("month") || new Date().getMonth().toString());
  const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = month === 12
    ? `${year + 1}-01-01`
    : `${year}-${String(month + 1).padStart(2, "0")}-01`;

  const { data: budget } = await supabase
    .from("budgets")
    .select(`
      id,
      budget_items (
        id,
        category_id,
        limit_amount,
        categories (
          id,
          name,
          icon,
          color
        )
      )
    `)
    .eq("user_id", user.id)
    .eq("month", month)
    .eq("year", year)
    .single();

  if (!budget || !budget.budget_items) {
    return NextResponse.json({ totalBudget: 0, totalSpent: 0, items: [] });
  }

  const { data: spending } = await supabase
    .from("transactions")
    .select("amount, category_id, categories ( type )")
    .eq("user_id", user.id)
    .gte("date", startDate)
    .lt("date", endDate)
    .in("category_id", budget.budget_items.map((item: any) => item.category_id));

  const spendingByCategory = spending?.reduce((acc: Record<string, number>, tx) => {
    const catType = (tx.categories as unknown as { type: string } | null)?.type;
    if (tx.category_id && tx.amount < 0 && catType !== "transfer") {
      acc[tx.category_id] = (acc[tx.category_id] || 0) + Math.abs(tx.amount);
    }
    return acc;
  }, {}) || {};

  const items = budget.budget_items.map((item: any) => ({
    category_id: item.category_id,
    category_name: item.categories?.name || "Unknown",
    category_icon: item.categories?.icon,
    category_color: item.categories?.color,
    limit_amount: item.limit_amount,
    spent_amount: spendingByCategory[item.category_id] || 0
  }));

  const totalBudget = items.reduce((sum: number, item: any) => sum + item.limit_amount, 0);
  const totalSpent = items.reduce((sum: number, item: any) => sum + item.spent_amount, 0);

  return NextResponse.json({ totalBudget, totalSpent, items });
}