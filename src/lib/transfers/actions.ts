"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { detectAndLinkTransfers } from "./detector";

export async function runTransferDetection() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const linked = await detectAndLinkTransfers(user.id);

  revalidatePath("/transactions");
  revalidatePath("/spending");

  return { linked };
}
