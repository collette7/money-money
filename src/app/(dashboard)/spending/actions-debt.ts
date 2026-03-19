"use server"

import { createClient } from "@/lib/supabase/server"

export type DebtAccount = {
  id: string
  name: string
  type: 'credit' | 'loan'
  originalBalance: number
  currentBalance: number
  creditLimit: number
  interestRate: number
  monthlyPayment: number
  institution: string
  lastUpdated: string
}

export async function getDebtAccounts(userId: string): Promise<DebtAccount[]> {
  const supabase = await createClient()
  
  const { data: explicitDebts } = await supabase
    .from("accounts")
    .select(`
      id, name, account_type, balance, opening_balance, credit_limit,
      institution_name, last_synced,
      original_balance, interest_rate, monthly_payment
    `)
    .eq("user_id", userId)
    .in("account_type", ["credit", "loan"])
    .order("balance", { ascending: true })

  const { data: mistyped } = await supabase
    .from("accounts")
    .select(`
      id, name, account_type, balance, opening_balance, credit_limit,
      institution_name, last_synced,
      original_balance, interest_rate, monthly_payment
    `)
    .eq("user_id", userId)
    .eq("account_type", "checking")
    .lt("balance", 0)
    .order("balance", { ascending: true })

  const allAccounts = [...(explicitDebts || []), ...(mistyped || [])]

  if (mistyped && mistyped.length > 0) {
    for (const account of mistyped) {
      await supabase
        .from("accounts")
        .update({ account_type: "credit" })
        .eq("id", account.id)
    }
  }

  return allAccounts.map(account => {
    const balance = Math.abs(account.balance || 0)
    const openingBalance = Math.abs(account.opening_balance || 0)
    const creditLimit = account.credit_limit || 0
    const originalBalance = account.original_balance
      || (creditLimit > 0 ? creditLimit : null)
      || Math.max(openingBalance, balance)
    const effectiveType = (account.balance < 0 && account.account_type === "checking")
      ? "credit"
      : account.account_type
    const interestRate = account.interest_rate || (effectiveType === 'credit' ? 19.99 : 6.9)
    const monthlyPayment = account.monthly_payment || Math.max(balance * 0.025, 25)
    
    return {
      id: account.id,
      name: account.name,
      type: effectiveType as 'credit' | 'loan',
      originalBalance,
      currentBalance: balance,
      interestRate,
      monthlyPayment,
      creditLimit: creditLimit,
      institution: account.institution_name || '',
      lastUpdated: account.last_synced || new Date().toISOString(),
    }
  })
}

export async function updateMonthlyPayment(accountId: string, monthlyPayment: number) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from("accounts")
    .update({ monthly_payment: monthlyPayment })
    .eq("id", accountId)
    
  if (error) throw error
  
  return { success: true }
}

export async function updateDebtDetails(
  accountId: string, 
  updates: {
    original_balance?: number
    credit_limit?: number
    interest_rate?: number
    monthly_payment?: number
  }
) {
  const supabase = await createClient()

  const payload: Record<string, number> = {}
  if (updates.original_balance != null) payload.original_balance = updates.original_balance
  if (updates.credit_limit != null) payload.credit_limit = updates.credit_limit
  if (updates.interest_rate != null) payload.interest_rate = updates.interest_rate
  if (updates.monthly_payment != null) payload.monthly_payment = updates.monthly_payment

  const { error } = await supabase
    .from("accounts")
    .update(payload)
    .eq("id", accountId)
    
  if (error) throw error
  
  return { success: true }
}

export async function initializeDebtTracking(userId: string) {
  const supabase = await createClient()
  
  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, balance, opening_balance, account_type, original_balance")
    .eq("user_id", userId)
    .in("account_type", ["credit", "loan"])
    .is("original_balance", null)
    
  if (!accounts || accounts.length === 0) return { updated: 0 }
  
  for (const account of accounts) {
    const balance = Math.abs(account.balance || 0)
    const openingBalance = Math.abs(account.opening_balance || 0)
    await supabase
      .from("accounts")
      .update({
        original_balance: Math.max(openingBalance, balance),
        interest_rate: account.account_type === 'credit' ? 19.99 : 6.9,
        monthly_payment: Math.max(balance * 0.025, 25)
      })
      .eq("id", account.id)
  }
  
  return { updated: accounts.length }
}
