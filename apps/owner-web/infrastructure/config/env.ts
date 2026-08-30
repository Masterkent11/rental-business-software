/**
 * Infrastructure Environment Configuration
 *
 * Rules:
 * - NO hardcoded fallback production Supabase URLs or keys.
 * - Fails fast with clear descriptive error if required environment variables are absent.
 */

export interface EnvConfig {
  readonly apiBaseUrl: string;
  readonly supabaseUrl: string;
  readonly supabasePublishableKey: string;
}

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key] ?? defaultValue;
  if (!value) {
    throw new Error(
      `[EnvConfig Error] Missing required environment variable: ${key}. Please configure it in your .env.local file.`,
    );
  }
  return value;
}

export const env: EnvConfig = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080",
  // Fail fast if Supabase configuration is missing in production/staging
  supabaseUrl:
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    (process.env.NODE_ENV === "development"
      ? "http://127.0.0.1:54321"
      : getEnvVar("NEXT_PUBLIC_SUPABASE_URL")),
  supabasePublishableKey:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    (process.env.NODE_ENV === "development"
      ? "sb_publishable_local_dev_key"
      : getEnvVar("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")),
};
