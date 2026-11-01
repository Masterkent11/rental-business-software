import assert from "node:assert/strict";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import {
  browser,
  context,
  errors,
  base,
  user,
} from "./helpers/partner-browser-fixture.mjs";

const output = path.resolve(
  import.meta.dirname,
  "../../../docs/agile/agent-dashboard/screenshots",
);
await mkdir(output, { recursive: true });
const snapshot = {
  agent: {
    id: "agent-ana",
    displayName: "Ana Santos",
    headline: "Real estate agent",
    photoUrl: null,
    verified: false,
    specialties: [],
    areasServed: [],
    bio: "",
    languages: [],
    licenseNumber: null,
    licenseAuthority: null,
    verificationState: "UNVERIFIED",
    publicState: "HIDDEN",
  },
  metrics: {
    newInquiries: 0,
    activeClients: 0,
    viewingsToday: 0,
    followUpsDue: 0,
    dealsInProgress: 0,
    pendingInvitations: 0,
    representedListings: 0,
  },
  response: {
    sampleSize: 0,
    respondedWithinDayRate: null,
    medianResponseMinutes: null,
  },
  pipeline: {
    NEW: 0,
    CONTACTED: 0,
    QUALIFIED: 0,
    VIEWING_SCHEDULED: 0,
    NEGOTIATING: 0,
    CLOSED: 0,
    LOST: 0,
  },
  today: [],
  recentInquiries: [],
};
let unavailable = false;
async function onApi({ route, request, url, headers }) {
  if (url.pathname !== "/agent/dashboard" || request.method() === "OPTIONS")
    return false;
  await route.fulfill({
    status: unavailable ? 503 : 200,
    headers,
    json: unavailable
      ? { message: "Dashboard temporarily unavailable" }
      : snapshot,
  });
  return true;
}
async function signIn(page) {
  await page.goto(base + "/sign-in");
  await page.getByLabel("Email", { exact: true }).fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill("synthetic-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}
const geometry = [];
try {
  const agent = await context({ complete: true, role: "AGENT", onApi });
  const page = agent.page;
  await signIn(page);
  await page.waitForURL(base + "/agent");
  await page
    .getByRole("heading", { name: "Nothing scheduled today" })
    .waitFor();
  assert.deepEqual(
    await page.locator(".dashboard-metric-value").allTextContents(),
    ["0", "0", "0", "0", "0"],
  );
  assert.deepEqual(
    await page
      .locator(".dashboard-metric-link")
      .evaluateAll((links) => links.map((link) => link.getAttribute("href"))),
    [
      "/agent/leads",
      "/agent/clients",
      "/agent/viewings",
      "/agent/tasks",
      "/agent/leads",
    ],
  );
  assert.equal(
    await page.getByRole("button", { name: "Choose workspace" }).count(),
    0,
  );
  for (const [width, height] of [
    [1672, 941],
    [1920, 1080],
    [1440, 900],
    [834, 1112],
    [375, 812],
  ]) {
    await page.setViewportSize({ width, height });
    await page
      .locator(".agent-dashboard img")
      .evaluateAll((images) =>
        Promise.all(images.map((image) => image.decode())),
      );
    await page.evaluate(() => {
      window.scrollTo(0, 0);
      return new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      );
    });
    const sizes = await page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    assert.ok(
      sizes.content <= sizes.width + 1,
      `Overflow at ${width}: ${JSON.stringify(sizes)}`,
    );
    const bounds = await page
      .locator(
        ".agent-response-panel, .agent-response-content > img, .dashboard-metric-art",
      )
      .evaluateAll((elements) =>
        elements.map((element) => {
          const r = element.getBoundingClientRect();
          return {
            class: element.className,
            x: r.x,
            y: r.y,
            width: r.width,
            height: r.height,
          };
        }),
      );
    geometry.push({ width, height, bounds });
    const panel = bounds[5],
      illustration = bounds[6];
    assert.ok(
      illustration.x >= panel.x &&
        illustration.x + illustration.width <= panel.x + panel.width + 1,
    );
    assert.ok(
      illustration.y >= panel.y &&
        illustration.y + illustration.height <= panel.y + panel.height + 1,
    );
    await page.screenshot({
      path: path.join(output, `agent-${width}.png`),
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(base + "/");
  await page.waitForURL(base + "/agent");
  await page
    .getByRole("heading", { name: "Nothing scheduled today" })
    .waitFor();
  snapshot.metrics = {
    ...snapshot.metrics,
    newInquiries: 2,
    activeClients: 3,
    viewingsToday: 1,
    followUpsDue: 1,
    dealsInProgress: 4,
  };
  snapshot.pipeline.NEW = 2;
  snapshot.pipeline.NEGOTIATING = 4;
  snapshot.today = [
    {
      kind: "VIEWING",
      id: "viewing-one",
      at: "2026-11-01T10:00:00Z",
      title: "Skyline residence",
      subtitle: "Ana client",
      status: "CONFIRMED",
    },
  ];
  snapshot.recentInquiries = [
    {
      id: "inquiry-one",
      listingTitle: "Skyline residence",
      customerName: "Carlos Rivera",
      status: "NEW",
      createdAt: "2026-11-01T08:00:00Z",
      conversationId: "conversation-one",
    },
  ];
  snapshot.response = {
    sampleSize: 4,
    respondedWithinDayRate: 0.75,
    medianResponseMinutes: 30,
  };
  await page.reload();
  await page.getByRole("link", { name: /Carlos Rivera/ }).waitFor();
  assert.deepEqual(
    await page.locator(".dashboard-metric-value").allTextContents(),
    ["2", "3", "1", "1", "4"],
  );
  assert.equal(
    await page
      .getByRole("link", { name: /Carlos Rivera/ })
      .getAttribute("href"),
    "/agent/messages?c=conversation-one",
  );
  assert.equal(
    await page
      .getByRole("meter", { name: "Negotiating", exact: true })
      .getAttribute("aria-valuenow"),
    "4",
  );
  await page.getByText("75%", { exact: true }).waitFor();
  await page.screenshot({
    path: path.join(output, "agent-populated.png"),
    fullPage: true,
  });
  unavailable = true;
  await page.reload();
  await page.getByRole("button", { name: /Try again/ }).waitFor();
  await page
    .getByText("Unavailable right now", { exact: true })
    .first()
    .waitFor();
  assert.deepEqual(
    await page.locator(".dashboard-metric-value").allTextContents(),
    ["—", "—", "—", "—", "—"],
  );
  unavailable = false;
  await page.getByRole("button", { name: /Try again/ }).click();
  await page.getByRole("link", { name: /Carlos Rivera/ }).waitFor();
  await agent.ctx.close();
  const owner = await context({ complete: true, role: "OWNER" });
  await signIn(owner.page);
  await owner.page.waitForURL(base + "/");
  await owner.page.goto(base + "/agent");
  await owner.page.waitForURL(base + "/");
  assert.equal(await owner.page.locator(".agent-dashboard").count(), 0);
  await owner.ctx.close();
  const dual = await context({
    complete: true,
    role: "AGENT",
    dual: true,
    verified: true,
    onApi,
  });
  await signIn(dual.page);
  await dual.page
    .getByRole("button", { name: /Ana Santos Agent workspace/ })
    .click();
  await dual.page.waitForURL(base + "/agent");
  assert.equal(
    await dual.page.getByRole("button", { name: "Choose workspace" }).count(),
    0,
  );
  assert.equal(
    await dual.page.locator(".owner-workspace-selector button").count(),
    0,
  );
  await dual.page.goto(base + "/account");
  assert.equal(await dual.page.getByText(/Owner B|Agent B/).count(), 0);
  const switchButton = dual.page
    .getByRole("listitem")
    .filter({ hasText: "Ana Homes" })
    .getByRole("button", { name: "Switch", exact: true });
  await switchButton.focus();
  await dual.page.keyboard.press("Enter");
  await dual.page.waitForURL(base + "/");
  assert.equal(await dual.page.locator(".agent-dashboard").count(), 0);
  await dual.ctx.close();
  assert.deepEqual(errors, []);
  await writeFile(
    path.join(output, "results.json"),
    JSON.stringify(
      {
        status: "PASS",
        environment:
          "Local production build with synthetic API and Auth fixtures",
        viewports: geometry,
        checks: [
          "Empty and populated actual UI",
          "SVG decoding and containment",
          "Responsive document overflow",
          "Error recovery without fabricated zeros",
          "Owner and Agent direct route boundaries",
          "Static sidebar and explicit authorized Account switching",
        ],
        errors,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    "PASS Agent overview, SVG alignment, responsive layouts, recovery and workspace navigation",
  );
} finally {
  await browser.close();
}
