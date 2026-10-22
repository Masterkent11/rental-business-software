import { Readable } from 'node:stream';
import { PayloadTooLargeException } from '@nestjs/common';

export async function readWebhookBody(payload: AsyncIterable<Uint8Array>, limit: number) {
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of payload) {
    bytes += chunk.byteLength;
    if (bytes > limit) throw new PayloadTooLargeException('Webhook body is too large');
    chunks.push(Buffer.from(chunk));
  }
  const body = Buffer.concat(chunks);
  return { rawBody: body.toString('utf8'), payload: Readable.from(body) };
}
