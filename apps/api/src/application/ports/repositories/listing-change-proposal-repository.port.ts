import type { SaleListingWriter } from './listing-repository.port.ts';
import type {
  CanonicalChanges,
  ChangeProposalStatus,
  ListingChangeProposal,
} from '@/domain/listings/listing.ts';

export interface ListingChangeProposalRepository {
  propose(input: {
    readonly organizationId: string;
    readonly listingId: string;
    readonly agentUserId: string;
    readonly changes: CanonicalChanges;
  }): Promise<ListingChangeProposal>;
  listPending(organizationId: string): Promise<readonly ListingChangeProposal[]>;
  findInOrganization(organizationId: string, id: string): Promise<ListingChangeProposal | null>;
  decide(
    organizationId: string,
    id: string,
    status: Exclude<ChangeProposalStatus, 'PENDING'>,
    decidedBy: string,
    applyApprovedChanges: (proposal: ListingChangeProposal, listings: SaleListingWriter) => Promise<void>,
  ): Promise<ListingChangeProposal | null>;
}
