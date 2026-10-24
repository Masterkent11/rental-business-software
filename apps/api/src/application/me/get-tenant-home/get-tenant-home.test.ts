import { describe, expect, it } from 'vitest';
import { getTenantHome } from './get-tenant-home.use-case.ts';
import { TenancyNotFoundError, type TenantHome } from '@/domain/occupancy/tenant-home.ts';

const home: TenantHome = { id: 'home', tenantId: 'tenant', kind: 'LEASE', state: 'COMMITTED', startsOn: '2026-01-01', endsOn: '2027-01-01', propertyId: 'property', listingId: null, title: 'Home', unit: 'A', address: 'Cebu', area: 'Cebu', propertyType: 'CONDO', description: '', photos: [], amenities: [], rules: [], latitude: null, longitude: null, landlordName: 'Manager', invoices: [] };
const clock = { now: () => new Date('2026-10-24T00:00:00Z') };
const activityForCustomer = async () => ({ hasTrips: true, pendingApplications: 1, approvedApplications: 1 });

describe('tenant home authorization', () => {
  it('does not equate bookings, held leases, future or ended leases with active tenancy', async () => {
    for (const patch of [{ kind: 'BOOKING' }, { kind: 'RESERVATION' }, { state: 'HELD' }, { state: 'CANCELLED' }, { state: 'RELEASED' }, { state: 'EXPIRED' }, { startsOn: '2027-01-01' }, { endsOn: '2026-10-24' }, { tenantId: 'other' }]) {
      const get = getTenantHome({ activityForCustomer, listForCustomer: async () => [{ ...home, ...patch }] }, clock);
      expect((await get({ userId: 'tenant' })).tenancies).toEqual([]);
      await expect(get({ userId: 'tenant', tenancyId: 'home' })).rejects.toThrow(TenancyNotFoundError);
    }
  });
  it('supports multiple tenancies and checks explicit ownership', async () => {
    const get = getTenantHome({ activityForCustomer, listForCustomer: async () => [home, { ...home, id: 'second' }] }, clock);
    expect((await get({ userId: 'tenant' })).tenancies).toHaveLength(2);
    expect((await get({ userId: 'tenant', tenancyId: 'second' })).tenancies[0]?.id).toBe('second');
    await expect(get({ userId: 'attacker', tenancyId: 'home' })).rejects.toThrow(TenancyNotFoundError);
  });
  it('allows authoritative open-ended leases and uses Manila midnight', async () => {
    const get = getTenantHome({ activityForCustomer, listForCustomer: async () => [{ ...home, startsOn: '2026-10-25', endsOn: null }] }, { now: () => new Date('2026-10-24T16:00:00Z') });
    expect((await get({ userId: 'tenant' })).tenancies).toHaveLength(1);
  });
  it('activates and expires a confirmed lease at server date boundaries without a duration threshold', async () => {
    let now = new Date('2026-10-23T15:59:59Z');
    const get = getTenantHome({ activityForCustomer, listForCustomer: async () => [{ ...home, startsOn: '2026-10-24', endsOn: '2026-10-25' }] }, { now: () => now });
    expect((await get({ userId: 'tenant' })).tenancies).toHaveLength(0);
    now = new Date('2026-10-23T16:00:00Z');
    expect((await get({ userId: 'tenant' })).tenancies).toHaveLength(1);
    now = new Date('2026-10-24T16:00:00Z');
    expect((await get({ userId: 'tenant' })).rentalHistory).toHaveLength(1);
    await expect(get({ userId: 'tenant', tenancyId: 'home' })).rejects.toThrow(TenancyNotFoundError);
  });
  it('offers concurrent experiences and rental history without turning move-in preparation into My Home', async () => {
    const get = getTenantHome({ activityForCustomer, listForCustomer: async () => [{ ...home, startsOn: '2026-12-01' }, { ...home, id: 'ended', endsOn: '2026-10-01' }] }, clock);
    const result = await get({ userId: 'tenant' });
    expect(result.capabilities).toEqual(['EXPLORE','TRIPS','APPLICATION_TRACKING','MOVE_IN','RENTAL_HISTORY']);
    expect(result.hasTrips).toBe(true);
    expect(result.upcomingMoveIns).toHaveLength(1);
    expect(result.rentalHistory).toHaveLength(1);
    expect(result.tenancies).toEqual([]);
  });
});
