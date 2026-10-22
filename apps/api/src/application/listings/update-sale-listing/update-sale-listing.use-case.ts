import type {
  ListingRepository,
  PropertyDetails,
  SaleListingDetails,
} from '@/application/ports/repositories/listing-repository.port.ts';
import type { ListingChangeProposalRepository } from '@/application/ports/repositories/listing-change-proposal-repository.port.ts';
import type { NotificationRepository } from '@/application/ports/repositories/notification-repository.port.ts';
import { applySaleListingChanges } from '@/application/listings/sale-listing-changes.rules.ts';
import { splitCanonicalChanges, type Listing, type ListingChangeProposal } from '@/domain/listings/listing.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import type { ListingGate } from '@/application/identity/partner-access.rules.ts';

export interface UpdateSaleListingCommand {
  readonly principal: Principal;
  readonly organizationId: string | null;
  readonly listingId: string;
  readonly listing: Partial<SaleListingDetails>;
  readonly property?: Partial<PropertyDetails>;
}

export interface SaleListingUpdate {
  readonly listing: Listing;
  readonly proposal: ListingChangeProposal | null;
}

export const updateSaleListing =
  (
    listings: ListingRepository,
    gate: ListingGate,
    proposals: ListingChangeProposalRepository,
    notifications: NotificationRepository,
  ) =>
  async (command: UpdateSaleListingCommand): Promise<SaleListingUpdate> => {
    const { organizationId, role } = await gate({
      principal: command.principal,
      organizationId: command.organizationId,
      listingId: command.listingId,
      permission: 'canEditListing',
    });

    if (role === 'OWNER') {
      const listing = await applySaleListingChanges(listings, {
        organizationId,
        listingId: command.listingId,
        listing: command.listing,
        property: command.property,
      });
      return { listing, proposal: null };
    }

    const { direct, canonical } = splitCanonicalChanges(command.listing, command.property);
    const listing = await applySaleListingChanges(listings, {
      organizationId,
      listingId: command.listingId,
      listing: direct.listing,
      property: direct.property,
    });
    if (!canonical) return { listing, proposal: null };

    const proposal = await proposals.propose({
      organizationId,
      listingId: command.listingId,
      agentUserId: command.principal.userId,
      changes: canonical,
    });
    await notifications.publish([
      {
        audience: { organizationId },
        kind: 'REPRESENTATION_UPDATED',
        title: `${proposal.agentName} proposed property detail changes`,
        body: listing.title,
        link: `/properties/${listing.id}`,
      },
    ]);
    return { listing, proposal };
  };
