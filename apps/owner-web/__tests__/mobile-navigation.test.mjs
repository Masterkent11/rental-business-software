import test from "node:test";
import assert from "node:assert/strict";
import {
  mobileNavigationFor,
  navigationFor,
  isActivePath,
} from "../domain/workspace/navigation.ts";

for (const kind of ["OWNER", "AGENT"]) {
  test(`${kind} mobile destinations reuse its existing portal navigation`, () => {
    const workspace = { kind };
    const items = mobileNavigationFor(workspace);
    const existing = navigationFor(workspace);
    assert.equal(items.length, 4);
    assert.equal(new Set(items.map((item) => item.href)).size, 4);
    for (const item of items) {
      assert.ok(existing.includes(item));
      assert.equal(item.href.startsWith("/agent"), kind === "AGENT");
    }
    assert.deepEqual(
      items.map((item) => item.href),
      kind === "AGENT"
        ? ["/agent", "/agent/leads", "/agent/clients", "/agent/viewings"]
        : ["/", "/properties", "/bookings", "/messages"],
    );
    assert.equal(
      items.some((item) => isActivePath("/account", item.href)),
      false,
    );
  });
}
