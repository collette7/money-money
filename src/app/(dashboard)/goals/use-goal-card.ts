"use client"

import { useState, useEffect, useTransition } from "react"
import { updateGoal, deleteGoal, getGoalContributions } from "./actions"

export type Goal = {
  id: string
  name: string
  icon: string | null
  color: string | null
  target_amount: number
  current_amount: number
  deadline: string | null
  contribution_amount: number | null
  contribution_frequency: string | null
  status: string
  created_at: string
}

export type Contribution = {
  id: string
  amount: number
  date: string
  type: string
  notes: string | null
  created_at: string
}

export const currency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

export const formatDate = (dateStr: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateStr))

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr)
  const now = new Date()
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function projectedCompletion(goal: Goal): string | null {
  if (
    !goal.contribution_amount ||
    goal.contribution_amount <= 0 ||
    goal.current_amount >= goal.target_amount
  ) {
    return null
  }

  const remaining = goal.target_amount - goal.current_amount
  const freq = goal.contribution_frequency ?? "monthly"
  const periodsPerYear =
    freq === "weekly" ? 52 : freq === "biweekly" ? 26 : 12
  const periodsNeeded = Math.ceil(remaining / goal.contribution_amount)
  const daysNeeded = Math.ceil((periodsNeeded / periodsPerYear) * 365)

  const projected = new Date()
  projected.setDate(projected.getDate() + daysNeeded)
  return formatDate(projected.toISOString())
}

export function frequencyLabel(freq: string | null): string {
  if (!freq) return ""
  const map: Record<string, string> = {
    weekly: "/wk",
    biweekly: "/2wks",
    monthly: "/mo",
  }
  return map[freq] ?? ""
}

export function useGoalCard({ goal }: { goal: Goal }) {
  const [detailOpen, setDetailOpen] = useState(false)
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [loadingContributions, setLoadingContributions] = useState(false)
  const [isPending, startTransition] = useTransition()

  const pct =
    goal.target_amount > 0
      ? (goal.current_amount / goal.target_amount) * 100
      : 0
  const accentColor = goal.color ?? "#6366f1"
  const days = goal.deadline ? daysUntil(goal.deadline) : null
  const projected = projectedCompletion(goal)
  const statusVariant: "default" | "secondary" | "outline" =
    goal.status === "completed"
      ? "default"
      : goal.status === "paused"
        ? "secondary"
        : "outline"

  useEffect(() => {
    if (detailOpen && contributions.length === 0) {
      setLoadingContributions(true)
      getGoalContributions(goal.id).then((data) => {
        setContributions(data)
        setLoadingContributions(false)
      })
    }
  }, [detailOpen, goal.id, contributions.length])

  const handleStatusToggle = () => {
    const newStatus = goal.status === "active" ? "paused" : "active"
    startTransition(async () => {
      await updateGoal(goal.id, { status: newStatus })
    })
  }

  const handleDelete = () => {
    startTransition(async () => {
      await deleteGoal(goal.id)
    })
  }

  return {
    detailOpen,
    setDetailOpen,
    contributions,
    loadingContributions,
    isPending,
    pct,
    accentColor,
    days,
    projected,
    statusVariant,
    handleStatusToggle,
    handleDelete,
  }
}
