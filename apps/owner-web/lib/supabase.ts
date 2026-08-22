"use client";

import { createClient } from "@supabase/supabase-js";

/**
 * Supabase Auth, for identity only.
 *
 * The token answers *who*. What this owner may do — and in which organization —
 * is resolved by the API on every request from the database (ADR-0007). Nothing
 * here reads a capability out of a token, and nothing should: an owner removed
 * from a property should lose access on their next request, not at expiry.
 *
 * The publishable key is safe in a shipped client. The secret key must never
 * appear in this app.
 */
const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://yoscanunnqbzmlnwzift.supabase.co";

const publishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "sb_publishable_kIi6Ltp2MkALYjGHCVeU3g_e5rAJp-q";

export const supabase = createClient(url, publishableKey);
