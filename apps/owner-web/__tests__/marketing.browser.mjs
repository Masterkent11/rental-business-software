import assert from "node:assert/strict";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import {
  browser,
  context,
  errors,
  base,
  user,
} from "./helpers/partner-browser-fixture.mjs";
const output = process.env.MARKETING_SCREENSHOTS ?? path.resolve(
  import.meta.dirname,
  "../../../docs/agile/marketing/screenshots",
);
await mkdir(output, { recursive: true });
const snapshot = {
  media: [],
  drafts: [],
  properties: [
    {
      id: "92000000-0000-4000-8000-000000000001",
      title: "Skyline residence",
      photos: [base + "/assets/auth/villa-dusk-reconstructed.png"],
    },
  ],
};
let unavailable = false;
async function onApi({ route, request, url, headers }) {
  if (!url.pathname.startsWith("/agent/marketing")) return false;
  if (request.method() === "OPTIONS") {
    await route.fulfill({ status: 204, headers });
    return true;
  }
  if (unavailable) {
    await route.fulfill({
      status: 503,
      headers,
      json: { message: "Marketing setup unavailable" },
    });
    return true;
  }
  let json = {};
  const method = request.method(),
    parts = url.pathname.split("/").filter(Boolean);
  if (parts.length === 2) json = snapshot;
  else if (parts[2] === "media") {
    if (method === "POST") {
      const body = request.postDataJSON();
      assert.equal(body.fileName, "Room.png");
      assert.ok(body.data);
      const media = {
        id: randomUUID(),
        fileName: body.fileName,
        contentType: "image/jpeg",
        bytes: 1500,
        state: "READY",
        createdAt: new Date().toISOString(),
      };
      snapshot.media.push(media);
      json = media;
    } else if (parts[4] === "read")
      json = {
        url: base + "/assets/auth/villa-dusk-reconstructed.png",
        expiresInSeconds: 120,
      };
    else if (method === "DELETE") {
      if (snapshot.drafts.some((d) => d.mediaIds.includes(parts[3]))) {
        await route.fulfill({
          status: 409,
          headers,
          json: {
            message: "Remove this media from its drafts before deleting it.",
          },
        });
        return true;
      }
      snapshot.media = snapshot.media.filter((m) => m.id !== parts[3]);
      json = { removed: true };
    }
  } else if (parts[2] === "drafts") {
    if (method === "POST" && parts[4] === "duplicate") {
      const original = snapshot.drafts.find((d) => d.id === parts[3]);
      json = {
        ...original,
        id: randomUUID(),
        title: original.title + " copy",
        state: "DRAFT",
        version: 1,
      };
      snapshot.drafts.push(json);
    } else if (method === "POST" || method === "PUT") {
      const body = request.postDataJSON(),
        existing = snapshot.drafts.find((d) => d.id === parts[3]);
      json = {
        ...body,
        id: existing?.id ?? randomUUID(),
        version: (existing?.version ?? 0) + 1,
        updatedAt: new Date().toISOString(),
        actionRequired: false,
      };
      snapshot.drafts = snapshot.drafts.filter((d) => d.id !== json.id);
      snapshot.drafts.unshift(json);
    } else if (method === "DELETE") {
      snapshot.drafts = snapshot.drafts.filter((d) => d.id !== parts[3]);
      json = { removed: true };
    } else json = snapshot.drafts.find((d) => d.id === parts[3]);
  }
  await route.fulfill({ headers, json });
  return true;
}
async function signIn(page) {
  await page.goto(base + "/sign-in");
  await page.getByLabel("Email", { exact: true }).fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill("synthetic-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}
try {
  const c = await context({
    complete: true,
    verified: true,
    role: "AGENT",
    onApi,
  });
  const page = c.page;
  await signIn(page);
  await page.waitForURL(base + "/agent");
  await page.goto(base + "/agent/marketing");
  await page.getByRole("heading", { name: "No drafts yet" }).waitFor();
  assert.equal(
    await page
      .getByRole("navigation", { name: "Main", exact: true })
      .getByRole("link", { name: "Marketing Hub", exact: true })
      .count(),
    1,
  );
  await page.getByRole("link", { name: "Media Library", exact: true }).focus();
  await page.keyboard.press("Enter");
  await page.waitForURL("**/agent/marketing?tab=library");
  await page.getByLabel("Upload marketing media").setInputFiles({
    name: "Room.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await page.getByText("Room.png", { exact: true }).waitFor();
  await page.getByRole("link", { name: "Create content", exact: true }).click();
  await page
    .getByLabel("Draft title", { exact: true })
    .fill("Skyline property introduction");
  await page
    .getByLabel("Property", { exact: true })
    .selectOption(snapshot.properties[0].id);
  await page.getByRole("checkbox", { name: "Select photo" }).check();
  await page.getByRole("checkbox", { name: /Room.png/ }).check();
  await page
    .getByLabel("Caption", { exact: true })
    .fill("A bright home with room to unwind. Ask us about a viewing.");
  for (const [width, height] of [
    [375, 812],
    [834, 1112],
    [1440, 900],
    [1920, 1080],
  ]) {
    await page.setViewportSize({ width, height });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    await page.screenshot({
      path: path.join(output, `editor-${width}x${height}.png`),
      fullPage: true,
      animations: "disabled",
    });
  }
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "Draft saved." }).waitFor();
  assert.equal(snapshot.drafts.length, 1);
  await page.reload();
  await page
    .getByRole("link", { name: "Skyline property introduction", exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Duplicate", exact: true }).click();
  await page
    .getByRole("link", {
      name: "Skyline property introduction copy",
      exact: true,
    })
    .waitFor();
  assert.equal(snapshot.drafts.length, 2);
  await page.getByRole("link", { name: "Edit", exact: true }).first().click();
  await page
    .getByLabel("Draft title", { exact: true })
    .fill("Updated property draft");
  await page
    .getByLabel("Internal status", { exact: true })
    .selectOption("READY_FOR_REVIEW");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await page
    .getByRole("link", { name: "Updated property draft", exact: true })
    .waitFor();
  await page
    .getByRole("link", { name: "Connected Channels", exact: true })
    .click();
  await page.getByText("Facebook Pages", { exact: true }).waitFor();
  assert.equal(await page.getByRole("button", { name: /connect/i }).count(), 0);
  await page
    .getByRole("link", { name: "Publishing Calendar", exact: true })
    .click();
  await page
    .getByText("Scheduling is not available yet.", { exact: false })
    .waitFor();
  await page.getByRole("link", { name: "Performance", exact: true }).click();
  await page
    .getByRole("heading", { name: "No publishing metrics yet" })
    .waitFor();
  await page.getByRole("link", { name: "Overview", exact: true }).click();
  for (const [width, height] of [
    [375, 812],
    [834, 1112],
    [1440, 900],
    [1920, 1080],
  ]) {
    await page.setViewportSize({ width, height });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    await page.screenshot({
      path: path.join(output, `overview-${width}x${height}.png`),
      fullPage: true,
      animations: "disabled",
    });
  }
  await page.getByRole("link", { name: "Media Library", exact: true }).click();
  await page.getByRole("button", { name: "Remove", exact: true }).click();
  await page
    .getByText("Remove this media from its drafts before deleting it.", {
      exact: true,
    })
    .waitFor();
  await page.getByRole("link", { name: "Posts & Reels", exact: true }).click();
  for (let i = 0; i < 2; i++) {
    await page
      .getByRole("button", { name: "Delete", exact: true })
      .first()
      .click();
    await page.waitForTimeout(100);
  }
  await page.getByRole("heading", { name: "No drafts yet" }).waitFor();
  await page.getByRole("link", { name: "Media Library", exact: true }).click();
  await page.getByRole("button", { name: "Remove", exact: true }).click();
  await page.getByRole("heading", { name: "Your library is empty" }).waitFor();
  unavailable = true;
  await page.reload();
  await page.getByRole("alert").waitFor();
  unavailable = false;
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await page.getByRole("heading", { name: "Your library is empty" }).waitFor();
  await c.ctx.close();
  const owner = await context({ complete: true, role: "OWNER", onApi });
  await signIn(owner.page);
  await owner.page.waitForURL(base + "/");
  await owner.page.goto(base + "/agent/marketing");
  await owner.page.waitForURL(base + "/");
  assert.equal(
    await owner.page
      .getByRole("link", { name: "Marketing Hub", exact: true })
      .count(),
    0,
  );
  await owner.ctx.close();
  const dual = await context({
    complete: true,
    verified: true,
    role: "AGENT",
    dual: true,
    onApi,
  });
  await signIn(dual.page);
  await dual.page
    .getByRole("heading", { name: "Choose a workspace" })
    .waitFor();
  await dual.page
    .getByRole("button", { name: /Ana Santos Agent workspace/ })
    .click();
  await dual.page.waitForURL(base + "/agent");
  await dual.page.goto(base + "/agent/marketing");
  await dual.page.getByRole("heading", { name: "No drafts yet" }).waitFor();
  await dual.page.goto(base + "/account");
  await dual.page
    .getByRole("listitem")
    .filter({ hasText: "Ana Homes" })
    .getByRole("button", { name: "Switch", exact: true })
    .click();
  await dual.page.waitForURL(base + "/");
  assert.equal(
    await dual.page
      .getByRole("link", { name: "Marketing Hub", exact: true })
      .count(),
    0,
  );
  await dual.ctx.close();
  assert.deepEqual(errors, []);
  await writeFile(
    path.join(output, "results.json"),
    JSON.stringify(
      {
        viewports: 4,
        captures: 8,
        checks: [
          "Agent only navigation",
          "keyboard internal navigation",
          "persisted upload and draft browser fixtures",
          "draft edit duplicate delete",
          "referenced media deletion refusal",
          "channels calendar performance truthful availability",
          "error retry",
          "Owner direct route guard",
          "dual workspace explicit choice and switch",
        ],
        pageErrors: errors,
        provider:
          "intercepted synthetic API responses; separate real PostgreSQL tests",
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS: marketing browser CRUD, four viewport reflow, availability, errors and portal separation.",
  );
} finally {
  await browser.close();
}
