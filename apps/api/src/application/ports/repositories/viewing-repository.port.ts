import type { LeadAssignment, PreferredTimeWindow } from '@/domain/assignment/lead-assignment.ts';
import type { Viewing, ViewingActor, ViewingStatus } from '@/domain/viewings/viewing.ts';
import type { NewLeadAssignment } from './lead-assignment-repository.port.ts';
import type { PartyScope } from './party-scope.port.ts';

export type ViewingAssignmentInput =
  | { readonly kind: 'EXISTING'; readonly assignmentId: string }
  | { readonly kind: 'NEW'; readonly assignment: NewLeadAssignment }
  | { readonly kind: 'NONE' };

export interface NewViewingRequest {
  readonly organizationId: string;
  readonly listingId: string;
  readonly customerId: string;
  readonly inquiryId: string | null;
  readonly preferredDate: string;
  readonly preferredWindow: PreferredTimeWindow;
  readonly timeZone: string;
  readonly durationMinutes: number;
  readonly customerNote: string;
  readonly clientRef: string;
  readonly assignment: ViewingAssignmentInput;
  readonly requestMessage: string;
  readonly requestPreview: string;
}

export interface SubmittedViewing {
  readonly viewing: Viewing;
  readonly assignment: LeadAssignment | null;
  readonly created: boolean;
}

export interface ViewingRange {
  readonly from?: Date;
  readonly to?: Date;
}

export interface ViewingChange {
  readonly from: ViewingStatus;
  readonly status: ViewingStatus;
  readonly scheduledAt?: Date | null;
  readonly preferredDate?: string;
  readonly preferredWindow?: PreferredTimeWindow;
  readonly partnerNote?: string;
  readonly customerNote?: string;
  readonly cancelledByRole?: ViewingActor;
  readonly at: Date;
}

export interface ViewingRepository {
  findByClientRef(customerId: string, clientRef: string): Promise<Viewing | null>;
  activeForCustomerListing(customerId: string, listingId: string): Promise<Viewing | null>;
  submitRequest(input: NewViewingRequest): Promise<SubmittedViewing>;
  findForCustomer(customerId: string, id: string): Promise<Viewing | null>;
  listForCustomer(customerId: string): Promise<readonly Viewing[]>;
  findForOrganization(organizationId: string, id: string): Promise<Viewing | null>;
  activeForAssignment(organizationId: string, assignmentId: string): Promise<Viewing | null>;
  listForOrganization(organizationId: string, range: ViewingRange): Promise<readonly Viewing[]>;
  findForAgent(agentUserId: string, id: string): Promise<Viewing | null>;
  listForAgent(agentUserId: string, range: ViewingRange): Promise<readonly Viewing[]>;
  transition(scope: PartyScope, id: string, change: ViewingChange): Promise<Viewing>;
}
