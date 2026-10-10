import { DEFAULT_LEAD_RESPONSE_WINDOW_MINUTES } from '@/domain/assignment/lead-assignment.ts';

export type AppEnvironment = 'development' | 'demo' | 'production' | 'test';
export type PaymentProviderName = 'sandbox' | 'none';

export interface EnvironmentConfig {
  readonly appEnv: AppEnvironment;
  readonly databaseUrl: string;
  readonly port: number;
  readonly supabaseUrl: string;
  readonly paymentProvider: PaymentProviderName;
  readonly paymentWebhookSecret: string | null;
  readonly corsOrigins: readonly string[] | true;
  readonly leadResponseWindowMinutes: number;
  readonly leadSweepIntervalSeconds: number;
}

export class EnvironmentConfigError extends Error {}

const DEFAULT_LEAD_SWEEP_INTERVAL_SECONDS = 60;

const APP_ENVS: readonly AppEnvironment[] = ['development', 'demo', 'production', 'test'];

export function loadEnvironmentConfig(env: NodeJS.ProcessEnv = process.env): EnvironmentConfig {
  const problems: string[] = [];
  const appEnv = (env.APP_ENV ?? 'development') as AppEnvironment;
  if (!APP_ENVS.includes(appEnv)) problems.push(`APP_ENV must be one of ${APP_ENVS.join(', ')}`);

  const databaseUrl = env.DATABASE_URL ?? '';
  if (!databaseUrl) problems.push('DATABASE_URL is required');

  const supabaseUrl = (env.SUPABASE_URL ?? '').replace(/\/$/, '');
  if (!supabaseUrl) problems.push('SUPABASE_URL is required');

  const requestedProvider = env.PAYMENT_PROVIDER ?? (appEnv === 'production' ? 'none' : 'sandbox');
  if (requestedProvider !== 'sandbox' && requestedProvider !== 'none') {
    problems.push('PAYMENT_PROVIDER must be sandbox or none until a live provider is integrated');
  }
  if (appEnv === 'production' && requestedProvider === 'sandbox') {
    problems.push('The sandbox payment provider cannot run with APP_ENV=production');
  }

  const paymentWebhookSecret = env.PAYMENT_WEBHOOK_SECRET?.trim() || null;
  if (requestedProvider === 'sandbox' && appEnv !== 'development' && appEnv !== 'test' && !paymentWebhookSecret) {
    problems.push('PAYMENT_WEBHOOK_SECRET is required for the sandbox provider outside development');
  }

  const corsOrigins = env.CORS_ORIGINS
    ? env.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
    : appEnv === 'production'
      ? []
      : true;
  if (appEnv === 'production' && Array.isArray(corsOrigins) && corsOrigins.length === 0) {
    problems.push('CORS_ORIGINS is required in production');
  }

  const leadResponseWindowMinutes = Number(env.LEAD_RESPONSE_WINDOW_MINUTES ?? DEFAULT_LEAD_RESPONSE_WINDOW_MINUTES);
  if (!Number.isInteger(leadResponseWindowMinutes) || leadResponseWindowMinutes < 5 || leadResponseWindowMinutes > 10080) {
    problems.push('LEAD_RESPONSE_WINDOW_MINUTES must be a whole number between 5 and 10080');
  }
  const leadSweepIntervalSeconds = Number(env.LEAD_SWEEP_INTERVAL_SECONDS ?? DEFAULT_LEAD_SWEEP_INTERVAL_SECONDS);
  if (!Number.isInteger(leadSweepIntervalSeconds) || leadSweepIntervalSeconds < 0 || leadSweepIntervalSeconds > 3600) {
    problems.push('LEAD_SWEEP_INTERVAL_SECONDS must be a whole number between 0 and 3600');
  }

  if (problems.length > 0) {
    throw new EnvironmentConfigError(`Invalid API configuration:\n- ${problems.join('\n- ')}`);
  }

  return {
    appEnv,
    databaseUrl,
    port: Number(env.PORT ?? 8080),
    supabaseUrl,
    paymentProvider: requestedProvider as PaymentProviderName,
    paymentWebhookSecret,
    corsOrigins,
    leadResponseWindowMinutes,
    leadSweepIntervalSeconds,
  };
}
