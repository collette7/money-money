"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export type RuleConditionRow = {
  field: string
  operator: string
  value: string
  value_end?: string | null
}

export type CategoryRuleRow = {
  id: string
  category_id: string
  field: string
  operator: string
  value: string
  value_end: string | null
  conditions: RuleConditionRow[]
  set_ignored: boolean | null
  set_merchant_name: string | null
  set_tags: string[] | null
  priority: number
  is_active: boolean
  created_at: string
  categories: {
    id: string
    name: string
    icon: string | null
    color: string | null
    type: string
  } | null
}

export async function listCategoryRules(): Promise<CategoryRuleRow[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const { data, error } = await supabase
    .from("category_rules")
    .select(
      `
      id, category_id, field, operator, value, value_end,
      conditions, set_ignored, set_merchant_name, set_tags,
      priority, is_active, created_at,
      categories ( id, name, icon, color, type )
    `
    )
    .eq("user_id", user.id)
     .order("created_at", { ascending: false })

   if (error) {
     console.error("[getRules]", error.message)
     throw new Error("Failed to load data")
   }

   return (data ?? []).map((row) => {
    let conditions: RuleConditionRow[] = []
    if (row.conditions) {
      try {
        const parsed =
          typeof row.conditions === "string"
            ? JSON.parse(row.conditions)
            : row.conditions
        if (Array.isArray(parsed) && parsed.length > 0) {
          conditions = parsed
        }
      } catch {
        // fall through to legacy
      }
    }

    // Fallback: build from legacy columns
    if (conditions.length === 0) {
      conditions = [
        {
          field: row.field,
          operator: row.operator,
          value: row.value,
          value_end: row.value_end,
        },
      ]
    }

    return {
      ...row,
      conditions,
      categories: Array.isArray(row.categories)
        ? (row.categories as unknown as CategoryRuleRow["categories"][])[0] ?? null
        : row.categories,
    } as CategoryRuleRow
  })
}

export async function updateCategoryRule(
  ruleId: string,
  updates: {
    categoryId?: string
    conditions?: RuleConditionRow[]
    setIgnored?: boolean | null
    setMerchantName?: string | null
    setTags?: string[] | null
    isActive?: boolean
  }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const payload: Record<string, unknown> = {}

  if (updates.categoryId !== undefined) {
    payload.category_id = updates.categoryId
  }
  if (updates.conditions !== undefined && updates.conditions.length > 0) {
    const primary = updates.conditions[0]
    payload.field = primary.field
    payload.operator = primary.operator
    payload.value = primary.value
    payload.value_end = primary.value_end ?? null
    payload.conditions = JSON.stringify(updates.conditions)
  }
  if (updates.setIgnored !== undefined) {
    payload.set_ignored = updates.setIgnored
  }
  if (updates.setMerchantName !== undefined) {
    payload.set_merchant_name = updates.setMerchantName
  }
  if (updates.setTags !== undefined) {
    payload.set_tags = updates.setTags
  }
  if (updates.isActive !== undefined) {
    payload.is_active = updates.isActive
  }

  const { error } = await supabase
    .from("category_rules")
    .update(payload)
     .eq("id", ruleId)
     .eq("user_id", user.id)

   if (error) {
     console.error("[updateRule]", error.message)
     throw new Error("Failed to update record")
   }

   // Re-apply retroactively when any actionable field changes
   const shouldReapply =
    updates.conditions || updates.categoryId ||
    updates.setMerchantName !== undefined ||
    updates.setIgnored !== undefined ||
    updates.setTags !== undefined

  let applied = 0
  if (shouldReapply) {
    const { data: rule } = await supabase
      .from("category_rules")
      .select("category_id, conditions, set_ignored, set_merchant_name, set_tags, field, operator, value, value_end")
      .eq("id", ruleId)
      .single()

    if (rule) {
      let conds: RuleConditionRow[] = []
      try {
        const parsed =
          typeof rule.conditions === "string"
            ? JSON.parse(rule.conditions as string)
            : rule.conditions
        if (Array.isArray(parsed) && parsed.length > 0) conds = parsed
      } catch {
        /* empty */
      }
      if (conds.length === 0) {
        conds = [{ field: rule.field, operator: rule.operator, value: rule.value, value_end: rule.value_end }]
      }

      applied = await applyRuleRetroactively(supabase, user.id, rule.category_id, conds, {
        setIgnored: rule.set_ignored,
        setMerchantName: rule.set_merchant_name,
        setTags: rule.set_tags,
      })
    }
  }

  revalidatePath("/")
  revalidatePath("/settings/rules")
  revalidatePath("/transactions")
  revalidatePath("/spending")
  return { success: true, applied }
}

export async function deleteCategoryRule(ruleId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const { error } = await supabase
    .from("category_rules")
    .delete()
     .eq("id", ruleId)
     .eq("user_id", user.id)

   if (error) {
     console.error("[deleteRule]", error.message)
     throw new Error("Failed to delete record")
   }

   revalidatePath("/settings/rules")
   revalidatePath("/transactions")
   return { success: true }
}

export async function toggleRuleActive(ruleId: string, isActive: boolean) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const { error } = await supabase
    .from("category_rules")
    .update({ is_active: isActive })
     .eq("id", ruleId)
     .eq("user_id", user.id)

   if (error) {
     console.error("[toggleRuleActive]", error.message)
     throw new Error("Failed to update record")
   }

   revalidatePath("/settings/rules")
   return { success: true }
}

function applyConditionToQuery(query: ReturnType<any>, cond: RuleConditionRow) {
  const { field, operator, value } = cond
  const val = value.trim()

  if (field === "amount") {
    const num = parseFloat(val)
    switch (operator) {
      case "equals":
        return query.eq("amount", num)
      case "greater_than":
        return query.gt("amount", num)
      case "less_than":
        return query.lt("amount", num)
      case "between": {
        const end = parseFloat(cond.value_end ?? val)
        return query.gte("amount", num).lte("amount", end)
      }
      default:
        return query
    }
  }

  const isTextPair = field === "merchant_name" || field === "description"

  switch (operator) {
    case "contains":
      if (isTextPair) {
        return query.or(`merchant_name.ilike.%${val}%,description.ilike.%${val}%`)
      }
      return query.ilike(field, `%${val}%`)
    case "equals":
      if (isTextPair) {
        return query.or(`merchant_name.ilike.${val},description.ilike.${val}`)
      }
      return query.ilike(field, val)
    case "starts_with":
      if (isTextPair) {
        return query.or(`merchant_name.ilike.${val}%,description.ilike.${val}%`)
      }
      return query.ilike(field, `${val}%`)
    default:
      return query
  }
}

async function applyRuleRetroactively(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  categoryId: string,
  conditions: RuleConditionRow[],
  options?: { setIgnored?: boolean | null; setMerchantName?: string | null; setTags?: string[] | null }
): Promise<number> {
  const { data: cat } = await supabase
    .from("categories")
    .select("type")
    .eq("id", categoryId)
    .single()

  let query = supabase
    .from("transactions")
    .select("id, accounts!account_id!inner ( user_id )")
    .eq("accounts.user_id", userId)

  for (const cond of conditions) {
    query = applyConditionToQuery(query, cond)
  }

  const { data: matches, error: matchError } = await query.limit(1000)
  if (matchError) {
    console.error("[applyRuleRetroactively] match query failed:", matchError.message)
    return 0
  }
  if (!matches?.length) return 0

  const ids = matches.map((m: { id: string }) => m.id)
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100)
    const payload: Record<string, unknown> = {
      category_id: categoryId,
      categorized_by: "rule",
      type: cat?.type ?? null,
      category_confirmed: true,
      review_flagged: false,
    }
    if (options?.setIgnored !== undefined && options.setIgnored !== null) {
      payload.ignored = options.setIgnored
    }
    if (options?.setMerchantName !== undefined && options.setMerchantName !== null) {
      payload.merchant_name = options.setMerchantName
    }
    if (options?.setTags !== undefined && options.setTags !== null) {
      payload.tags = options.setTags
    }
    const { error: updateError } = await supabase.from("transactions").update(payload).in("id", chunk)
    if (updateError) {
      console.error("[applyRuleRetroactively] update failed:", updateError.message)
    }
  }

  return ids.length
}
