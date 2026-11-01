import test from "node:test";
import assert from "node:assert/strict";
import { loadSource } from "./helpers/load-store.mjs";

process.env.NEXT_PUBLIC_API_BASE_URL = "http://api.example.test";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://auth.example.test";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "fixture-publishable";
const { SupabasePartnerAccessAdapter } = loadSource(
  "infrastructure/auth/supabase-partner-access.adapter.ts",
);
const adapter = new SupabasePartnerAccessAdapter({});

test("Google availability distinguishes enabled and explicitly disabled providers", async (t) => {
  for (const enabled of [true, false]) {
    const mock = t.mock.method(globalThis, "fetch", async (url, options) => {
      assert.equal(url, "https://auth.example.test/auth/v1/settings");
      assert.equal(options.cache, "no-store");
      return Response.json({ external: { google: enabled } });
    });
    assert.equal(await adapter.googleAvailable(), enabled);
    mock.mock.restore();
  }
});

test("Google settings failures stay retryable instead of reporting a disabled provider", async (t) => {
  for (const response of [
    () => Response.json({}, { status: 503 }),
    () => Response.json({}),
    () => Response.json({ external: { google: "true" } }),
    () => {
      throw new TypeError("Network unavailable");
    },
    () => {
      throw new DOMException("Timed out", "TimeoutError");
    },
  ]) {
    const mock = t.mock.method(globalThis, "fetch", async () => response());
    await assert.rejects(
      adapter.googleAvailable(),
      /Google sign in could not be checked/,
    );
    mock.mock.restore();
  }
});
