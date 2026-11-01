import assert from "node:assert/strict";
import path from "node:path";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import {
  browser,
  context,
  errors,
  base,
  user,
  org,
} from "./helpers/partner-browser-fixture.mjs";
import { dashboardApi } from "./helpers/dashboard-browser-fixture.mjs";
const require = createRequire(import.meta.url),
  sharp = require(
    path.resolve(import.meta.dirname, "../../api/node_modules/sharp"),
  );
const output =
  process.env.PARTNER_SCREENSHOTS ??
  path.resolve(
    import.meta.dirname,
    "../../../docs/agile/partner-shell/screenshots",
  );
await mkdir(output, { recursive: true });
const image = await sharp({
  create: { width: 96, height: 96, channels: 4, background: "#335f92" },
})
  .png()
  .toBuffer();
const normalized =
  "data:image/webp;base64," +
  (await sharp(image).webp().toBuffer()).toString("base64");
const ids = { property: "a1000000-0000-4000-8000-000000000001" };
let logo = null,
  fail = false,
  searches = [];
async function onApi({ route, request, url, headers, state }) {
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
    if (request.method() === "PUT") {
      assert.equal(request.postDataJSON().contentType, "image/png");
      logo = normalized;
    }
    if (request.method() === "DELETE") logo = null;
    await route.fulfill({ headers, json: { logo, canEdit: true } });
    return true;
  }
  if (url.pathname === "/partner/search") {
    const query = url.searchParams.get("q");
    searches.push({
      query,
      org: request.headers()["x-organization-id"] ?? null,
      role: state.role,
    });
    if (query === "slow") {
      await new Promise((r) => setTimeout(r, 900));
      try {
        await route.fulfill({
          headers,
          json: {
            items: [
              {
                id: ids.property,
                kind: "PROPERTY",
                title: "Stale result",
                subtitle: "Old query",
              },
            ],
          },
        });
      } catch {}
      return true;
    }
    await route.fulfill({
      status: fail ? 503 : 200,
      headers,
      json: fail
        ? { message: "Search unavailable" }
        : {
            items: query.toLowerCase().includes("cebu")
              ? [
                  {
                    id: ids.property,
                    kind: "PROPERTY",
                    title: "Cebu villa",
                    subtitle: "Talamban, Cebu",
                  },
                ]
              : [],
          },
    });
    return true;
  }
  return dashboardApi({ route, url, headers, state });
}

async function signIn(page) {
  await page.goto(base + "/sign-in");
  await page.getByLabel("Email", { exact: true }).fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill("synthetic-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}
const verification = [];
try {
  for (const role of ["AGENT", "OWNER"]) {
    logo = null;
    const fixture = await context({ complete: true, role, onApi });
    const page = fixture.page;
    await signIn(page);
    await page.waitForURL(base + (role === "AGENT" ? "/agent" : "/"));
    await page
      .getByRole("combobox", { name: "Search this workspace" })
      .waitFor();
    await page
      .getByRole("button", { name: "Notifications, 3 unread", exact: true })
      .waitFor();
    assert.equal(
      await page.locator(".partner-unread-count").textContent(),
      "3",
    );
    for (const [width, height] of [
      [320, 755],
      [375, 812],
      [834, 1112],
      [1364, 768],
      [1440, 900],
      [1672, 941],
      [1920, 1080],
    ]) {
      await page.setViewportSize({ width, height });
      assert.equal(
        await page
          .locator(".partner-notifications .partner-verification-seal")
          .count(),
        0,
      );
      assert.equal(await page.locator(".partner-verification-seal").count(), 0);
      const geometry = await page.evaluate(() => {
        const search = (
          document.querySelector(".partner-search").getBoundingClientRect()
            .width
            ? document.querySelector(".partner-search")
            : document.querySelector(".partner-search-trigger")
        ).getBoundingClientRect();
        return {
          width: document.documentElement.clientWidth,
          content: document.documentElement.scrollWidth,
          search: {
            x: search.x,
            y: search.y,
            width: search.width,
            height: search.height,
          },
          header: (() => {
            const r = document
              .querySelector(".dashboard-header")
              .getBoundingClientRect();
            return { x: r.x, y: r.y, width: r.width, height: r.height };
          })(),
          greeting: (() => {
            const r = document
              .querySelector(".dashboard-greeting h1")
              .getBoundingClientRect();
            return { x: r.x, y: r.y, width: r.width, height: r.height };
          })(),
          notifications: (() => {
            const r = document
              .querySelector(".partner-notifications")
              .getBoundingClientRect();
            return { x: r.x, y: r.y, width: r.width, height: r.height };
          })(),
          identity: (() => {
            const r = document
              .querySelector(".partner-account")
              .getBoundingClientRect();
            return { x: r.x, y: r.y, width: r.width, height: r.height };
          })(),
          toolbarIntegrated: document
            .querySelector(".partner-toolbar")
            .parentElement.classList.contains("dashboard-header"),
          toolbar: (() => {
            const r = document
              .querySelector(".partner-toolbar")
              .getBoundingClientRect();
            return { x: r.x, y: r.y, width: r.width, height: r.height };
          })(),
          sidebar: (() => {
            const r = document
              .querySelector(".owner-sidebar")
              .getBoundingClientRect();
            return { x: r.x, y: r.y, width: r.width, height: r.height };
          })(),
          toolbarPosition: getComputedStyle(
            document.querySelector(".partner-toolbar"),
          ).position,
        };
      });
      assert.ok(
        geometry.content <= width + 1,
        JSON.stringify({ role, width, geometry }),
      );
      assert.ok(geometry.search.width >= (width < 360 ? 44 : 140));
      assert.equal(geometry.toolbarIntegrated, false);
      assert.equal(geometry.toolbarPosition, "sticky");
      assert.equal(geometry.toolbar.x, 0);
      assert.equal(geometry.toolbar.width, width);
      assert.equal(geometry.header.y, geometry.toolbar.height);
      assert.equal(
        await page.locator(".owner-sidebar .owner-workspace-selector").count(),
        0,
      );
      assert.equal(
        await page.locator(".owner-sidebar .owner-wordmark").count(),
        0,
      );
      for (const element of [geometry.notifications, geometry.identity]) {
        assert.ok(
          Math.abs(
            geometry.search.y +
              geometry.search.height / 2 -
              (element.y + element.height / 2),
          ) <= 2,
          "Search, notification and account must share one row",
        );
      }
      assert.ok(
        geometry.search.x + geometry.search.width <=
          geometry.notifications.x + 1,
      );
      assert.ok(
        geometry.notifications.x + geometry.notifications.width <=
          geometry.identity.x + 1,
      );
      const navigation = await page
        .locator(".owner-sidebar .owner-navigation")
        .evaluate((node) => {
          const css = getComputedStyle(node);
          const rows = Array.from(
            node.querySelectorAll(":scope > a"),
            (link) => {
              const rect = link.getBoundingClientRect();
              const style = getComputedStyle(link);
              return {
                label: link.textContent.trim(),
                top: rect.top,
                bottom: rect.bottom,
                height: rect.height,
                padding: style.padding,
                font: style.fontSize,
              };
            },
          );
          return { gap: css.gap, rows };
        });
      if (width >= 1024) {
        assert.equal(navigation.gap, "6px");
        for (const row of navigation.rows) {
          assert.ok(row.height >= 44);
          assert.equal(row.padding, "10px 14px");
          assert.equal(row.font, "14px");
        }
        for (let i = 1; i < navigation.rows.length; i++)
          assert.ok(
            navigation.rows[i].top - navigation.rows[i - 1].bottom >= 5.5,
          );
      }
      assert.equal(
        await page
          .locator(".partner-notifications")
          .evaluate((node) => getComputedStyle(node).borderLeftWidth),
        "0px",
      );
      assert.equal(
        await page
          .locator(".partner-notifications")
          .evaluate((node) => getComputedStyle(node).borderRightWidth),
        "0px",
      );
      assert.ok(geometry.greeting.y >= geometry.toolbar.height);
      if (width >= 1024) {
        assert.equal(geometry.toolbar.height, 72);
        assert.equal(geometry.sidebar.y, 72);
        assert.equal(geometry.sidebar.width, 244);
        assert.equal(geometry.header.x, 244);
        await page.locator(".partner-brand .partner-wordmark").waitFor();
      }
      assert.equal(
        await page.locator(".owner-sidebar .owner-profile").count(),
        0,
      );
      if (width >= 1024)
        await page
          .locator(".owner-sidebar")
          .getByRole("button", { name: "Sign out", exact: true })
          .waitFor();
      await page.evaluate(async () => {
        for (const img of document.images) img.loading = "eager";
        await Promise.all(
          Array.from(document.images, (img) =>
            img.decode().catch(() => undefined),
          ),
        );
        await document.fonts.ready;
      });

      await page.screenshot({
        path: path.join(output, `${role.toLowerCase()}-${width}.png`),
        fullPage: true,
        animations: "disabled",
      });
      verification.push({ role, width, height, geometry, navigation });
    }
    const accountMenu = page.getByRole("button", {
      name: `Account menu for ${user.user_metadata.full_name}`,
      exact: true,
    });
    await accountMenu.focus();
    await accountMenu.press("Enter");
    await page.getByRole("menu", { name: "Account", exact: true }).waitFor();
    assert.equal(
      await page.getByRole("menuitem", { name: "Agent profile" }).count(),
      role === "AGENT" ? 1 : 0,
    );
    await page.keyboard.press("Escape");
    await page
      .getByRole("menu", { name: "Account", exact: true })
      .waitFor({ state: "hidden" });
    await page.waitForFunction(() =>
      document.activeElement?.classList.contains("partner-account"),
    );
    await accountMenu.click();
    await page.getByRole("menu", { name: "Account", exact: true }).waitFor();
    await page.locator(".dashboard-greeting h1").click();
    await page
      .getByRole("menu", { name: "Account", exact: true })
      .waitFor({ state: "hidden" });
    await accountMenu.click();
    await page.screenshot({
      path: path.join(output, `${role.toLowerCase()}-account-menu.png`),
    });
    await page
      .getByRole("menuitem", { name: "Account and settings", exact: true })
      .click();
    await page.waitForURL(base + "/account");
    await page
      .getByRole("button", { name: "Upload logo", exact: true })
      .waitFor();
    for (const [width, height] of [
      [320, 755],
      [375, 812],
      [834, 1112],
      [1364, 768],
      [1440, 900],
      [1672, 941],
      [1920, 1080],
    ]) {
      await page.setViewportSize({ width, height });
      const row = await page.evaluate(() => {
        const rect = (selector) => {
          const r = document.querySelector(selector).getBoundingClientRect();
          return { x: r.x, y: r.y, width: r.width, height: r.height };
        };
        return {
          search: rect(
            document.querySelector(".partner-search").getBoundingClientRect()
              .width
              ? ".partner-search"
              : ".partner-search-trigger",
          ),
          notification: rect(".partner-notifications"),
          identity: rect(".partner-account"),
          overflow: document.documentElement.scrollWidth > innerWidth,
        };
      });
      assert.equal(row.overflow, false);
      for (const element of [row.notification, row.identity])
        assert.ok(
          Math.abs(
            row.search.y +
              row.search.height / 2 -
              (element.y + element.height / 2),
          ) <= 2,
        );
      await page.screenshot({
        path: path.join(output, `${role.toLowerCase()}-account-${width}.png`),
        fullPage: true,
        animations: "disabled",
      });
      await page.getByRole("button", { name: /^Notifications/ }).click();
      const notificationPanel = page.getByRole("region", {
        name: "Notifications",
        exact: true,
      });
      await notificationPanel.waitFor();
      const panelBounds = await notificationPanel.boundingBox();
      assert.ok(
        panelBounds.x >= -1 && panelBounds.x + panelBounds.width <= width + 1,
      );
      await page
        .getByRole("button", { name: "Close notifications", exact: true })
        .click();
      verification.push({ role, width, height, route: "account", row });
    }
    await page.goto(base + (role === "AGENT" ? "/agent" : "/"));
    const input = page.getByRole("combobox", { name: "Search this workspace" });
    await input.waitFor();
    await page
      .getByRole("button", { name: "Notifications, 3 unread", exact: true })
      .waitFor();
    await page.keyboard.press("Control+k");
    assert.equal(
      await input.evaluate((node) => node === document.activeElement),
      true,
    );
    await input.blur();
    await page.keyboard.press("Meta+k");
    assert.equal(
      await input.evaluate((node) => node === document.activeElement),
      true,
    );
    await input.fill("cebu");
    await page.getByRole("option", { name: /Cebu villa/ }).waitFor();
    await page.screenshot({
      path: path.join(output, `${role.toLowerCase()}-search-open.png`),
    });
    assert.equal(searches.at(-1).org, role === "OWNER" ? org : null);
    await input.press("ArrowUp");
    assert.ok(await input.getAttribute("aria-activedescendant"));
    await input.press("Escape");
    assert.equal(await input.getAttribute("aria-expanded"), "false");
    await input.fill("slow");
    await page.waitForTimeout(300);
    await input.fill("absent");
    await page.getByText("No matches. Try another keyword.").waitFor();
    await page.waitForTimeout(1000);
    assert.equal(
      await page.getByText("Stale result", { exact: true }).count(),
      0,
    );
    fail = true;
    await input.fill("mark");
    await page
      .getByRole("alert")
      .filter({ hasText: "Your page shortcuts" })
      .waitFor();
    if (role === "AGENT")
      await page.getByRole("option", { name: /Marketing Hub/ }).waitFor();
    fail = false;
    await page.getByRole("button", { name: "Clear workspace search" }).click();
    await input.fill("account");
    await page.getByRole("option", { name: /Account/ }).waitFor();
    await input.press("ArrowDown");
    await input.press("Enter");
    await page.waitForURL(base + "/account");
    await page
      .getByRole("button", { name: "Upload logo", exact: true })
      .waitFor();
    await page
      .getByLabel("Choose workspace logo", { exact: true })
      .setInputFiles({
        name: "partner.png",
        mimeType: "image/png",
        buffer: image,
      });
    await page.getByText("Workspace logo saved.", { exact: true }).waitFor();
    await page.getByRole("img", { name: "Current workspace logo" }).waitFor();
    await page.locator(".partner-brand .partner-logo img").waitFor();
    const partnerTitle = role === "OWNER" ? "Ana Homes" : "Ana Santos";
    assert.equal(await page.locator(".partner-brand .partner-wordmark").innerText(), partnerTitle);
    assert.equal(await page.locator(".partner-brand").innerText(), `${partnerTitle}\n${role === "OWNER" ? "Owner workspace" : "Agent workspace"}`);
    assert.equal(await page.locator(".partner-workspace-name").count(), 0);
    assert.equal(await page.locator(".owner-sidebar .partner-logo img").count(), 0);
    await page.reload();
    await page.getByRole("img", { name: "Current workspace logo" }).waitFor();
    await page.locator(".partner-brand .partner-logo img").waitFor();
    await page.screenshot({ path: path.join(output, `${role.toLowerCase()}-partner-header-logo.png`) });
    await page.setViewportSize({ width: 375, height: 812 });
    await page.getByRole("button", { name: "Open navigation", exact: true }).click();
    const brandedDrawer = page.getByRole("dialog", { name: "Navigation", exact: true });
    await brandedDrawer.locator(".partner-logo img").waitFor();
    assert.equal(await brandedDrawer.locator(".partner-wordmark").innerText(), partnerTitle);
    await page.screenshot({ path: path.join(output, `${role.toLowerCase()}-partner-drawer-logo.png`) });
    await brandedDrawer.getByRole("button", { name: "Close navigation" }).click();
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page
      .getByRole("button", { name: "Remove logo", exact: true })
      .click();
    await page.getByText("Workspace logo removed.", { exact: true }).waitFor();
    assert.equal(
      await page.getByRole("img", { name: "Current workspace logo" }).count(),
      0,
    );
    await page
      .getByLabel("Choose workspace logo", { exact: true })
      .setInputFiles({
        name: "unsafe.svg",
        mimeType: "image/svg+xml",
        buffer: Buffer.from("<svg/>"),
      });
    await page
      .getByRole("alert")
      .filter({ hasText: "Choose a JPEG" })
      .waitFor();
    await page.screenshot({
      path: path.join(output, `${role.toLowerCase()}-branding.png`),
      fullPage: true,
      animations: "disabled",
    });
    if (role === "AGENT") {
      await page.setViewportSize({ width: 1364, height: 900 });
      await page
        .locator(".owner-sidebar")
        .getByRole("link", { name: "Represented Properties", exact: true })
        .click();
      await page.waitForURL(base + "/agent/properties");
      await page
        .getByRole("heading", { name: "Represented properties", exact: true })
        .waitFor();
      await page.screenshot({
        path: path.join(output, "agent-properties-spacing.png"),
        fullPage: true,
      });
      const row = page.locator('.owner-sidebar a[aria-current="page"]');
      assert.equal(await row.count(), 1);
      assert.equal(await row.getAttribute("href"), "/agent/properties");
    }
    await fixture.ctx.close();
    const verified = await context({
      complete: true,
      role,
      verified: true,
      onApi,
    });
    await signIn(verified.page);
    await verified.page.waitForURL(base + (role === "AGENT" ? "/agent" : "/"));
    const seal = verified.page.locator(
      ".partner-account .partner-verification-seal",
    );
    await seal.waitFor();
    assert.equal(
      await seal.getAttribute("aria-label"),
      `Verified ${role === "AGENT" ? "Agent" : "Owner"} workspace`,
    );
    assert.equal(
      await verified.page
        .locator(".partner-notifications .partner-verification-seal")
        .count(),
      0,
    );
    const bounds = await verified.page.evaluate(() => {
      const avatar = document
          .querySelector(".partner-account-avatar")
          .getBoundingClientRect(),
        badge = document
          .querySelector(".partner-account .partner-verification-seal")
          .getBoundingClientRect();
      return {
        avatar: {
          x: avatar.x,
          y: avatar.y,
          width: avatar.width,
          height: avatar.height,
        },
        badge: {
          x: badge.x,
          y: badge.y,
          width: badge.width,
          height: badge.height,
        },
        color: getComputedStyle(
          document.querySelector(".partner-account .partner-verification-seal"),
        ).color,
      };
    });
    assert.ok(
      bounds.badge.x + bounds.badge.width >=
        bounds.avatar.x + bounds.avatar.width - 1,
    );
    assert.ok(
      bounds.badge.y + bounds.badge.height >=
        bounds.avatar.y + bounds.avatar.height - 1,
    );
    assert.equal(bounds.color, "rgb(24, 119, 242)");
    await verified.page.screenshot({
      path: path.join(output, `${role.toLowerCase()}-verified-avatar.png`),
      fullPage: true,
      animations: "disabled",
    });
    await verified.page.setViewportSize({ width: 375, height: 812 });
    await verified.page
      .getByRole("button", { name: "Open navigation", exact: true })
      .click();
    await verified.page
      .locator(".owner-drawer")
      .getByRole("button", { name: "Sign out", exact: true })
      .waitFor();
    assert.equal(
      await verified.page.locator(".owner-drawer .owner-profile").count(),
      0,
    );
    await verified.page.screenshot({
      path: path.join(output, `${role.toLowerCase()}-verified-drawer.png`),
      fullPage: true,
      animations: "disabled",
    });
    verification.push({
      role,
      verified: true,
      avatarBadge: bounds,
      mobileDrawer: "PASS",
    });
    await verified.page
      .locator(".owner-drawer")
      .getByRole("button", { name: "Sign out", exact: true })
      .click();
    await verified.page
      .getByRole("button", { name: "Sign in", exact: true })
      .waitFor();
    assert.equal(await verified.page.locator(".partner-account").count(), 0);
    await verified.ctx.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(
    path.join(output, "results.json"),
    JSON.stringify(
      {
        verification,
        searches,
        browserErrors: errors,
        scope:
          "Synthetic browser provider and API interception; actual HTTP/PostgreSQL verified separately",
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS unified Owner and Agent header, avatar menu, shortcuts, sidebar geometry, branding and scoped search regressions",
  );
} finally {
  await browser.close();
}
