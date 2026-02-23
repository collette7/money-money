"use client"

import { useState, useTransition } from "react"
import { Eye, MoreVertical, Pencil, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { AccountIcon } from "@/components/account-icon"
import { extractAccountLastFour } from "@/lib/account-utils"
import { deleteAccount } from "./actions"

function stripTrailingAccountNumber(name: string): string {
  const lastFour = extractAccountLastFour(name)
  if (!lastFour) return name
  const idx = name.lastIndexOf(lastFour)
  if (idx <= 0) return name
  let stripped = name.slice(0, idx)
  stripped = stripped.replace(/[\s\-–—•·.:()]+$/, '')
  return stripped || name
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

interface InstitutionGroupProps {
  institutionName: string
  institutionDomain?: string | null
  accounts: Account[]
}

function InstitutionGroup({ institutionName, institutionDomain, accounts }: InstitutionGroupProps) {
  const [showDelete, setShowDelete] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null)

  const mostRecentSync = accounts.reduce<string | null>((acc, account) => {
    if (!account.last_synced) return acc
    if (!acc) return account.last_synced
    return new Date(account.last_synced) > new Date(acc) ? account.last_synced : acc
  }, null)

  const syncMethod = accounts[0]?.sync_method || "manual"

  const handleDeleteClick = (account: Account) => {
    setAccountToDelete(account)
    setShowDelete(true)
  }

  const handleDeleteConfirm = () => {
    if (!accountToDelete) return
    startTransition(async () => {
      await deleteAccount(accountToDelete.id)
      setShowDelete(false)
      setAccountToDelete(null)
    })
  }

  return (
    <>
      <div className="border-b border-[#e5e7eb]">
        <div className="flex items-center justify-between pt-5 px-6 pb-3">
          <div className="flex items-center gap-3">
            <AccountIcon
              institutionName={institutionName}
              institutionDomain={institutionDomain}
              size="md"
              showNumber={false}
            />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[#101828]">{institutionName}</span>
                <Badge 
                  className="bg-[#f0fdf4] border border-[#b9f8cf] text-[#008236] text-[10px] font-semibold rounded tracking-[0.6px] px-1.5 py-0"
                >
                  ACTIVE
                </Badge>
              </div>
              <span className="text-xs text-[#6a7282]">
                Updated {relativeTime(mostRecentSync)} • via {syncMethod === "simplefin" ? "SimpleFIN" : "Manual"}
              </span>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreVertical className="size-5 text-[#6a7282]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {accounts.map((account) => (
                <DropdownMenuItem
                  key={account.id}
                  variant="destructive"
                  onClick={() => handleDeleteClick(account)}
                >
                  <Trash2 className="size-4" />
                  Delete {account.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex flex-col gap-0.5 px-6 pb-4">
          {accounts.map((account) => (
            <div 
              key={account.id} 
              className="grid grid-cols-[1fr_120px_80px] items-center py-1.5"
            >
              <div className="flex items-center">
                <span className="text-sm text-[#101828]">{stripTrailingAccountNumber(account.name)}</span>
                <span className="text-sm text-[#99a1af] mx-1"> • </span>
                <span className="text-sm text-[#6a7282]">
                  {extractAccountLastFour(account.name) || account.name.slice(-4)}
                </span>
              </div>
              
              <div className="text-sm text-[#101828]">
                {formatCurrency(account.balance, account.currency)}
              </div>
              
              <div className="flex items-center justify-end gap-2">
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Pencil className="size-4 text-[#6a7282]" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Eye className="size-4 text-[#6a7282]" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">
                {accountToDelete?.name}
              </span>{" "}
              from {institutionName}? This will also remove all
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
              onClick={handleDeleteConfirm}
            >
              {isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export { InstitutionGroup }
