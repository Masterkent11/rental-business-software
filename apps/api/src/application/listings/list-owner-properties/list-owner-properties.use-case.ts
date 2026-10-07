import type {
  ListingRepository,
  OwnerProperty,
} from '@/application/ports/repositories/listing-repository.port.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { assertMayManageOrganization } from '@/application/identity/application-authorization.rules.ts';

export const listOwnerProperties =
  (listings: ListingRepository) =>
  async (input: {
    readonly principal: Principal;
    readonly organizationId: string;
  }): Promise<readonly OwnerProperty[]> => {
    assertMayManageOrganization(input.principal, input.organizationId);
    return listings.listProperties(input.organizationId);
  };
