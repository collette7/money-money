"use client"

import { useState, useTransition } from "react"
import { Sensitive } from "@/components/sensitive"
import { cn } from "@/lib/utils"
import { updateMonthlyPayment } from "../actions-debt"
import { CreditCard, Building2, TrendingUp, Calendar, DollarSign } from "lucide-react"
import type { DebtAccount } from "../actions-debt"

type DebtCardProps = {
  debt: DebtAccount
  onPaymentUpdate: (debtId: string, newPayment: number) => void
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { 
    style: "currency", 
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(value))

function calculateMonthsToPayoff(balance: number, rate: number, payment: number): number {
  if (payment <= 0 || balance <= 0) return Infinity
  const monthlyRate = rate / 100 / 12
  if (monthlyRate === 0) return Math.ceil(balance / payment)
  const monthlyInterest = balance * monthlyRate
  if (payment <= monthlyInterest) return Infinity
  const months = -Math.log(1 - (monthlyRate * balance) / payment) / Math.log(1 + monthlyRate)
  return isFinite(months) && months > 0 ? Math.ceil(months) : Infinity
}

function formatPayoffDate(months: number): string {
  if (!isFinite(months)) return "Never"
  const date = new Date()
  date.setMonth(date.getMonth() + months)
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" })
}

export function DebtCard({ debt, onPaymentUpdate }: DebtCardProps) {
  const [payment, setPayment] = useState(debt.monthlyPayment)
  const [isPending, startTransition] = useTransition()

  const paidOff = debt.originalBalance - debt.currentBalance
  const paidPct = debt.originalBalance > 0
    ? Math.round((paidOff / debt.originalBalance) * 100)
    : 0

  const monthlyInterest = debt.currentBalance * (debt.interestRate / 100 / 12)
  const monthsToPayoff = calculateMonthsToPayoff(debt.currentBalance, debt.interestRate, payment)
  const payoffDate = formatPayoffDate(monthsToPayoff)
  const totalInterest = isFinite(monthsToPayoff) ? (payment * monthsToPayoff) - debt.currentBalance : 0

  const handlePaymentChange = (value: string) => {
    const next = parseFloat(value) || 0
    setPayment(next)
    onPaymentUpdate(debt.id, next)
    startTransition(async () => {
      try { await updateMonthlyPayment(debt.id, next) }
      catch (e) { console.error("Failed to update payment:", e) }
    })
  }

  const Icon = debt.type === "credit" ? CreditCard : Building2

  return (
    <div className="debt-card" data-type={debt.type}>
      <div className="debt-card__header">
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flex: 1, minWidth: 0 }}>
          <div className="debt-card__icon">
            <Icon style={{ width: 18, height: 18 }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 className="debt-card__name">{debt.name}</h3>
            <p className="debt-card__institution">{debt.institution}</p>
          </div>
        </div>
        <div className="debt-card__amount">
          <span className="debt-card__balance">
            <Sensitive>{formatCurrency(debt.currentBalance)}</Sensitive>
          </span>
          <span className="debt-card__percentage">{paidPct}% paid</span>
        </div>
      </div>

      <div className="debt-card__progress-wrapper">
        <div className="debt-card__progress-track">
          <div
            className="debt-card__progress-fill"
            style={{ width: `${paidPct}%` }}
          />
        </div>
      </div>

      <div className="debt-card__details">
        <div className="debt-card__detail">
          <TrendingUp style={{ width: 14, height: 14 }} />
          <span className="debt-card__detail-label">APR</span>
          <span className="debt-card__detail-value">{debt.interestRate}%</span>
        </div>
        <div className="debt-card__detail">
          <Calendar style={{ width: 14, height: 14 }} />
          <span className="debt-card__detail-label">Payoff</span>
          <span className="debt-card__detail-value">{payoffDate}</span>
        </div>
        <div className="debt-card__detail">
          <DollarSign style={{ width: 14, height: 14 }} />
          <span className="debt-card__detail-label">Interest/mo</span>
          <span className="debt-card__detail-value text-expense">
            {formatCurrency(monthlyInterest)}
          </span>
        </div>
      </div>

      <div className="debt-card__payment">
        <label htmlFor={`pay-${debt.id}`} className="debt-card__payment-label">
          Monthly Payment
        </label>
        <div className="debt-card__payment-input-wrapper">
          <span className="debt-card__payment-currency">$</span>
          <input
            id={`pay-${debt.id}`}
            type="number"
            min="0"
            step="10"
            value={payment || ""}
            onChange={(e) => handlePaymentChange(e.target.value)}
            disabled={isPending}
            className={cn("debt-card__payment-input", isPending && "opacity-50")}
            placeholder="0"
          />
        </div>
        {isFinite(monthsToPayoff) && (
          <span className="debt-card__payment-info">
            <span>{monthsToPayoff} mo</span>
            <span>·</span>
            <span>{formatCurrency(totalInterest)} interest</span>
          </span>
        )}
      </div>
    </div>
  )
}
