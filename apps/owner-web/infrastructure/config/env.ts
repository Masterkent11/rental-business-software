export interface EnvConfig {
  readonly apiBaseUrl: string;
  readonly supabaseUrl: string;
  readonly supabasePublishableKey: string;
  readonly appEnv: string;
}

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy apps/owner-web/.env.example to .env.local and fill it in.`,
    );
  }
  return value;
}

export const env: EnvConfig = {
  apiBaseUrl: required("NEXT_PUBLIC_API_BASE_URL", process.env.NEXT_PUBLIC_API_BASE_URL),
  supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabasePublishableKey: required(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  ),
  appEnv: process.env.NEXT_PUBLIC_APP_ENV ?? "development",
};
