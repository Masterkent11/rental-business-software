import assert from "node:assert/strict";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import {
  browser,
  context,
  errors,
  base,
} from "./helpers/partner-browser-fixture.mjs";

const output =
  process.env.AUTH_SCREENSHOTS ??
  path.resolve(
    import.meta.dirname,
    "../../../docs/agile/partner-shell/header-refresh/auth",
  );
await mkdir(output, { recursive: true });
const results = [];
try {
  for (const [width, height] of [
    [375, 812],
    [834, 1112],
    [1440, 900],
    [1920, 1080],
  ]) {
    const c = await context();
    let mode = "slow",
      calls = 0;
    await c.ctx.route("**/auth/v1/settings", async (route) => {
      calls++;
      const current = mode;
      if (current === "slow")
        await new Promise((resolve) => setTimeout(resolve, 700));
      await route.fulfill({
        status: current === "failed" ? 503 : 200,
        json: { external: { google: current !== "disabled" } },
      });
    });
    await c.page.setViewportSize({ width, height });
    for (const [route, name] of [
      ["/sign-in", "Continue with Google"],
      ["/sign-up?role=AGENT", "Sign up with Google"],
    ]) {
      mode = "slow";
      await c.page.goto(base + route);
      const button = c.page.getByRole("button", { name, exact: true });
      await button.waitFor();
      assert.equal(await button.isDisabled(), true);
      assert.equal(await button.getAttribute("aria-busy"), "true");
      await button.waitFor({ state: "visible" });
      await c.page.waitForFunction(
        (name) =>
          Array.from(document.querySelectorAll("button")).some(
            (b) => b.textContent.trim() === name && !b.disabled,
          ),
        name,
      );
      const previous = calls;
      mode = "failed";
      await c.page.reload();
      await button.waitFor();
      await c.page
        .getByRole("status")
        .filter({ hasText: "Google sign in could not be checked." })
        .waitFor();
      assert.equal(await button.isDisabled(), true);
      assert.ok(calls > previous);
      mode = "slow";
      await c.page
        .getByRole("button", { name: "Try again", exact: true })
        .click();
      assert.equal(await button.isDisabled(), true);
      await c.page.waitForFunction(
        (name) =>
          Array.from(document.querySelectorAll("button")).some(
            (b) => b.textContent.trim() === name && !b.disabled,
          ),
        name,
      );
      assert.equal(
        await c.page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      await c.page.evaluate(async () => {
        for (const img of document.images) img.loading = "eager";
        await Promise.all(
          Array.from(document.images, (img) =>
            img.decode().catch(() => undefined),
          ),
        );
        await document.fonts.ready;
      });
      await c.page.screenshot({
        path: path.join(
          output,
          `${route.startsWith("/sign-in") ? "signin" : "signup"}-${width}.png`,
        ),
        fullPage: true,
        animations: "disabled",
      });
      mode = "disabled";
      await c.page.reload();
      await button.waitFor({ state: "hidden" });
      results.push({
        route,
        width,
        height,
        checking: "visible and disabled",
        refreshFailure: "visible with retry",
        retry: "enabled",
        explicitDisabled: "hidden",
        requests: calls,
      });
    }
    await c.ctx.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(
    path.join(output, "results.json"),
    JSON.stringify(
      {
        results,
        pageErrors: errors,
        scope:
          "Synthetic provider settings; live Google consent and membership are separate acceptance",
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS Google action survives reload, delayed checks and retry at four viewports for sign in and signup",
  );
} finally {
  await browser.close();
}
