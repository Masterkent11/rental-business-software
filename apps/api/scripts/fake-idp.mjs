// A stand-in identity provider: serves an ES256 JWKS and mints a token, so the
// running API can be exercised end-to-end without creating a user in the real
// Supabase project.
import { createServer } from 'node:http';
import { SignJWT, exportJWK, generateKeyPair } from 'jose';

const { privateKey, publicKey } = await generateKeyPair('ES256');
const jwk = await exportJWK(publicKey);
Object.assign(jwk, { kid: 'test-key', alg: 'ES256', use: 'sig' });

const PORT = 9099;
createServer((req, res) => {
  if (req.url?.endsWith('/.well-known/jwks.json')) {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ keys: [jwk] }));
    return;
  }
  res.writeHead(404).end();
}).listen(PORT, '127.0.0.1');

const base = `http://127.0.0.1:${PORT}`;
const mint = (sub, email) =>
  new SignJWT({ sub, email })
    .setProtectedHeader({ alg: 'ES256', kid: 'test-key' })
    .setIssuedAt()
    .setIssuer(`${base}/auth/v1`)
    .setAudience('authenticated')
    .setExpirationTime('1h')
    .sign(privateKey);

const ana = await mint('11111111-aaaa-4aaa-8aaa-000000000001', 'ana@example.test');
const ben = await mint('22222222-bbbb-4bbb-8bbb-000000000002', 'ben@example.test');
const anon = await new SignJWT({ sub: 'x' })
  .setProtectedHeader({ alg: 'ES256', kid: 'test-key' })
  .setIssuedAt().setIssuer(`${base}/auth/v1`).setAudience('anon')
  .setExpirationTime('1h').sign(privateKey);

console.log(JSON.stringify({ base, ana, ben, anon }));
