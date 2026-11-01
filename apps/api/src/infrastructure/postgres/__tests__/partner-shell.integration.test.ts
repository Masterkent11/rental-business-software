import "reflect-metadata";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import sharp from "sharp";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { PartnerShellController } from "@/modules/partners/controllers/partner-shell.controller.ts";
import { partnerShellActions } from "@/modules/partners/partner-shell.module.ts";
import { PARTNER_SHELL } from "@/modules/partners/partner-shell.tokens.ts";
import { RESOLVE_PRINCIPAL } from "@/modules/me/me.tokens.ts";
import { resolvePrincipal } from "@/application/identity/resolve-principal/resolve-principal.use-case.ts";
import { postgresUserRepository } from "@/infrastructure/postgres/repositories/postgres-user.repository.ts";
import { PresentationExceptionFilter } from "@/modules/shared/http-exception.filter.ts";
import { sql, withUserAndScope } from "@/infrastructure/postgres/db.ts";
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
  staff = randomUUID(),
  customer = randomUUID(),
  orgA = randomUUID(),
  orgB = randomUUID(),
  profileA = randomUUID(),
  profileB = randomUUID();
const resolve = resolvePrincipal(
  {
    verify: async (token) =>
      new Set<string>([ownerA, ownerB, agentA, agentB, staff]).has(token)
        ? { userId: token, email: null, mobile: null }
        : null,
  },
  postgresUserRepository(),
);
@Module({
  controllers: [PartnerShellController],
  providers: [
    { provide: PARTNER_SHELL, useFactory: partnerShellActions },
    { provide: RESOLVE_PRINCIPAL, useValue: resolve },
  ],
})
class Harness {}
suite(
  "Partner header actual HTTP and PostgreSQL isolation",
  { timeout: 30000 },
  () => {
    let admin: ReturnType<typeof postgres>,
      app: NestFastifyApplication,
      logo: string,
      listingA: string;
    const headers = (actor: string, org?: string) => ({
      authorization: "Bearer " + actor,
      ...(org ? { "x-organization-id": org } : {}),
    });
    const request = (actor: string, url: string, org?: string) =>
      app.inject({ method: "GET", url, headers: headers(actor, org) });
    beforeAll(async () => {
      admin = postgres(process.env.TEST_ADMIN_DATABASE_URL!, { max: 1 });
      for (const id of [ownerA, ownerB, agentA, agentB, staff, customer])
        await admin`insert into user_profiles(id,display_name) values(${id},'Cebu client')`;
      for (const id of [orgA, orgB])
        await admin`insert into organizations(id,legal_name,trading_name,state) values(${id},'Partner','Partner','VERIFIED')`;
      await admin`insert into organization_members(user_id,organization_id,role) values(${ownerA},${orgA},'OWNER'),(${ownerB},${orgB},'OWNER'),(${staff},${orgA},'STAFF')`;
      await admin`insert into user_capabilities(user_id,capability,organization_id,source_type) values(${ownerA},'OWNER',${orgA},'MEMBERSHIP'),(${ownerB},'OWNER',${orgB},'MEMBERSHIP'),(${staff},'STAFF',${orgA},'MEMBERSHIP'),(${agentA},'AGENT',null,'REGISTRATION'),(${agentB},'AGENT',null,'REGISTRATION')`;
      await admin`insert into agent_profiles(id,user_id,display_name) values(${profileA},${agentA},'Agent A'),(${profileB},${agentB},'Agent B')`;
      await admin.begin(async (tx) => {
        await tx`select set_config('app.verification_actor',${ownerA},true)`;
        await tx`update agent_profiles set verification_state='VERIFIED',verified_at=now() where id in (${profileA},${profileB})`;
      });
      for (const [organization, title] of [
        [orgA, "Cébu villa"],
        [orgA, "Cebu villa garden"],
        [orgA, "Garden Cebu villa"],
        [orgB, "Cebu secret villa"],
      ]) {
        const property = randomUUID(),
          resource = randomUUID(),
          listing = randomUUID();
        if (!listingA) listingA = listing;
        await admin`insert into properties(id,organization_id,name,area_label,city_label) values(${property},${organization!},'Property','Talamban','Cebu')`;
        await admin`insert into rentable_resources(id,organization_id,property_id,root_id,label,resource_type,rental_mode) values(${resource},${organization!},${property},${resource},'Unit','UNIT','LONG_TERM')`;
        await admin`insert into listings(id,organization_id,resource_id,kind,title,price_centavos) values(${listing},${organization!},${resource},'LONG_TERM',${title!},10000)`;
      }
      await admin`insert into listing_representations(organization_id,listing_id,agent_id,state,responded_at) values(${orgA},${listingA},${profileA},'ACTIVE',now())`;
      const conversation = randomUUID();
      await admin`insert into conversations(id,organization_id,listing_id,customer_id,agent_id) values(${conversation},${orgA},${listingA},${customer},${profileA})`;
      await admin`insert into inquiries(organization_id,listing_id,customer_id,agent_id,conversation_id,message,client_ref) values(${orgA},${listingA},${customer},${profileA},${conversation},'Cebu viewing',${randomUUID()})`;
      await admin`insert into agent_tasks(agent_id,title,due_at) values(${profileA},'Cebu callback',now()),(${profileB},'Cebu secret task',now())`;
      logo = (
        await sharp({
          create: { width: 32, height: 32, channels: 4, background: "#123456" },
        })
          .png()
          .toBuffer()
      ).toString("base64");
      app = await NestFactory.create<NestFastifyApplication>(
        Harness,
        new FastifyAdapter(),
        { logger: false },
      );
      app.useGlobalFilters(new PresentationExceptionFilter());
      await app.init();
      await app.getHttpAdapter().getInstance().ready();
    });
    afterAll(async () => {
      await app?.close();
      await admin?.end();
      await sql.end();
    });
    it("ranks accent insensitive exact and prefix titles before infix without another Owner results", async () => {
      const response = await request(
        ownerA,
        "/partner/search?q=cebu%20villa",
        orgA,
      );
      expect(response.statusCode).toBe(200);
      expect(
        response
          .json()
          .items.filter((r: { kind: string }) => r.kind === "PROPERTY")
          .map((r: { title: string }) => r.title),
      ).toEqual(["Cébu villa", "Cebu villa garden", "Garden Cebu villa"]);
      expect(response.headers["cache-control"]).toBe("private, no-store");
    });
    it("Agent sees only current represented properties and their clients, inquiries and tasks", async () => {
      const response = await request(agentA, "/partner/search?q=cebu");
      expect(response.statusCode).toBe(200);
      const items = response.json().items;
      expect(new Set(items.map((i: { kind: string }) => i.kind))).toEqual(
        new Set(["PROPERTY", "INQUIRY", "CLIENT", "TASK"]),
      );
      expect(
        items.some((i: { title: string }) => i.title.includes("secret")),
      ).toBe(false);
      const other = await request(agentB, "/partner/search?q=cebu");
      expect(other.json().items.map((i: { title: string }) => i.title)).toEqual(
        ["Cebu secret task"],
      );
    });
    it("rejects forged contexts, missing auth, invalid identifiers and invalid query lengths", async () => {
      expect(
        (await request(ownerA, "/partner/search?q=cebu", orgB)).statusCode,
      ).toBe(403);
      expect((await request(ownerA, "/partner/search?q=cebu")).statusCode).toBe(
        403,
      );
      expect(
        (await request(agentA, "/partner/search?q=cebu", orgA)).statusCode,
      ).toBe(403);
      expect(
        (await app.inject({ method: "GET", url: "/partner/search?q=cebu" }))
          .statusCode,
      ).toBe(401);
      expect(
        (await request(ownerA, "/partner/search?q=cebu", "invalid")).statusCode,
      ).toBe(400);
      expect(
        (await request(agentA, "/partner/search?q=" + "x".repeat(81)))
          .statusCode,
      ).toBe(400);
    });
    it("escapes wildcard input and treats SQL text as data", async () => {
      expect(
        (await request(ownerA, "/partner/search?q=%25%25", orgA)).json().items,
      ).toEqual([]);
      expect(
        (
          await request(ownerA, "/partner/search?q=%27%20OR%201%3D1", orgA)
        ).json().items,
      ).toEqual([]);
    });
    it("persists logos only for the correct Owner or Agent and staff has read only access", async () => {
      for (const [actor, org] of [
        [ownerA, orgA],
        [agentA, undefined],
      ] as const) {
        const uploaded = await app.inject({
          method: "PUT",
          url: "/partner/branding",
          headers: headers(actor, org),
          payload: { data: logo, contentType: "image/png" },
        });
        expect(uploaded.statusCode).toBe(200);
        expect(uploaded.json().logo.startsWith("data:image/webp;base64,")).toBe(
          true,
        );
        expect(
          (await request(actor, "/partner/branding", org)).json().logo,
        ).toBe(uploaded.json().logo);
      }
      expect(
        (await request(ownerB, "/partner/branding", orgB)).json().logo,
      ).toBe(null);
      expect((await request(agentB, "/partner/branding")).json().logo).toBe(
        null,
      );
      expect(
        (await request(staff, "/partner/branding", orgA)).json().canEdit,
      ).toBe(false);
      expect(
        (
          await app.inject({
            method: "PUT",
            url: "/partner/branding",
            headers: headers(staff, orgA),
            payload: { data: logo, contentType: "image/png" },
          })
        ).statusCode,
      ).toBe(403);
      expect(
        await withUserAndScope(
          ownerA,
          orgA,
          (tx) =>
            tx`select id from app_private.partner_branding where agent_id=${profileA}`,
        ),
      ).toHaveLength(0);
    });
    it("removes own logo and rejects damaged or script files", async () => {
      expect(
        (
          await app.inject({
            method: "PUT",
            url: "/partner/branding",
            headers: headers(agentA),
            payload: {
              data: Buffer.from("<svg/>").toString("base64"),
              contentType: "image/png",
            },
          })
        ).statusCode,
      ).toBe(400);
      expect(
        (
          await app.inject({
            method: "DELETE",
            url: "/partner/branding",
            headers: headers(agentA),
          })
        ).statusCode,
      ).toBe(200);
      expect((await request(agentA, "/partner/branding")).json().logo).toBe(
        null,
      );
    });
    it("raw RLS refuses foreign context reads and staff writes", async () => {
      expect(
        await withUserAndScope(
          ownerB,
          orgA,
          (tx) =>
            tx`select id from app_private.partner_branding where organization_id=${orgA}`,
        ),
      ).toHaveLength(0);
      expect(
        await withUserAndScope(
          staff,
          orgA,
          (tx) =>
            tx`update app_private.partner_branding set updated_at=now() where organization_id=${orgA} returning id`,
        ),
      ).toHaveLength(0);
      await expect(
        withUserAndScope(
          agentB,
          null,
          (tx) =>
            tx`insert into app_private.partner_branding(agent_id,logo) values(${profileA},${"data:image/webp;base64,AAAA"})`,
        ),
      ).rejects.toMatchObject({ code: "42501" });
    });
    it("missing branding migration is explicit and search remains independent of branding table", async () => {
      await admin`alter table app_private.partner_branding rename to partner_branding_test_hidden`;
      try {
        const response = await request(ownerA, "/partner/branding", orgA);
        expect(response.statusCode).toBe(503);
        expect(response.json().code).toBe("PARTNER_UNAVAILABLE");
        expect(
          (await request(ownerA, "/partner/search?q=cebu", orgA)).statusCode,
        ).toBe(200);
      } finally {
        await admin`alter table app_private.partner_branding_test_hidden rename to partner_branding`;
      }
    });
    it("revoked membership or Agent suspension immediately denies search and branding", async () => {
      await admin`update organization_members set revoked_at=now() where user_id=${ownerA}`;
      expect(
        (await request(ownerA, "/partner/search?q=cebu", orgA)).statusCode,
      ).toBe(403);
      expect(
        (await request(ownerA, "/partner/branding", orgA)).statusCode,
      ).toBe(403);
      await admin.begin(async (tx) => {
        await tx`select set_config('app.verification_actor',${ownerB},true)`;
        await tx`update agent_profiles set verification_state='SUSPENDED' where id=${profileA}`;
      });
      expect((await request(agentA, "/partner/search?q=cebu")).statusCode).toBe(
        403,
      );
      expect((await request(agentA, "/partner/branding")).statusCode).toBe(403);
    });
  },
);
