import type { Capability, Principal } from '@/domain/identity/identity.ts';

export interface AuthorizationProvider {
  assertAuthorized(
    principal: Principal,
    capability: Capability,
    organizationId?: string | null,
  ): void;
}
