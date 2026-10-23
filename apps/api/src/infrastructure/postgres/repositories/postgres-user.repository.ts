import { sql, withUser } from '@/infrastructure/postgres/db.ts';
import type {
  PrincipalData,
  StayReceipt,
  UserProfile,
  UserRepository,
} from '@/application/ports/repositories/user-repository.port.ts';
import type {
  Capability,
  HeldCapability,
} from '@/domain/identity/identity.ts';

interface ProfileRow {
  id: string;
  display_name: string;
  email: string | null;
  mobile: string | null;
}

const toProfile = (row: ProfileRow): UserProfile => ({
  id: row.id,
  displayName: row.display_name,
  email: row.email,
  mobile: row.mobile,
});

export function postgresUserRepository(): UserRepository {
  return {
    async loadPrincipal(userId, organizationId): Promise<PrincipalData> {
      // One transaction, one scope-setting, three cheap indexed reads.
      return withUser(userId, async (tx) => {
        const [profile] = await tx<ProfileRow[]>`
          select id, display_name, email, mobile
            from user_profiles
           where id = ${userId} and deactivated_at is null
        `;

        const capabilities = await tx<
          { capability: Capability; organization_id: string | null }[]
        >`
          select capability, organization_id
            from user_capabilities
           where user_id = ${userId} and revoked_at is null
        `;

        let isMember: boolean | null = null;
        if (organizationId !== null) {
          const [row] = await tx<{ n: string }[]>`
            select count(*)::text as n
              from organization_members
             where user_id = ${userId}
               and organization_id = ${organizationId}
               and revoked_at is null
          `;
          isMember = Number(row?.n ?? '0') > 0;
        }

        return {
          profile: profile ? toProfile(profile) : null,
          capabilities: capabilities.map<HeldCapability>((row) => ({
            capability: row.capability,
            organizationId: row.organization_id,
          })),
          isMember,
        };
      });
    },

    async organizationsFor(userId) {
      const rows = await withUser(userId, (tx) =>
        tx<{ organization_id: string; name: string; role: 'OWNER' | 'STAFF'; state: string }[]>`
          select distinct on (m.organization_id)
                 m.organization_id, o.trading_name as name, m.role, o.state
            from organization_members m
            join organizations o on o.id = m.organization_id
           where m.user_id = ${userId} and m.revoked_at is null
           order by m.organization_id, (m.role = 'OWNER') desc
        `,
      );
      return rows.map((row) => ({
        organizationId: row.organization_id,
        name: row.name,
        role: row.role,
        verified: row.state === 'VERIFIED',
      }));
    },

    async findProfile(userId) {
      const rows = await withUser(userId, (tx) =>
        tx<ProfileRow[]>`
          select id, display_name, email, mobile
            from user_profiles
           where id = ${userId} and deactivated_at is null
        `,
      );
      return rows[0] ? toProfile(rows[0]) : null;
    },

    async updateProfile(userId, patch) {
      const rows = await withUser(userId, (tx) =>
        tx<ProfileRow[]>`
          update user_profiles set display_name = ${patch.displayName}
           where id = ${userId}
          returning id, display_name, email, mobile
        `,
      );
      return rows[0] ? toProfile(rows[0]) : null;
    },

    async createProfile({ id, email, mobile, displayName }) {
      // The row may already exist from a concurrent first request, so this is
      // an upsert rather than an insert. Two requests arriving together for a
      // brand-new user is ordinary, not exceptional.
      return withUser(id, async (tx) => {
        const rows = await tx<ProfileRow[]>`
          insert into user_profiles (id, email, mobile, display_name)
          values (${id}, ${email}, ${mobile}, ${displayName?.trim() || email?.split('@')[0] || mobile || ''})
          on conflict (id) do update set
            email = coalesce(user_profiles.email, excluded.email),
            mobile = coalesce(user_profiles.mobile, excluded.mobile)
          returning id, display_name, email, mobile
        `;
        await tx`
          insert into user_capabilities (user_id, capability, source_type)
          values (${id}, 'CUSTOMER', 'REGISTRATION')
          on conflict do nothing
        `;
        return toProfile(rows[0]!);
      });
    },

    async capabilitiesFor(userId) {
      const rows = await withUser(userId, (tx) =>
        tx<{ capability: Capability; organization_id: string | null }[]>`
          select capability, organization_id
            from user_capabilities
           where user_id = ${userId} and revoked_at is null
        `,
      );

      return rows.map<HeldCapability>((row) => ({
        capability: row.capability,
        organizationId: row.organization_id,
      }));
    },

    async isMemberOf(userId, organizationId) {
      const rows = await withUser(userId, (tx) =>
        tx<{ n: string }[]>`
          select count(*)::text as n
            from organization_members
           where user_id = ${userId}
             and organization_id = ${organizationId}
             and revoked_at is null
        `,
      );
      return Number(rows[0]?.n ?? '0') > 0;
    },

    async staysFor(userId) {
      // Joined through to the payment so the receipt shows what was actually
      // paid, not what the listing costs today.
      const rows = await withUser(userId, (tx) =>
        tx<
          {
            stay_id: string;
            reference: string;
            title: string;
            property_name: string;
            area_label: string;
            city_label: string;
            starts_on: string;
            ends_on: string;
            nights: string;
            paid_centavos: string | null;
            paid_at: Date | null;
            state: string;
            photo: string | null;
            state_label: string;
            bucket: 'ACTIVE' | 'PAST' | 'CANCELLED';
          }[]
        >`
          select
            s.id as stay_id,
            -- Short, human-quotable, and stable. The full uuid is not
            -- something anyone reads down a phone line.
            upper(substring(replace(s.id::text, '-', '') from 1 for 8)) as reference,
            l.title,
            p.name as property_name,
            p.area_label,
            p.city_label,
            to_char(lower(o.during), 'YYYY-MM-DD') as starts_on,
            to_char(upper(o.during), 'YYYY-MM-DD') as ends_on,
            (upper(o.during) - lower(o.during))::text as nights,
            pay.amount_centavos::text as paid_centavos,
            pay.received_at as paid_at,
            s.state,
            (select m.storage_url from media_assets m
              where m.listing_id = l.id order by m.position limit 1) as photo,
            -- Decided here, so every client says the same thing about the
            -- same stay.
            case
              when s.state = 'CANCELLED' then 'Cancelled'
              when upper(o.during) <= current_date then 'Completed'
              when lower(o.during) <= current_date then 'Checked in'
              else 'Confirmed'
            end as state_label,
            case
              when s.state = 'CANCELLED' then 'CANCELLED'
              when upper(o.during) <= current_date then 'PAST'
              else 'ACTIVE'
            end as bucket
            from stays s
            join occupancies o on o.id = s.occupancy_id
            join rentable_resources r on r.id = o.resource_id
            join properties p on p.id = r.property_id
            join listings l
              on l.resource_id = r.id and l.kind = 'SHORT_TERM'
            left join payments pay
              on pay.occupancy_id = o.id and pay.state = 'SUCCEEDED'
           where s.user_id = ${userId}
           order by lower(o.during) desc
        `,
      );

      return rows.map<StayReceipt>((row) => ({
        stayId: row.stay_id,
        reference: row.reference,
        listingTitle: row.title,
        propertyName: row.property_name,
        areaLabel: row.area_label,
        cityLabel: row.city_label,
        startsOn: row.starts_on,
        endsOn: row.ends_on,
        nights: Number(row.nights),
        paidCentavos: Number(row.paid_centavos ?? '0'),
        paidAt: row.paid_at,
        state: row.state,
        photo: row.photo,
        stateLabel: row.state_label,
        bucket: row.bucket,
      }));
    },

    async savedListingIds(userId) {
      const rows = await withUser(userId, (tx) =>
        tx<{ listing_id: string }[]>`
          select listing_id from saved_listings
           where user_id = ${userId}
           order by saved_at desc
        `,
      );
      return rows.map((row) => row.listing_id);
    },

    async saveListing(userId, listingId) {
      await withUser(userId, (tx) =>
        tx`
          insert into saved_listings (user_id, listing_id)
          values (${userId}, ${listingId})
          on conflict do nothing
        `,
      );
    },

    async unsaveListing(userId, listingId) {
      await withUser(userId, (tx) =>
        tx`
          delete from saved_listings
           where user_id = ${userId} and listing_id = ${listingId}
        `,
      );
    },
  };
}

export { sql };
