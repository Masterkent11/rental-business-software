import type postgres from 'postgres';
import type { RentalApplicationPolicy } from '@/domain/verification/verification.ts';

export async function loadRentalApplicationPolicy(tx: postgres.TransactionSql, resourceId: string) {
  const [row] = await tx<(RentalApplicationPolicy & {
    organizationId: string; allowPendingIdentityApplication: boolean;
  })[]>`
    select l.kind, l.intent, l.state, r.rental_mode as "rentalMode", r.organization_id as "organizationId",
      l.max_occupants as "maxOccupants", l.min_lease_months as "minLeaseMonths", l.max_lease_months as "maxLeaseMonths",
      to_char(l.available_from, 'YYYY-MM-DD') as "availableFrom",
      l.allow_pending_identity_application as "allowPendingIdentityApplication"
    from listings l join rentable_resources r on r.id = l.resource_id
    where r.id = ${resourceId} and l.kind = 'LONG_TERM' and l.intent = 'RENT' and l.state = 'PUBLISHED'
    order by l.id limit 1`;
  return row ?? null;
}
