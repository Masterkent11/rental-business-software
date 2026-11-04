import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sql, withUser } from "@/infrastructure/postgres/db.ts";
import { postgresUserRepository } from "@/infrastructure/postgres/repositories/postgres-user.repository.ts";
import { postgresPartnerOnboardingRepository } from "@/infrastructure/postgres/repositories/postgres-partner-onboarding.repository.ts";

const suite = process.env.DATABASE_URL ? describe : describe.skip;
const owner = randomUUID(),
  other = randomUUID(),
  inactive = randomUUID();
const organizations: string[] = [];

suite("partner onboarding against real PostgreSQL", { timeout: 30000 }, () => {
  const users = postgresUserRepository();
  const repository = postgresPartnerOnboardingRepository();
  beforeAll(async () => {
    for (const id of [owner, other, inactive])
      await users.createProfile({
        id,
        email: `${id}@example.test`,
        mobile: null,
      });
    await withUser(
      inactive,
      (tx) =>
        tx`update user_profiles set deactivated_at = now() where id = ${inactive}`,
    );
  });
  afterAll(async () => {
    if (process.env.TEST_ADMIN_DATABASE_URL) {
      const admin = postgres(process.env.TEST_ADMIN_DATABASE_URL, { max: 1 });
      await admin`delete from user_capabilities where user_id in (${owner}, ${other}, ${inactive})`;
      await admin`delete from organization_members where user_id in (${owner}, ${other}, ${inactive})`;
      for (const id of organizations)
        await admin`delete from organizations where id = ${id}`;
      await admin`delete from user_profiles where id in (${owner}, ${other}, ${inactive})`;
      await admin.end();
    }
    await sql.end({ timeout: 5 });
  });
  it("concurrent retries create one draft workspace and one membership", async () => {
    const results = await Promise.all(
      Array.from({ length: 4 }, () =>
        repository.createOwnerWorkspace({
          userId: owner,
          workspaceName: "Ana Homes",
        }),
      ),
    );
    const ids = new Set(results.map((r) => r.organizationId));
    expect(ids.size).toBe(1);
    const id = results[0]!.organizationId;
    organizations.push(id);
    const [organization] =
      await sql`select state, publish_delegation from organizations where id = ${id}`;
    expect(organization).toMatchObject({
      state: "DRAFT",
      publish_delegation: false,
    });
    const membership = await users.organizationsFor(owner);
    expect(membership).toHaveLength(1);
    expect(membership[0]).toMatchObject({
      organizationId: id,
      role: "OWNER",
      verified: false,
    });
    expect(
      (await users.capabilitiesFor(owner)).filter(
        (c) => c.capability === "OWNER",
      ),
    ).toEqual([{ capability: "OWNER", organizationId: id }]);
  });
  it("a different user gets no membership in the first workspace", async () => {
    const result = await repository.createOwnerWorkspace({
      userId: other,
      workspaceName: "Ben Homes",
    });
    organizations.push(result.organizationId);
    expect(result.organizationId).not.toBe(organizations[0]);
    expect(await users.isMemberOf(other, organizations[0]!)).toBe(false);
  });
  it("RLS refuses forged creator and verified/publication state during insertion", async () => {
    await expect(
      withUser(
        owner,
        (tx) =>
          tx`insert into organizations (legal_name,trading_name,onboarding_user_id) values ('Bad','Bad',${randomUUID()})`,
      ),
    ).rejects.toThrow();
    await expect(
      withUser(
        owner,
        (tx) =>
          tx`insert into organizations (legal_name,trading_name,onboarding_user_id,state) values ('Bad','Bad',${owner},'VERIFIED')`,
      ),
    ).rejects.toThrow();
    await expect(
      withUser(
        owner,
        (tx) =>
          tx`insert into organizations (legal_name,trading_name,onboarding_user_id,publish_delegation) values ('Bad','Bad',${owner},true)`,
      ),
    ).rejects.toThrow();
  });
  it("does not restore revoked owner membership on retry", async () => {
    await withUser(
      owner,
      (tx) =>
        tx`update organization_members set revoked_at = now() where user_id = ${owner}`,
    );
    await expect(
      repository.createOwnerWorkspace({
        userId: owner,
        workspaceName: "Try again",
      }),
    ).rejects.toThrow("access has changed");
    expect(await users.isMemberOf(owner, organizations[0]!)).toBe(false);
  });
  it("does not create workspaces for inactive accounts", async () => {
    await expect(
      repository.createOwnerWorkspace({
        userId: inactive,
        workspaceName: "Inactive Homes",
      }),
    ).rejects.toThrow("account is not available");
  });
});
