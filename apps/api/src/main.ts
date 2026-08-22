import 'reflect-metadata';
import { Readable } from 'node:stream';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module.ts';
import { sql } from './infrastructure/postgres/db.ts';

/**
 * Fastify under Nest, keeping ADR-0002's transport reasoning: long-lived
 * connections suit the `SERIALIZABLE` transactions and advisory locks that
 * Sprint 3's occupancy writes depend on.
 */
const adapter = new FastifyAdapter();

/**
 * Keep the raw request body.
 *
 * A webhook signature is computed over bytes. Re-serialising the parsed JSON
 * does not reliably reproduce them — key order and whitespace are not
 * guaranteed — so verification has to see what actually arrived.
 */
adapter.getInstance().addHook('preParsing', async (request, _reply, payload) => {
  const chunks: Buffer[] = [];
  for await (const chunk of payload) {
    chunks.push(Buffer.from(chunk as Buffer));
  }
  const raw = Buffer.concat(chunks);
  (request as typeof request & { rawBody?: string }).rawBody = raw.toString('utf8');
  return Readable.from(raw);
});

const app = await NestFactory.create<NestFastifyApplication>(
  AppModule,
  adapter,
);

app.enableCors({ origin: true });

const port = Number(process.env.PORT ?? 8080);
await app.listen(port, '0.0.0.0');

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
      `${(process.env.SUPABASE_URL ?? '').replace(/\/$/, '')}/auth/v1/.well-known/jwks.json`,
    ).catch(() => undefined),
  ]);
})();
