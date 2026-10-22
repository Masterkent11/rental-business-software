import { Readable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { readWebhookBody } from '@/infrastructure/http/webhook-body.adapter.ts';

describe('webhook raw body', () => {
  it('preserves exact signed bytes across stream chunks', async () => {
    const original = '{ "eventId": "synthetic", "value": "ñ" }';
    const bytes = Buffer.from(original);
    const result = await readWebhookBody(Readable.from([bytes.subarray(0, 10), bytes.subarray(10)]), bytes.length);
    expect(result.rawBody).toBe(original);
    const replayed: Buffer[] = [];
    for await (const chunk of result.payload) replayed.push(chunk);
    expect(Buffer.concat(replayed)).toEqual(bytes);
  });
  it('rejects an oversized chunked stream before buffering the entire request', async () => {
    let consumed = 0;
    async function* body() {
      for (let i = 0; i < 100; i++) { consumed++; yield Buffer.alloc(8); }
    }
    await expect(readWebhookBody(body(), 10)).rejects.toMatchObject({ status: 413 });
    expect(consumed).toBe(2);
  });
});
