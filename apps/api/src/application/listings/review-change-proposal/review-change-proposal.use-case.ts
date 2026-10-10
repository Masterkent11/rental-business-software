import type { ListingRepository, PropertyDetails, SaleListingDetails } from '@/application/ports/repositories/listing-repository.port.ts';
import type { ListingChangeProposalRepository } from '@/application/ports/repositories/listing-change-proposal-repository.port.ts';
import { applySaleListingChanges } from '@/application/listings/sale-listing-changes.rules.ts';
import { assertMayManageOrganization } from '@/application/identity/application-authorization.rules.ts';
import { ChangeProposalNotFoundError, type ListingChangeProposal } from '@/domain/listings/listing.ts';
import type { Principal } from '@/domain/identity/identity.ts';

export const listChangeProposals =
  (proposals: ListingChangeProposalRepository) =>
  async (input: { readonly principal: Principal; readonly organizationId: string }): Promise<readonly ListingChangeProposal[]> => {
    assertMayManageOrganization(input.principal, input.organizationId);
    return proposals.listPending(input.organizationId);
  };

export const decideChangeProposal =
  (proposals: ListingChangeProposalRepository, listings: ListingRepository) =>
  async (input: {
    readonly principal: Principal;
    readonly organizationId: string;
    readonly proposalId: string;
    readonly approve: boolean;
  }): Promise<ListingChangeProposal> => {
    assertMayManageOrganization(input.principal, input.organizationId);
    const proposal = await proposals.findInOrganization(input.organizationId, input.proposalId);
    if (!proposal || proposal.status !== 'PENDING') throw new ChangeProposalNotFoundError('Proposal not found');
    if (input.approve) {
      await applySaleListingChanges(listings, {
        organizationId: input.organizationId,
        listingId: proposal.listingId,
        listing: proposal.changes.listing as Partial<SaleListingDetails>,
        property: Object.keys(proposal.changes.property).length > 0
          ? (proposal.changes.property as Partial<PropertyDetails>)
          : undefined,
      });
    }
    const decided = await proposals.decide(
      input.organizationId,
      input.proposalId,
      input.approve ? 'APPROVED' : 'REJECTED',
      input.principal.userId,
    );
    if (!decided) throw new ChangeProposalNotFoundError('Proposal not found');
    return decided;
  };
