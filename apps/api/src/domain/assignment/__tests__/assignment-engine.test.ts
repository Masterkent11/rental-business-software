import { describe, expect, it } from 'vitest';
import {
  INQUIRY_ASSIGNMENT_POLICY,
  VIEWING_ASSIGNMENT_POLICY,
  eligibilityOf,
  rankCandidates,
  reliabilityRatio,
  resolveAssignment,
  scoreCandidate,
  selectFairly,
  workloadRatio,
  type AssignmentCandidate,
  type AssignmentRequest,
  type LeadAssignment,
} from '@/domain/assignment/lead-assignment.ts';

const NOW = new Date('2026-10-10T02:00:00.000Z');

const candidate = (agentId: string, overrides: Partial<AssignmentCandidate> = {}): AssignmentCandidate => ({
  representationId: `rep-${agentId}`,
  agentId,
  organizationId: 'org-1',
  representationType: 'NON_EXCLUSIVE',
  isPrimary: false,
  representationAcceptsLeads: true,
  validFrom: null,
  validUntil: null,
  initiatedByAgent: false,
  agentName: agentId,
  verificationState: 'VERIFIED',
  agentAcceptsLeads: true,
  leadCapacity: 20,
  agentDeactivated: false,
  organizationState: 'VERIFIED',
  specialties: [],
  areasServed: [],
  activeLeads: 0,
  recentAssignments: 0,
  lastAssignedAt: null,
  acceptedAssignments: 0,
  missedAssignments: 0,
  scheduleConflicts: 0,
  listingActivity: 0,
  ...overrides,
});

const request = (overrides: Partial<AssignmentRequest> = {}): AssignmentRequest => ({
  purpose: 'VIEWING',
  listing: { listingId: 'listing-1', propertyTypeLabels: ['House', 'House & Lot'], areaLabel: 'Brgy. Catalunan Grande', cityLabel: 'Davao City' },
  customerId: 'customer-1',
  existing: null,
  referralAgentId: null,
  schedule: { date: '2026-10-14', window: 'AFTERNOON' },
  excludedAgentIds: [],
  now: NOW,
  ...overrides,
});

const existing = (agentId: string): LeadAssignment => ({
  id: 'assignment-1',
  organizationId: 'org-1',
  listingId: 'listing-1',
  customerId: 'customer-1',
  representationId: `rep-${agentId}`,
  agentId,
  purpose: 'INQUIRY',
  status: 'ACCEPTED',
  reason: 'BEST_AVAILABLE',
  score: 80,
  breakdown: null,
  candidatesConsidered: 3,
  previousAssignmentId: null,
  releaseReason: null,
  responseDueAt: null,
  assignedAt: NOW,
  acceptedAt: NOW,
  releasedAt: null,
});

describe('deterministic assignment rules', () => {
  it('keeps the existing agent for the same customer and property', () => {
    const decision = resolveAssignment(
      [candidate('maria', { activeLeads: 19 }), candidate('john'), candidate('ana', { representationType: 'EXCLUSIVE' })],
      request({ existing: existing('maria'), referralAgentId: 'john' }),
    );
    expect(decision).toMatchObject({ kind: 'ASSIGNED', reason: 'EXISTING_RELATIONSHIP', continued: true });
    expect(decision.kind === 'ASSIGNED' && decision.candidate.agentId).toBe('maria');
  });

  it('continuity survives a full calendar but not a suspension', () => {
    const busy = resolveAssignment(
      [candidate('maria', { scheduleConflicts: 9, activeLeads: 20 }), candidate('john')],
      request({ existing: existing('maria') }),
    );
    expect(busy.kind === 'ASSIGNED' && busy.candidate.agentId).toBe('maria');

    const suspended = resolveAssignment(
      [candidate('maria', { verificationState: 'SUSPENDED' }), candidate('john')],
      request({ existing: existing('maria') }),
    );
    expect(suspended).toMatchObject({ kind: 'ASSIGNED', reason: 'BEST_AVAILABLE' });
    expect(suspended.kind === 'ASSIGNED' && suspended.candidate.agentId).toBe('john');
  });

  it('a valid referral wins over exclusive, primary and scoring', () => {
    const decision = resolveAssignment(
      [candidate('maria', { representationType: 'EXCLUSIVE' }), candidate('john', { isPrimary: true }), candidate('ana')],
      request({ referralAgentId: 'ana' }),
    );
    expect(decision).toMatchObject({ kind: 'ASSIGNED', reason: 'REFERRAL_ATTRIBUTION', score: null });
    expect(decision.kind === 'ASSIGNED' && decision.candidate.agentId).toBe('ana');
  });

  it('an ineligible referral agent falls through to the next rule', () => {
    const decision = resolveAssignment(
      [candidate('maria', { representationType: 'EXCLUSIVE' }), candidate('ana', { agentAcceptsLeads: false })],
      request({ referralAgentId: 'ana' }),
    );
    expect(decision).toMatchObject({ kind: 'ASSIGNED', reason: 'EXCLUSIVE_REPRESENTATION' });
    expect(decision.kind === 'ASSIGNED' && decision.candidate.agentId).toBe('maria');
  });

  it('a referral for an agent who does not represent the property is ignored', () => {
    const decision = resolveAssignment([candidate('maria'), candidate('john')], request({ referralAgentId: 'stranger' }));
    expect(decision).toMatchObject({ kind: 'ASSIGNED', reason: 'BEST_AVAILABLE' });
  });

  it('exclusive representation wins over the primary representative', () => {
    const decision = resolveAssignment(
      [candidate('maria', { isPrimary: true }), candidate('john', { representationType: 'EXCLUSIVE' })],
      request(),
    );
    expect(decision.kind === 'ASSIGNED' && decision.reason).toBe('EXCLUSIVE_REPRESENTATION');
    expect(decision.kind === 'ASSIGNED' && decision.candidate.agentId).toBe('john');
  });

  it('the primary representative wins over scoring when eligible', () => {
    const decision = resolveAssignment(
      [candidate('maria', { acceptedAssignments: 50 }), candidate('john', { isPrimary: true, activeLeads: 10 })],
      request(),
    );
    expect(decision.kind === 'ASSIGNED' && decision.reason).toBe('PRIMARY_REPRESENTATIVE');
    expect(decision.kind === 'ASSIGNED' && decision.candidate.agentId).toBe('john');
  });

  it('no eligible agent yields a safe unavailable result', () => {
    const decision = resolveAssignment(
      [candidate('maria', { verificationState: 'PENDING' }), candidate('john', { activeLeads: 20 })],
      request(),
    );
    expect(decision).toEqual({ kind: 'UNAVAILABLE', considered: 2 });
    expect(resolveAssignment([], request())).toEqual({ kind: 'UNAVAILABLE', considered: 0 });
  });
});

describe('eligibility', () => {
  const reasons = (overrides: Partial<AssignmentCandidate>, req: Partial<AssignmentRequest> = {}) =>
    eligibilityOf(candidate('x', overrides), request(req));

  it('excludes inactive, expired or not-yet-valid representations', () => {
    expect(reasons({ representationAcceptsLeads: false })).toBe('REPRESENTATION_NOT_ACCEPTING_LEADS');
    expect(reasons({ validUntil: new Date(NOW.getTime() - 1) })).toBe('REPRESENTATION_EXPIRED');
    expect(reasons({ validFrom: new Date(NOW.getTime() + 60_000) })).toBe('REPRESENTATION_NOT_YET_VALID');
  });

  it('excludes suspended, unverified or deactivated agents and unverified organizations', () => {
    expect(reasons({ verificationState: 'SUSPENDED' })).toBe('AGENT_SUSPENDED');
    expect(reasons({ verificationState: 'UNVERIFIED' })).toBe('AGENT_NOT_VERIFIED');
    expect(reasons({ agentDeactivated: true })).toBe('AGENT_DEACTIVATED');
    expect(reasons({ organizationState: 'SUSPENDED' })).toBe('ORGANIZATION_NOT_VERIFIED');
    expect(reasons({ agentAcceptsLeads: false })).toBe('AGENT_NOT_ACCEPTING_LEADS');
  });

  it('respects capacity, served areas, full schedules and exclusions', () => {
    expect(reasons({ activeLeads: 20, leadCapacity: 20 })).toBe('AT_CAPACITY');
    expect(reasons({ areasServed: ['Cebu City', 'Mandaue'] })).toBe('AREA_NOT_SERVED');
    expect(reasons({ areasServed: ['Davao'] })).toBeNull();
    expect(reasons({ scheduleConflicts: VIEWING_ASSIGNMENT_POLICY.maxViewingsPerWindow })).toBe('SCHEDULE_FULL');
    expect(reasons({ scheduleConflicts: 9 }, { purpose: 'INQUIRY', schedule: null })).toBeNull();
    expect(reasons({}, { excludedAgentIds: ['x'] })).toBe('EXCLUDED');
  });
});

describe('scoring', () => {
  it('availability affects viewing ranking', () => {
    const [first] = rankCandidates(
      [candidate('free'), candidate('booked', { scheduleConflicts: 2 })],
      request(),
    );
    expect(first!.candidate.agentId).toBe('free');
    const booked = scoreCandidate(candidate('booked', { scheduleConflicts: 2 }), request(), VIEWING_ASSIGNMENT_POLICY, 0);
    expect(booked.breakdown.availability).toBeLessThan(VIEWING_ASSIGNMENT_POLICY.weights.availability);
  });

  it('response reliability raises the score and new agents get a neutral baseline', () => {
    const reliable = candidate('reliable', { acceptedAssignments: 40, missedAssignments: 0 });
    const unreliable = candidate('unreliable', { acceptedAssignments: 2, missedAssignments: 20 });
    const fresh = candidate('fresh');
    expect(reliabilityRatio(reliable, VIEWING_ASSIGNMENT_POLICY)).toBeGreaterThan(reliabilityRatio(fresh, VIEWING_ASSIGNMENT_POLICY));
    expect(reliabilityRatio(fresh, VIEWING_ASSIGNMENT_POLICY)).toBe(VIEWING_ASSIGNMENT_POLICY.reliabilityBaseline);
    expect(reliabilityRatio(unreliable, VIEWING_ASSIGNMENT_POLICY)).toBeLessThan(reliabilityRatio(fresh, VIEWING_ASSIGNMENT_POLICY));
    expect(reliabilityRatio(fresh, VIEWING_ASSIGNMENT_POLICY)).toBeGreaterThan(0);
  });

  it('an overloaded agent receives a lower workload score based on open leads only', () => {
    expect(workloadRatio(candidate('a', { activeLeads: 18, leadCapacity: 20 }))).toBeCloseTo(0.1);
    expect(workloadRatio(candidate('b', { activeLeads: 0, recentAssignments: 500 }))).toBe(1);
  });

  it('scores never exceed one hundred and the breakdown adds up', () => {
    const scored = scoreCandidate(
      candidate('max', { acceptedAssignments: 1000, listingActivity: 3, initiatedByAgent: true, specialties: ['House & Lot'], areasServed: ['Davao City'] }),
      request(),
      VIEWING_ASSIGNMENT_POLICY,
      0,
    );
    const sum = Object.values(scored.breakdown).reduce((total, part) => total + part, 0);
    expect(scored.score).toBeCloseTo(sum, 2);
    expect(scored.score).toBeLessThanOrEqual(100);
  });

  it('inquiry and viewing use different weights', () => {
    const booked = candidate('booked', { scheduleConflicts: 2 });
    const viewing = scoreCandidate(booked, request(), VIEWING_ASSIGNMENT_POLICY, 0);
    const inquiry = scoreCandidate(booked, request({ purpose: 'INQUIRY', schedule: null }), INQUIRY_ASSIGNMENT_POLICY, 0);
    expect(viewing.breakdown.availability).toBeGreaterThan(0);
    expect(inquiry.breakdown.availability).toBe(0);
    expect(inquiry.breakdown.fairness).toBeGreaterThan(viewing.breakdown.fairness);
  });
});

describe('fair selection', () => {
  it('fairness prevents one candidate from monopolising assignments inside the top band', () => {
    const decision = resolveAssignment(
      [
        candidate('maria', { acceptedAssignments: 30, recentAssignments: 12, lastAssignedAt: new Date('2026-10-09T00:00:00Z') }),
        candidate('john', { acceptedAssignments: 28, recentAssignments: 3 }),
        candidate('ana', { acceptedAssignments: 25, recentAssignments: 4 }),
        candidate('carlo', { verificationState: 'VERIFIED', activeLeads: 17, missedAssignments: 30 }),
      ],
      request(),
    );
    expect(decision.kind === 'ASSIGNED' && decision.candidate.agentId).toBe('john');
    expect(decision.kind === 'ASSIGNED' && decision.reason).toBe('BEST_AVAILABLE');
  });

  it('a candidate far below the top band is never chosen just for being idle', () => {
    const chosen = selectFairly(
      rankCandidates(
        [candidate('strong', { recentAssignments: 5 }), candidate('weak', { scheduleConflicts: 2, missedAssignments: 40, activeLeads: 15 })],
        request(),
      ),
      VIEWING_ASSIGNMENT_POLICY,
      'seed',
    );
    expect(chosen!.candidate.agentId).toBe('strong');
  });

  it('ties are resolved deterministically by the seed', () => {
    const tied = [candidate('alpha'), candidate('bravo'), candidate('charlie')];
    const first = resolveAssignment(tied, request());
    const again = resolveAssignment(tied, request());
    expect(first).toEqual(again);
    const pick = (customerId: string) => {
      const decision = resolveAssignment(tied, request({ customerId }));
      return decision.kind === 'ASSIGNED' ? decision.candidate.agentId : null;
    };
    const spread = new Set(Array.from({ length: 30 }, (_, i) => pick(`customer-${i}`)));
    expect(spread.size).toBeGreaterThan(1);
  });

  it('the least recently assigned agent wins an otherwise equal tie', () => {
    const decision = resolveAssignment(
      [
        candidate('recent', { lastAssignedAt: new Date('2026-10-09T00:00:00Z') }),
        candidate('older', { lastAssignedAt: new Date('2026-09-01T00:00:00Z') }),
      ],
      request(),
    );
    expect(decision.kind === 'ASSIGNED' && decision.candidate.agentId).toBe('older');
  });

  it('persists the score and breakdown for the chosen candidate', () => {
    const decision = resolveAssignment([candidate('only')], request());
    expect(decision.kind).toBe('ASSIGNED');
    if (decision.kind !== 'ASSIGNED') return;
    expect(decision.score).not.toBeNull();
    expect(decision.breakdown).not.toBeNull();
    expect(decision.considered).toBe(1);
  });
});
