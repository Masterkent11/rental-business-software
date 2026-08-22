/**
 * Verifies that a token was issued by the identity provider and has not
 * expired. It answers *who*, and deliberately nothing else (ADR-0007).
 *
 * One interface, so replacing Supabase Auth with any OIDC provider is a single
 * adapter rather than a rewrite.
 */
export interface VerifiedToken {
  readonly userId: string;
  /** Present when the provider knows them; the platform still owns its copy. */
  readonly email: string | null;
  readonly mobile: string | null;
}

export interface IdentityProvider {
  /** Null when the token is absent, malformed, expired, or wrongly signed. */
  verify(token: string): Promise<VerifiedToken | null>;
}
