import { ASSIGNMENT_POLICIES, type AssignmentPolicy } from './assignment-policy.ts';
import type {
  AssignmentCandidate,
  AssignmentDecision,
  AssignmentListingContext,
  AssignmentRequest,
  IneligibilityReason,
  ScoreBreakdown,
  ScoredCandidate,
} from './assignment-types.ts';

const clamp01 = (value: number): number => (Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0);

const round2 = (value: number): number => Math.round(value * 100) / 100;

const normaliseLabel = (value: string): string =>
  value
    .toLowerCase()
    .replace(/^brgy\.?\s*/u, '')
    .replace(/[^a-z0-9&]+/gu, ' ')
    .trim();

const labelsOverlap = (a: string, b: string): boolean => {
  const left = normaliseLabel(a);
  const right = normaliseLabel(b);
  return left.length > 0 && right.length > 0 && (left.includes(right) || right.includes(left));
};

export function servesArea(candidate: AssignmentCandidate, listing: AssignmentListingContext): boolean {
  if (candidate.areasServed.length === 0) return true;
  return candidate.areasServed.some(
    (area) => labelsOverlap(area, listing.cityLabel) || labelsOverlap(area, listing.areaLabel),
  );
}

export function specialisesIn(candidate: AssignmentCandidate, listing: AssignmentListingContext): boolean {
  return candidate.specialties.some((specialty) => listing.propertyTypeLabels.some((label) => labelsOverlap(specialty, label)));
}

function standingIssue(candidate: AssignmentCandidate, request: AssignmentRequest, policy: AssignmentPolicy): IneligibilityReason | null {
  const now = request.now.getTime();
  if (request.excludedAgentIds.includes(candidate.agentId)) return 'EXCLUDED';
  if (candidate.validFrom && candidate.validFrom.getTime() > now) return 'REPRESENTATION_NOT_YET_VALID';
  if (candidate.validUntil && candidate.validUntil.getTime() <= now) return 'REPRESENTATION_EXPIRED';
  if (candidate.verificationState === 'SUSPENDED') return 'AGENT_SUSPENDED';
  if (policy.requireVerifiedAgent && candidate.verificationState !== 'VERIFIED') return 'AGENT_NOT_VERIFIED';
  if (candidate.agentDeactivated) return 'AGENT_DEACTIVATED';
  if (candidate.organizationState !== 'VERIFIED') return 'ORGANIZATION_NOT_VERIFIED';
  return null;
}

export function eligibilityOf(
  candidate: AssignmentCandidate,
  request: AssignmentRequest,
  policy: AssignmentPolicy = ASSIGNMENT_POLICIES[request.purpose],
): IneligibilityReason | null {
  const standing = standingIssue(candidate, request, policy);
  if (standing) return standing;
  if (!candidate.representationAcceptsLeads) return 'REPRESENTATION_NOT_ACCEPTING_LEADS';
  if (!candidate.agentAcceptsLeads) return 'AGENT_NOT_ACCEPTING_LEADS';
  if (candidate.activeLeads >= candidate.leadCapacity) return 'AT_CAPACITY';
  if (!servesArea(candidate, request.listing)) return 'AREA_NOT_SERVED';
  if (request.purpose === 'VIEWING' && request.schedule && candidate.scheduleConflicts >= policy.maxViewingsPerWindow) {
    return 'SCHEDULE_FULL';
  }
  return null;
}

export function mayContinue(
  candidate: AssignmentCandidate,
  request: AssignmentRequest,
  policy: AssignmentPolicy = ASSIGNMENT_POLICIES[request.purpose],
): boolean {
  return standingIssue(candidate, request, policy) === null;
}

export function reliabilityRatio(candidate: AssignmentCandidate, policy: AssignmentPolicy): number {
  const samples = candidate.acceptedAssignments + candidate.missedAssignments;
  return clamp01(
    (candidate.acceptedAssignments + policy.reliabilityBaseline * policy.reliabilityPriorWeight) /
      (samples + policy.reliabilityPriorWeight),
  );
}

export function workloadRatio(candidate: AssignmentCandidate): number {
  return clamp01(1 - candidate.activeLeads / Math.max(1, candidate.leadCapacity));
}

export function availabilityRatio(candidate: AssignmentCandidate, request: AssignmentRequest, policy: AssignmentPolicy): number {
  if (request.purpose !== 'VIEWING' || !request.schedule) return 1;
  return clamp01(1 - candidate.scheduleConflicts / Math.max(1, policy.maxViewingsPerWindow));
}

export function familiarityRatio(candidate: AssignmentCandidate, policy: AssignmentPolicy): number {
  return clamp01(
    (candidate.listingActivity > 0 ? policy.familiarityFromHistory : 0) +
      (candidate.initiatedByAgent ? policy.familiarityFromOwnRepresentation : 0) +
      (candidate.isPrimary ? policy.familiarityFromPrimaryRole : 0),
  );
}

export function specializationRatio(
  candidate: AssignmentCandidate,
  listing: AssignmentListingContext,
  policy: AssignmentPolicy,
): number {
  const area = candidate.areasServed.length === 0 ? policy.undeclaredSpecializationCredit : servesArea(candidate, listing) ? 1 : 0;
  const category =
    candidate.specialties.length === 0 ? policy.undeclaredSpecializationCredit : specialisesIn(candidate, listing) ? 1 : 0;
  return clamp01((area + category) / 2);
}

export function fairnessRatio(candidate: AssignmentCandidate, busiestRecentCount: number): number {
  if (busiestRecentCount <= 0) return 1;
  return clamp01(1 - candidate.recentAssignments / busiestRecentCount);
}

export function scoreCandidate(
  candidate: AssignmentCandidate,
  request: AssignmentRequest,
  policy: AssignmentPolicy,
  busiestRecentCount: number,
): ScoredCandidate {
  const w = policy.weights;
  const breakdown: ScoreBreakdown = {
    availability: round2(w.availability * availabilityRatio(candidate, request, policy)),
    responseReliability: round2(w.responseReliability * reliabilityRatio(candidate, policy)),
    workload: round2(w.workload * workloadRatio(candidate)),
    propertyFamiliarity: round2(w.propertyFamiliarity * familiarityRatio(candidate, policy)),
    specialization: round2(w.specialization * specializationRatio(candidate, request.listing, policy)),
    fairness: round2(w.fairness * fairnessRatio(candidate, busiestRecentCount)),
  };
  const score = round2(
    breakdown.availability +
      breakdown.responseReliability +
      breakdown.workload +
      breakdown.propertyFamiliarity +
      breakdown.specialization +
      breakdown.fairness,
  );
  return { candidate, score, breakdown };
}

export function fairnessKey(seed: string, agentId: string): number {
  let hash = 0x811c9dc5;
  for (const character of `${seed}:${agentId}`) {
    hash ^= character.codePointAt(0)!;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

export function selectFairly(scored: readonly ScoredCandidate[], policy: AssignmentPolicy, seed: string): ScoredCandidate | null {
  if (scored.length === 0) return null;
  const best = Math.max(...scored.map((entry) => entry.score));
  const band = scored.filter((entry) => entry.score >= best - policy.topBandDistance);
  const lastAssigned = (entry: ScoredCandidate) => entry.candidate.lastAssignedAt?.getTime() ?? Number.NEGATIVE_INFINITY;
  return [...band].sort(
    (a, b) =>
      a.candidate.recentAssignments - b.candidate.recentAssignments ||
      a.candidate.activeLeads - b.candidate.activeLeads ||
      lastAssigned(a) - lastAssigned(b) ||
      fairnessKey(seed, a.candidate.agentId) - fairnessKey(seed, b.candidate.agentId),
  )[0]!;
}

export function rankCandidates(
  candidates: readonly AssignmentCandidate[],
  request: AssignmentRequest,
  policy: AssignmentPolicy = ASSIGNMENT_POLICIES[request.purpose],
): ScoredCandidate[] {
  const busiest = Math.max(0, ...candidates.map((candidate) => candidate.recentAssignments));
  return candidates
    .map((candidate) => scoreCandidate(candidate, request, policy, busiest))
    .sort((a, b) => b.score - a.score);
}

export function resolveAssignment(
  candidates: readonly AssignmentCandidate[],
  request: AssignmentRequest,
  policy: AssignmentPolicy = ASSIGNMENT_POLICIES[request.purpose],
): AssignmentDecision {
  const considered = candidates.length;
  const direct = (candidate: AssignmentCandidate, reason: Exclude<AssignmentDecision, { kind: 'UNAVAILABLE' }>['reason'], continued = false): AssignmentDecision => ({
    kind: 'ASSIGNED',
    candidate,
    reason,
    score: null,
    breakdown: null,
    considered,
    continued,
  });

  if (request.existing) {
    const current = candidates.find((candidate) => candidate.agentId === request.existing!.agentId);
    if (current && mayContinue(current, request, policy)) return direct(current, 'EXISTING_RELATIONSHIP', true);
  }

  const eligible = candidates.filter((candidate) => eligibilityOf(candidate, request, policy) === null);

  if (request.referralAgentId) {
    const referred = eligible.find((candidate) => candidate.agentId === request.referralAgentId);
    if (referred) return direct(referred, 'REFERRAL_ATTRIBUTION');
  }

  const exclusive = eligible.find((candidate) => candidate.representationType === 'EXCLUSIVE');
  if (exclusive) return direct(exclusive, 'EXCLUSIVE_REPRESENTATION');

  const primary = eligible.find((candidate) => candidate.isPrimary);
  if (primary) return direct(primary, 'PRIMARY_REPRESENTATIVE');

  const chosen = selectFairly(
    rankCandidates(eligible, request, policy),
    policy,
    `${request.listing.listingId}:${request.customerId}`,
  );
  if (!chosen) return { kind: 'UNAVAILABLE', considered };
  return {
    kind: 'ASSIGNED',
    candidate: chosen.candidate,
    reason: 'BEST_AVAILABLE',
    score: chosen.score,
    breakdown: chosen.breakdown,
    considered,
    continued: false,
  };
}
