import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getAISettingsForUser } from "./actions"
import { SettingsForm } from "./settings-form"

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const settings = await getAISettingsForUser() || {
    provider: "openai",
    hasApiKey: false,
    apiKeyPreview: null,
    baseUrl: null,
    model: "gpt-4o-mini"
  }

  return (
    <SettingsForm
      currentSettings={settings}
      userEmail={user.email ?? ""}
      firstName={(user.user_metadata?.first_name as string) ?? ""}
      lastName={(user.user_metadata?.last_name as string) ?? ""}
    />
  )
}
