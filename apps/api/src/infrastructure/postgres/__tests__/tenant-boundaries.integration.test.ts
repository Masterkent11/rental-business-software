import "reflect-metadata";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { AgentWorkspaceController } from "@/modules/agents/controllers/agent-workspace.controller.ts";
import { OwnerListingsController } from "@/modules/listings/controllers/owner-listings.controller.ts";
import { PartnerMonitoringController } from "@/modules/administration/controllers/partner-monitoring.controller.ts";
import { PresentationExceptionFilter } from "@/modules/shared/http-exception.filter.ts";
import * as agentTokens from "@/modules/agents/agent.tokens.ts";
import * as listingTokens from "@/modules/listings/listing.tokens.ts";
import { RESOLVE_PRINCIPAL } from "@/modules/me/me.tokens.ts";
import { MONITOR_PARTNERS } from "@/modules/administration/administration.tokens.ts";
import { resolvePrincipal } from "@/application/identity/resolve-principal/resolve-principal.use-case.ts";
import {
  listAgentTasks,
  removeAgentTask,
} from "@/application/agents/manage-agent-tasks/manage-agent-tasks.use-case.ts";
import { listOwnerListings } from "@/application/listings/list-owner-listings/list-owner-listings.use-case.ts";
import { postgresAgentTaskRepository } from "@/infrastructure/postgres/repositories/postgres-agent-task.repository.ts";
import { postgresListingRepository } from "@/infrastructure/postgres/repositories/postgres-listing.repository.ts";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { beforeAll, afterAll, beforeEach, describe, it, expect } from "vitest";
import {
  sql,
  withUser,
  withUserAndScope,
} from "@/infrastructure/postgres/db.ts";
import { assertDatabaseIsolation } from "@/infrastructure/postgres/database-isolation.provider.ts";
import { postgresUserRepository } from "@/infrastructure/postgres/repositories/postgres-user.repository.ts";
import { postgresAgentRepository } from "@/infrastructure/postgres/repositories/postgres-agent.repository.ts";
import { postgresPartnerOnboardingRepository } from "@/infrastructure/postgres/repositories/postgres-partner-onboarding.repository.ts";
import { postgresAdministrationRepository } from "@/infrastructure/postgres/repositories/postgres-administration.repository.ts";
import { authorizeAdministration } from "@/application/administration/authorize-administration/authorize-administration.use-case.ts";
import { monitorPartners } from "@/application/administration/monitor-partners/monitor-partners.use-case.ts";
import { normaliseAgentProfile } from "@/domain/agents/agent.ts";
import type { Principal } from "@/domain/identity/identity.ts";

const local = Boolean(
  process.env.TEST_ADMIN_DATABASE_URL &&
  ["127.0.0.1", "localhost"].includes(
    new URL(process.env.TEST_ADMIN_DATABASE_URL).hostname,
  ),
);
const suite = local ? describe : describe.skip;
const ownerA = randomUUID(),
  ownerB = randomUUID(),
  agentA = randomUUID(),
  agentB = randomUUID(),
  administrator = randomUUID(),
  customer = randomUUID();
const orgA = randomUUID(),
  orgB = randomUUID(),
  profileA = randomUUID(),
  profileB = randomUUID(),
  listingA = randomUUID(),
  listingB = randomUUID(),
  representation = randomUUID();
const profile = normaliseAgentProfile({
  displayName: "Synthetic partner",
  headline: "Agent",
  bio: "",
  photoUrl: null,
  licenseNumber: null,
  licenseAuthority: null,
  specialties: [],
  areasServed: [],
  languages: [],
  publicState: "HIDDEN",
});
const conversationA = randomUUID();
const audit = {
  purpose: "Synthetic tenant verification",
  requestId: "tenant-verification-1",
};
const principal: Principal = {
  userId: administrator,
  displayName: "Synthetic admin",
  organizationId: null,
  assuranceLevel: "aal2",
  capabilities: [{ capability: "PLATFORM_ADMIN", organizationId: null }],
};
const repository = postgresAdministrationRepository();
const authorize = authorizeAdministration(repository);
suite("remaining tenant boundaries with real PostgreSQL", () => {
  let admin: ReturnType<typeof postgres>;
  beforeAll(async () => {
    admin = postgres(process.env.TEST_ADMIN_DATABASE_URL!, { max: 1 });
    for (const id of [ownerA, ownerB, agentA, agentB, administrator, customer])
      await admin`insert into user_profiles(id,display_name) values(${id},'Synthetic isolation actor')`;
    for (const [id, name] of [
      [orgA, "Owner A"],
      [orgB, "Owner B"],
    ])
      await admin`insert into organizations(id,legal_name,trading_name,state) values(${id!},${name!},${name!},'VERIFIED')`;
    await admin`insert into organization_members(user_id,organization_id,role) values(${ownerA},${orgA},'OWNER'),(${ownerB},${orgB},'OWNER')`;
    await admin`insert into user_capabilities(user_id,capability,organization_id,source_type) values(${ownerA},'OWNER',${orgA},'MEMBERSHIP'),(${ownerB},'OWNER',${orgB},'MEMBERSHIP'),(${agentA},'AGENT',null,'REGISTRATION'),(${agentB},'AGENT',null,'REGISTRATION'),(${administrator},'PLATFORM_ADMIN',null,'PLATFORM')`;
    await admin`insert into agent_profiles(id,user_id,display_name) values(${profileA},${agentA},'Agent A'),(${profileB},${agentB},'Agent B')`;
    await admin.begin(async (tx) => {
      await tx`select set_config('app.verification_actor',${administrator},true)`;
      await tx`update agent_profiles set verification_state='VERIFIED',verified_at=now() where id in (${profileA},${profileB})`;
    });
    for (const [organization, listing] of [
      [orgA, listingA],
      [orgB, listingB],
    ]) {
      const propertyId = randomUUID(),
        resource = randomUUID();
      await admin`insert into properties(id,organization_id,name,area_label,city_label) values(${propertyId},${organization!},'Private property','Area','City')`;
      await admin`insert into rentable_resources(id,organization_id,property_id,root_id,label,resource_type,rental_mode) values(${resource},${organization!},${propertyId},${resource},'Unit','UNIT','LONG_TERM')`;
      await admin`insert into listings(id,organization_id,resource_id,kind,title,price_centavos) values(${listing!},${organization!},${resource},'LONG_TERM','Private draft',10000)`;
    }
    await admin`insert into listing_representations(id,organization_id,listing_id,agent_id,state,responded_at) values(${representation},${orgA},${listingA},${profileA},'ACTIVE',now())`;
    await admin`update listing_representations set can_edit_listing=true where id=${representation}`;
    await admin`insert into conversations(id,organization_id,listing_id,customer_id,agent_id) values(${conversationA},${orgA},${listingA},${customer},${profileA})`;
    await admin`insert into messages(organization_id,conversation_id,sender_id,sender_role,body,client_id) values(${orgA},${conversationA},${customer},'CUSTOMER','Synthetic private conversation',${randomUUID()})`;
    await admin`insert into agent_tasks(agent_id,title,due_at) values(${profileA},'A private task',now()),(${profileB},'B private task',now())`;
  });
  beforeEach(async () => {
    await admin`update user_profiles set deactivated_at=null where id in (${agentA},${ownerA},${administrator})`;
    await admin`update user_capabilities set revoked_at=null where user_id in (${agentA},${ownerA},${administrator})`;
    await admin`update listing_representations set valid_from=null,valid_until=null where id=${representation}`;
    await admin`delete from app_private.platform_permissions where user_id=${administrator}`;
  });
  afterAll(async () => {
    await admin?.end();
    await sql.end();
  });
  it("common tenant membership projection returns only the authenticated partner", async () => {
    const owner = await withUser(
      ownerA,
      (tx) => tx`select tenant_id,kind from app_private.partner_tenants`,
    );
    const agent = await withUser(
      agentA,
      (tx) => tx`select tenant_id,kind from app_private.partner_tenants`,
    );
    expect(owner).toEqual([{ tenant_id: orgA, kind: "OWNER" }]);
    expect(agent).toEqual([{ tenant_id: profileA, kind: "AGENT" }]);
    await admin`update organization_members set revoked_at=now() where user_id=${ownerA}`;
    expect(
      await withUser(
        ownerA,
        (tx) => tx`select * from app_private.partner_tenants`,
      ),
    ).toHaveLength(0);
    await admin`update organization_members set revoked_at=null where user_id=${ownerA}`;
  });
  it("migration preserves separately granted legacy memberships without inventing another tenant", async () => {
    const rows = await withUser(
      "00000000-0000-4000-9000-000000000701",
      (tx) => tx`select kind from app_private.partner_tenants order by kind`,
    );
    expect(rows).toEqual([{ kind: "AGENT" }, { kind: "OWNER" }]);
  });
  it("unreviewed legacy opposite role stays out of allowed workspaces", async () => {
    const id = "00000000-0000-4000-9000-000000000701";
    await admin.begin(async (tx) => {
      await tx`select set_config('app.verification_actor',${administrator},true)`;
      await tx`update agent_profiles set verification_state='UNVERIFIED' where user_id=${id}`;
    });
    expect(
      await withUser(
        id,
        (tx) => tx`select kind from app_private.partner_tenants`,
      ),
    ).toEqual([{ kind: "OWNER" }]);
    expect(
      (await postgresUserRepository().loadPrincipal(id, null)).agentAvailable,
    ).toBe(false);
  });
  it("Agent capability revocation denies raw private task reads immediately", async () => {
    expect(
      await withUser(
        agentA,
        (tx) => tx`select title from agent_tasks where agent_id=${profileA}`,
      ),
    ).toHaveLength(1);
    await admin`update user_capabilities set revoked_at=now() where user_id=${agentA}`;
    expect(
      await withUser(
        agentA,
        (tx) => tx`select title from agent_tasks where agent_id=${profileA}`,
      ),
    ).toHaveLength(0);
  });
  it("expired and future resource grants deny draft listing access in RLS", async () => {
    expect(
      await withUser(
        agentA,
        (tx) => tx`select id from listings where id=${listingA}`,
      ),
    ).toHaveLength(1);
    await admin`update listing_representations set valid_until=now() - interval '1 second' where id=${representation}`;
    expect(
      await withUser(
        agentA,
        (tx) => tx`select id from listings where id=${listingA}`,
      ),
    ).toHaveLength(0);
    await admin`update listing_representations set valid_until=null,valid_from=now()+interval '1 day' where id=${representation}`;
    expect(
      await withUser(
        agentA,
        (tx) => tx`select id from listings where id=${listingA}`,
      ),
    ).toHaveLength(0);
  });
  it("private customer identity and storage authorization expire with the resource grant", async () => {
    const storageAccess = () =>
      admin.begin(async (tx) => {
        await tx`set local role authenticated`;
        await tx`select set_config('request.jwt.claim.sub',${agentA},true)`;
        return tx`select app_private.agent_may_write_listing_media(${orgA + "/listings/" + listingA + "/photo.jpg"}) as allowed`;
      });
    const realtimeRows = () =>
      admin.begin(async (tx) => {
        await tx`set local role authenticated`;
        await tx`select set_config('request.jwt.claim.sub',${agentA},true)`;
        return tx`select body from public.messages where conversation_id=${conversationA}`;
      });
    expect(await realtimeRows()).toHaveLength(1);
    expect((await storageAccess())[0]!.allowed).toBe(true);
    expect(
      await withUser(
        agentA,
        (tx) => tx`select id from user_profiles where id=${customer}`,
      ),
    ).toHaveLength(1);
    await admin`update listing_representations set valid_until=now()-interval '1 second' where id=${representation}`;
    expect(await realtimeRows()).toHaveLength(0);
    expect((await storageAccess())[0]!.allowed).toBe(false);
    expect(
      await withUser(
        agentA,
        (tx) => tx`select id from user_profiles where id=${customer}`,
      ),
    ).toHaveLength(0);
  });
  it("Owner A cannot link a child record to Owner B listing", async () => {
    await expect(
      withUserAndScope(
        ownerA,
        orgA,
        (tx) =>
          tx`insert into conversations(organization_id,listing_id,customer_id) values(${orgA},${listingB},${customer})`,
      ),
    ).rejects.toMatchObject({ code: "23503" });
  });
  it("new Owner cannot self enroll as Agent and Agent cannot create Owner tenant", async () => {
    await expect(
      postgresAgentRepository().create(ownerA, profile),
    ).rejects.toThrow("explicit platform");
    await expect(
      postgresPartnerOnboardingRepository().createOwnerWorkspace({
        userId: agentA,
        workspaceName: "Forbidden owner",
      }),
    ).rejects.toThrow("explicit platform");
  });
  it("application identity scope cannot mint admin authority or foreign membership", async () => {
    await expect(
      withUser(
        ownerA,
        (tx) =>
          tx`insert into user_capabilities(user_id,capability,source_type) values(${ownerA},'PLATFORM_ADMIN','PLATFORM')`,
      ),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      withUser(
        ownerA,
        (tx) =>
          tx`insert into organization_members(user_id,organization_id,role) values(${ownerA},${orgB},'OWNER')`,
      ),
    ).rejects.toMatchObject({ code: "42501" });
    await admin`update user_capabilities set revoked_at=now() where user_id=${agentA}`;
    await expect(
      withUser(
        agentA,
        (tx) =>
          tx`update user_capabilities set revoked_at=null where user_id=${agentA}`,
      ),
    ).rejects.toMatchObject({ code: "42501" });
    await admin`update user_profiles set deactivated_at=now() where id=${agentA}`;
    await expect(
      withUser(
        agentA,
        (tx) =>
          tx`update user_profiles set deactivated_at=null where id=${agentA}`,
      ),
    ).rejects.toMatchObject({ code: "42501" });
    await admin`update organizations set state='DRAFT' where id=${orgA}`;
    try {
      await expect(
        withUserAndScope(
          ownerA,
          orgA,
          (tx) =>
            tx`update organizations set state='VERIFIED' where id=${orgA}`,
        ),
      ).rejects.toMatchObject({ code: "42501" });
    } finally {
      await admin`update organizations set state='VERIFIED' where id=${orgA}`;
    }
  });
  it("simultaneous first enrollment creates exactly one partner role", async () => {
    const id = randomUUID();
    await postgresUserRepository().createProfile({
      id,
      email: null,
      mobile: null,
    });
    const results = await Promise.allSettled([
      postgresAgentRepository().create(id, profile),
      postgresPartnerOnboardingRepository().createOwnerWorkspace({
        userId: id,
        workspaceName: "First partner",
      }),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    const [counts] =
      await admin`select (select count(*) from agent_profiles where user_id=${id})+(select count(*) from organization_members where user_id=${id}) as n`;
    expect(Number(counts!.n)).toBe(1);
  });
  it("Realtime eligibility rejects revoked membership and deactivated identity", async () => {
    const eligible = () =>
      admin.begin(async (tx) => {
        await tx`set local role authenticated`;
        await tx`select set_config('request.jwt.claim.sub',${ownerA},true)`;
        return tx`select app_private.is_org_member(${orgA}) as allowed`;
      });
    expect((await eligible())[0]!.allowed).toBe(true);
    await admin`update user_profiles set deactivated_at=now() where id=${ownerA}`;
    expect((await eligible())[0]!.allowed).toBe(false);
  });
  it("admin monitoring needs MFA plus its exact permission and audits denied attempts", async () => {
    await expect(
      monitorPartners(repository, authorize)(principal, audit),
    ).rejects.toThrow("permission");
    await admin`insert into app_private.platform_permissions(user_id,permission) values(${administrator},'PARTNER_MONITOR')`;
    await expect(
      monitorPartners(repository, authorize)(
        { ...principal, assuranceLevel: "aal1" },
        audit,
      ),
    ).rejects.toThrow("MFA");
    const counts = await monitorPartners(repository, authorize)(
      principal,
      audit,
    );
    expect(counts.some((c) => c.kind === "OWNER")).toBe(true);
    expect(
      counts.every(
        (c) => Object.keys(c).sort().join(",") === "kind,state,total",
      ),
    ).toBe(true);
    const events =
      await admin`select outcome from app_private.platform_audit_events where actor_user_id=${administrator}`;
    expect(events.filter((e) => e.outcome === "DENIED")).toHaveLength(2);
    await admin`update app_private.platform_permissions set revoked_at=now() where user_id=${administrator}`;
    await expect(
      monitorPartners(repository, authorize)(principal, audit),
    ).rejects.toThrow("permission");
  });
  it("partner cannot read, alter permissions or delete the admin audit journal", async () => {
    await expect(
      repository.audit(ownerA, "PARTNER_MONITOR", null, "ALLOWED", audit),
    ).rejects.toMatchObject({ code: "42501" });
    for (const query of [
      () =>
        withUser(
          ownerA,
          (tx) => tx`select * from app_private.platform_audit_events`,
        ),
      () =>
        withUser(
          ownerA,
          (tx) => tx`delete from app_private.platform_audit_events`,
        ),
      () =>
        withUser(
          ownerA,
          (tx) =>
            tx`insert into app_private.platform_permissions(user_id,permission) values(${ownerA},'PARTNER_MONITOR')`,
        ),
    ])
      await expect(query()).rejects.toMatchObject({ code: "42501" });
  });
  it("real HTTP controllers enforce Owner and Agent boundaries and administrative denial", async () => {
    const users = postgresUserRepository();
    const tasks = postgresAgentTaskRepository();
    const resolve = resolvePrincipal(
      {
        verify: async (token) =>
          (
            [ownerA, ownerB, agentA, agentB, administrator] as string[]
          ).includes(token)
            ? {
                userId: token,
                email: null,
                mobile: null,
                assuranceLevel: "aal1",
              }
            : null,
      },
      users,
    );
    const implementations = new Map<symbol, unknown>([
      [agentTokens.LIST_AGENT_TASKS, listAgentTasks(tasks)],
      [agentTokens.REMOVE_AGENT_TASK, removeAgentTask(tasks)],
      [
        listingTokens.LIST_OWNER_LISTINGS,
        listOwnerListings(postgresListingRepository()),
      ],
      [RESOLVE_PRINCIPAL, resolve],
      [MONITOR_PARTNERS, monitorPartners(repository, authorize)],
    ]);
    const tokens = [
      ...Object.values(agentTokens),
      ...Object.values(listingTokens),
      RESOLVE_PRINCIPAL,
      MONITOR_PARTNERS,
    ];
    @Module({
      controllers: [
        AgentWorkspaceController,
        OwnerListingsController,
        PartnerMonitoringController,
      ],
      providers: tokens.map((token) => ({
        provide: token,
        useValue:
          implementations.get(token) ??
          (() => {
            throw new Error("Unused test endpoint");
          }),
      })),
    })
    class BoundaryHttpModule {}
    const app = await NestFactory.create<NestFastifyApplication>(
      BoundaryHttpModule,
      new FastifyAdapter(),
      { logger: false },
    );
    app.useGlobalFilters(new PresentationExceptionFilter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    const server = app.getHttpAdapter().getInstance();
    try {
      const request = (url: string, actor?: string) =>
        server.inject({
          method: "GET",
          url,
          headers: actor ? { authorization: "Bearer " + actor } : {},
        });
      expect((await request("/agent/tasks")).statusCode).toBe(401);
      expect((await request("/agent/tasks", ownerA)).statusCode).toBe(403);
      const mine = await request("/agent/tasks?agentId=" + profileB, agentA);
      expect(mine.statusCode).toBe(200);
      expect(mine.body).toContain("A private task");
      expect(mine.body).not.toContain("B private task");
      expect(
        (await request("/organizations/" + orgA + "/listings", ownerA))
          .statusCode,
      ).toBe(200);
      expect(
        (await request("/organizations/" + orgB + "/listings", ownerA))
          .statusCode,
      ).toBe(403);
      expect(
        (await request("/organizations/" + orgA + "/listings", agentA))
          .statusCode,
      ).toBe(403);
      expect(
        (await request("/admin/partners/summary", ownerA)).statusCode,
      ).toBe(403);
      const adminDenied = await server.inject({
        method: "GET",
        url: "/admin/partners/summary",
        headers: {
          authorization: "Bearer " + administrator,
          "x-admin-purpose": "Synthetic monitor request",
        },
      });
      expect(adminDenied.statusCode).toBe(403);
      await admin`update user_capabilities set revoked_at=now() where user_id=${agentA}`;
      expect((await request("/agent/tasks", agentA)).statusCode).toBe(403);
    } finally {
      await app.close();
    }
  });
  it("startup rejects privileged connections and accepts the application role", async () => {
    await expect(assertDatabaseIsolation(admin)).rejects.toThrow("bypass RLS");
    await expect(assertDatabaseIsolation(sql)).resolves.toBeUndefined();
  });
});
