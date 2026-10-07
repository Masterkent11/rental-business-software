import { createServer, type Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SignJWT, exportJWK, generateKeyPair } from 'jose';
import { jwksIdentityProvider } from '@/infrastructure/supabase/jwks-identity.provider.ts';

/**
 * Verifies the adapter against a key set we control.
 *
 * Supabase signs with ES256 and publishes only the public half, so these use a
 * locally generated ES256 pair served at the same well-known path. That covers
 * every rule the adapter enforces — signature, issuer, audience, expiry —
 * without creating a user in a real project.
 */
let server: Server;
let baseUrl: string;
let sign: (claims: Record<string, unknown>, options?: {
  issuer?: string;
  audience?: string;
  expiresIn?: string;
}) => Promise<string>;
let wrongKeySign: (claims: Record<string, unknown>) => Promise<string>;

beforeAll(async () => {
  const { privateKey, publicKey } = await generateKeyPair('ES256');
  const wrong = await generateKeyPair('ES256');
  const jwk = await exportJWK(publicKey);
  jwk.kid = 'test-key';
  jwk.alg = 'ES256';
  jwk.use = 'sig';

  server = createServer((req, res) => {
    if (req.url?.endsWith('/.well-known/jwks.json')) {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ keys: [jwk] }));
      return;
    }
    res.writeHead(404).end();
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  baseUrl = `http://127.0.0.1:${port}`;

  sign = (claims, options = {}) =>
    new SignJWT(claims)
      .setProtectedHeader({ alg: 'ES256', kid: 'test-key' })
      .setIssuedAt()
      .setIssuer(options.issuer ?? `${baseUrl}/auth/v1`)
      .setAudience(options.audience ?? 'authenticated')
      .setExpirationTime(options.expiresIn ?? '1h')
      .sign(privateKey);

  wrongKeySign = (claims) =>
    new SignJWT(claims)
      .setProtectedHeader({ alg: 'ES256', kid: 'test-key' })
      .setIssuedAt()
      .setIssuer(`${baseUrl}/auth/v1`)
      .setAudience('authenticated')
      .setExpirationTime('1h')
      .sign(wrong.privateKey);
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe('jwksIdentityProvider', () => {
  it('accepts a properly signed token and returns who it is', async () => {
    const provider = jwksIdentityProvider(baseUrl);
    const token = await sign({
      sub: 'aaaaaaaa-0000-0000-0000-000000000001',
      email: 'ana@example.test',
    });

    const verified = await provider.verify(token);

    expect(verified).toEqual({
      userId: 'aaaaaaaa-0000-0000-0000-000000000001',
      email: 'ana@example.test',
      mobile: null,
      displayName: null,
    });
  });

  it('carries the mobile number when the token has one', async () => {
    // Mobile + OTP is a first-class sign-in method here, because a phone number
    // is the identifier most Philippine tenants actually have.
    const provider = jwksIdentityProvider(baseUrl);
    const token = await sign({ sub: 'u-1', phone: '+639171234567' });

    expect((await provider.verify(token))?.mobile).toBe('+639171234567');
  });

  it('rejects a token signed with the wrong key', async () => {
    const provider = jwksIdentityProvider(baseUrl);
    expect(await provider.verify(await wrongKeySign({ sub: 'u-1' }))).toBeNull();
  });

  it('rejects an expired token', async () => {
    const provider = jwksIdentityProvider(baseUrl);
    const token = await sign({ sub: 'u-1' }, { expiresIn: '-1m' });

    expect(await provider.verify(token)).toBeNull();
  });

  it('rejects a token issued by someone else', async () => {
    const provider = jwksIdentityProvider(baseUrl);
    const token = await sign({ sub: 'u-1' }, { issuer: 'https://evil.test' });

    expect(await provider.verify(token)).toBeNull();
  });

  it('rejects an anon token, which is a valid signature over nobody', async () => {
    // Supabase's publishable key yields a well-formed token with aud "anon".
    // Accepting it would authenticate every anonymous visitor as a user.
    const provider = jwksIdentityProvider(baseUrl);
    const token = await sign({ sub: 'u-1' }, { audience: 'anon' });

    expect(await provider.verify(token)).toBeNull();
  });

  it('rejects a token with no subject', async () => {
    const provider = jwksIdentityProvider(baseUrl);
    expect(await provider.verify(await sign({}))).toBeNull();
  });

  it('rejects garbage rather than throwing', async () => {
    const provider = jwksIdentityProvider(baseUrl);
    expect(await provider.verify('not-a-token')).toBeNull();
  });
});
