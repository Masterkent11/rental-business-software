import { assertDatabaseIsolation } from '@/infrastructure/postgres/database-isolation.provider.ts';
import 'reflect-metadata';
import { readWebhookBody } from './infrastructure/http/webhook-body.adapter.ts';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { loadEnvironmentConfig } from './infrastructure/config/environment-config.ts';
import { corsOptions } from './infrastructure/config/cors-options.ts';

const config = loadEnvironmentConfig();

const { AppModule } = await import('./app.module.ts');
const { sql } = await import('./infrastructure/postgres/db.ts');
await assertDatabaseIsolation(sql);

/**
 * Fastify under Nest, keeping ADR-0002's transport reasoning: long-lived
 * connections suit the `SERIALIZABLE` transactions and advisory locks that
 * Sprint 3's occupancy writes depend on.
 */
/**
 * Bodies large enough for a panorama.
 *
 * Fastify defaults to 1 MB, which is right for JSON and wrong for a 360°
 * photograph: the storage bucket accepts 25 MB and base64 inflates by a third,
 * so the ceiling has to clear ~34 MB.
 *
 * Base64 inside JSON rather than multipart: it keeps one content type across
 * the whole API and avoids a parser dependency for the single endpoint that
 * takes a file. The cost is that third, paid on the owner's upload — once per
 * room, at authoring time, never on the customer's path.
 */
const adapter = new FastifyAdapter({ bodyLimit: 40 * 1024 * 1024 });

adapter.getInstance().addHook('preParsing', async (request, _reply, payload) => {
  if (request.method !== 'POST' || request.url.split('?')[0] !== '/webhooks/payments') return payload;
  const result = await readWebhookBody(payload, 1024 * 1024);
  (request as typeof request & { rawBody?: string }).rawBody = result.rawBody;
  return result.payload;
});

const app = await NestFactory.create<NestFastifyApplication>(
  AppModule,
  adapter,
);

app.enableCors(corsOptions(config.corsOrigins));

await app.listen(config.port, '0.0.0.0');

/**
 * Warm the two cold caches before the first customer request arrives.
 *
 * On a cold start the first authenticated request pays for a JWKS fetch to the
 * identity provider *and* for opening a pooled connection to a database in
 * another region — while the app fires four requests at once. That burst
 * overran the client's 12-second timeout and surfaced as "could not reach the
 * server" on a server that was working fine.
 *
 * Deliberately after `listen` and deliberately not awaited: warming is an
 * optimisation, and a slow identity provider must not stop the service coming
 * up. Failures are ignored for the same reason — the next real request will
 * try again and report properly.
 */
void (async () => {
  await Promise.allSettled([
    sql`select 1`,
    fetch(
      `${config.supabaseUrl}/auth/v1/.well-known/jwks.json`,
    ).catch(() => undefined),
  ]);
})();
