import type postgres from 'postgres';
import type {
  AgentRepository,
  AgentSearchQuery,
} from '@/application/ports/repositories/agent-repository.port.ts';
import type {
  AgentProfile,
  AgentProfileInput,
  AgentPublicState,
  AgentVerificationState,
} from '@/domain/agents/agent.ts';
import { AgentProfileExistsError } from '@/domain/agents/agent.ts';
import { withScope, withUser } from '@/infrastructure/postgres/db.ts';

interface AgentRow {
  id: string;
  user_id: string;
  display_name: string;
  headline: string;
  bio: string;
  photo_url: string | null;
  license_number: string | null;
  license_authority: string | null;
  verification_state: string;
  verified_at: Date | null;
  specialties: string[] | null;
  areas_served: string[] | null;
  languages: string[] | null;
  public_state: string;
  created_at: Date;
  updated_at: Date;
}

const COLUMNS = (tx: postgres.TransactionSql) => tx`
  id, user_id, display_name, headline, bio, photo_url, license_number, license_authority,
  verification_state, verified_at, specialties, areas_served, languages, public_state,
  created_at, updated_at
`;

const toAgent = (row: AgentRow): AgentProfile => ({
  id: row.id,
  userId: row.user_id,
  displayName: row.display_name,
  headline: row.headline,
  bio: row.bio,
  photoUrl: row.photo_url,
  licenseNumber: row.license_number,
  licenseAuthority: row.license_authority,
  verificationState: row.verification_state as AgentVerificationState,
  verifiedAt: row.verified_at,
  specialties: row.specialties ?? [],
  areasServed: row.areas_served ?? [],
  languages: row.languages ?? [],
  publicState: row.public_state as AgentPublicState,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const UNIQUE_VIOLATION = '23505';

const textArray = (tx: postgres.TransactionSql, values: readonly string[]) => tx.array([...values]);

export const postgresAgentRepository = (): AgentRepository => ({
  async findByUser(userId: string) {
    return withUser(userId, async (tx) => {
      const [row] = await tx<AgentRow[]>`select ${COLUMNS(tx)} from agent_profiles where user_id = ${userId}`;
      return row ? toAgent(row) : null;
    });
  },

  async findPublic(agentId: string) {
    return withScope(null, async (tx) => {
      const [row] = await tx<AgentRow[]>`
        select ${COLUMNS(tx)} from agent_profiles where id = ${agentId} and public_state = 'PUBLIC'
      `;
      return row ? toAgent(row) : null;
    });
  },

  async findAssigned(customerId: string, agentId: string) {
    return withUser(customerId, async (tx) => {
      const [row] = await tx<AgentRow[]>`select ${COLUMNS(tx)} from agent_profiles where id = ${agentId}`;
      return row ? toAgent(row) : null;
    });
  },

  async searchPublic(query: AgentSearchQuery) {
    return withScope(null, async (tx) => {
      const text = query.text ? `%${query.text}%` : null;
      const area = query.area ? query.area.toLowerCase() : null;
      const rows = await tx<AgentRow[]>`
        select ${COLUMNS(tx)} from agent_profiles
         where public_state = 'PUBLIC'
           ${text ? tx`and (display_name ilike ${text} or headline ilike ${text})` : tx``}
           ${area ? tx`and exists (select 1 from unnest(areas_served) s where lower(s) = ${area})` : tx``}
         order by (verification_state = 'VERIFIED') desc, display_name
         limit ${query.limit}
      `;
      return rows.map(toAgent);
    });
  },

  async create(userId: string, input: AgentProfileInput) {
    return withUser(userId, async (tx) => {
      try {
        const [row] = await tx<AgentRow[]>`
          insert into agent_profiles (
            user_id, display_name, headline, bio, photo_url, license_number, license_authority,
            specialties, areas_served, languages, public_state
          ) values (
            ${userId}, ${input.displayName}, ${input.headline}, ${input.bio}, ${input.photoUrl},
            ${input.licenseNumber}, ${input.licenseAuthority},
            ${textArray(tx, input.specialties)}, ${textArray(tx, input.areasServed)},
            ${textArray(tx, input.languages)}, ${input.publicState}
          )
          returning ${COLUMNS(tx)}
        `;
        await tx`
          insert into user_capabilities (user_id, capability, source_type, source_id)
          values (${userId}, 'AGENT', 'REGISTRATION', ${row!.id})
          on conflict do nothing
        `;
        return toAgent(row!);
      } catch (error) {
        if ((error as { code?: string }).code === UNIQUE_VIOLATION) {
          throw new AgentProfileExistsError('You already have an agent profile');
        }
        throw error;
      }
    });
  },

  async update(userId: string, input: AgentProfileInput) {
    return withUser(userId, async (tx) => {
      const [row] = await tx<AgentRow[]>`
        update agent_profiles set
          display_name = ${input.displayName},
          headline = ${input.headline},
          bio = ${input.bio},
          photo_url = ${input.photoUrl},
          license_number = ${input.licenseNumber},
          license_authority = ${input.licenseAuthority},
          specialties = ${textArray(tx, input.specialties)},
          areas_served = ${textArray(tx, input.areasServed)},
          languages = ${textArray(tx, input.languages)},
          public_state = ${input.publicState},
          updated_at = now()
        where user_id = ${userId}
        returning ${COLUMNS(tx)}
      `;
      return toAgent(row!);
    });
  },

  async requestVerification(userId: string) {
    return withUser(userId, async (tx) => {
      const [row] = await tx<AgentRow[]>`
        update agent_profiles set verification_state = 'PENDING', updated_at = now()
         where user_id = ${userId} and verification_state in ('UNVERIFIED', 'REJECTED')
        returning ${COLUMNS(tx)}
      `;
      return toAgent(row!);
    });
  },

  async pendingVerification(adminUserId: string) {
    return withUser(adminUserId, async (tx) => {
      const rows = await tx<AgentRow[]>`
        select ${COLUMNS(tx)} from agent_profiles
         where verification_state = 'PENDING'
         order by updated_at asc
         limit 100
      `;
      return rows.map(toAgent);
    });
  },

  async findForAdmin(adminUserId: string, agentId: string) {
    return withUser(adminUserId, async (tx) => {
      const [row] = await tx<AgentRow[]>`select ${COLUMNS(tx)} from agent_profiles where id = ${agentId}`;
      return row ? toAgent(row) : null;
    });
  },

  async decideVerification(input) {
    return withUser(input.adminUserId, async (tx) => {
      await tx`select set_config('app.verification_actor', ${input.adminUserId}, true)`;
      const [row] = await tx<AgentRow[]>`
        update agent_profiles set
          verification_state = ${input.next},
          verified_at = case when ${input.next} = 'VERIFIED' then now() else verified_at end,
          verified_by = case when ${input.next} = 'VERIFIED' then ${input.adminUserId}::uuid else verified_by end,
          verification_note = ${input.note},
          updated_at = now()
        where id = ${input.agentId} and verification_state = ${input.current}
        returning ${COLUMNS(tx)}
      `;
      return row ? toAgent(row) : null;
    });
  },

  async responseSamples(agentId: string, since: Date) {
    return withScope(null, async (tx) => {
      const rows = await tx<{ created_at: Date; first_response_at: Date | null }[]>`
        select created_at, first_response_at from app_private.agent_response_samples(${agentId}, ${since})
      `;
      return rows.map((row) => ({ createdAt: row.created_at, firstResponseAt: row.first_response_at }));
    });
  },

  async activeListingCount(agentId: string) {
    return withScope(null, async (tx) => {
      const [row] = await tx<{ n: number }[]>`
        select count(*)::int as n from listing_representations r
          join listings l on l.id = r.listing_id
         where r.agent_id = ${agentId} and r.state = 'ACTIVE' and l.state = 'PUBLISHED'
      `;
      return row?.n ?? 0;
    });
  },

  async publishedListingIds(agentId: string) {
    return withScope(null, async (tx) => {
      const rows = await tx<{ id: string }[]>`
        select l.id from listing_representations r
          join listings l on l.id = r.listing_id
         where r.agent_id = ${agentId} and r.state = 'ACTIVE' and l.state = 'PUBLISHED'
         order by l.published_at desc nulls last
         limit 50
      `;
      return rows.map((row) => row.id);
    });
  },
});
