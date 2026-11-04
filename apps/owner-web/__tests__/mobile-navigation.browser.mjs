import assert from "node:assert/strict";
import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import {
  browser,
  context,
  errors,
  base,
  user,
} from "./helpers/partner-browser-fixture.mjs";
import { dashboardApi } from "./helpers/dashboard-browser-fixture.mjs";
const output =
  process.env.MOBILE_SCREENSHOTS ??
  path.resolve(
    import.meta.dirname,
    "../../../docs/agile/partner-shell/mobile-navigation/after",
  );
await mkdir(output, { recursive: true });
const sharp = createRequire(import.meta.url)(
  path.resolve(import.meta.dirname, "../../api/node_modules/sharp"),
);
async function onApi(args) {
  const { route, request, url, headers } = args;
  if (request.method() === "OPTIONS") return false;
  if (url.pathname.endsWith("/notifications")) {
    await route.fulfill({
      headers,
      json: { notifications: [], unreadCount: 3 },
    });
    return true;
  }
  if (url.pathname.endsWith("/notifications/read")) {
    await route.fulfill({ headers, json: {} });
    return true;
  }
  if (url.pathname === "/partner/branding") {
    await route.fulfill({ headers, json: { logo: null, canEdit: true } });
    return true;
  }
  if (url.pathname === "/partner/search") {
    await route.fulfill({ headers, json: { items: [] } });
    return true;
  }
  return dashboardApi(args);
}
const results = [];
try {
  for (const role of ["AGENT", "OWNER"]) {
    const { page, ctx } = await context({ complete: true, role, onApi });
    const home = role === "AGENT" ? "/agent" : "/";
    await page.goto(base + "/sign-in");
    await page.getByLabel("Email", { exact: true }).fill(user.email);
    await page
      .getByLabel("Password", { exact: true })
      .fill("synthetic-password");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.waitForURL(base + home);
    await page
      .getByRole("button", { name: "Notifications, 3 unread", exact: true })
      .waitFor();
    for (const [width, height] of [
      [320, 568],
      [375, 812],
      [390, 844],
      [430, 932],
      [834, 1112],
      [1440, 900],
      [1920, 1080],
    ]) {
      await page.setViewportSize({ width, height });
      await page.evaluate(async () => {
        scrollTo({ top: 0, behavior: "instant" });
        await document.fonts.ready;
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        await Promise.all(
          Array.from(document.images, async (img) => {
            img.loading = "eager";
            await img.decode();
            await new Promise(resolve => requestAnimationFrame(resolve));
          }),
        );
      });
      const dock = page.getByRole("navigation", { name: "Quick navigation" });
      const geometry = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        metrics: Array.from(
          document.querySelectorAll(".dashboard-metric"),
          (n) => n.getBoundingClientRect().toJSON(),
        ),
        header: document
          .querySelector(".partner-toolbar")
          .getBoundingClientRect()
          .toJSON(),
      }));
      assert.equal(geometry.overflow, false);
      if (width <= 600) {
        await dock.waitFor();
        assert.equal(await dock.getByRole("link").count(), 4);
        assert.equal(
          await dock.getByRole("button", { name: "More navigation" }).count(),
          1,
        );
        for (const control of await dock.locator("a,button").all()) {
          const bounds = await control.boundingBox();
          assert.ok(bounds.width >= 44 && bounds.height >= 44);
        }
        for (const selector of [
          ".partner-navigation",
          ".partner-notifications button",
          ".partner-account",
        ]) {
          const r = await page.locator(selector).boundingBox();
          assert.ok(r.width >= 44 && r.height >= 44);
        }
        const r = await dock.boundingBox();
        assert.ok(Math.abs(height - r.y - r.height - 12) <= 1);
        assert.equal(
          await dock.evaluate((n) => getComputedStyle(n).position),
          "fixed",
        );
        if (role === "AGENT") {
          const m = geometry.metrics;
          assert.equal(m[0].y, m[1].y);
          assert.equal(m[2].y, m[3].y);
          assert.ok(m[4].width >= m[0].width * 1.8);
        }
        await page.screenshot({
          path: path.join(
            output,
            `${role.toLowerCase()}-${width}-viewport.png`,
          ),
        });
        await page.evaluate(() =>
          scrollTo({
            top: document.documentElement.scrollHeight,
            behavior: "instant",
          }),
        );
        const bottom = await page.locator(".owner-dashboard").boundingBox();
        const fixed = await dock.boundingBox();
        assert.ok(Math.abs(fixed.y - r.y) <= 1);
        assert.ok(bottom.y + bottom.height <= fixed.y);
        await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
        if (width < 360) {
          await page
            .getByRole("button", { name: "Open workspace search" })
            .click();
          const dialog = page.getByRole("dialog", {
            name: "Search your workspace",
          });
          await dialog.waitFor();
          const input = dialog.getByRole("combobox");
          await page.waitForFunction(
            () => document.activeElement?.getAttribute("role") === "combobox",
          );
          await input.fill("account");
          await page.getByRole("option", { name: /Account/ }).waitFor();
          await page.screenshot({
            path: path.join(output, `${role.toLowerCase()}-search-dialog.png`),
          });
          await input.press("Escape");
          await page.keyboard.press("Escape");
          await dialog.waitFor({ state: "hidden" });
          await page.waitForFunction(
            () =>
              document.activeElement?.getAttribute("aria-label") ===
              "Open workspace search",
          );
          await page.keyboard.press("Control+k");
          await dialog.waitFor();
          await dialog.getByRole("combobox").fill("");
          await page
            .getByRole("button", { name: "Cancel", exact: true })
            .click();
        }
      } else {
        assert.equal(await dock.isVisible(), false);
      }
      await page.screenshot({
        path: path.join(output, `${role.toLowerCase()}-${width}.png`),
        fullPage: true,
      });
      if (width >= 834) {
        const before = path.resolve(
          output,
          "../before",
          `${role.toLowerCase()}-${width}.png`,
        );
        const actual = path.join(output, `${role.toLowerCase()}-${width}.png`);
        const crop = { left: 0, top: 0, width, height: Math.min(height, 900) };
        const [a, b] = await Promise.all([
          sharp(before)
            .extract(crop)
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true }),
          sharp(actual)
            .extract(crop)
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true }),
        ]);
        assert.deepEqual(a.info, b.info);
        let changedPixels = 0;
        for (let i = 0; i < a.data.length; i += 4)
          if (
            [0, 1, 2].some(
              (channel) =>
                Math.abs(a.data[i + channel] - b.data[i + channel]) > 2,
            )
          )
            changedPixels++;
        const toolbarHeight = Math.floor(geometry.header.height);
        let changedToolbarPixels = 0;
        for (let i = 0; i < width * toolbarHeight * 4; i += 4)
          if ([0, 1, 2].some(channel => Math.abs(a.data[i + channel] - b.data[i + channel]) > 2)) changedToolbarPixels++;
        assert.ok(changedToolbarPixels <= 25, `${role} ${width}: ${changedToolbarPixels} changed toolbar pixels`);
        geometry.toolbarChangedPixels = changedToolbarPixels;
        const baseline = JSON.parse(
          await readFile(
            path.resolve(output, "../before/results.json"),
            "utf8",
          ),
        ).verification.find(
          (item) => item.role === role && item.width === width,
        );
        assert.deepEqual(geometry.header, baseline.geometry.header);
        assert.deepEqual(geometry.metrics, baseline.geometry.metrics);
        geometry.viewportChangedPixels = changedPixels;
      }
      results.push({ role, width, height, geometry });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    const dock = page.getByRole("navigation", { name: "Quick navigation" });
    const destinations = await dock.getByRole("link").evaluateAll((nodes) =>
      nodes.map((n) => ({
        href: n.getAttribute("href"),
        label: n.getAttribute("aria-label"),
      })),
    );
    for (const { href, label } of destinations) {
      await dock.getByRole("link", { name: label, exact: true }).click();
      await page.waitForURL(base + href);
      assert.equal(
        await dock
          .getByRole("link", { name: label, exact: true })
          .getAttribute("aria-current"),
        "page",
      );
      assert.equal(href.startsWith("/agent"), role === "AGENT");
    }
    await page.goBack();
    assert.equal(await dock.locator('[aria-current="page"]').count(), 1);
    await page.goForward();
    assert.equal(await dock.locator('[aria-current="page"]').count(), 1);
    await page.goto(base + home);
    await dock.getByRole("link", { name: "Dashboard", exact: true }).waitFor();
    await dock.getByRole("link", { name: "Dashboard", exact: true }).click();
    assert.equal(page.url(), base + home);
    await dock.getByRole("button", { name: "More navigation" }).click();
    const drawer = page.getByRole("dialog", {
      name: "Navigation",
      exact: true,
    });
    await drawer.waitFor();
    const hrefs = await drawer
      .getByRole("link")
      .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("href")));
    assert.ok(
      hrefs.every(
        (h) =>
          h === "/account" || h.startsWith("/agent") === (role === "AGENT"),
      ),
    );
    await page.screenshot({
      path: path.join(output, `${role.toLowerCase()}-more.png`),
    });
    await drawer
      .getByRole("button", { name: "Close navigation", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Open navigation", exact: true })
      .click();
    await drawer.waitFor();
    await page.keyboard.press("Escape");
    await drawer.waitFor({ state: "hidden" });
    await dock.getByRole("button", { name: "More navigation" }).click();
    await drawer.getByRole("link", { name: "Account", exact: true }).click();
    await page.waitForURL(base + "/account");
    assert.equal(
      await dock
        .getByRole("button", { name: "More navigation" })
        .getAttribute("aria-current"),
      "page",
    );
    await page.getByRole("button", { name: /^Notifications/ }).click();
    await page
      .getByRole("region", { name: "Notifications", exact: true })
      .waitFor();
    assert.equal(await page.locator(".partner-unread-count").count(), 0);
    await page
      .getByRole("button", { name: "Close notifications", exact: true })
      .click();
    await page.setViewportSize({ width: 320, height: 568 });
    await page.getByRole("button", { name: "Open workspace search" }).click();
    const searchDialog = page.getByRole("dialog", {
      name: "Search your workspace",
    });
    await searchDialog.getByRole("combobox").fill("account");
    await page.getByRole("option", { name: /Account/ }).waitFor();
    await searchDialog.getByRole("combobox").press("ArrowDown");
    await searchDialog.getByRole("combobox").press("Enter");
    await searchDialog.waitFor({ state: "hidden" });
    await page.waitForURL(base + "/account");
    await page.setViewportSize({ width: 390, height: 844 });
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Emulation.setSafeAreaInsetsOverride", {
      insets: { top: 20, bottom: 34, left: 0, right: 0 },
    });
    await page.waitForFunction(
      () =>
        document.querySelector(".partner-toolbar").getBoundingClientRect()
          .height === 84,
    );
    const safe = await dock.boundingBox();
    assert.ok(Math.abs(844 - safe.y - safe.height - 46) <= 1);
    await page.screenshot({
      path: path.join(output, `${role.toLowerCase()}-safe-area.png`),
    });
    await cdp.send("Emulation.setSafeAreaInsetsOverride", {
      insets: { top: 0, bottom: 0, left: 0, right: 0 },
    });

    await cdp.send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-transparency", value: "reduce" }],
    });
    assert.equal(
      await dock.evaluate((n) => getComputedStyle(n).backdropFilter),
      "none",
    );
    assert.equal(
      await dock.evaluate((n) => getComputedStyle(n).backgroundColor),
      "rgb(255, 255, 255)",
    );
    await cdp.send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "reduce" }],
    });
    assert.equal(
      await dock
        .locator("a")
        .first()
        .evaluate((n) => getComputedStyle(n).transitionDuration),
      "0s",
    );
    await page
      .getByRole("button", { name: "Account menu for Ana Santos", exact: true })
      .click();
    await page.getByRole("menuitem", { name: "Sign out", exact: true }).click();
    await page.getByRole("button", { name: "Sign in", exact: true }).waitFor();
    assert.equal(await dock.count(), 0);
    await ctx.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(
    path.join(output, "results.json"),
    JSON.stringify(
      {
        results,
        errors,
        scope:
          "Synthetic provider/API responses; responsive and navigation presentation evidence",
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS mobile dock, portal routes, More, history, search dialog, touch targets, reduced preferences, scroll clearance and tablet/desktop baseline comparison",
  );
} finally {
  await browser.close();
}
