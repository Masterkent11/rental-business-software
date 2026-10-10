import type { RepresentationKind } from '@/domain/agents/representation.ts';
import type { AssignmentReason, LeadAssignment, LeadPurpose } from './lead-assignment.ts';

export type PreferredTimeWindow = 'MORNING' | 'AFTERNOON' | 'EVENING';

export interface ScoreBreakdown {
  readonly availability: number;
  readonly responseReliability: number;
  readonly workload: number;
  readonly propertyFamiliarity: number;
  readonly specialization: number;
  readonly fairness: number;
}

export interface AssignmentCandidate {
  readonly representationId: string;
  readonly agentId: string;
  readonly organizationId: string;
  readonly representationType: RepresentationKind;
  readonly isPrimary: boolean;
  readonly representationAcceptsLeads: boolean;
  readonly validFrom: Date | null;
  readonly validUntil: Date | null;
  readonly initiatedByAgent: boolean;
  readonly agentName: string;
  readonly verificationState: string;
  readonly agentAcceptsLeads: boolean;
  readonly leadCapacity: number;
  readonly agentDeactivated: boolean;
  readonly organizationState: string;
  readonly specialties: readonly string[];
  readonly areasServed: readonly string[];
  readonly activeLeads: number;
  readonly recentAssignments: number;
  readonly lastAssignedAt: Date | null;
  readonly acceptedAssignments: number;
  readonly missedAssignments: number;
  readonly scheduleConflicts: number;
  readonly listingActivity: number;
}

export interface AssignmentListingContext {
  readonly listingId: string;
  readonly propertyTypeLabels: readonly string[];
  readonly areaLabel: string;
  readonly cityLabel: string;
}

export interface PreferredSchedule {
  readonly date: string;
  readonly window: PreferredTimeWindow;
}

export interface AssignmentRequest {
  readonly purpose: LeadPurpose;
  readonly listing: AssignmentListingContext;
  readonly customerId: string;
  readonly existing: LeadAssignment | null;
  readonly referralAgentId: string | null;
  readonly schedule: PreferredSchedule | null;
  readonly excludedAgentIds: readonly string[];
  readonly now: Date;
}

export type IneligibilityReason =
  | 'REPRESENTATION_NOT_ACCEPTING_LEADS'
  | 'REPRESENTATION_NOT_YET_VALID'
  | 'REPRESENTATION_EXPIRED'
  | 'AGENT_NOT_VERIFIED'
  | 'AGENT_SUSPENDED'
  | 'AGENT_DEACTIVATED'
  | 'AGENT_NOT_ACCEPTING_LEADS'
  | 'ORGANIZATION_NOT_VERIFIED'
  | 'AT_CAPACITY'
  | 'AREA_NOT_SERVED'
  | 'SCHEDULE_FULL'
  | 'EXCLUDED';

export interface ScoredCandidate {
  readonly candidate: AssignmentCandidate;
  readonly score: number;
  readonly breakdown: ScoreBreakdown;
}

export type AssignmentDecision =
  | {
      readonly kind: 'ASSIGNED';
      readonly candidate: AssignmentCandidate;
      readonly reason: AssignmentReason;
      readonly score: number | null;
      readonly breakdown: ScoreBreakdown | null;
      readonly considered: number;
      readonly continued: boolean;
    }
  | { readonly kind: 'UNAVAILABLE'; readonly considered: number };
