import type postgres from 'postgres';
import { sql } from '@/infrastructure/postgres/db.ts';
import {
  NotBookableError,
  OccupancyConflictError,
  SerializationError,
  type NightAvailability,
  type NightStatus,
  type OccupancyRepository,
} from '@/application/ports/repositories/occupancy-repository.port.ts';
import { nightsIn, type Occupancy } from '@/domain/occupancy/occupancy.ts';

/** 23P01 exclusion_violation · 40001 serialization_failure · 40P01 deadlock. */
const EXCLUSION_VIOLATION = '23P01';
const SERIALIZATION_FAILURE = '40001';
const DEADLOCK_DETECTED = '40P01';
const UNIQUE_VIOLATION = '23505';

interface OccupancyRow {
  id: string;
  organization_id: string;
  resource_id: string;
  kind: Occupancy['kind'];
  state: Occupancy['state'];
  starts_on: string;
  ends_on: string;
  expires_at: Date | null;
}

const toOccupancy = (row: OccupancyRow): Occupancy => ({
  id: row.id,
  organizationId: row.organization_id,
  resourceId: row.resource_id,
  kind: row.kind,
  state: row.state,
  during: { startsOn: row.starts_on, endsOn: row.ends_on },
  expiresAt: row.expires_at,
});

export function postgresOccupancyRepository(): OccupancyRepository {
  return {
    async nightsFor(resourceId, range) {
      // The projection is the fast path, but expired holds are discounted here
      // rather than trusted from the table (ADR-0004): an abandoned checkout
      // must never show a night as taken while the sweep is pending.
      const rows = await sql<{ night: string; status: NightStatus }[]>`
        with wanted as (
          select generate_series(
            ${range.startsOn}::date,
            ${range.endsOn}::date - 1,
            interval '1 day'
          )::date as night
        ),
        live as (
          select o.during, o.kind
            from occupancies o
            join rentable_resources r
              on r.id = ${resourceId}
           where o.root_id = r.root_id
             and o.subtree && r.subtree
             and (
               o.state = 'COMMITTED'
               or (o.state = 'HELD' and o.expires_at > now())
             )
        )
        select
          to_char(w.night, 'YYYY-MM-DD') as night,
          coalesce(
            (select case
                      when l.kind = 'LEASE' then 'LEASED'
                      when l.kind = 'BLOCK' then 'BLOCKED'
                      else 'BOOKED'
                    end
               from live l
              where l.during @> w.night
              limit 1),
            'OPEN'
          ) as status
          from wanted w
         order by w.night
      `;

      return rows.map<NightAvailability>((row) => ({
        night: row.night,
        status: row.status,
      }));
    },

    async placeHold({ resourceId, during, holdMinutes, heldBy, guests, clientRef }) {
      try {
        return await sql.begin(async (tx) => {
          // ADR-0005, in order. Each mechanism is necessary; none is
          // sufficient alone.
          await tx`set transaction isolation level serializable`;

          // Only inventory that is actually on the market may be held. Without
          // this a booking attempt is a way to reserve — and to discover —
          // listings nobody has published.
          const [resource] = await tx<
            { root_id: string; organization_id: string }[]
          >`
            select r.root_id, r.organization_id
              from rentable_resources r
              join listings l
                on l.resource_id = r.id
               and l.state = 'PUBLISHED'
               and l.kind = 'SHORT_TERM'
             where r.id = ${resourceId}
             limit 1
          `;
          if (!resource) {
            throw new NotBookableError('That place is not available to book');
          }

          // Scope the write to the organization that owns the inventory.
          //
          // Derived from the resource, never from a header: the customer is a
          // guest of this organization, not a member of it, so there is no
          // membership to check against. RLS still constrains every statement
          // that follows to this one organization's rows.
          await tx`select set_config('app.organization_id', ${resource.organization_id}, true)`;

          // Lock the ROOT, not the resource. A lease on the unit and a booking
          // on a bed inside it must contend on the same lock, or the nesting
          // rule is unenforced exactly when it matters.
          await tx`select pg_advisory_xact_lock(hashtext(${resource.root_id}))`;

          // Sweep expired holds on this tree first. The exclusion constraint
          // cannot evaluate "expired" — its predicate must be immutable — so an
          // abandoned checkout would otherwise block the nights forever.
          await tx`
            update occupancies
               set state = 'EXPIRED'
             where root_id = ${resource.root_id}
               and state = 'HELD'
               and expires_at <= now()
          `;

          if (clientRef) {
            const [previous] = await tx<(OccupancyRow & { guests: number | null })[]>`
              select id, organization_id, resource_id, kind, state, guests,
                     to_char(lower(during), 'YYYY-MM-DD') as starts_on,
                     to_char(upper(during), 'YYYY-MM-DD') as ends_on,
                     expires_at
                from occupancies
               where held_by = ${heldBy} and client_ref = ${clientRef}
               limit 1
            `;
            if (previous) {
              if (previous.resource_id !== resourceId || previous.starts_on !== during.startsOn
                || previous.ends_on !== during.endsOn || previous.guests !== (guests ?? null)) {
                throw new OccupancyConflictError('This booking request was already used for different details');
              }
              return toOccupancy(previous);
            }
          }

          const [inserted] = await tx<OccupancyRow[]>`
            insert into occupancies (
              organization_id, resource_id, root_id, subtree,
              during, kind, state, expires_at, held_by, guests, client_ref
            )
            select
              r.organization_id, r.id, r.root_id, r.subtree,
              daterange(${during.startsOn}::date, ${during.endsOn}::date, '[)'),
              'BOOKING', 'HELD',
              now() + (${holdMinutes} || ' minutes')::interval,
              ${heldBy}, ${guests ?? null}, ${clientRef ?? null}
              from rentable_resources r
             where r.id = ${resourceId}
            returning
              id, organization_id, resource_id, kind, state,
              to_char(lower(during), 'YYYY-MM-DD') as starts_on,
              to_char(upper(during), 'YYYY-MM-DD') as ends_on,
              expires_at
          `;

          // Same transaction as the timeline write (ADR-0004), so the calendar
          // is never stale within a request.
          const nights = nightsIn(during);
          if (nights.length > 0) {
            await tx`
              insert into resource_night_status (
                organization_id, resource_id, night, status
              )
              select ${inserted!.organization_id}, ${resourceId},
                     unnest(${tx.array([...nights])}::date[]), 'HELD'
              on conflict (resource_id, night)
              do update set status = excluded.status
            `;
          }

          return toOccupancy(inserted!);
        });
      } catch (error) {
        throw translate(error);
      }
    },
  };
}

/**
 * Turn Postgres's refusals into something the domain names.
 *
 * The distinction matters to the caller: a conflict is final and the customer
 * must be told now, while a serialization failure is a retryable accident of
 * timing that the customer should never see.
 */
function translate(error: unknown): unknown {
  if (error instanceof OccupancyConflictError) return error;
  if (error instanceof NotBookableError) return error;

  const code = (error as postgres.PostgresError | undefined)?.code;

  if (code === EXCLUSION_VIOLATION) {
    return new OccupancyConflictError('Those nights have just been taken');
  }
  if (code === SERIALIZATION_FAILURE || code === DEADLOCK_DETECTED || code === UNIQUE_VIOLATION) {
    return new SerializationError('Could not complete; try again');
  }
  return error;
}
