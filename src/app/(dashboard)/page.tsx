import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { HomeContent } from "./home-content"

function computeChange(
  snapshots: { date: string; net_worth: number; total_assets: number | null; total_liabilities: number | null }[],
) {
  if (snapshots.length < 2) return null

  const now = new Date()
  const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())

  const latest = snapshots[snapshots.length - 1]
  const older = snapshots.find((s) => new Date(s.date) <= oneMonthAgo) ?? snapshots[0]

  const currentVal = latest.net_worth ?? 0
  const previousVal = older.net_worth ?? 0

  if (previousVal === 0) return null
  const pctChange = ((currentVal - previousVal) / Math.abs(previousVal)) * 100
  const dollarChange = currentVal - previousVal
  return { pctChange, dollarChange }
}

async function getDashboardData() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
  const nextMonth = now.getMonth() === 11 ? 1 : now.getMonth() + 2
  const nextYear = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear()
  const monthEnd = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`

  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthStart = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}-01`
  const lastMonthEnd = monthStart

  const [
    { data: accountsList },
    { data: snapshots },
    { data: recentTxns },
    { data: dailyTxns },
    { data: budget },
    { data: lastMonthTxns },
  ] = await Promise.all([
    supabase
      .from("accounts")
      .select("id, name, account_type, balance, institution_name")
      .eq("user_id", user.id)
      .order("account_type", { ascending: true }),
    supabase
      .from("net_worth_snapshots")
      .select("date, net_worth, total_assets, total_liabilities")
      .eq("user_id", user.id)
      .order("date", { ascending: true })
      .limit(365),
    supabase
      .from("transactions")
      .select("id, merchant_name, description, date, amount, notes, tags, ignored, review_flagged, review_flagged_reason, category_confirmed, category_confidence, categorized_by, categories ( id, name, icon, color ), accounts!account_id!inner ( user_id )")
      .eq("accounts.user_id", user.id)
      .eq("ignored", false)
      .order("date", { ascending: false })
      .limit(4),
    supabase
      .from("transactions")
      .select("amount, date, accounts!account_id!inner ( user_id )")
      .eq("accounts.user_id", user.id)
      .gte("date", monthStart)
      .lt("date", monthEnd)
      .lt("amount", 0)
      .order("date", { ascending: true }),
    supabase
      .from("budgets")
      .select("id, budget_items ( limit_amount )")
      .eq("user_id", user.id)
      .eq("month", now.getMonth() + 1)
      .eq("year", now.getFullYear())
      .single(),
    supabase
      .from("transactions")
      .select("amount, accounts!account_id!inner ( user_id )")
      .eq("accounts.user_id", user.id)
      .gte("date", lastMonthStart)
      .lt("date", lastMonthEnd)
      .lt("amount", 0),
  ])

  const accounts = accountsList ?? []
  const assetTypes = ["checking", "savings", "investment"]
  const liabilityTypes = ["credit", "loan"]

  const assets = accounts
    .filter((a) => assetTypes.includes(a.account_type))
    .reduce((sum, a) => sum + (a.balance ?? 0), 0)

  const liabilities = accounts
    .filter((a) => liabilityTypes.includes(a.account_type))
    .reduce((sum, a) => sum + Math.abs(a.balance ?? 0), 0)

  const lastMonthSpent = (lastMonthTxns ?? []).reduce((sum, tx) => sum + Math.abs(tx.amount), 0)

  const netWorth = assets - liabilities
  const today = new Date().toISOString().split("T")[0]
  const hasToday = (snapshots ?? []).some((s: { date: string }) => s.date === today)

  if (!hasToday) {
    await supabase.from("net_worth_snapshots").upsert(
      {
        user_id: user.id,
        date: today,
        total_assets: assets,
        total_liabilities: liabilities,
        net_worth: netWorth,
      },
      { onConflict: "user_id,date" }
    )
  }

  const rawSnapshots = (snapshots ?? []) as {
    date: string
    net_worth: number
    total_assets: number | null
    total_liabilities: number | null
  }[]

  const snapshotData = hasToday
    ? rawSnapshots
    : [
        ...rawSnapshots,
        { date: today, net_worth: netWorth, total_assets: assets, total_liabilities: liabilities },
      ]

  const changeData = computeChange(snapshotData)

  const dailyMap = new Map<string, number>()
  for (const tx of dailyTxns ?? []) {
    const date = tx.date as string
    dailyMap.set(date, (dailyMap.get(date) ?? 0) + Math.abs(tx.amount))
  }
  const dailySpending = Array.from(dailyMap.entries())
    .map(([date, total]) => ({ date, total }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const monthlySpent = (dailyTxns ?? []).reduce((sum, tx) => sum + Math.abs(tx.amount), 0)

  const budgetTotal = budget?.budget_items
    ? (budget.budget_items as { limit_amount: number }[]).reduce((sum, item) => sum + item.limit_amount, 0)
    : 0

  const recentTransactions = (recentTxns ?? []).map((tx: any) => ({
    id: tx.id as string,
    merchant_name: tx.merchant_name as string | null,
    description: tx.description as string,
    date: tx.date as string,
    amount: tx.amount as number,
    notes: tx.notes as string | null,
    tags: tx.tags as string[] | null,
    ignored: tx.ignored as boolean,
    review_flagged: tx.review_flagged as boolean,
    review_flagged_reason: tx.review_flagged_reason as string | null,
    category_confirmed: tx.category_confirmed as boolean,
    category_confidence: tx.category_confidence as number | null,
    categorized_by: tx.categorized_by as string | null,
    categories: tx.categories as { id: string; name: string; icon: string | null; color: string | null } | null,
  }))

  return {
    netWorth,
    assets,
    liabilities,
    netWorthPctChange: changeData?.pctChange ?? null,
    netWorthDollarChange: changeData?.dollarChange ?? null,
    snapshots: snapshotData,
    hasAccounts: accounts.length > 0,
    userName: user.user_metadata?.full_name?.split(" ")[0] ?? "there",
    monthLabel: new Intl.DateTimeFormat("en-US", { month: "long" }).format(now).toUpperCase(),
    monthLabelTitle: new Intl.DateTimeFormat("en-US", { month: "long" }).format(now),
    monthlySpent,
    budgetTotal,
    dailySpending,
    recentTransactions,
    lastMonthSpent,
  }
}

export default async function HomePage() {
  const data = await getDashboardData()
  return <HomeContent data={data} />
}
