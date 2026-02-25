"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { aiSettingsSchema } from "@/lib/validation";
import { createAuditLog } from "@/lib/audit-log";
import { encrypt, decrypt } from "@/lib/encryption";

export async function getAISettingsForUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  try {
    const { data, error } = await supabase
      .from("ai_settings")
      .select("provider, api_key, base_url, model, metadata")
      .eq("user_id", user.id)
      .single();

    if (error) {
      if (error.message.includes("metadata")) {
        const { data: basicData } = await supabase
          .from("ai_settings")
          .select("provider, api_key, base_url, model")
          .eq("user_id", user.id)
          .single();
          
        if (!basicData) return null;
        
        return {
          provider: basicData.provider,
          hasApiKey: !!basicData.api_key,
          baseUrl: basicData.base_url,
          model: basicData.model,
        };
      }
      
      if (error.code === "PGRST116") {
        return null;
      }
      
      console.error("Error fetching settings:", error);
      throw error;
    }

    if (!data) return null;
    
    let effectiveProvider = data.provider;
    
    if (data.metadata) {
      const metadata = data.metadata as Record<string, any>;
      if (metadata.original_provider) {
        effectiveProvider = metadata.original_provider;
      }
    }

    return {
      provider: effectiveProvider,
      hasApiKey: !!data.api_key,
      baseUrl: data.base_url,
      model: data.model,
    };
  } catch (error) {
    console.error("Error getting AI settings:", error);
    
    return {
      provider: 'openai',
      hasApiKey: false,
      apiKeyPreview: null,
      baseUrl: null,
      model: 'gpt-4o-mini',
    };
  }
}

export async function saveAISettings(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const result = aiSettingsSchema.safeParse({
    provider: formData.get("provider"),
    model: formData.get("model"),
    api_key: formData.get("apiKey") || undefined,
    base_url: formData.get("baseUrl") || undefined,
  });

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const errorMsg = Object.values(errors).flat()[0] || "Invalid input";
    return { success: false, error: errorMsg };
  }

  const { provider, api_key: apiKey, base_url: baseUrl, model } = result.data;

  const { data: existing, error: queryError } = await supabase
    .from("ai_settings")
    .select("id, api_key, provider")
    .eq("user_id", user.id)
    .single();

  if (queryError && queryError.code !== "PGRST116") {
    console.error("Error querying existing settings:", queryError);
    return { success: false, error: "Failed to query existing settings" };
  }

  const basicUpdates: Record<string, unknown> = {
    provider,
    model,
    base_url: baseUrl,
    updated_at: new Date().toISOString(),
  };

  if (apiKey && apiKey.trim() !== "") {
    basicUpdates.api_key = encrypt(apiKey);
  }

  try {
    let result;
    
    if (existing) {
      result = await supabase
        .from("ai_settings")
        .update(basicUpdates)
        .eq("id", existing.id);
        
      if (!result.error) {
        try {
          await supabase
            .from("ai_settings")
            .update({
              metadata: { original_provider: provider }
            })
            .eq("id", existing.id);
        } catch (metadataError) {
          console.log("Metadata column may not exist, but basic settings saved successfully");
        }
      }
    } else {
      result = await supabase
        .from("ai_settings")
        .insert({
          user_id: user.id,
          ...basicUpdates,
          api_key: apiKey ? encrypt(apiKey) : null,
        });
      
      const newRecord = result.data?.[0] as { id: string } | undefined;
      
      if (!result.error && newRecord?.id) {
        try {
          await supabase
            .from("ai_settings")
            .update({
              metadata: { original_provider: provider }
            })
            .eq("id", newRecord.id);
        } catch (metadataError) {
          console.log("Metadata column may not exist, but basic settings saved successfully");
        }
      }
    }

    if (result.error) {
      console.error("Error saving AI settings:", result.error);
      
      if (result.error.message.includes('invalid input value for enum')) {
        return { 
          success: false, 
          error: `The provider "${provider}" is not supported in your database. Please ensure migrations have been applied. Run: ALTER TYPE public.app_ai_provider ADD VALUE '${provider}';`
        };
      }
      
      return { success: false, error: result.error.message };
    }

    await createAuditLog({
      action: "settings.ai_update",
      metadata: {
        provider,
        model,
        hasBaseUrl: !!baseUrl,
        previousProvider: existing?.provider,
        success: true
      }
    });

    revalidatePath("/settings");
    revalidatePath("/advisor");
    
    return { 
      success: true,
      savedProvider: provider
    };
  } catch (error) {
    console.error("Unexpected error saving AI settings:", error);
    return { 
      success: false, 
      error: "An unexpected error occurred while saving settings. Please try again later." 
    };
  }
}

export async function getNotifications(unreadOnly = false) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  let query = supabase
    .from("notifications")
    .select("id, type, title, message, is_read, metadata, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (unreadOnly) {
    query = query.eq("is_read", false);
  }

  const { data } = await query;
  return data ?? [];
}

export async function markNotificationRead(notificationId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("user_id", user.id);

  revalidatePath("/settings");
}

export async function markAllNotificationsRead() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  revalidatePath("/settings");
}

export async function getUnreadCount() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  return count ?? 0;
}

export async function clearAIApiKey() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { error } = await supabase
    .from("ai_settings")
    .update({ 
      api_key: null,
      updated_at: new Date().toISOString()
    })
    .eq("user_id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/settings");
  revalidatePath("/advisor");
  return { success: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const firstName = (formData.get("firstName") as string ?? "").trim();
  const lastName = (formData.get("lastName") as string ?? "").trim();

  if (!firstName) return { success: false, error: "First name is required" };
  if (firstName.length > 50) return { success: false, error: "First name is too long" };
  if (lastName.length > 50) return { success: false, error: "Last name is too long" };

  const { error } = await supabase.auth.updateUser({
    data: {
      full_name: lastName ? `${firstName} ${lastName}` : firstName,
      first_name: firstName,
      last_name: lastName,
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  await createAuditLog({
    action: "settings.profile_update",
    metadata: { firstName, lastName, success: true },
  });

  revalidatePath("/", "layout");
  return { success: true };
}

// ─── User Preferences (profiles.preferences JSONB) ─────────────────

export type WatchedSymbol = {
  symbol: string
  name: string
}

const DEFAULT_WATCHED_SYMBOLS: WatchedSymbol[] = [
  { symbol: "^DJI", name: "Dow Jones" },
  { symbol: "^GSPC", name: "S&P 500" },
  { symbol: "^VIX", name: "VIX" },
]

export async function getWatchedSymbols(): Promise<WatchedSymbol[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return DEFAULT_WATCHED_SYMBOLS;

  const { data } = await supabase
    .from("profiles")
    .select("preferences")
    .eq("id", user.id)
    .single();

  const prefs = data?.preferences as Record<string, unknown> | null;
  const symbols = prefs?.watched_symbols as WatchedSymbol[] | undefined;

  if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
    return DEFAULT_WATCHED_SYMBOLS;
  }

  return symbols;
}

const CURATED_SYMBOLS: WatchedSymbol[] = [
  { symbol: "^DJI", name: "Dow Jones" },
  { symbol: "^GSPC", name: "S&P 500" },
  { symbol: "^VIX", name: "VIX" },
  { symbol: "^IXIC", name: "Nasdaq" },
  { symbol: "^RUT", name: "Russell 2000" },
  { symbol: "^FTSE", name: "FTSE 100" },
  { symbol: "^N225", name: "Nikkei 225" },
  { symbol: "BTC-USD", name: "Bitcoin" },
  { symbol: "ETH-USD", name: "Ethereum" },
  { symbol: "GC=F", name: "Gold" },
  { symbol: "CL=F", name: "Crude Oil" },
]

export async function searchSymbols(query: string): Promise<WatchedSymbol[]> {
  const q = query.trim().toLowerCase()
  if (q.length === 0) return CURATED_SYMBOLS.slice(0, 6)

  const localMatches = CURATED_SYMBOLS.filter(
    (s) =>
      s.symbol.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q)
  )

  const apiKey = process.env.FINNHUB_API_KEY
  let finnhubResults: WatchedSymbol[] = []

  if (apiKey && q.length >= 1) {
    try {
      const res = await fetch(
        `https://finnhub.io/api/v1/search?q=${encodeURIComponent(q)}&token=${apiKey}`,
        { next: { revalidate: 60 } }
      )
      if (res.ok) {
        const data = await res.json() as {
          result: { description: string; displaySymbol: string; symbol: string; type: string }[]
        }
        finnhubResults = (data.result ?? [])
          .filter((r) => !r.symbol.includes(".") || r.symbol.endsWith(".TO"))
          .slice(0, 8)
          .map((r) => ({ symbol: r.displaySymbol, name: r.description }))
      }
    } catch {
    }
  }

  const seen = new Set<string>()
  const merged: WatchedSymbol[] = []
  for (const s of [...localMatches, ...finnhubResults]) {
    if (!seen.has(s.symbol)) {
      seen.add(s.symbol)
      merged.push(s)
    }
  }

  return merged.slice(0, 10)
}

export async function updateWatchedSymbols(symbols: WatchedSymbol[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Read current preferences to merge (don't overwrite other prefs)
  const { data: existing } = await supabase
    .from("profiles")
    .select("preferences")
    .eq("id", user.id)
    .single();

  const currentPrefs = (existing?.preferences as Record<string, unknown>) ?? {};

  const { error } = await supabase
    .from("profiles")
    .update({
      preferences: { ...currentPrefs, watched_symbols: symbols },
    })
    .eq("id", user.id);

  if (error) {
    console.error("Error updating watched symbols:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  return { success: true };
}
