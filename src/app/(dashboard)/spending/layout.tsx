import { createClient } from "@/lib/supabase/server"
import { SpendingShell } from "./spending-shell"

export default async function SpendingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const rawName =
    user?.user_metadata?.full_name?.split(" ")[0] ??
    user?.email?.split("@")[0] ??
    "there"
  // Capitalize and strip trailing digits from email-derived usernames (e.g. "collette7smith" → "Collette")
  const firstName = rawName.replace(/\d+.*$/, "").replace(/^./, (c: string) => c.toUpperCase()) || rawName

  return <SpendingShell firstName={firstName}>{children}</SpendingShell>
}