import { createRequire } from "node:module";
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";

const root = path.resolve(import.meta.dirname, "../..");
const require = createRequire(import.meta.url);
const { chromium } = require(
  process.env.PLAYWRIGHT_PACKAGE ??
    path.join(root, "../../tools/node_modules/playwright"),
);
const config = await readFile(path.join(root, ".env.local"), "utf8");
const setting = (name) =>
  config.match(new RegExp(`^${name}=(.+)$`, "m"))?.[1].trim();
const authHost = new URL(setting("NEXT_PUBLIC_SUPABASE_URL")).hostname;
const apiOrigin = new URL(setting("NEXT_PUBLIC_API_BASE_URL")).origin;
const base = process.env.OWNER_QA_BASE_URL ?? "http://localhost:3202";
const output =
  process.env.AUTH_SCREENSHOTS ??
  path.join(
    root,
    "../../docs/agile/epics/owner-web-auth/verification/screenshots",
  );
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const errors = [];
const org = "91000000-0000-4000-8000-000000000001";
const user = {
  id: "91000000-0000-4000-8000-000000000002",
  aud: "authenticated",
  role: "authenticated",
  email: "ana@example.test",
  user_metadata: { full_name: "Ana Santos" },
  app_metadata: { provider: "email", providers: ["email"] },
  created_at: "2026-11-01T00:00:00Z",
};
const fixtureToken = [
  Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url"),
  Buffer.from(
    JSON.stringify({
      sub: user.id,
      exp: Math.floor(Date.now() / 1000) + 7200,
      role: "authenticated",
    }),
  ).toString("base64url"),
  "synthetic-test-signature",
].join(".");
const session = () => ({
  access_token: fixtureToken,
  refresh_token: "synthetic-refresh-token",
  token_type: "bearer",
  expires_in: 7200,
  expires_at: Math.floor(Date.now() / 1000) + 7200,
  user,
});
async function context(options = {}) {
  const state = {
    role: "OWNER",
    complete: false,
    confirmation: false,
    google: true,
    signupCalls: 0,
    setupCalls: 0,
    resetCalls: 0,
    callbackCalls: 0,
    passwordUpdates: 0,
    ...options,
  };
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });
  await ctx.route("**/*", async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    if (url.hostname === authHost) {
      if (url.pathname.endsWith("/settings"))
        return route.fulfill({ json: { external: { google: state.google } } });
      if (url.pathname.endsWith("/authorize"))
        return route.fulfill({
          status: 302,
          headers: {
            location: `${url.searchParams.get("redirect_to")}&code=fixture-code`,
          },
        });
      if (url.pathname.endsWith("/signup")) {
        state.signupCalls++;
        const body = request.postDataJSON();
        assert.equal(body.data.full_name, "Ana Santos");
        assert.equal(body.data.role, undefined);
        return route.fulfill({
          json: state.confirmation ? { user } : session(),
        });
      }
      if (url.pathname.endsWith("/token")) {
        const body = request.postDataJSON();
        if (url.searchParams.get("grant_type") === "pkce") {
          assert.equal(body.auth_code, "fixture-code");
          assert.ok(body.code_verifier);
          state.callbackCalls++;
        }
        if (body.password === "incorrect-password")
          return route.fulfill({
            status: 400,
            json: {
              code: "invalid_credentials",
              error_description: "Invalid login credentials",
              msg: "Invalid login credentials",
            },
          });
        return route.fulfill({ json: session() });
      }
      if (url.pathname.endsWith("/logout"))
        return route.fulfill({ status: 204 });
      if (url.pathname.endsWith("/recover")) {
        state.resetCalls++;
        return route.fulfill({ json: {} });
      }
      if (url.pathname.endsWith("/user")) {
        if (request.method() === "PUT") {
          assert.equal(
            request.postDataJSON().password,
            "updated-synthetic-password",
          );
          state.passwordUpdates++;
        }
        return route.fulfill({ json: user });
      }
      if (url.pathname.endsWith("/verify"))
        return route.fulfill({ json: session() });
      return route.fulfill({ json: {} });
    }
    if (url.origin !== apiOrigin) return route.continue();
    const headers = {
      "access-control-allow-origin": new URL(base).origin,
      "access-control-allow-headers":
        "authorization,content-type,x-organization-id",
      "access-control-allow-methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
    };
    if (
      state.onApi &&
      (await state.onApi({ route, request, url, headers, state }))
    )
      return;
    if (request.method() === "OPTIONS")
      return route.fulfill({ status: 204, headers });
    if (url.pathname === "/me")
      return route.fulfill({
        headers,
        json: {
          id: user.id,
          displayName: "Ana Santos",
          email: user.email,
          organizations:
            state.complete && (state.role === "OWNER" || state.dual)
              ? [{ id: org, name: "Ana Homes", role: "OWNER", verified: Boolean(state.verified) }]
              : [],
          capabilities: state.complete ? [
            ...(state.role === "OWNER" || state.dual ? [{ capability: "OWNER", organizationId: org }] : []),
            ...(state.role === "AGENT" ? [{ capability: "AGENT", organizationId: null }] : []),
          ] : [],
          agentProfile:
            state.complete && state.role === "AGENT"
              ? {
                  id: "agent-ana",
                  displayName: "Ana Santos",
                  headline: "Real estate agent",
                  photoUrl: null,
                  verificationState: state.verified ? "VERIFIED" : "UNVERIFIED",
                }
              : null,
        },
      });
    if (url.pathname === "/me/owner-workspace") {
      state.setupCalls++;
      assert.deepEqual(Object.keys(request.postDataJSON()), ["workspaceName"]);
      assert.ok(request.headers().authorization.startsWith("Bearer "));
      state.complete = true;
      return route.fulfill({ headers, json: { organizationId: org } });
    }
    if (url.pathname === "/agent/profile") {
      if (request.method() === "POST") {
        state.setupCalls++;
        const body = request.postDataJSON();
        assert.equal(body.publicState, "HIDDEN");
        assert.equal(body.licenseNumber, null);
        state.complete = true;
        return route.fulfill({
          headers,
          json: { id: "agent-ana", displayName: "Ana Santos" },
        });
      }
      return route.fulfill({
        status: state.complete ? 200 : 404,
        headers,
        json: state.complete
          ? { id: "agent-ana", displayName: "Ana Santos" }
          : { message: "No profile yet" },
      });
    }
    if (url.pathname.startsWith("/content/"))
      return route.fulfill({
        headers,
        json: {
          title: url.pathname.endsWith("/privacy")
            ? "Privacy Policy"
            : "Terms of Service",
          body: "## Your information\n\nThis content comes from the existing content endpoint.",
          status: "DRAFT",
        },
      });
    return route.fulfill({ headers, json: { items: [] } });
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  return { ctx, page, state };
}
export { browser, context, errors, base, output, user, org, apiOrigin };
