import type {
  AssignmentCandidate,
  AssignmentReason,
  LeadAssignment,
  LeadPurpose,
  PreferredTimeWindow,
  ReleaseReason,
  ScoreBreakdown,
} from '@/domain/assignment/lead-assignment.ts';
import type { ViewingStatus } from '@/domain/viewings/viewing.ts';

export interface CandidateQuery {
  readonly listingId: string;
  readonly customerId: string;
  readonly window: {
    readonly from: Date;
    readonly to: Date;
    readonly day: string;
    readonly name: PreferredTimeWindow;
  } | null;
  readonly fairnessSince: Date;
  readonly reliabilitySince: Date;
}

export interface NewLeadAssignment {
  readonly organizationId: string;
  readonly listingId: string;
  readonly customerId: string;
  readonly representationId: string;
  readonly agentId: string;
  readonly purpose: LeadPurpose;
  readonly reason: AssignmentReason;
  readonly score: number | null;
  readonly breakdown: ScoreBreakdown | null;
  readonly considered: number;
  readonly previousAssignmentId: string | null;
  readonly responseDueAt: Date | null;
  readonly assignedAt: Date;
}

export interface LeadEngagement {
  readonly accepted: boolean;
  readonly agentMessages: number;
  readonly viewingConfirmed: boolean;
}

export interface Reassignment {
  readonly organizationId: string;
  readonly current: LeadAssignment;
  readonly releaseReason: ReleaseReason;
  readonly next: NewLeadAssignment | null;
  readonly viewingStatusWithoutAgent: Extract<ViewingStatus, 'MATCHING' | 'DECLINED'>;
  readonly notice: string | null;
  readonly at: Date;
}

export interface LeadAssignmentRepository {
  activeFor(customerId: string, listingId: string): Promise<LeadAssignment | null>;
  create(next: NewLeadAssignment): Promise<LeadAssignment>;
  candidates(query: CandidateQuery): Promise<readonly AssignmentCandidate[]>;
  referralAgentFor(customerId: string, listingId: string): Promise<string | null>;
  attributeReferral(customerId: string, listingId: string, code: string): Promise<string | null>;
  issueReferralCode(agentUserId: string, listingId: string, code: string): Promise<string>;
  findInOrganization(organizationId: string, id: string): Promise<LeadAssignment | null>;
  findForAgent(agentUserId: string, id: string): Promise<LeadAssignment | null>;
  historyFor(organizationId: string, listingId: string, customerId: string): Promise<readonly LeadAssignment[]>;
  engagementOf(organizationId: string, assignmentId: string): Promise<LeadEngagement>;
  markAccepted(agentUserId: string, listingId: string, customerId: string, at: Date): Promise<void>;
  markAcceptedById(organizationId: string, id: string, at: Date): Promise<void>;
  dueForResponse(at: Date, limit: number): Promise<readonly { readonly id: string; readonly organizationId: string }[]>;
  activeForRepresentation(organizationId: string, representationId: string): Promise<readonly LeadAssignment[]>;
  matchingViewings(limit: number): Promise<readonly { readonly viewingId: string; readonly organizationId: string }[]>;
  attachToViewing(organizationId: string, viewingId: string, next: NewLeadAssignment): Promise<LeadAssignment | null>;
  reassign(input: Reassignment): Promise<LeadAssignment | null>;
}
