import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { corsOptions } from '@/infrastructure/config/cors-options.ts';

describe('CORS options', () => {
  it('lets browsers send every method the portal uses', async () => {
    const app = Fastify();
    await app.register(cors, corsOptions(['http://localhost:3200']));
    app.patch('/thing', async () => ({ ok: true }));
    for (const method of ['PATCH', 'PUT', 'DELETE']) {
      const preflight = await app.inject({
        method: 'OPTIONS',
        url: '/thing',
        headers: {
          origin: 'http://localhost:3200',
          'access-control-request-method': method,
          'access-control-request-headers': 'authorization,content-type',
        },
      });
      expect(preflight.statusCode).toBe(204);
      expect(preflight.headers['access-control-allow-methods']).toContain(method);
      expect(preflight.headers['access-control-allow-origin']).toBe('http://localhost:3200');
    }
    await app.close();
  });

  it('does not reflect origins outside the allow-list', async () => {
    const app = Fastify();
    await app.register(cors, corsOptions(['https://partners.example.com']));
    app.get('/thing', async () => ({ ok: true }));
    const response = await app.inject({ method: 'GET', url: '/thing', headers: { origin: 'https://evil.example' } });
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
    await app.close();
  });
});
