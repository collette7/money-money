import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { listCategoryRules, type CategoryRuleRow } from "./actions"
import { getCategories } from "@/app/(dashboard)/transactions/actions"
import { RulesList } from "./rules-list"

export default async function RulesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const [rules, categories] = await Promise.all([
    listCategoryRules(),
    getCategories(),
  ])

  return <RulesList rules={rules} categories={categories} />
}
