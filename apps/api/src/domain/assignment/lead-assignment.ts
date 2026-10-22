export * from './assignment-types.ts';
export * from './assignment-policy.ts';
export * from './assignment-engine.ts';

import type { ScoreBreakdown } from './assignment-types.ts';

export type LeadPurpose = 'INQUIRY' | 'VIEWING';

export type LeadAssignmentStatus = 'ASSIGNED' | 'ACCEPTED' | 'RELEASED' | 'REASSIGNED' | 'CLOSED';

export const ACTIVE_LEAD_STATUSES: readonly LeadAssignmentStatus[] = ['ASSIGNED', 'ACCEPTED'];

export type AssignmentReason =
  | 'EXISTING_RELATIONSHIP'
  | 'REFERRAL_ATTRIBUTION'
  | 'EXCLUSIVE_REPRESENTATION'
  | 'PRIMARY_REPRESENTATIVE'
  | 'BEST_AVAILABLE';

export type ReleaseReason =
  | 'RESPONSE_TIMEOUT'
  | 'AGENT_DECLINED'
  | 'AGENT_UNAVAILABLE'
  | 'REPRESENTATION_ENDED'
  | 'CUSTOMER_CLOSED';

export interface LeadAssignment {
  readonly id: string;
  readonly organizationId: string;
  readonly listingId: string;
  readonly customerId: string;
  readonly representationId: string | null;
  readonly agentId: string;
  readonly purpose: LeadPurpose;
  readonly status: LeadAssignmentStatus;
  readonly reason: AssignmentReason;
  readonly score: number | null;
  readonly breakdown: ScoreBreakdown | null;
  readonly candidatesConsidered: number;
  readonly previousAssignmentId: string | null;
  readonly releaseReason: ReleaseReason | null;
  readonly responseDueAt: Date | null;
  readonly assignedAt: Date;
  readonly acceptedAt: Date | null;
  readonly releasedAt: Date | null;
}
