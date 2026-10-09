import type {
  ViewingRange,
  ViewingRepository,
} from '@/application/ports/repositories/viewing-repository.port.ts';
import type { Viewing } from '@/domain/viewings/viewing.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { partnerScopeFor } from '@/application/identity/partner-access.rules.ts';

export const listPartnerViewings =
  (viewings: ViewingRepository) =>
  async (input: {
    readonly principal: Principal;
    readonly organizationId: string | null;
    readonly range: ViewingRange;
  }): Promise<readonly Viewing[]> => {
    const scope = partnerScopeFor(input.principal, input.organizationId);
    return 'organizationId' in scope
      ? viewings.listForOrganization(scope.organizationId, input.range)
      : viewings.listForAgent(input.principal.userId, input.range);
  };
