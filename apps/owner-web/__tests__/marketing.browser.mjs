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
const output =
  process.env.MARKETING_SCREENSHOTS ??
  path.resolve(
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
      location: "Cebu City",
      photos: [base + "/assets/auth/villa-dusk-reconstructed.png"],
    },
  ],
};
let unavailable = false;
let facebookEnabled = false;
let facebookRouteMissing = false;
let facebookAuthorizationExpired = false;
let connection = null;
let selection = null;
let failSave = false;
let uploads = 0;
let saves = 0;
let failPreview = false;
const fixtureMedia = new Map();
const facebookState = "x".repeat(43);
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
  if (parts[2] === "channels") {
    if (facebookRouteMissing) {
      await route.fulfill({ status: 404, headers, json: { message: "Cannot GET /agent/marketing/channels/facebook" } });
      return true;
    }
    if (parts[4] === "start") {
      json = {
        authorizationUrl: "https://www.facebook.com/v25.0/dialog/oauth",
      };
    } else if (parts[4] === "complete") {
      assert.deepEqual(request.postDataJSON(), {
        state: facebookState,
        code: "fixture-code",
      });
      if (facebookAuthorizationExpired) {
        await route.fulfill({ status: 409, headers, json: { message: "Your Facebook authorization expired or was revoked. Connect Facebook again." } });
        return true;
      }
      selection = {
        id: "fixture-selection",
        pages: [{ id: "123", name: "Test Facebook Page" }],
      };
      json = { outcome: "SELECT_PAGE" };
    } else {
      if (parts[4] === "select") {
        assert.deepEqual(request.postDataJSON(), {
          selectionId: "fixture-selection",
          pageId: "123",
        });
        connection = {
          ...selection.pages[0],
          connectedAt: new Date().toISOString(),
        };
        selection = null;
      } else if (method === "DELETE") {
        connection = null;
      }
      json = { enabled: facebookEnabled, connection, selection };
    }
  } else if (parts.length === 2) json = snapshot;
  else if (parts[2] === "media") {
    if (method === "POST") {
      const body = request.postDataJSON();
      assert.ok(["Room.png", "Walkthrough.mp4"].includes(body.fileName));
      uploads++;
      assert.ok(body.data);
      const media = {
        id: randomUUID(),
        fileName: body.fileName,
        contentType: body.fileName.endsWith(".mp4")
          ? "video/mp4"
          : "image/jpeg",
        bytes: 1500,
        state: "READY",
        createdAt: new Date().toISOString(),
      };
      fixtureMedia.set(media.id, Buffer.from(body.data, "base64"));
      snapshot.media.push(media);
      json = media;
    } else if (parts[4] === "read")
      json = {
        url: base + "/qa-marketing-media/" + parts[3],
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
      saves++;
      if (failSave) {
        await route.fulfill({
          status: 409,
          headers,
          json: { message: "The draft changed. Please try again." },
        });
        return true;
      }
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
async function verifyFacebookConnection(page) {
  facebookRouteMissing = true;
  await page.goto(base + "/agent/marketing?tab=channels");
  await page.getByText("Facebook Pages", { exact: true }).waitFor();
  await page.getByText("This API version does not support Facebook connections yet. Update the API and try again.").waitFor();
  facebookRouteMissing = false;
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await page
    .getByText("Facebook setup is unavailable in this environment.", {
      exact: true,
    })
    .waitFor();
  assert.equal(await page.getByRole("button", { name: /connect/i }).count(), 0);
  facebookEnabled = true;
  await page.route("https://www.facebook.com/**", (route) =>
    route.fulfill({
      status: 302,
      headers: {
        location:
          base +
          "/agent/marketing/facebook/callback?state=" +
          facebookState +
          "&code=fixture-code",
      },
    }),
  );
  await page.reload();
  const connectFacebook = page.getByRole("button", { name: "Connect Facebook", exact: true });
  facebookAuthorizationExpired = true;
  await connectFacebook.click();
  await page.getByText("Your Facebook authorization expired or was revoked. Connect Facebook again.").waitFor();
  await connectFacebook.waitFor();
  facebookAuthorizationExpired = false;
  await connectFacebook.click();
  await page.getByLabel("Choose a Facebook Page").selectOption("123");
  assert.equal(new URL(page.url()).hash, "");
  assert.equal(new URL(page.url()).searchParams.has("code"), false);
  await page.getByRole("button", { name: "Connect Page", exact: true }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "Facebook Page connected." })
    .waitFor();
  await page.reload();
  await page.getByText("Test Facebook Page", { exact: true }).waitFor();
  await page
    .getByRole("button", { name: "Disconnect Facebook", exact: true })
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: "Facebook Page disconnected." })
    .waitFor();
}

async function verifyMarketingBrowser() {
  const c = await context({
    complete: true,
    verified: true,
    role: "AGENT",
    onApi,
  });
  const page = c.page;
  await page.route("**/qa-marketing-media/*", (route) => {
    if (failPreview) return route.fulfill({ status: 403 });
    const id = new URL(route.request().url()).pathname.split("/").at(-1);
    const asset = snapshot.media.find((media) => media.id === id);
    return route.fulfill({
      contentType: asset?.fileName.endsWith(".mp4") ? "video/mp4" : "image/png",
      body: fixtureMedia.get(id),
    });
  });
  await signIn(page);
  await page.waitForURL(base + "/agent");
  if (process.argv.includes("--facebook-only")) {
    await verifyFacebookConnection(page);
    assert.deepEqual(errors, []);
    console.log("PASS: Facebook route retry, OAuth callback recovery, Page selection, refresh persistence and disconnect.");
    return;
  }
  await page.goto(base + "/agent/marketing");
  await page.getByRole("heading", { name: "No drafts yet" }).waitFor();
  assert.equal(
    await page
      .getByRole("navigation", { name: "Main", exact: true })
      .getByRole("link", { name: "Marketing Hub", exact: true })
      .count(),
    1,
  );
  const tab = (name) =>
    page
      .getByRole("navigation", { name: "Marketing Hub" })
      .getByRole("link", { name, exact: true });
  const composer = page.getByRole("dialog");
  const open = () =>
    page.getByRole("link", { name: "Create post", exact: true }).click();
  const picker = () => composer.getByLabel("Upload marketing media");
  const caption = composer.getByLabel("Caption", { exact: true });
  const save = composer.getByRole("button", {
    name: "Save draft",
    exact: true,
  });
  await tab("Media").focus();
  await page.keyboard.press("Enter");
  await page.waitForURL("**/agent/marketing?tab=library");
  await open();
  await composer.waitFor();
  await page.keyboard.press("Escape");
  await composer.waitFor({ state: "hidden" });
  await page.waitForURL("**/agent/marketing?tab=posts");
  await open();
  await picker().setInputFiles({
    name: "unsupported.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from("<svg/>"),
  });
  await composer.getByRole("alert").waitFor();
  assert.equal(uploads, 0);
  const photoBytes = Buffer.from(
    await page.evaluate(async (url) => {
      const image = new Image();
      image.src = url;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = Math.round((640 * image.height) / image.width);
      canvas
        .getContext("2d")
        .drawImage(image, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/png"),
      );
      return Array.from(new Uint8Array(await blob.arrayBuffer()));
    }, snapshot.properties[0].photos[0]),
  );
  await picker().setInputFiles({
    name: "Room.png",
    mimeType: "image/png",
    buffer: photoBytes,
  });
  await composer.getByText("Room.png", { exact: true }).waitFor();
  await composer.getByRole("button", { name: "Remove attachment" }).click();
  await composer
    .getByLabel("Reuse media from library")
    .selectOption(snapshot.media[0].id);
  assert.equal(uploads, 1);
  await composer.getByLabel("Search represented properties").fill("Cebu");
  await composer
    .getByLabel("Property", { exact: true })
    .selectOption(snapshot.properties[0].id);
  await composer.getByText("Cebu City", { exact: true }).waitFor();
  await caption.fill("Skyline property introduction");
  await page.goBack();
  await page.getByRole("link", { name: "Resume editing" }).waitFor();
  await page.goForward();
  await composer.waitFor();
  assert.equal(await caption.inputValue(), "Skyline property introduction");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.keyboard.press("Escape");
  assert.equal(await composer.isVisible(), true);
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
    if (width === 375) {
      const preview = composer.getByRole("button", {
        name: "Preview",
        exact: true,
      });
      await preview.click();
      await composer.getByRole("img", { name: "Room.png" }).waitFor();
      await composer
        .getByRole("img", { name: "Room.png" })
        .evaluate((image) => image.decode());
      await page.screenshot({
        path: path.join(output, "mobile-preview-375x812.png"),
        animations: "disabled",
      });
      await composer.getByRole("button", { name: "Hide preview" }).click();
      await composer.locator(".marketing-editor").evaluate((element) => {
        element.scrollTop = 0;
      });
    }
    await page.screenshot({
      path: path.join(output, `editor-${width}x${height}.png`),
      animations: "disabled",
    });
  }
  failSave = true;
  await save.click();
  await composer.getByRole("alert").waitFor();
  assert.equal(await caption.inputValue(), "Skyline property introduction");
  failSave = false;
  await save.click();
  await page.waitForURL("**/agent/marketing?tab=posts");
  await composer.waitFor({ state: "hidden" });
  await page.getByRole("status").filter({ hasText: "Draft saved." }).waitFor();
  assert.equal(snapshot.drafts.length, 1);
  assert.equal(saves, 2);
  assert.equal(snapshot.drafts[0].title, "Skyline property introduction");
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
  await page
    .getByRole("link", {
      name: "Edit Skyline property introduction",
      exact: true,
    })
    .click();
  await page
    .getByLabel("Draft title", { exact: true })
    .fill("Updated property draft");
  await page
    .getByLabel("Internal status", { exact: true })
    .selectOption("READY_FOR_REVIEW");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await composer.waitFor({ state: "hidden" });
  await page
    .getByRole("link", { name: "Updated property draft", exact: true })
    .waitFor();
  await open();
  await composer.getByRole("radio", { name: "Video / Reel" }).check();
  const videoBytes = Buffer.from(
    await page.evaluate(async () => {
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext("2d");
      const stream = canvas.captureStream(15);
      const chunks = [];
      const recorder = new MediaRecorder(stream, { mimeType: "video/mp4" });
      const recording = new Promise((resolve) => {
        recorder.ondataavailable = (event) => chunks.push(event.data);
        recorder.onstop = async () =>
          resolve(
            Array.from(new Uint8Array(await new Blob(chunks).arrayBuffer())),
          );
      });
      recorder.start();
      for (const color of ["navy", "white", "navy"]) {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 64, 64);
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      recorder.stop();
      stream.getTracks().forEach((track) => track.stop());
      return recording;
    }),
  );
  await picker().setInputFiles({
    name: "Walkthrough.mp4",
    mimeType: "video/mp4",
    buffer: videoBytes,
  });
  const video = composer.locator("video");
  await video.waitFor();
  await page.waitForFunction(
    () => document.querySelector("dialog video")?.readyState >= 1,
  );
  await caption.fill("Video walkthrough");
  await save.click();
  await composer.waitFor({ state: "hidden" });
  await page.getByRole("link", { name: "Edit Video walkthrough" }).click();
  await composer.getByRole("radio", { name: "Video / Reel" }).waitFor();
  assert.equal(
    await composer.getByRole("radio", { name: "Video / Reel" }).isChecked(),
    true,
  );
  await composer.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByLabel("Status", { exact: true }).selectOption("FAILED");
  await page
    .getByRole("heading", { name: "Publishing activity is unavailable" })
    .waitFor();
  await page.getByLabel("Status", { exact: true }).selectOption("all");
  await page.getByLabel("Search content").fill("walkthrough");
  assert.equal(
    await page
      .getByRole("link", { name: "Edit Skyline property introduction copy" })
      .count(),
    0,
  );
  await page.getByRole("button", { name: "Grid view" }).click();
  assert.equal(
    await page
      .getByRole("button", { name: "Grid view" })
      .getAttribute("aria-pressed"),
    "true",
  );
  await verifyFacebookConnection(page);
  await tab("Calendar").click();
  await page
    .getByText("Scheduling is not available yet", { exact: false })
    .waitFor();
  await tab("Analytics").click();
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
  await tab("Media").click();
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("listitem")
    .filter({ hasText: "Room.png" })
    .getByRole("button", { name: "Remove", exact: true })
    .click();
  await page
    .getByText("Remove this media from its drafts before deleting it.", {
      exact: true,
    })
    .waitFor();
  await tab("Content").click();
  for (let i = 0; i < 3; i++) {
    page.once("dialog", (dialog) => dialog.accept());
    await page
      .getByRole("button", { name: "Delete", exact: true })
      .first()
      .click();
    await page.waitForTimeout(100);
  }
  await page.getByRole("heading", { name: "No drafts yet" }).waitFor();
  await tab("Media").click();
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("listitem")
    .filter({ hasText: "Room.png" })
    .getByRole("button", { name: "Remove", exact: true })
    .click();
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("listitem")
    .filter({ hasText: "Walkthrough.mp4" })
    .getByRole("button", { name: "Remove", exact: true })
    .click();
  await page.getByRole("heading", { name: "Your library is empty" }).waitFor();
  unavailable = true;
  await page.reload();
  const retry = page.getByRole("button", { name: "Try again", exact: true });
  await retry.waitFor();
  unavailable = false;
  await retry.click();
  await page.getByRole("heading", { name: "Your library is empty" }).waitFor();
  await page.getByLabel("Upload marketing media").setInputFiles({
    name: "Room.png",
    mimeType: "image/png",
    buffer: photoBytes,
  });
  await page.getByText("Room.png", { exact: true }).waitFor();
  failPreview = true;
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await page.getByText(/The media could not be displayed/).waitFor();
  failPreview = false;
  await page.getByRole("button", { name: "Retry preview", exact: true }).click();
  await page.getByRole("img", { name: "Room.png" }).evaluate((image) => image.decode());
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Remove", exact: true }).click();
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
        captures: 9,
        checks: [
          "Agent only navigation",
          "keyboard internal navigation",
          "direct photo and video upload, invalid file rejection, asset reuse, optional title and draft persistence",
          "Back/forward preserves edits, Escape prompts, and a failed save keeps the caption",
          "content search, status filtering and grid view",
          "draft edit duplicate delete",
          "referenced media deletion refusal",
          "channels calendar performance truthful availability",
          "API and private media preview retry",
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
}

try {
  await verifyMarketingBrowser();
} finally {
  await browser.close();
}
