import type {
  ListingRepository,
  SaleTerms,
  SaleTermsInput,
} from '@/application/ports/repositories/listing-repository.port.ts';
import {
  InvalidListingDetailsError,
  ListingNotFoundError,
  assertValidInternalPrice,
} from '@/domain/listings/listing.ts';
import { assertActiveRepresentationAllows } from '@/domain/agents/agent.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import type { ListingGate } from '@/application/identity/partner-access.rules.ts';

export const saveSaleTerms =
  (listings: ListingRepository, gate: ListingGate) =>
  async (input: {
    readonly principal: Principal;
    readonly organizationId: string | null;
    readonly listingId: string;
    readonly terms: SaleTermsInput;
  }): Promise<SaleTerms> => {
    const access = await gate({
      principal: input.principal,
      organizationId: input.organizationId,
      listingId: input.listingId,
      permission: 'canEditListing',
    });
    if (access.role === 'AGENT') assertActiveRepresentationAllows(access.representation, 'canViewCommercial');

    const listing = await listings.findById(access.organizationId, input.listingId);
    if (!listing) throw new ListingNotFoundError('Listing not found');
    if (listing.intent !== 'SALE') throw new InvalidListingDetailsError('Only sale listings have commercial terms');
    assertValidInternalPrice(input.terms.askingPriceInternalCentavos);
    if (input.terms.commercialNotes.length > 4000) {
      throw new InvalidListingDetailsError('Keep commercial notes under 4,000 characters');
    }
    return listings.saveSaleTerms(access.organizationId, input.listingId, input.terms, input.principal.userId);
  };
