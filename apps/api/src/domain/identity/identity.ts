import { InvalidProfileError } from './identity-errors.ts';
import type { Capability } from './role.ts';
import { ORGANIZATION_SCOPED } from './role.ts';

export type { Capability };

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
  readonly assuranceLevel?: 'aal1' | 'aal2';
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

export { InvalidProfileError } from './identity-errors.ts';

export function normaliseDisplayName(raw: string): string {
  const name = raw.replace(/\s+/g, ' ').trim();
  if (name.length < 2 || name.length > 80) {
    throw new InvalidProfileError('Use a name between 2 and 80 characters');
  }
  return name;
}
