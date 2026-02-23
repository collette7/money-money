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
  const firstName =
    user?.user_metadata?.full_name?.split(" ")[0] ??
    user?.email?.split("@")[0] ??
    "there"

  return <SpendingShell firstName={firstName}>{children}</SpendingShell>
}