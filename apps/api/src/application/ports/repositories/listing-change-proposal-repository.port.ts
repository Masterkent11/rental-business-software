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
  ): Promise<ListingChangeProposal | null>;
}
