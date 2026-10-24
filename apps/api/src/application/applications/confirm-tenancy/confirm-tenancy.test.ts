import { describe, expect, it, vi } from 'vitest';
import { confirmTenancy } from './confirm-tenancy.use-case.ts';
import { assertTenancyActivation } from '@/domain/occupancy/tenancy-activation.ts';
import { InvalidTransitionError } from '@/domain/applications/application-errors.ts';
import { OrganizationForbiddenError } from '@/application/identity/resolve-principal/resolve-principal.use-case.ts';

const now = new Date('2026-10-24T00:00:00Z');
const live = { applicationState: 'APPROVED', kind: 'LEASE', state: 'HELD', expiresAt: new Date('2026-10-25T00:00:00Z'), endsOn: '2027-01-01', now };

describe('manual tenancy confirmation', () => {
  it('accepts live approved lease holds and credited reservations', () => {
    expect(() => assertTenancyActivation(live)).not.toThrow();
    expect(() => assertTenancyActivation({ ...live, kind: 'RESERVATION', state: 'COMMITTED' })).not.toThrow();
  });
  it('rejects unpaid reservations, expired holds, ended periods, cancelled leases and unapproved applications', () => {
    for (const patch of [{ applicationState: 'SUBMITTED' }, { applicationState: 'REJECTED' }, { applicationState: 'WITHDRAWN' }, { kind: 'BOOKING' }, { kind: 'RESERVATION' }, { state: 'CANCELLED' }, { expiresAt: now }, { endsOn: '2026-10-24' }]) {
      expect(() => assertTenancyActivation({ ...live, ...patch })).toThrow(InvalidTransitionError);
    }
  });
  it('requires an owner or staff capability at the actual organization and an explicit review', async () => {
    const confirm = vi.fn(async () => ({ id: 'lease', state: 'COMMITTED' as const, startsOn: '2026-10-25', endsOn: '2027-01-01', confirmedAt: now }));
    const run = confirmTenancy({ confirm }, { now: () => now });
    const base = { userId: 'actor', displayName: 'Staff', organizationId: 'org' };
    for (const capabilities of [[], [{ capability: 'CUSTOMER' as const, organizationId: null }], [{ capability: 'STAFF' as const, organizationId: 'other' }]]) {
      await expect(run({ principal: { ...base, capabilities }, organizationId: 'org', applicationId: 'application', requirementsReviewed: true })).rejects.toThrow(OrganizationForbiddenError);
    }
    const principal = { ...base, capabilities: [{ capability: 'STAFF' as const, organizationId: 'org' }] };
    await expect(run({ principal, organizationId: 'org', applicationId: 'application', requirementsReviewed: false })).rejects.toThrow(InvalidTransitionError);
    expect(confirm).not.toHaveBeenCalled();
    await run({ principal, organizationId: 'org', applicationId: 'application', requirementsReviewed: true });
    expect(confirm).toHaveBeenCalledWith({ organizationId: 'org', applicationId: 'application', confirmedBy: 'actor', now });
  });
});
