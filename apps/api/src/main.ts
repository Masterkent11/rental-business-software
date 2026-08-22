import 'reflect-metadata';
import { Readable } from 'node:stream';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module.ts';

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
