import type { ListingRepository } from '@/application/ports/repositories/listing-repository.port.ts';
import { assertLeaseDurationLimits, type Listing, type ListingKind } from '@/domain/listings/listing.ts';
import type { Centavos } from '@/domain/shared/money.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { assertMayManageOrganization } from '@/application/identity/application-authorization.rules.ts';

export interface CreateOwnerListingInput {
  readonly principal: Principal;
  readonly organizationId: string;
  readonly resourceId: string;
  readonly kind: ListingKind;
  readonly title: string;
  readonly description: string;
  readonly priceCentavos: Centavos;
  readonly amenities: readonly string[];
  readonly houseRules: readonly string[];
  readonly terms: readonly string[];
  readonly minLeaseMonths?: number | null | undefined;
  readonly maxLeaseMonths?: number | null | undefined;
  readonly allowPendingIdentityApplication?: boolean | undefined;
  readonly minStayNights: number | null;
  readonly advanceMonths: number;
  readonly depositMonths: number;
  readonly photos: readonly string[];
}

export const createListing =
  (listings: ListingRepository) =>
  async (input: CreateOwnerListingInput): Promise<Listing> => {
    assertMayManageOrganization(input.principal, input.organizationId);

    assertLeaseDurationLimits(input);
    return listings.createListing({
      organizationId: input.organizationId,
      resourceId: input.resourceId,
      kind: input.kind,
      title: input.title,
      description: input.description,
      priceCentavos: input.priceCentavos,
      amenities: input.amenities,
      houseRules: input.houseRules,
      terms: input.terms,
      minStayNights: input.minStayNights,
      minLeaseMonths: input.minLeaseMonths,
      maxLeaseMonths: input.maxLeaseMonths,
      allowPendingIdentityApplication: input.allowPendingIdentityApplication,
      advanceMonths: input.advanceMonths,
      depositMonths: input.depositMonths,
      photos: input.photos,
    });
  };
