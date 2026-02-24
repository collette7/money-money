import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/sidebar/app-sidebar"
import { AppHeader } from "@/components/header/app-header"
import { AutoSync } from "@/components/auto-sync"
import { createClient } from "@/lib/supabase/server"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const fullName = user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "User"
  const email = user?.email ?? ""

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppHeader userName={fullName} />
        <div className="flex-1 overflow-auto p-4 md:p-6">{children}</div>
      </SidebarInset>
      <AutoSync />
    </SidebarProvider>
  )
}
