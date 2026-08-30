import type { AuthorizationProvider } from '@/application/ports/providers/authorization-provider.port.ts';
import type { Capability, Principal } from '@/domain/identity/identity.ts';
import { hasCapability } from '@/domain/identity/identity.ts';

export class DomainAuthorizationAdapter implements AuthorizationProvider {
  assertAuthorized(
    principal: Principal,
    capability: Capability,
    organizationId?: string | null,
  ): void {
    if (!hasCapability(principal, capability, organizationId)) {
      throw new Error(`Principal does not hold capability ${capability}`);
    }
  }
}
