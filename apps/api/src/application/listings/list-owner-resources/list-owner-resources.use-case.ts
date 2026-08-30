import type { ListingRepository } from '@/application/ports/repositories/listing-repository.port.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { assertMayManageOrganization } from '@/application/identity/application-authorization.rules.ts';

export interface ListOwnerResourcesInput {
  readonly principal: Principal;
  readonly organizationId: string;
}

export const listResources =
  (listings: ListingRepository) =>
  async (
    input: ListOwnerResourcesInput,
  ): Promise<readonly { id: string; label: string; propertyName: string; resourceType: string }[]> => {
    assertMayManageOrganization(input.principal, input.organizationId);
    return listings.listResources(input.organizationId);
  };
