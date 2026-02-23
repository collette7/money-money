import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getConversations } from "./actions"
import { ChatUI } from "./chat-ui"

export default async function AdvisorPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const conversations = await getConversations()

  return <ChatUI conversations={conversations} />
}
