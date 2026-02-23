import Link from "next/link"
import { redirect } from "next/navigation"
import {
  ChevronDown,
  FileSpreadsheet,
  Landmark,
  Plus,
  Wifi,
} from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { InstitutionGroup } from "./institution-group"
import { SyncButton } from "./sync-button"

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

export default async function AccountsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const { data: accounts } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", user.id)
    .order("institution_name", { ascending: true })

  const hasAccounts = accounts && accounts.length > 0

  const groupedAccounts = new Map<string, Account[]>()
  accounts?.forEach((acc) => {
    const key = acc.institution_name
    if (!groupedAccounts.has(key)) {
      groupedAccounts.set(key, [])
    }
    groupedAccounts.get(key)!.push(acc as Account)
  })

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="text-xs font-medium uppercase tracking-[1.2px] text-[#6a7282]">
            ACCOUNTS
          </span>
        </div>
        <div className="flex items-center gap-2">
          {hasAccounts && <SyncButton />}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Plus className="size-4" />
                Add Account
                <ChevronDown className="size-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/accounts/connect">
                  <Wifi className="size-4" />
                  Connect via SimpleFIN
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/accounts/import">
                  <FileSpreadsheet className="size-4" />
                  Import CSV/OFX File
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {hasAccounts ? (
        <div className="rounded-lg border border-[#e5e7eb] bg-white">
          <div className="grid grid-cols-[1fr_120px_80px] items-center border-b border-[#e5e7eb] px-6 py-3">
            <span className="text-sm font-medium text-[#101828]">Account Name</span>
            <span className="text-sm font-medium text-[#101828]">Amount</span>
            <span className="text-sm font-medium text-[#101828] text-right">Actions</span>
          </div>
          {Array.from(groupedAccounts.entries()).map(([institutionName, institutionAccounts]) => (
            <InstitutionGroup
              key={institutionName}
              institutionName={institutionName}
              institutionDomain={institutionAccounts[0]?.institution_domain}
              accounts={institutionAccounts}
            />
          ))}
        </div>
      ) : (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <Landmark className="mb-4 size-12 text-muted-foreground/50" />
          <h2 className="text-lg font-medium">No accounts linked</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Connect your bank accounts to get a complete picture of your
            finances.
          </p>
          <div className="mt-6 flex gap-3">
            <Button variant="outline" asChild>
              <Link href="/accounts/import">
                <FileSpreadsheet className="size-4" />
                Import File
              </Link>
            </Button>
            <Button asChild>
              <Link href="/accounts/connect">
                <Wifi className="size-4" />
                Connect SimpleFIN
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
