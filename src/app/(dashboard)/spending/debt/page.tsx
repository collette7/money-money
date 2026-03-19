import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DebtTracker } from "./debt-tracker"
import { getDebtAccounts } from "../actions-debt"

export default async function DebtPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const debts = await getDebtAccounts(user.id)

  const totalOwed = debts.reduce((sum: number, debt) => sum + debt.currentBalance, 0)
  const totalPaidOff = debts.reduce((sum: number, debt) => sum + (debt.originalBalance - debt.currentBalance), 0)
  const monthlyCommitment = debts.reduce((sum: number, debt) => sum + debt.monthlyPayment, 0)

  return (
    <div className="debt-tracker-container">
      <DebtTracker 
        debts={debts}
        totalOwed={totalOwed}
        totalPaidOff={totalPaidOff}
        monthlyCommitment={monthlyCommitment}
      />
    </div>
  )
}