"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Pencil, Check, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AccountIcon } from "@/components/account-icon"
import { updatePaymentDueDay } from "@/app/(dashboard)/accounts/actions"

type CreditAccount = {
  id: string
  name: string
  institution_name: string | null
  balance: number
  payment_due_day: number | null
}

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
})

function getNextDueDate(dayOfMonth: number): string {
  const now = new Date()
  let due = new Date(now.getFullYear(), now.getMonth(), dayOfMonth)
  if (due <= now) {
    due = new Date(now.getFullYear(), now.getMonth() + 1, dayOfMonth)
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(due)
}

function CreditCardRow({ account }: { account: CreditAccount }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [dayValue, setDayValue] = useState(String(account.payment_due_day ?? ""))
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    const parsed = parseInt(dayValue, 10)
    const day = isNaN(parsed) || parsed < 1 || parsed > 31 ? null : parsed
    startTransition(async () => {
      await updatePaymentDueDay(account.id, day)
      setEditing(false)
      router.refresh()
    })
  }

  const lastFour = account.name.match(/\d{4}$/)?.[0]

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center gap-2">
        <AccountIcon
          accountNumber={account.name}
          accountType="credit"
          institutionName={account.institution_name}
          size="sm"
          showNumber={false}
        />
        <span className="font-medium text-sm">
          {account.institution_name ?? "Credit Card"}
          {lastFour && <span className="text-muted-foreground"> • {lastFour}</span>}
        </span>
      </div>
      <div className="mt-3 space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Payment due</span>
          {editing ? (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Day</span>
              <input
                type="number"
                min={1}
                max={31}
                value={dayValue}
                onChange={(e) => setDayValue(e.target.value)}
                className="w-12 h-6 text-xs text-center border rounded px-1 tabular-nums"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave()
                  if (e.key === "Escape") setEditing(false)
                }}
              />
              <button
                onClick={handleSave}
                disabled={isPending}
                className="text-emerald-600 hover:text-emerald-700"
              >
                <Check className="size-3.5" />
              </button>
              <button
                onClick={() => setEditing(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span>
                {account.payment_due_day
                  ? getNextDueDate(account.payment_due_day)
                  : "Not set"}
              </span>
              <button
                onClick={() => setEditing(true)}
                className="text-muted-foreground hover:text-foreground"
              >
                <Pencil className="size-3" />
              </button>
            </div>
          )}
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Current balance</span>
          <span className="font-medium tabular-nums">
            {currency.format(Math.abs(account.balance))}
          </span>
        </div>
      </div>
    </div>
  )
}

export function CreditCardBills({ accounts }: { accounts: CreditAccount[] }) {
  if (accounts.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          Credit Card Payments
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {accounts.map((acc) => (
          <CreditCardRow key={acc.id} account={acc} />
        ))}
      </CardContent>
    </Card>
  )
}
