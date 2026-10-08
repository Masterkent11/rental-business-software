import type {
  ListingRepository,
  SaleTerms,
} from '@/application/ports/repositories/listing-repository.port.ts';
import { InvalidListingDetailsError, ListingNotFoundError } from '@/domain/listings/listing.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import type { ListingGate } from '@/application/identity/partner-access.rules.ts';

export const getSaleTerms =
  (listings: ListingRepository, gate: ListingGate) =>
  async (input: {
    readonly principal: Principal;
    readonly organizationId: string | null;
    readonly listingId: string;
  }): Promise<SaleTerms> => {
    const { organizationId } = await gate({
      principal: input.principal,
      organizationId: input.organizationId,
      listingId: input.listingId,
      permission: 'canViewCommercial',
    });
    const listing = await listings.findById(organizationId, input.listingId);
    if (!listing) throw new ListingNotFoundError('Listing not found');
    if (listing.intent !== 'SALE') throw new InvalidListingDetailsError('Only sale listings have commercial terms');
    return (
      (await listings.saleTerms(organizationId, input.listingId)) ?? {
        listingId: input.listingId,
        askingPriceInternalCentavos: null,
        priceNegotiable: true,
        commercialNotes: '',
        updatedAt: null,
      }
    );
  };
