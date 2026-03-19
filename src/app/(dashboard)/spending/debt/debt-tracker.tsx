"use client"

import { useState, useEffect } from "react"
import { Sensitive } from "@/components/sensitive"
import { cn } from "@/lib/utils"
import { DebtCard } from "./debt-card"
import { DonutChart } from "./donut-chart"
import { TrendingDown, Plus, Target, Wallet, Calendar, TrendingUp, Zap, AlertCircle } from "lucide-react"
import type { DebtAccount } from "../actions-debt"
import "@/app/spending.css"

type DebtTrackerProps = {
  debts: DebtAccount[]
  totalOwed: number
  totalPaidOff: number
  monthlyCommitment: number
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { 
    style: "currency", 
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(value))

const formatDate = (months: number) => {
  if (months <= 0) return "—"
  const date = new Date()
  date.setMonth(date.getMonth() + months)
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

export function DebtTracker({
  debts,
  totalOwed,
  totalPaidOff,
  monthlyCommitment,
}: DebtTrackerProps) {
  const [localDebts, setLocalDebts] = useState(debts)
  const [mounted, setMounted] = useState(false)

  const totalOriginal = debts.reduce((sum, debt) => sum + debt.originalBalance, 0)
  const progressPercentage = totalOriginal > 0 ? totalPaidOff / totalOriginal : 0
  const estimatedPayoffMonths = monthlyCommitment > 0 ? Math.ceil(totalOwed / monthlyCommitment) : 0

  const totalMonthlyInterest = localDebts.reduce((sum, debt) => {
    return sum + (debt.currentBalance * (debt.interestRate / 100 / 12))
  }, 0)
  const projectedTotalInterest = totalMonthlyInterest * estimatedPayoffMonths
  const hasHighInterestDebt = debts.some(debt => debt.interestRate > 20)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50)
    return () => clearTimeout(t)
  }, [])

  const handlePaymentUpdate = (debtId: string, newPayment: number) => {
    setLocalDebts(prev =>
      prev.map(debt =>
        debt.id === debtId
          ? { ...debt, monthlyPayment: newPayment }
          : debt
      )
    )
  }

  const updatedMonthlyCommitment = localDebts.reduce((sum, debt) => sum + debt.monthlyPayment, 0)

  return (
    <div className="debt-tracker">
      <div className="debt-tracker__header">
        <div>
          <h1 className="text-title" style={{ letterSpacing: "-0.02em", marginBottom: 4 }}>
            Debt Tracker
          </h1>
          <p className="text-detail" style={{ color: "var(--muted-foreground)", margin: 0 }}>
            Your journey to financial freedom
          </p>
        </div>
        <button className="debt-tracker__add-btn">
          <Plus className="h-4 w-4" />
          Add Debt
        </button>
      </div>

      <div className={cn("debt-status", mounted && "debt-enter")}>
        <div className="debt-status__header">
          <div>
            <h2 className="debt-status__title">Overall Progress</h2>
            <p className="debt-status__subtitle">
              <Sensitive>{formatCurrency(totalPaidOff)}</Sensitive>
              {" of "}
              <Sensitive>{formatCurrency(totalOriginal)}</Sensitive>
              {" paid"}
            </p>
          </div>
          <div className="debt-status__pct">
            <span className="debt-status__pct-value">{Math.round(progressPercentage * 100)}</span>
            <span className="debt-status__pct-sign">%</span>
          </div>
        </div>

        <div className="debt-status__track">
          <div
            className="debt-status__fill"
            style={{
              width: mounted ? `${Math.max(progressPercentage * 100, 1)}%` : "0%",
            }}
          />
        </div>

        <div className="debt-status__metrics">
          <div className="debt-status__metric">
            <Calendar className="debt-status__metric-icon" />
            <div>
              <p className="debt-status__metric-label">Debt Free By</p>
              <p className="debt-status__metric-value">{formatDate(estimatedPayoffMonths)}</p>
            </div>
          </div>
          <div className="debt-status__metric">
            <TrendingUp className="debt-status__metric-icon" />
            <div>
              <p className="debt-status__metric-label">Monthly Payment</p>
              <p className="debt-status__metric-value">
                <Sensitive>{formatCurrency(updatedMonthlyCommitment)}</Sensitive>
              </p>
            </div>
          </div>
          <div className="debt-status__metric">
            <Zap className="debt-status__metric-icon" />
            <div>
              <p className="debt-status__metric-label">Projected Interest</p>
              <p className="debt-status__metric-value text-expense">
                <Sensitive>{formatCurrency(projectedTotalInterest)}</Sensitive>
              </p>
            </div>
          </div>
        </div>

        {hasHighInterestDebt && (
          <div className="debt-status__alert">
            <AlertCircle className="h-4 w-4" />
            <span>High interest debt detected — consider paying those first</span>
          </div>
        )}
      </div>

      <div className={cn("debt-metrics", mounted && "debt-enter")} style={{ animationDelay: "0.05s" }}>
        <div className="debt-metric-card">
          <div className="debt-metric-card__icon debt-metric-card__icon--expense">
            <TrendingDown className="h-4 w-4" />
          </div>
          <div>
            <p className="debt-metric-card__label">Total Debt</p>
            <p className="debt-metric-card__value text-expense">
              <Sensitive>{formatCurrency(totalOwed)}</Sensitive>
            </p>
          </div>
        </div>

        <div className="debt-metric-card">
          <div className="debt-metric-card__icon debt-metric-card__icon--income">
            <Target className="h-4 w-4" />
          </div>
          <div>
            <p className="debt-metric-card__label">Paid Off</p>
            <p className="debt-metric-card__value text-income">
              <Sensitive>{formatCurrency(totalPaidOff)}</Sensitive>
            </p>
          </div>
        </div>

        <div className="debt-metric-card">
          <div className="debt-metric-card__icon debt-metric-card__icon--transfer">
            <Wallet className="h-4 w-4" />
          </div>
          <div>
            <p className="debt-metric-card__label">Monthly</p>
            <p className="debt-metric-card__value">
              <Sensitive>{formatCurrency(updatedMonthlyCommitment)}</Sensitive>
            </p>
          </div>
        </div>

        <div className="debt-metric-card">
          <div className="debt-metric-card__icon">
            <Calendar className="h-4 w-4" />
          </div>
          <div>
            <p className="debt-metric-card__label">Months Left</p>
            <p className="debt-metric-card__value">
              {estimatedPayoffMonths > 0 ? estimatedPayoffMonths : "—"}
            </p>
          </div>
        </div>
      </div>

      <div className="debt-layout">
        <div>
          <h2 className="debt-layout__section-title">Active Debts</h2>

          {localDebts.length > 0 ? (
            <div className="debt-layout__cards">
              {localDebts.map((debt) => (
                <DebtCard
                  key={debt.id}
                  debt={debt}
                  onPaymentUpdate={handlePaymentUpdate}
                />
              ))}
            </div>
          ) : (
            <div className="debt-empty">
              <p className="debt-empty__text">No debts tracked yet</p>
              <button className="debt-tracker__add-btn">
                <Plus className="h-4 w-4" />
                Add Your First Debt
              </button>
            </div>
          )}
        </div>

        {debts.length > 0 && (
          <div className="debt-layout__sidebar">
            <h3 className="debt-layout__section-title">Distribution</h3>
            <DonutChart
              segments={debts.map(debt => ({
                value: debt.currentBalance,
                color: debt.type === "credit" ? "#6366F1" : "#10B981",
                label: debt.name,
              }))}
              size={240}
              strokeWidth={44}
            />
          </div>
        )}
      </div>
    </div>
  )
}
