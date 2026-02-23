import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { RecurringConfirmation } from "./recurring-confirmation"
import { UpcomingTransactions } from "./upcoming-transactions"
import { CreditCardBills } from "./credit-card-bills"
import { getDetectedRecurringPatterns } from "../actions"
import { getConfirmedRecurringRules } from "@/lib/recurring/actions"
import { computeNextExpected } from "@/lib/recurring/matcher"
import type { RecurringFrequency } from "@/types/database"

export default async function RecurringPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const [confirmedRules, potentialRecurring, creditAccounts] = await Promise.all([
    getConfirmedRecurringRules(),
    getDetectedRecurringPatterns(user.id),
    supabase
      .from("accounts")
      .select("id, name, institution_name, balance, payment_due_day")
      .eq("user_id", user.id)
      .eq("account_type", "credit")
      .order("institution_name"),
  ])

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const upcomingRules = confirmedRules
    .map((rule) => {
      let nextDate = rule.next_expected
        ? new Date(rule.next_expected + "T00:00:00")
        : null

      if (!nextDate || nextDate < today) {
        const base = nextDate
          ? rule.next_expected!
          : new Date().toISOString().split("T")[0]
        const nextStr = computeNextExpected(
          base,
          rule.frequency as RecurringFrequency,
          rule.expected_day
        )
        nextDate = new Date(nextStr + "T00:00:00")
      }

      const daysUntil = Math.ceil(
        (nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      )

      return {
        id: rule.id,
        merchant_name: rule.merchant_name ?? rule.merchant_pattern,
        merchant_pattern: rule.merchant_pattern,
        expected_amount: rule.expected_amount ? Number(rule.expected_amount) : 0,
        frequency: rule.frequency as RecurringFrequency,
        expected_day: rule.expected_day,
        next_expected: rule.next_expected,
        category: rule.categories as {
          id: string
          name: string
          icon: string | null
          color: string | null
          type: string
        } | null,
        nextDate: `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}-${String(nextDate.getDate()).padStart(2, "0")}`,
        daysUntil,
        end_date: rule.end_date,
        stop_after: rule.stop_after,
      }
    })
    .filter((r) => r.daysUntil >= 0 && r.daysUntil <= 35)
    .sort((a, b) => a.daysUntil - b.daysUntil)

  const billRules = upcomingRules.filter(
    (r) => r.category?.type !== "income"
  )
  const monthlyExpenses = billRules.reduce(
    (sum, r) => sum + Math.abs(r.expected_amount),
    0
  )
  const yearlyTotal = monthlyExpenses * 12

  const upcomingDates = []
  for (let i = 0; i < 35; i++) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i)
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
    const dayRules = upcomingRules.filter((r) => r.nextDate === dateStr)
    const dayTotal = dayRules.reduce(
      (sum, r) => sum + Math.abs(r.expected_amount),
      0
    )
    upcomingDates.push({
      date: dateStr,
      day: date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(),
      dayNum: date.getDate(),
      total: dayTotal,
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,560px)_340px]">
      <div className="space-y-6">
        <UpcomingTransactions
          upcomingRules={upcomingRules}
          dates={upcomingDates}
          monthlyExpenses={monthlyExpenses}
          yearlyTotal={yearlyTotal}
          billCount={billRules.length}
          subscriptionCount={upcomingRules.length}
        />
      </div>

      <div className="space-y-6">
        <RecurringConfirmation potentialRecurring={potentialRecurring} />

        <CreditCardBills accounts={(creditAccounts.data ?? []).map((a) => ({
          id: a.id,
          name: a.name,
          institution_name: a.institution_name,
          balance: a.balance,
          payment_due_day: a.payment_due_day,
        }))} />
      </div>
    </div>
  )
}