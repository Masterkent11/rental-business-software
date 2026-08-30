export interface EnvironmentConfig {
  readonly databaseUrl: string;
  readonly port: number;
  readonly supabaseUrl?: string | undefined;
  readonly supabaseAnonKey?: string | undefined;
}

export function loadEnvironmentConfig(): EnvironmentConfig {
  return {
    databaseUrl: process.env.DATABASE_URL || '',
    port: parseInt(process.env.PORT || '3000', 10),
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  };
}
