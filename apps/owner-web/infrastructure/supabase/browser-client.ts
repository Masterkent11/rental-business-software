import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "../config/env";

let client: SupabaseClient | null = null;

export function supabaseBrowserClient(): SupabaseClient {
  if (!client) {
    client = createClient(env.supabaseUrl, env.supabasePublishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
      realtime: { params: { eventsPerSecond: 20 } },
    });
  }
  return client;
}

export async function currentAccessToken(): Promise<string | null> {
  const { data } = await supabaseBrowserClient().auth.getSession();
  return data.session?.access_token ?? null;
}
