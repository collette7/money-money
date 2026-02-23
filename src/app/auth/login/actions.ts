"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validation";
import { createAuditLog } from "@/lib/audit-log";

export async function login(formData: FormData) {
  const supabase = await createClient();

  const result = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const errorMsg = errors.email?.[0] || errors.password?.[0] || "Invalid input";
    redirect(`/auth/login?error=${encodeURIComponent(errorMsg)}`);
  }

  const { error } = await supabase.auth.signInWithPassword(result.data);

  if (error) {
    await createAuditLog({
      action: "auth.login",
      metadata: { 
        email: result.data.email, 
        success: false,
        error: error.message 
      }
    });
    redirect("/auth/login?error=Invalid+credentials");
  }

  await createAuditLog({
    action: "auth.login",
    metadata: { 
      email: result.data.email,
      success: true 
    }
  });

  revalidatePath("/", "layout");
  redirect("/");
}
