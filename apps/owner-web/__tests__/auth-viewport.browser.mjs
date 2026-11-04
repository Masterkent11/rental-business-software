import assert from "node:assert/strict";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { browser, context, errors, base } from "./helpers/partner-browser-fixture.mjs";

const output = process.env.AUTH_VIEWPORT_SCREENSHOTS ?? "/tmp/westayplace-auth-viewport";
const results = [];
await mkdir(output, { recursive: true });

try {
  for (const [width, height] of [[320, 568], [375, 667], [390, 664], [430, 740], [667, 375], [834, 1112], [1440, 900]]) {
    const { ctx, page } = await context();
    let release;
    const pending = new Promise(resolve => { release = resolve; });
    await ctx.route("**/auth/v1/verify", async route => {
      await pending;
      await route.fulfill({ status: 400, json: { error: "expired", error_description: "Synthetic expired link" } });
    });
    await page.setViewportSize({ width, height });
    await page.goto(base + "/auth/callback?token_hash=synthetic-pending-token&type=recovery");
    const status = page.getByRole("status").filter({ hasText: "Confirming your account" });
    await status.waitFor();
    const bounds = await status.boundingBox();
    assert.ok(bounds.height >= 100 && bounds.height <= 160, "Pending callback stays compact");
    assert.equal(await status.evaluate(el => getComputedStyle(el).backgroundColor), "rgba(0, 0, 0, 0)");
    assert.equal(await status.locator("svg").evaluate(el => getComputedStyle(el).animationName), "none");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    if (width <= 430) {
      assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= height, "Pending copy fits visible portrait viewport");
    }
    await status.scrollIntoViewIfNeeded();
    const visible = await status.boundingBox();
    assert.ok(visible.y >= 0 && visible.y + visible.height <= height + 1, "Pending copy remains reachable");
    await page.screenshot({ path: path.join(output, `callback-${width}x${height}.png`) });
    release();
    await page.getByRole("alert").waitFor();
    await page.getByRole("link", { name: "Back to sign in", exact: true }).click();
    await page.getByLabel("Email", { exact: true }).waitFor();
    if (width <= 1023) {
      assert.ok(await page.getByLabel("Email", { exact: true }).evaluate(el => parseFloat(getComputedStyle(el).fontSize)) >= 16);
    }
    results.push({ width, height, loadingHeight: bounds.height, outcome: "passed" });
    await ctx.close();
  }
  const opening = await context();
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  await opening.ctx.route("**/onboarding/role?**", async route => {
    await pending;
    await route.continue();
  });
  await opening.page.setViewportSize({ width: 375, height: 667 });
  await opening.page.goto(base + "/properties");
  const status = opening.page.getByRole("status").filter({ hasText: "Opening your workspace" });
  await status.waitFor();
  assert.ok((await status.boundingBox()).height >= 667, "Standalone entry fills viewport before auth CSS is loaded");
  const copy = await status.locator("p").boundingBox();
  assert.ok(copy.y > 250 && copy.y < 420, "Standalone entry remains centered");
  await opening.page.screenshot({ path: path.join(output, "opening-workspace.png") });
  release();
  await opening.page.waitForURL(/onboarding\/role/);
  await opening.ctx.close();
  assert.deepEqual(errors, []);
  await writeFile(path.join(output, "results.json"), JSON.stringify({ results, standaloneEntry: "passed", errors, fixture: "Synthetic provider only; physical iPhone and live Google completion not run" }, null, 2));
  console.log(`PASS authentication viewport regression: ${results.length} sizes, callback pending and error recovery, mobile input sizing, standalone entry, reduced motion`);
} finally {
  await browser.close();
}
