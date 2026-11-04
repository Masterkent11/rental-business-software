import { describe, expect, it } from 'vitest';
import {
  InvalidAgentProfileError,
  DEFAULT_TERMS,
  InvalidRepresentationTransitionError,
  InvalidVerificationRequestError,
  RepresentationForbiddenError,
  assertActiveRepresentationAllows,
  assertRepresentationCurrent,
  assertMayRequestVerification,
  isAssignable,
  nextRepresentationState,
  nextVerificationState,
  normaliseAgentProfile,
  responseMetrics,
} from '@/domain/agents/agent.ts';
import { agentWorkload } from '@/domain/agents/agent-dashboard.ts';
import type { Inquiry } from '@/domain/inquiries/inquiry.ts';

const profile = {
  displayName: '  Maria   Santos ',
  headline: 'Licensed real estate broker',
  bio: 'Helping families in Cebu.',
  licenseNumber: ' 0012 345 ',
  licenseAuthority: 'PRC',
  specialties: ['House & Lot', 'house & lot', 'Condo', ''],
  areasServed: ['Cebu City', 'Mandaue'],
  languages: ['English', 'Cebuano'],
  publicState: 'PUBLIC' as const,
  photoUrl: null,
};

describe('agent profile', () => {
  it('normalises names and de-duplicates lists', () => {
    const clean = normaliseAgentProfile(profile);
    expect(clean.displayName).toBe('Maria Santos');
    expect(clean.licenseNumber).toBe('0012345');
    expect(clean.specialties).toEqual(['House & Lot', 'Condo']);
  });

  it('refuses photo links that are not uploaded images over https', () => {
    expect(() => normaliseAgentProfile({ ...profile, photoUrl: 'javascript:alert(1)' })).toThrow(InvalidAgentProfileError);
  });

  it('only verified, public agents can be assigned to a listing', () => {
    expect(isAssignable({ verificationState: 'VERIFIED', publicState: 'PUBLIC' })).toBe(true);
    expect(isAssignable({ verificationState: 'PENDING', publicState: 'PUBLIC' })).toBe(false);
    expect(isAssignable({ verificationState: 'VERIFIED', publicState: 'HIDDEN' })).toBe(false);
  });

  it('needs a license number before asking for verification and cannot ask twice', () => {
    expect(() => assertMayRequestVerification({ verificationState: 'UNVERIFIED', licenseNumber: null })).toThrow(
      InvalidVerificationRequestError,
    );
    expect(() => assertMayRequestVerification({ verificationState: 'PENDING', licenseNumber: 'X1' })).toThrow(
      InvalidVerificationRequestError,
    );
    expect(() => assertMayRequestVerification({ verificationState: 'UNVERIFIED', licenseNumber: '12345' })).not.toThrow();
  });

  it('follows the verification decision rules', () => {
    expect(nextVerificationState('PENDING', 'VERIFY')).toBe('VERIFIED');
    expect(nextVerificationState('PENDING', 'REJECT')).toBe('REJECTED');
    expect(nextVerificationState('VERIFIED', 'SUSPEND')).toBe('SUSPENDED');
    expect(() => nextVerificationState('UNVERIFIED', 'VERIFY')).toThrow(InvalidVerificationRequestError);
  });

  it('reports no response metrics until there is enough data', () => {
    const at = (minutes: number) => new Date(Date.UTC(2026, 9, 1, 0, minutes));
    expect(responseMetrics([{ createdAt: at(0), firstResponseAt: at(5) }]).respondedWithinDayRate).toBeNull();
    const metrics = responseMetrics([
      { createdAt: at(0), firstResponseAt: at(10) },
      { createdAt: at(0), firstResponseAt: at(30) },
      { createdAt: at(0), firstResponseAt: null },
    ]);
    expect(metrics.respondedWithinDayRate).toBe(0.67);
    expect(metrics.medianResponseMinutes).toBe(20);
  });
});

describe('representation', () => {
  it('only the agent answers an invitation, once', () => {
    expect(nextRepresentationState('PENDING', 'ACCEPT', 'AGENT')).toBe('ACTIVE');
    expect(nextRepresentationState('PENDING', 'DECLINE', 'AGENT')).toBe('ENDED');
    expect(() => nextRepresentationState('PENDING', 'ACCEPT', 'OWNER')).toThrow(InvalidRepresentationTransitionError);
    expect(() => nextRepresentationState('ACTIVE', 'ACCEPT', 'AGENT')).toThrow(InvalidRepresentationTransitionError);
  });

  it('either side can end it, but not twice', () => {
    expect(nextRepresentationState('ACTIVE', 'END', 'OWNER')).toBe('ENDED');
    expect(nextRepresentationState('PENDING', 'END', 'AGENT')).toBe('ENDED');
    expect(() => nextRepresentationState('ENDED', 'END', 'OWNER')).toThrow(InvalidRepresentationTransitionError);
  });

  it('permissions are checked against an active representation only', () => {
    const permissions = { canEditListing: false, canManageTour: true, canViewCommercial: true };
    expect(() => assertActiveRepresentationAllows(null, null)).toThrow(RepresentationForbiddenError);
    expect(() => assertActiveRepresentationAllows({ state: 'PENDING', permissions }, null)).toThrow(RepresentationForbiddenError);
    expect(() => assertActiveRepresentationAllows({ state: 'ACTIVE', permissions }, 'canEditListing')).toThrow(
      RepresentationForbiddenError,
    );
    expect(() => assertActiveRepresentationAllows({ state: 'ACTIVE', permissions }, 'canManageTour')).not.toThrow();
  });
});

describe('agent workload', () => {
  it('counts only real work for today in Manila', () => {
    const now = new Date('2026-10-08T02:00:00.000Z');
    const inquiry = (status: Inquiry['status'], customerId: string): Inquiry =>
      ({ status, customerId } as unknown as Inquiry);
    const workload = agentWorkload({
      now,
      inquiries: [inquiry('NEW', 'a'), inquiry('NEGOTIATING', 'b'), inquiry('LOST', 'c'), inquiry('NEW', 'a')],
      viewings: [
        {
          id: 'v1',
          scheduledAt: new Date('2026-10-08T06:00:00.000Z'),
          status: 'CONFIRMED',
          customerName: 'Ana',
          listingTitle: 'House',
        } as never,
        {
          id: 'v2',
          scheduledAt: new Date('2026-10-09T06:00:00.000Z'),
          status: 'CONFIRMED',
          customerName: 'Ben',
          listingTitle: 'Condo',
        } as never,
      ],
      tasks: [
        { id: 't1', title: 'Call Ana', dueAt: new Date('2026-10-07T01:00:00.000Z'), doneAt: null, customerName: 'Ana' },
        { id: 't2', title: 'Later', dueAt: new Date('2026-10-20T01:00:00.000Z'), doneAt: null, customerName: null },
      ],
    });
    expect(workload.newInquiries).toBe(2);
    expect(workload.activeClients).toBe(2);
    expect(workload.dealsInProgress).toBe(1);
    expect(workload.viewingsToday).toBe(1);
    expect(workload.followUpsDue).toBe(1);
    expect(workload.today.map((item) => item.kind)).toEqual(['FOLLOW_UP', 'VIEWING']);
    expect(workload.today[0]!.status).toBe('OVERDUE');
  });
});


describe('representation validity interval', () => {
  const now = new Date('2026-11-01T00:00:00Z');
  it('allows the start boundary and an open ended accepted grant', () => {
    expect(() => assertRepresentationCurrent({ terms: { ...DEFAULT_TERMS, validFrom: now, validUntil: null } }, now)).not.toThrow();
  });
  it.each([
    { validFrom: new Date('2026-11-02T00:00:00Z'), validUntil: null },
    { validFrom: null, validUntil: now },
    { validFrom: null, validUntil: new Date('2026-10-31T23:59:59Z') },
  ])('rejects a future or expired grant', dates => {
    expect(() => assertRepresentationCurrent({ terms: { ...DEFAULT_TERMS, ...dates } }, now)).toThrow(RepresentationForbiddenError);
  });
});
