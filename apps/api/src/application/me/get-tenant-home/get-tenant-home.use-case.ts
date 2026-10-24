import type { TenantHomeRepository } from '@/application/ports/repositories/tenant-home-repository.port.ts';
import type { Clock } from '@/application/ports/providers/clock.port.ts';
import { eligibleTenantHome, TenancyNotFoundError } from '@/domain/occupancy/tenant-home.ts';
import { localDay } from '@/domain/shared/calendar.ts';

export const getTenantHome = (repository: TenantHomeRepository, clock: Clock) =>
  async (input: { userId: string; tenancyId?: string }) => {
    const today = localDay(clock.now());
    const owned = await repository.listForCustomer(input.userId);
    const tenancies = owned
      .filter(home => eligibleTenantHome(home, input.userId, today))
      .sort((a, b) => (a.startsOn ?? '').localeCompare(b.startsOn ?? '') || a.id.localeCompare(b.id))
      .map(home => ({ ...home, asOf: today }));
    if (!input.tenancyId) {
      const activity = await repository.activityForCustomer(input.userId);
      const upcoming = owned.filter(home => home.tenantId === input.userId
        && home.kind === 'LEASE' && home.state === 'COMMITTED'
        && home.startsOn !== null && home.startsOn > today);
      const history = owned.filter(home => home.tenantId === input.userId
        && home.kind === 'LEASE' && (['CANCELLED', 'RELEASED'].includes(home.state)
          || (home.endsOn !== null && home.endsOn <= today)));
      return {
        tenancies,
        asOf: today,
        selectedTenancyId: tenancies[0]?.id ?? null,
        capabilities: [
          'EXPLORE', 'TRIPS', 'APPLICATION_TRACKING',
          ...(tenancies.length ? ['MY_HOME'] : []),
          ...(upcoming.length || activity.approvedApplications ? ['MOVE_IN'] : []),
          ...(history.length ? ['RENTAL_HISTORY'] : []),
        ],
        hasTrips: activity.hasTrips,
        pendingApplications: activity.pendingApplications,
        approvedApplications: activity.approvedApplications,
        upcomingMoveIns: upcoming.map(home => ({ ...home, asOf: today })),
        rentalHistory: history.map(home => ({ ...home, asOf: today })),
      };
    }
    const home = tenancies.find(home => home.id === input.tenancyId);
    if (!home) throw new TenancyNotFoundError('This tenancy is not available to your account.');
    return { tenancies: [home] };
  };
