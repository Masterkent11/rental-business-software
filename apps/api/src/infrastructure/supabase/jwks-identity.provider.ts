import { createRemoteJWKSet, jwtVerify } from 'jose';
import type {
  IdentityProvider,
  VerifiedToken,
} from '@/application/ports/providers/identity-provider.port.ts';

/**
 * Verifies Supabase-issued access tokens against the project's **public** keys.
 *
 * The project signs with ES256 and publishes the public half at
 * `/auth/v1/.well-known/jwks.json`, so this service never holds a signing
 * secret. A leaked read-only config here cannot mint tokens — which is not true
 * of the shared-secret (HS256) alternative.
 *
 * The key set is cached and refetched on rotation by `jose`.
 */
export function jwksIdentityProvider(
  supabaseUrl = process.env.SUPABASE_URL ?? '',
): IdentityProvider {
  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL is required to verify access tokens');
  }

  const issuer = `${supabaseUrl.replace(/\/$/, '')}/auth/v1`;
  const jwks = createRemoteJWKSet(
    new URL(`${issuer}/.well-known/jwks.json`),
  );

  return {
    async verify(token: string): Promise<VerifiedToken | null> {
      try {
        const { payload } = await jwtVerify(token, jwks, {
          issuer,
          // Supabase issues 'authenticated' for a signed-in user. An anon token
          // is a valid signature over "nobody", and must not resolve to one.
          audience: 'authenticated',
        });

        if (typeof payload.sub !== 'string' || !payload.sub) return null;

        return {
          userId: payload.sub,
          email: typeof payload.email === 'string' ? payload.email : null,
          mobile: typeof payload.phone === 'string' && payload.phone
            ? payload.phone
            : null,
        };
      } catch {
        // Signature, expiry, issuer, and audience failures are all the same
        // answer to the caller: this token does not establish who you are.
        return null;
      }
    },
  };
}
