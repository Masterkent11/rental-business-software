/**
 * What a person may do, and why.
 *
 * Capabilities are **derived from facts**, not granted as badges. TENANT exists
 * because a lease is active; GUEST because a stay is in progress; STAFF because
 * a membership is live. When the fact ends, so does the capability — which is
 * why the database records what makes each one true rather than storing a bare
 * list per user.
 *
 * D-16 keeps Owner and Tenant distinct actors: the same human may hold both,
 * but never merged into one role.
 */
export const CAPABILITIES = [
  'CUSTOMER',
  'TENANT',
  'GUEST',
  'OWNER',
  'STAFF',
  'PLATFORM_ADMIN',
] as const;

export type Capability = (typeof CAPABILITIES)[number];

/** Capabilities that mean nothing outside a specific organization. */
const ORGANIZATION_SCOPED: ReadonlySet<Capability> = new Set(['OWNER', 'STAFF']);

export interface HeldCapability {
  readonly capability: Capability;
  /** Null for platform-wide capabilities. */
  readonly organizationId: string | null;
}

/**
 * Who the request is, after the database has been consulted.
 *
 * Deliberately NOT built from token claims: a token is a snapshot of authority
 * that changes underneath it (ADR-0007). The only thing taken from the token is
 * `userId`.
 */
export interface Principal {
  readonly userId: string;
  readonly displayName: string;
  readonly capabilities: readonly HeldCapability[];
  /** Verified against membership, never taken on the header's word. */
  readonly organizationId: string | null;
}

export function hasCapability(
  principal: Principal,
  capability: Capability,
  organizationId?: string | null,
): boolean {
  return principal.capabilities.some((held) => {
    if (held.capability !== capability) return false;
    if (!ORGANIZATION_SCOPED.has(capability)) return true;
    // An organization-scoped capability held at one organization says nothing
    // about another. Ignoring the scope would let staff of one agency act
    // inside a competitor's.
    return held.organizationId === (organizationId ?? null);
  });
}
