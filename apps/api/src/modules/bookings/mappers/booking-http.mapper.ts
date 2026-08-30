import type { Occupancy } from '@/domain/occupancy/occupancy.ts';
import { nightCount } from '@/domain/occupancy/occupancy.ts';

export const toBookingHttpResponse = (occupancy: Occupancy) => ({
  id: occupancy.id,
  resourceId: occupancy.resourceId,
  state: occupancy.state,
  startsOn: occupancy.during.startsOn,
  endsOn: occupancy.during.endsOn,
  nights: nightCount(occupancy.during),
  expiresAt: occupancy.expiresAt?.toISOString() ?? null,
});
