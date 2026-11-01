import assert from "node:assert/strict";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { browser, context, errors, base, user } from "./helpers/partner-browser-fixture.mjs";
import { dashboardApi } from "./helpers/dashboard-browser-fixture.mjs";
import * as fixture from "./fixtures/owner-dashboard.mjs";
const output = path.resolve(import.meta.dirname, "../../../docs/agile/partner-shell/mobile-navigation/screens");
await mkdir(output, { recursive: true });
const photo = "/assets/dashboard/owner-header-banner.jpg";
const listings = fixture.listings.map((item, i) => ({ ...item, title: ["Modern house and lot in Talamban", "Pre selling two bedroom condo in Cebu Business Park", "Luxury condo with a city view at IT Park"][i % 3], propertyType: i % 2 ? "CONDO" : "HOUSE", areaLabel: "Talamban", cityLabel: "Cebu City", floorAreaSqm: 105, bedrooms: 3, bathrooms: 2, activity: { views: 1200, inquiries: 8, viewings: 3 } }));
const scene = (i) => ({ id: `scene-${i}`, label: i ? "Kitchen and dining" : "Living room", position: i, state: "READY", failureReason: null, initialYaw: 60, initialPitch: 0, initialFov: 75, sourceUrl: photo, previewUrl: photo, thumbnailUrl: photo, hotspots: [] });
const tour = { id: "tour-fixture", resourceId: "resource-0", state: "PUBLISHED", provider: "PLATFORM", externalModelId: null, embedUrl: null, entrySceneId: "scene-0", scenes: [scene(0), scene(1)], publishable: true, problems: null };
const messages = [{ id: "message-fixture", conversationId: "conversation-0", senderRole: "CUSTOMER", body: "I would like to view this property. Is Tuesday afternoon available?", clientId: "client-fixture", createdAt: "2026-11-01T04:00:00Z" }];
let sent = 0, populated = false;
async function onApi(args) {
  const { route, request, url, headers, state } = args;
  if (request.method() === "OPTIONS") return false;
  const reply = async (json) => { await route.fulfill({ headers, json }); return true; };
  if (url.pathname.endsWith("/notifications")) return reply({ notifications: [], unreadCount: 3 });
  if (url.pathname === "/partner/branding") return reply({ logo: null, canEdit: true });
  if (url.pathname.endsWith("/listings")) return reply({ items: listings });
  if (url.pathname.endsWith("/conversations")) return reply({ conversations: populated ? fixture.conversations : [], unreadTotal: populated ? 4 : 0 });
  if (url.pathname.endsWith("/conversations/conversation-0/messages")) {
    if (request.method() === "POST") {
      const body = request.postDataJSON();
      sent++;
      const result = { id: `sent-${sent}`, conversationId: "conversation-0", senderRole: state.role, body: body.body, clientId: body.clientId, createdAt: new Date().toISOString() };
      messages.push(result);
      return reply(result);
    }
    return reply({ conversation: fixture.conversations[0], messages, hasMore: false });
  }
  if (url.pathname.endsWith("/read")) return reply({});
  if (url.pathname.endsWith("/tour") || url.pathname.endsWith("/tours/tour-fixture")) return reply(tour);
  if (url.pathname.endsWith("/scenes/scene-0") && request.method() === "PUT") {
    tour.scenes[0].label = request.postDataJSON().label;
    return reply({});
  }
  if (url.pathname.endsWith("/unpublish")) { tour.state = "READY"; return reply({}); }
  return dashboardApi(args);
}
const results = [];
async function capture(page, name, fullPage = true) {
  await page.evaluate(async () => { await document.fonts.ready; scrollTo({ top: 0, behavior: "instant" }); });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${name}: overflow`);
  await page.screenshot({ path: path.join(output, `${name}.png`), fullPage });
  if (fullPage) await page.screenshot({ path: path.join(output, `${name}-viewport.png`) });
}
try {
  const { page, ctx } = await context({ complete: true, role: "OWNER", verified: true, onApi });
  await page.goto(base + "/sign-in");
  await page.getByLabel("Email", { exact: true }).fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill("synthetic-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(base + "/");
  for (const [width, height] of [[320,568], [375,812], [390,844], [430,932]]) {
    await page.setViewportSize({ width, height });
    await page.goto(base + "/properties");
    await page.locator(".property-row").first().waitFor();
    assert.equal(await page.locator(".property-row").count(), 6);
    const tabs = await page.getByRole("tab").evaluateAll(nodes => nodes.map(n => n.getBoundingClientRect().y));
    assert.ok(tabs.every(y => y === tabs[0]), "Single row status tabs");
    const toolbar = await page.locator(".properties-toolbar").boundingBox();
    assert.ok(toolbar.height <= 120, "Compact two row toolbar");
    const card = await page.locator(".property-row").first().boundingBox();
    assert.ok(card.height <= 230, "Compact aligned property card");
    await capture(page, `properties-${width}`);
    await page.getByRole("button", { name: /Filters/ }).click();
    await page.getByLabel("Property type", { exact: true }).selectOption("CONDO");
    await page.getByRole("button", { name: "Apply filters" }).click();
    assert.equal(await page.locator(".property-row").count(), 5);
    await capture(page, `properties-filters-${width}`);
    await page.getByRole("button", { name: "Clear all" }).click();
    await page.getByRole("button", { name: "Filters", exact: true }).click();
    const status = page.getByRole("tab", { name: /^All/ });
    await status.focus(); await status.press("ArrowRight");
    assert.equal(await page.getByRole("tab", { name: /^Published/ }).getAttribute("aria-selected"), "true");
    await page.getByRole("tab", { name: /^All/ }).click();
    await page.getByRole("button", { name: "Next page", exact: true }).click();
    assert.equal(await page.locator(".property-row").count(), 5);
    await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
    const footer = await page.locator(".properties-pagination").boundingBox();
    const dock = await page.locator(".partner-mobile-dock").boundingBox();
    assert.ok(footer.y + footer.height <= dock.y, "Pagination clears dock");
    await page.goto(base + "/bookings");
    await page.getByText("No bookings yet", { exact: true }).waitFor();
    const bookingTabs = await page.getByRole("tab").evaluateAll(nodes => nodes.map(n => n.getBoundingClientRect().y));
    assert.ok(bookingTabs.every(y => y === bookingTabs[0]));
    await capture(page, `bookings-${width}`);
    await page.goto(base + "/messages");
    await page.getByText("No conversations yet", { exact: true }).waitFor();
    assert.ok((await page.locator(".partner-message-frame").boundingBox()).height <= 280);
    await capture(page, `messages-empty-${width}`);
    await page.goto(base + "/analytics");
    await page.locator(".analytics-summary").waitFor();
    const stats = await page.locator(".analytics-summary > *").evaluateAll(nodes => nodes.map(n => n.getBoundingClientRect().toJSON()));
    assert.equal(stats[0].y, stats[1].y); assert.equal(stats[2].y, stats[3].y);
    await capture(page, `analytics-${width}`);
    await page.getByRole("button", { name: "Open navigation", exact: true }).click();
    const drawer = page.getByRole("dialog", { name: "Navigation", exact: true });
    await drawer.locator(".partner-drawer-brand").waitFor();
    assert.equal(await drawer.getByRole("img", { name: "Westayplace", exact: true }).count(), 1);
    await capture(page, `drawer-${width}`, false);
    await drawer.getByRole("button", { name: "Close navigation" }).click();
    results.push({ width, properties: true, filters: true, pagination: true, tabsKeyboard: true, bookings: true, messagesEmpty: true, analytics: true, drawer: true });
  }
  populated = true;
  await page.reload();
  for (const [width, height] of [[320,568], [375,812], [390,844], [430,932]]) {
    await page.setViewportSize({ width, height });
    await page.goto(base + "/messages?c=conversation-0");
    await page.getByLabel("Reply", { exact: true }).waitFor();
    assert.equal(await page.locator(".partner-toolbar").isVisible(), false);
    assert.equal(await page.locator(".partner-mobile-dock").isVisible(), false);
    const thread = await page.locator(".partner-thread-open").boundingBox();
    assert.equal(thread.width, width); assert.ok(Math.abs(thread.height - height) <= 1);
    const composer = await page.locator(".partner-composer").boundingBox();
    assert.ok(composer.y + composer.height <= height + 1);
    await page.getByLabel("Reply", { exact: true }).fill(`Confirmed for Tuesday ${width}`);
    await page.getByRole("button", { name: "Send reply", exact: true }).click();
    await page.getByText(`Confirmed for Tuesday ${width}`, { exact: true }).waitFor();
    await page.getByText("Sending…", { exact: true }).waitFor({ state: "hidden" });
    await capture(page, `chat-${width}`, false);
    await page.setViewportSize({ width, height: 400 });
    await page.waitForFunction(() => document.querySelector(".partner-thread-open").getBoundingClientRect().height <= 401);
    assert.ok((await page.locator(".partner-composer").boundingBox()).y + (await page.locator(".partner-composer").boundingBox()).height <= 401);
    await capture(page, `chat-keyboard-height-${width}`, false);
    await page.getByRole("link", { name: "Back to inbox" }).click();
    await page.waitForURL(base + "/messages");
    assert.equal(await page.locator(".partner-mobile-dock").isVisible(), true);
  }
  assert.equal(sent, 4);
  for (const [width, height] of [[320,568], [375,812], [390,844], [430,932]]) {
    await page.setViewportSize({ width, height });
    await page.goto(base + `/tours/${fixture.listingId}`);
    await page.getByLabel("Room name", { exact: true }).first().waitFor();
    const viewer = await page.locator(".tour-viewport").boundingBox();
    assert.ok(viewer.height >= 280);
    for (const control of await page.locator(".tour-viewer-controls button").all()) {
      const r = await control.boundingBox(); assert.ok(r.width >= 44 && r.height >= 44);
    }
    await capture(page, `tour-studio-${width}`);
    await page.getByRole("button", { name: "Full screen", exact: true }).click();
    assert.ok((await page.locator(".is-fullscreen").boundingBox()).height >= height);
    await capture(page, `tour-fullscreen-${width}`, false);
    await page.keyboard.press("Escape");
    assert.equal(await page.locator(".is-fullscreen").count(), 0);
  }
  await page.getByLabel("Room name", { exact: true }).first().fill("Main living room");
  await page.getByRole("button", { name: "Rename", exact: true }).click();
  await page.getByRole("button", { name: /Main living room/ }).waitFor();
  await ctx.close();
  const agent = await context({ complete: true, role: "AGENT", onApi });
  await agent.page.goto(base + "/sign-in");
  await agent.page.getByLabel("Email", { exact: true }).fill(user.email);
  await agent.page.getByLabel("Password", { exact: true }).fill("synthetic-password");
  await agent.page.getByRole("button", { name: "Sign in", exact: true }).click();
  await agent.page.waitForURL(base + "/agent");
  for (const [width, height] of [[320,568], [375,812], [390,844], [430,932]]) {
    await agent.page.setViewportSize({ width, height });
    await agent.page.goto(base + "/agent/analytics");
    await agent.page.locator(".analytics-summary").waitFor();
    await capture(agent.page, `agent-analytics-${width}`);
    await agent.page.goto(base + "/agent/messages?c=conversation-0");
    await agent.page.getByLabel("Reply", { exact: true }).waitFor();
    assert.equal(await agent.page.locator(".partner-mobile-dock").isVisible(), false);
    await agent.page.getByLabel("Reply", { exact: true }).fill(`Agent reply ${width}`);
    await agent.page.getByRole("button", { name: "Send reply" }).click();
    await agent.page.getByText(`Agent reply ${width}`, { exact: true }).waitFor();
    await agent.page.getByText("Sending…", { exact: true }).waitFor({ state: "hidden" });
    await capture(agent.page, `agent-chat-${width}`, false);
    await agent.page.getByRole("link", { name: "Back to inbox" }).click();
    await agent.page.waitForURL(base + "/agent/messages");
    assert.equal(await agent.page.locator(".partner-mobile-dock").isVisible(), true);
  }
  assert.equal(sent, 8);
  await agent.ctx.close();
  const opening = await context();
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await opening.ctx.route("**/onboarding/role?**", async route => {
    await gate;
    await route.continue();
  });
  await opening.page.setViewportSize({ width: 375, height: 812 });
  await opening.page.goto(base + "/properties");
  const status = opening.page.getByRole("status").filter({ hasText: "Opening your workspace" });
  await status.waitFor();
  const openingBounds = await status.boundingBox();
  assert.ok(openingBounds.height >= 812);
  const copy = await status.locator("p").boundingBox();
  assert.ok(copy.y > 300 && copy.y < 500);
  await capture(opening.page, "opening-workspace", false);
  release();
  await opening.page.waitForURL(/onboarding\/role/);
  await opening.ctx.close();
  assert.deepEqual(errors, []);
  await writeFile(path.join(output, "results.json"), JSON.stringify({ fixture: "Synthetic API interception, no production writes", results, sent, tours: "All four phone widths, fullscreen and rename", physicalKeyboard: "Not run; browser viewport resize simulates available height", errors }, null, 2));
  console.log("PASS mobile pages: 4 phone widths, properties/filter/paging, bookings, empty and full screen messages/send, analytics, branded drawer, tours/fullscreen/rename");
} finally { await browser.close(); }
