import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

export type AuditAction = 
  | "auth.login"
  | "auth.signup"
  | "auth.logout"
  | "settings.ai_update"
  | "account.connect"
  | "account.sync"
  | "transaction.import"
  | "transaction.bulk_update"
  | "transaction.categorize"
  | "goal.create"
  | "goal.update"
  | "goal.delete"
  | "budget.create"
  | "budget.update";

export interface AuditLogEntry {
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, any>;
}

export async function createAuditLog(entry: AuditLogEntry) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    const headersList = await headers();
    const ipAddress = headersList.get("x-forwarded-for") || 
                     headersList.get("x-real-ip") || 
                     undefined;
    const userAgent = headersList.get("user-agent") || undefined;

    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId,
      metadata: entry.metadata,
      ip_address: ipAddress,
      user_agent: userAgent,
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
  }
}