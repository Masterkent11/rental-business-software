"use client";

import { createClient } from "@supabase/supabase-js";
import { env } from "@/infrastructure/config/env";

/**
 * Supabase Auth client for identity tokens.
 *
 * Configured strictly via environment variables (env.ts).
 * No hardcoded remote URLs or production keys allowed.
 */
export const supabase = createClient(env.supabaseUrl, env.supabasePublishableKey);
