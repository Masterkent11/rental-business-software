import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { postgresUserRepository } from '../user-repository.pg.ts';
import { sql, withUser } from '../db.ts';

/**
 * Identity against real PostgreSQL.
 *
 * Skipped without DATABASE_URL so the unit suite runs anywhere, never faked.
 * The isolation assertions here are the ones that matter: RLS on the identity
 * tables is user-scoped, not organization-scoped, and only a real database can
 * show whether that actually holds.
 */
// Remote databases are not local ones: a handful of sequential round trips to
// another region legitimately exceeds the 5s default. The timeout describes the
// network, not a tolerance for slow code.
const live = Boolean(process.env.DATABASE_URL);
const suite = live ? describe : describe.skip;

/**
 * Fresh identities per run.
 *
 * The alternative — fixed ids wiped in `beforeAll` — would need DELETE on the
 * identity tables, and the application role has no business holding it: nothing
 * in Sprint 2 deletes a user. Test convenience is a bad reason to widen a
 * production grant, so the tests work within the role instead.
 */
const ANA = randomUUID();
const BEN = randomUUID();
const ORG_SANTOS = '11111111-1111-1111-1111-111111111111';
const ORG_VILLA = '33333333-3333-3333-3333-333333333333';

suite('identity against real PostgreSQL', { timeout: 30_000 }, () => {
  const users = postgresUserRepository();
  let publishedListingId: string;

  beforeAll(async () => {
    const rows = await sql<{ id: string }[]>`
      select id from listings where state = 'PUBLISHED' order by price_centavos limit 1
    `;
    publishedListingId = rows[0]!.id;
  });

  afterAll(async () => {
    // Best-effort tidy-up through an admin connection when one is configured.
    // Without it the run leaves two profile rows behind, which is preferable to
    // granting the application a DELETE it never needs.
    const adminUrl = process.env.TEST_ADMIN_DATABASE_URL;
    if (adminUrl) {
      const admin = postgres(adminUrl, { max: 1 });
      try {
        await admin`delete from saved_listings where user_id in (${ANA}, ${BEN})`;
        await admin`delete from user_capabilities where user_id in (${ANA}, ${BEN})`;
        await admin`delete from organization_members where user_id in (${ANA}, ${BEN})`;
        await admin`delete from user_profiles where id in (${ANA}, ${BEN})`;
      } finally {
        await admin.end({ timeout: 5 });
      }
    }
    await sql.end({ timeout: 5 });
  });

  it('creates a profile and the CUSTOMER capability together', async () => {
    // D-15 starts here: registration is what makes CUSTOMER true, and the row
    // records that reason rather than being a bare badge.
    const profile = await users.createProfile({
      id: ANA,
      email: 'ana@example.test',
      mobile: null,
    });

    expect(profile.id).toBe(ANA);
    expect(await users.capabilitiesFor(ANA)).toEqual([
      { capability: 'CUSTOMER', organizationId: null },
    ]);
  });

  it('is idempotent when two first requests race', async () => {
    // Two requests arriving together for a brand-new user is ordinary.
    await Promise.all([
      users.createProfile({ id: BEN, email: 'ben@example.test', mobile: null }),
      users.createProfile({ id: BEN, email: 'ben@example.test', mobile: null }),
    ]);

    expect(await users.capabilitiesFor(BEN)).toHaveLength(1);
  });

  it('omits a revoked capability', async () => {
    await withUser(ANA, (tx) => tx`
      insert into user_capabilities (user_id, capability, organization_id, source_type, revoked_at)
      values (${ANA}, 'STAFF', ${ORG_SANTOS}, 'MEMBERSHIP', now())
    `);

    const held = await users.capabilitiesFor(ANA);
    expect(held.some((c) => c.capability === 'STAFF')).toBe(false);
  });

  it('reports membership only while it is live', async () => {
    const adminUrl = process.env.TEST_ADMIN_DATABASE_URL;
    if (!adminUrl) return; // needs write access the application role lacks
    const admin = postgres(adminUrl, { max: 1 });
    await admin`
      insert into organization_members (user_id, organization_id, role)
      values (${ANA}, ${ORG_SANTOS}, 'STAFF')
      on conflict do nothing
    `;
    expect(await users.isMemberOf(ANA, ORG_SANTOS)).toBe(true);
    // A different organization is not implied by membership in this one.
    expect(await users.isMemberOf(ANA, ORG_VILLA)).toBe(false);

    await admin`
      update organization_members set revoked_at = now()
       where user_id = ${ANA} and organization_id = ${ORG_SANTOS}
    `;
    // Dismissal takes effect on the next request, not at token expiry.
    expect(await users.isMemberOf(ANA, ORG_SANTOS)).toBe(false);
    await admin.end({ timeout: 5 });
  });

  it('saves and unsaves a listing', async () => {
    await users.saveListing(ANA, publishedListingId);
    expect(await users.savedListingIds(ANA)).toContain(publishedListingId);

    // Saving twice is not an error — the button is idempotent.
    await users.saveListing(ANA, publishedListingId);
    expect(await users.savedListingIds(ANA)).toHaveLength(1);

    await users.unsaveListing(ANA, publishedListingId);
    expect(await users.savedListingIds(ANA)).toEqual([]);
  });

  it('keeps one user\'s saved listings invisible to another', async () => {
    // The demo for Sprint 2 is "sign in on one device, see your saved listings
    // on another" — which is only safe if they are *yours*.
    await users.saveListing(ANA, publishedListingId);

    expect(await users.savedListingIds(ANA)).toContain(publishedListingId);
    expect(await users.savedListingIds(BEN)).toEqual([]);

    // And directly at the database, with Ben's scope set: RLS, not a WHERE
    // clause the application could forget.
    const leaked = await withUser(BEN, (tx) =>
      tx<{ n: string }[]>`select count(*)::text as n from saved_listings`,
    );
    expect(Number(leaked[0]!.n)).toBe(0);
  });

  it('keeps one user\'s profile invisible to another', async () => {
    const leaked = await withUser(BEN, (tx) =>
      tx<{ n: string }[]>`
        select count(*)::text as n from user_profiles where id = ${ANA}
      `,
    );
    expect(Number(leaked[0]!.n)).toBe(0);
  });
});
