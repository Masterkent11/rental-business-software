import type { ScoreBreakdown } from './assignment-types.ts';
import type { LeadPurpose } from './lead-assignment.ts';

export type ScoreWeights = ScoreBreakdown;

export interface AssignmentPolicy {
  readonly weights: ScoreWeights;
  readonly topBandDistance: number;
  readonly requireVerifiedAgent: boolean;
  readonly maxViewingsPerWindow: number;
  readonly reliabilityBaseline: number;
  readonly reliabilityPriorWeight: number;
  readonly familiarityFromHistory: number;
  readonly familiarityFromOwnRepresentation: number;
  readonly familiarityFromPrimaryRole: number;
  readonly undeclaredSpecializationCredit: number;
}

const SHARED = {
  topBandDistance: 3,
  requireVerifiedAgent: true,
  maxViewingsPerWindow: 3,
  reliabilityBaseline: 0.7,
  reliabilityPriorWeight: 5,
  familiarityFromHistory: 0.6,
  familiarityFromOwnRepresentation: 0.4,
  familiarityFromPrimaryRole: 0.4,
  undeclaredSpecializationCredit: 0.5,
} as const;

export const VIEWING_ASSIGNMENT_POLICY: AssignmentPolicy = {
  ...SHARED,
  weights: {
    availability: 35,
    responseReliability: 20,
    workload: 15,
    propertyFamiliarity: 10,
    specialization: 10,
    fairness: 10,
  },
};

export const INQUIRY_ASSIGNMENT_POLICY: AssignmentPolicy = {
  ...SHARED,
  weights: {
    availability: 0,
    responseReliability: 30,
    workload: 25,
    propertyFamiliarity: 15,
    specialization: 10,
    fairness: 20,
  },
};

export const ASSIGNMENT_POLICIES: Readonly<Record<LeadPurpose, AssignmentPolicy>> = {
  VIEWING: VIEWING_ASSIGNMENT_POLICY,
  INQUIRY: INQUIRY_ASSIGNMENT_POLICY,
};

export const MAX_ASSIGNMENT_SCORE = 100;

export const FAIRNESS_LOOKBACK_DAYS = 30;

export const RELIABILITY_LOOKBACK_DAYS = 90;

export const DEFAULT_LEAD_RESPONSE_WINDOW_MINUTES = 240;
