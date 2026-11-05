import { createDecipheriv, randomUUID } from "node:crypto";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Principal } from "@/domain/identity/identity.ts";
import { MarketingConflictError } from "@/domain/marketing/marketing.ts";
import { marketingAccess } from "@/application/marketing/marketing-access.rules.ts";
import { partnerListingGate } from "@/application/identity/partner-access.rules.ts";
import { startFacebookConnection } from "@/application/marketing/start-facebook-connection/start-facebook-connection.use-case.ts";
import { completeFacebookAuthorization } from "@/application/marketing/complete-facebook-authorization/complete-facebook-authorization.use-case.ts";
import { selectFacebookPage } from "@/application/marketing/select-facebook-page/select-facebook-page.use-case.ts";
import { withUser } from "@/infrastructure/postgres/db.ts";
import { postgresAgentRepository } from "@/infrastructure/postgres/repositories/postgres-agent.repository.ts";
import { postgresFacebookConnectionRepository } from "@/infrastructure/postgres/repositories/postgres-facebook-connection.repository.ts";
import { postgresListingRepository } from "@/infrastructure/postgres/repositories/postgres-listing.repository.ts";
import { postgresRepresentationRepository } from "@/infrastructure/postgres/repositories/postgres-representation.repository.ts";
import { postgresUserRepository } from "@/infrastructure/postgres/repositories/postgres-user.repository.ts";
import { facebookConnectionSecrets } from "@/infrastructure/social/facebook-connection-secrets.adapter.ts";
import { metaFacebookPages } from "@/infrastructure/social/meta-facebook-pages.adapter.ts";

const database = process.env.TEST_ADMIN_DATABASE_URL;
const local =
  database && ["localhost", "127.0.0.1"].includes(new URL(database).hostname);
const suite = local ? describe : describe.skip;

suite("Facebook Page connection", () => {
  const admin = postgres(database ?? "", { max: 1 });
  const users = postgresUserRepository();
  const agents = postgresAgentRepository();
  const reps = postgresRepresentationRepository();
  const access = marketingAccess(
    agents,
    postgresListingRepository(),
    reps,
    partnerListingGate(reps),
    { now: () => new Date() },
  );
  const repo = postgresFacebookConnectionRepository();
  const key = Buffer.alloc(32, 7);
  const secrets = facebookConnectionSecrets(key);
  const pageToken = "synthetic-page-token";
  const request = vi.fn<typeof fetch>(async (input) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith("/oauth/access_token")) {
      return Response.json({
        access_token: url.searchParams.has("code") ? "short" : "long",
      });
    }
    if (url.pathname.endsWith("/permissions")) {
      return Response.json({
        data: [
          "pages_show_list",
          "pages_read_engagement",
          "pages_manage_posts",
        ].map((permission) => ({ permission, status: "granted" })),
      });
    }
    return Response.json({
      data: [
        {
          id: "123",
          name: "Test Page",
          access_token: pageToken,
          tasks: ["PROFILE_PLUS_CREATE_CONTENT"],
        },
        {
          id: "456",
          name: "Other Page",
          access_token: "other-token",
          tasks: ["ANALYZE"],
        },
      ],
    });
  });
  const provider = metaFacebookPages(
    {
      appId: "1234",
      loginConfigId: "5678",
      appSecret: "synthetic-app-secret",
      apiVersion: "v25.0",
      redirectUri: "https://owner.example/agent/marketing/facebook/callback",
    },
    request,
  );
  const start = startFacebookConnection(repo, access, provider, secrets);
  const complete = completeFacebookAuthorization(
    repo,
    access,
    provider,
    secrets,
  );
  const select = selectFacebookPage(repo, access, true);
  const userA = randomUUID(),
    userB = randomUUID();
  const principal = (userId: string): Principal => ({
    userId,
    displayName: "Agent",
    organizationId: null,
    capabilities: [{ capability: "AGENT", organizationId: null }],
  });
  let agentA: string;

  beforeAll(async () => {
    for (const id of [userA, userB]) {
      await users.createProfile({
        id,
        email: id + "@example.test",
        mobile: null,
      });
      await agents.create(id, {
        displayName: "Test Agent",
        headline: "",
        bio: "",
        photoUrl: null,
        licenseNumber: null,
        licenseAuthority: null,
        specialties: [],
        areasServed: [],
        languages: [],
        publicState: "HIDDEN",
      });
    }
    agentA = (await agents.findByUser(userA))!.id;
  });

  afterAll(async () => {
    await admin.end();
  });

  async function begin() {
    const { authorizationUrl } = await start(principal(userA));
    const url = new URL(authorizationUrl);
    expect(url.origin).toBe("https://www.facebook.com");
    expect(url.searchParams.get("config_id")).toBe("5678");
    expect(url.searchParams.has("scope")).toBe(false);
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://owner.example/agent/marketing/facebook/callback",
    );
    return url.searchParams.get("state")!;
  }

  it("rejects foreign and repeated callbacks, selects only eligible Pages, encrypts the token, and disconnects", async () => {
    const state = await begin();
    await expect(
      complete(principal(userB), state, "foreign-code"),
    ).rejects.toBeInstanceOf(MarketingConflictError);
    expect(request).not.toHaveBeenCalled();
    const callbacks = await Promise.allSettled([
      complete(principal(userA), state, "valid-code"),
      complete(principal(userA), state, "replayed-code"),
    ]);
    expect(callbacks.filter((result) => result.status === "fulfilled")).toEqual(
      [{ status: "fulfilled", value: { outcome: "SELECT_PAGE" } }],
    );
    expect(request).toHaveBeenCalledTimes(4);
    const actor = { userId: userA, agentId: agentA };
    const pending = await repo.read(actor);
    expect(pending.selection?.pages).toEqual([
      { id: "123", name: "Test Page" },
    ]);
    const selectionId = pending.selection!.id;
    await expect(
      select(principal(userA), selectionId, "456"),
    ).rejects.toBeInstanceOf(MarketingConflictError);
    await expect(
      select(principal(userB), selectionId, "123"),
    ).rejects.toBeInstanceOf(MarketingConflictError);
    const selected = await select(principal(userA), selectionId, "123");
    expect(selected).toEqual({
      enabled: true,
      selection: null,
      connection: {
        id: "123",
        name: "Test Page",
        connectedAt: expect.any(String),
      },
    });
    const [stored] = await admin<{ encrypted_token: string }[]>`
      select encrypted_token from app_private.facebook_page_connections where agent_id = ${agentA}
    `;
    expect(stored!.encrypted_token).not.toContain(pageToken);
    const [version, nonce, tag, encrypted] = stored!.encrypted_token.split(".");
    expect(version).toBe("v1");
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(nonce!, "base64url"),
    );
    decipher.setAAD(Buffer.from(`facebook-page:v1:${agentA}:123`));
    decipher.setAuthTag(Buffer.from(tag!, "base64url"));
    expect(
      Buffer.concat([
        decipher.update(Buffer.from(encrypted!, "base64url")),
        decipher.final(),
      ]).toString(),
    ).toBe(pageToken);
    await expect(
      withUser(
        userB,
        (tx) =>
          tx`select * from app_private.facebook_page_connections where agent_id = ${agentA}`,
      ),
    ).resolves.toHaveLength(0);
    await repo.disconnect(actor);
    expect(await repo.read(actor)).toEqual({
      connection: null,
      selection: null,
    });
    const events = await admin<{ action: string }[]>`
      select action from app_private.facebook_page_connection_events where agent_id = ${agentA} order by occurred_at
    `;
    expect(events.map(({ action }) => action)).toEqual([
      "CONNECTED",
      "DISCONNECTED",
    ]);
  });

  it("handles cancellation and expiration without exchanging a token", async () => {
    request.mockClear();
    const cancelled = await begin();
    await expect(complete(principal(userA), cancelled, null)).resolves.toEqual({
      outcome: "CANCELLED",
    });
    await expect(
      complete(principal(userA), cancelled, "late"),
    ).rejects.toBeInstanceOf(MarketingConflictError);
    const expired = await begin();
    await admin`update app_private.facebook_page_attempts set expires_at = now() - interval '1 second' where agent_id = ${agentA}`;
    await expect(
      complete(principal(userA), expired, "expired"),
    ).rejects.toBeInstanceOf(MarketingConflictError);
    expect(request).not.toHaveBeenCalled();
  });
});
