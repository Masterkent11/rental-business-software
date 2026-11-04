import { readFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import * as ownerFixture from "../fixtures/owner-dashboard.mjs";
const source = await readFile(
  path.resolve(import.meta.dirname, "../agent-dashboard.browser.mjs"),
  "utf8",
);
const snapshot = vm.runInNewContext(
  "(" +
    source
      .slice(
        source.indexOf("const snapshot = ") + 17,
        source.indexOf("\nlet unavailable"),
      )
      .trim()
      .replace(/;$/, "") +
    ")",
);

export async function dashboardApi({ route, url, headers, state }) {
  if (url.pathname === "/agent/dashboard") {
    await route.fulfill({
      headers,
      json: {
        ...snapshot,
        agent: {
          ...snapshot.agent,
          verificationState: state.verified ? "VERIFIED" : "UNVERIFIED",
        },
      },
    });
    return true;
  }
  if (state.role === "OWNER") {
    let json;
    if (url.pathname.endsWith("/listings"))
      json = { listings: ownerFixture.listings };
    else if (url.pathname.includes("/bookings"))
      json = {
        items: [],
        bookings: [],
        counts: { upcoming: 0, past: 0, cancelled: 0 },
      };
    else if (url.pathname.endsWith("/collection"))
      json = ownerFixture.collection;
    else if (url.pathname.endsWith("/analytics")) json = ownerFixture.analytics;
    if (json) {
      await route.fulfill({ headers, json });
      return true;
    }
  }
  return false;
}
