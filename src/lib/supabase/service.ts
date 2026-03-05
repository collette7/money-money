import { createServerClient } from "@supabase/ssr";

let _client: ReturnType<typeof createServerClient> | null = null;

export function createServiceClient() {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL");
  }

  _client = createServerClient(url, key, {
    cookies: { getAll: () => [], setAll: () => {} },
  });
  return _client;
}
