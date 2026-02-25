"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { signupSchema } from "@/lib/validation";
import { createAuditLog } from "@/lib/audit-log";

export async function signup(formData: FormData) {
  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_APP_URL || (await headers()).get("origin");

  const result = signupSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const errorMsg = Object.values(errors).flat()[0] || "Invalid input";
    redirect(`/auth/signup?error=${encodeURIComponent(errorMsg)}`);
  }

  const { firstName, lastName, email, password } = result.data;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: {
        full_name: `${firstName} ${lastName}`,
        first_name: firstName,
        last_name: lastName,
      },
    },
  });

  if (error) {
    await createAuditLog({
      action: "auth.signup",
      metadata: {
        email,
        success: false,
        error: error.message
      }
    });
    redirect("/auth/signup?error=Could+not+create+account");
  }

  await createAuditLog({
    action: "auth.signup",
    metadata: {
      email,
      success: true
    }
  });

  revalidatePath("/", "layout");
  redirect("/auth/confirm");
}
