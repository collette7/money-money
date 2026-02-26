"use client"

import { useState, useTransition } from "react"
import {
  Building2,
  CreditCard,
  Landmark,
  MoreVertical,
  PiggyBank,
  Trash2,
  TrendingUp,
  Wallet,
  Wifi,
  FileSpreadsheet,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { deleteAccount } from "./actions"
import { AccountIcon } from "@/components/account-icon"
import { extractAccountLastFour } from "@/lib/account-utils"
import { SyncButton } from "./sync-button"

const ACCOUNT_TYPE_CONFIG: Record<
  string,
  { label: string; icon: typeof Landmark; variant: "default" | "secondary" | "outline" }
> = {
  checking: { label: "Checking", icon: Wallet, variant: "secondary" },
  savings: { label: "Savings", icon: PiggyBank, variant: "secondary" },
  credit: { label: "Credit Card", icon: CreditCard, variant: "outline" },
  investment: { label: "Investment", icon: TrendingUp, variant: "secondary" },
  loan: { label: "Loan", icon: Building2, variant: "outline" },
}

function formatCurrency(amount: number, currency: string = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount)
}

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return "Never"
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffSec = Math.floor(diffMs / 1000)

  if (diffSec < 60) return "Just now"
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour}h ago`
  const diffDay = Math.floor(diffHour / 24)
  if (diffDay < 30) return `${diffDay}d ago`
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

interface Account {
  id: string
  institution_name: string
  institution_domain?: string | null
  account_type: string
  name: string
  balance: number
  currency: string
  sync_method: string
  last_synced: string | null
}

function AccountCard({ account }: { account: Account }) {
  const [showDelete, setShowDelete] = useState(false)
  const [isPending, startTransition] = useTransition()

  const typeConfig = ACCOUNT_TYPE_CONFIG[account.account_type] ?? {
    label: account.account_type,
    icon: Landmark,
    variant: "secondary" as const,
  }
  const TypeIcon = typeConfig.icon
  const isNegative = account.balance < 0

  return (
    <>
      <Card className="group relative overflow-hidden transition-shadow hover:shadow-md">
        <CardHeader className="pb-2 px-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 overflow-hidden">
              <AccountIcon
                accountNumber={account.name}
                accountType={account.account_type}
                institutionName={account.institution_name}
                institutionDomain={account.institution_domain}
                size="sm"
                showNumber={false}
              />
              <div className="min-w-0 flex-1">
                <CardTitle className="flex items-center gap-1.5 text-[16px] leading-tight">
                  <span className="truncate">{account.institution_name}</span>
                  <span className="shrink-0 text-muted-foreground text-[13px]">{extractAccountLastFour(account.name) || account.name.slice(-4)}</span>
                </CardTitle>
                <p className="truncate text-[13px] text-muted-foreground">
                  {ACCOUNT_TYPE_CONFIG[account.account_type as keyof typeof ACCOUNT_TYPE_CONFIG]?.label || account.account_type}
                </p>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setShowDelete(true)}
                >
                  <Trash2 className="size-4" />
                  Delete Account
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 px-4">
          <p
            className={`text-[16px] font-semibold tracking-tight ${
              isNegative ? "text-orange-600" : ""
            }`}
          >
            {formatCurrency(account.balance, account.currency)}
          </p>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
              <Badge variant={typeConfig.variant} className="text-[10px] shrink-0">
                {typeConfig.label}
              </Badge>
              <Badge
                variant="outline"
                className="text-[10px] gap-1 shrink-0"
              >
                {account.sync_method === "simplefin" ? (
                  <Wifi className="size-2.5" />
                ) : (
                  <FileSpreadsheet className="size-2.5" />
                )}
                {account.sync_method === "simplefin" ? "SimpleFIN" : "Manual"}
              </Badge>
            </div>
            <span className="text-[10px] text-muted-foreground shrink-0">
              {relativeTime(account.last_synced)}
            </span>
          </div>
          {account.sync_method === "simplefin" && (
            <div className="flex items-center justify-between border-t pt-2">
              <div>
                <p className="text-[13px] text-muted-foreground">Last synced</p>
                <p className="text-[13px] font-medium">{relativeTime(account.last_synced)}</p>
              </div>
              <SyncButton variant="ghost" size="icon" />
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">
                {account.name}
              </span>{" "}
              from {account.institution_name}? This will also remove all
              associated transactions. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDelete(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  await deleteAccount(account.id)
                  setShowDelete(false)
                })
              }
            >
              {isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export { AccountCard }
