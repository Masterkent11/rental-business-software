import { describe, expect, it } from 'vitest';
import {
  EnvironmentConfigError,
  loadEnvironmentConfig,
} from '@/infrastructure/config/environment-config.ts';

const base = { DATABASE_URL: 'postgres://x', SUPABASE_URL: 'https://example.supabase.co' };

describe('loadEnvironmentConfig', () => {
  it('defaults development to the sandbox provider and open CORS', () => {
    const config = loadEnvironmentConfig({ ...base });
    expect(config.appEnv).toBe('development');
    expect(config.paymentProvider).toBe('sandbox');
    expect(config.corsOrigins).toBe(true);
  });

  it('fails fast when required values are missing', () => {
    expect(() => loadEnvironmentConfig({})).toThrow(EnvironmentConfigError);
  });

  it('never runs the sandbox payment provider in production', () => {
    expect(() =>
      loadEnvironmentConfig({ ...base, APP_ENV: 'production', PAYMENT_PROVIDER: 'sandbox', CORS_ORIGINS: 'https://owner.example' }),
    ).toThrow(/sandbox payment provider/);
    const config = loadEnvironmentConfig({ ...base, APP_ENV: 'production', CORS_ORIGINS: 'https://owner.example' });
    expect(config.paymentProvider).toBe('none');
    expect(config.corsOrigins).toEqual(['https://owner.example']);
  });

  it('requires a webhook secret for the sandbox outside development', () => {
    expect(() => loadEnvironmentConfig({ ...base, APP_ENV: 'demo' })).toThrow(/PAYMENT_WEBHOOK_SECRET/);
  });
});
