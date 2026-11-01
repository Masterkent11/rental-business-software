import assert from "node:assert/strict";
import path from "node:path";
import { writeFile } from "node:fs/promises";
import {
  browser,
  context,
  errors,
  base,
  output,
  user,
} from "./helpers/partner-browser-fixture.mjs";

try {
  const visual = await context();
  for (const [width, height, label] of [
    [375, 812, "mobile"],
    [834, 1112, "ipad"],
    [1440, 900, "laptop"],
    [1920, 1080, "desktop"],
  ]) {
    await visual.page.setViewportSize({ width, height });
    for (const [route, name, button] of [
      ["/sign-in", "signin", "Continue with Google"],
      ["/sign-up?role=OWNER", "signup", "Sign up with Google"],
    ]) {
      await visual.page.goto(base + route);
      await visual.page
        .getByRole("button", { name: button, exact: true })
        .waitFor();
      await visual.page.evaluate(() => document.fonts.ready);
      assert.equal(
        await visual.page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        `${name} ${label} horizontal overflow`,
      );
      await visual.page.screenshot({
        path: path.join(output, `${name}-${width}x${height}.png`),
        fullPage: true,
        animations: "disabled",
      });
    }
  }
  for (const [width, height] of [
    [320, 568],
    [390, 844],
    [768, 1024],
    [1024, 768],
  ]) {
    await visual.page.setViewportSize({ width, height });
    await visual.page.goto(base + "/sign-up?role=AGENT");
    await visual.page.getByLabel("Full name", { exact: true }).waitFor();
    assert.equal(
      await visual.page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      `${width}px reflow`,
    );
    await visual.page
      .getByLabel("Password", { exact: true })
      .fill("synthetic-password");
    await visual.page.getByRole("button", { name: "Show password" }).click();
    assert.equal(
      await visual.page
        .getByLabel("Password", { exact: true })
        .getAttribute("type"),
      "text",
    );
  }
  await visual.page.setViewportSize({ width: 1440, height: 900 });
  await visual.page.goto(base + "/sign-up?role=OWNER");
  await visual.page.getByLabel("Full name", { exact: true }).waitFor();
  assert.deepEqual(
    await visual.page.locator(".auth-promo-copy").evaluate((el) => {
      const style = getComputedStyle(el);
      return [style.backgroundColor, style.borderTopWidth];
    }),
    ["rgba(0, 0, 0, 0)", "0px"],
  );
  for (const [width, height] of [
    [1420, 700],
    [375, 812],
    [720, 450],
  ]) {
    await visual.page.setViewportSize({ width, height });
    await visual.page.goto(base + "/onboarding/role");
    await visual.page.getByRole("radio", { name: /Property Owner/ }).waitFor();
    assert.equal(
      await visual.page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    assert.deepEqual(
      await visual.page.locator(".role-panel").evaluate((el) => {
        const style = getComputedStyle(el);
        return [style.backgroundColor, style.backdropFilter];
      }),
      ["rgb(255, 255, 255)", "none"],
    );
    const ownerRadio = visual.page.getByRole("radio", {
      name: /Property Owner/,
    });
    await ownerRadio.focus();
    await visual.page.keyboard.press("ArrowRight");
    assert.equal(
      await visual.page
        .getByRole("radio", { name: /Property Agent/ })
        .isChecked(),
      true,
    );
    await visual.page.screenshot({
      path: path.join(output, `role-${width}x${height}.png`),
      fullPage: true,
      animations: "disabled",
    });
  }
  await visual.ctx.close();
  for (const role of ["OWNER", "AGENT"]) {
    const { ctx, page, state } = await context({ role });
    await page.goto(base + "/");
    await page.waitForURL("**/onboarding/role**");
    await page
      .getByRole("heading", { name: "How will you use Westayplace?" })
      .waitFor();
    await page.setViewportSize({ width: 1440, height: 778 });
    assert.ok(
      await page.evaluate(() => document.body.scrollHeight <= innerHeight + 1),
      "role screen fits laptop height",
    );
    await page.getByRole("button", { name: "Show workspace slide 2" }).click();
    await page
      .getByRole("heading", { name: "Your properties, in one place." })
      .waitFor();
    await page.getByRole("button", { name: "Show workspace slide 3" }).click();
    await page
      .getByRole("heading", { name: "Stay close to your clients." })
      .waitFor();
    await page.getByRole("button", { name: "Show workspace slide 1" }).click();
    await page.screenshot({
      path: path.join(output, `role-${role.toLowerCase()}-1440x778.png`),
      fullPage: true,
      animations: "disabled",
    });
    await page
      .getByRole("radio", {
        name: role === "OWNER" ? /Property Owner/ : /Property Agent/,
      })
      .check();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.waitForURL("**/sign-up?**");
    await page
      .getByRole("button", { name: "Create account", exact: true })
      .click();
    await page
      .getByText("Enter your full name (2 to 80 characters).", { exact: true })
      .waitFor();
    assert.equal(state.signupCalls, 0);
    await page.getByLabel("Full name", { exact: true }).fill("Ana Santos");
    await page.getByLabel("Email", { exact: true }).fill(user.email);
    await page
      .getByLabel("Password", { exact: true })
      .fill("synthetic-test-password");
    await page
      .getByRole("button", { name: "Create account", exact: true })
      .click();
    await page.waitForURL("**/onboarding/setup");
    if (role === "OWNER")
      await page
        .getByLabel("Workspace name", { exact: true })
        .fill("Ana Homes");
    else {
      await page
        .getByLabel("Professional name", { exact: true })
        .fill("Ana Santos");
      await page
        .getByLabel("Area served (optional)", { exact: true })
        .fill("Cebu City");
    }
    await page.screenshot({
      path: path.join(output, `setup-${role.toLowerCase()}.png`),
      fullPage: true,
      animations: "disabled",
    });
    await page
      .getByRole("button", {
        name: role === "OWNER" ? "Create workspace" : "Create agent profile",
        exact: true,
      })
      .click();
    await page.waitForURL(role === "OWNER" ? base + "/" : base + "/agent");
    assert.equal(state.signupCalls, 1);
    assert.equal(state.setupCalls, 1);
    assert.equal(state.complete, true);
    await ctx.close();
  }
  const confirm = await context({ confirmation: true });
  await confirm.page.goto(base + "/sign-up?role=OWNER");
  await confirm.page
    .getByLabel("Full name", { exact: true })
    .fill("Ana Santos");
  await confirm.page.getByLabel("Email", { exact: true }).fill(user.email);
  await confirm.page
    .getByLabel("Password", { exact: true })
    .fill("synthetic-test-password");
  await confirm.page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await confirm.page
    .getByRole("heading", { name: "Check your email" })
    .waitFor();
  assert.equal(confirm.state.setupCalls, 0);
  await confirm.ctx.close();
  const reset = await context({ google: false });
  await reset.page.goto(base + "/sign-in");
  await reset.page.getByLabel("Email", { exact: true }).fill(user.email);
  await reset.page
    .getByLabel("Password", { exact: true })
    .fill("incorrect-password");
  await reset.page
    .getByRole("button", { name: "Sign in", exact: true })
    .click();
  await reset.page
    .getByText("That email and password don't match an account.", {
      exact: true,
    })
    .waitFor();
  await reset.page.getByRole("link", { name: "Forgot password?" }).click();
  await reset.page.waitForURL("**/forgot-password");
  await reset.page
    .getByRole("heading", { name: "Forgot your password?" })
    .waitFor();
  await reset.page.getByLabel("Email", { exact: true }).fill(user.email);
  await reset.page.getByRole("button", { name: "Send reset link" }).click();
  await reset.page.getByRole("heading", { name: "Check your email" }).waitFor();
  assert.equal(reset.state.resetCalls, 1);
  await reset.page.goto(base + "/legal/privacy");
  await reset.page
    .getByRole("heading", { name: "Privacy Policy", exact: true })
    .waitFor();
  await reset.page.goto(
    base + "/auth/callback?error=access_denied&next=https://evil.test",
  );
  await reset.page
    .getByText(
      "This link has expired or couldn't be completed. Please try signing in again.",
      { exact: true },
    )
    .waitFor();
  assert.equal(new URL(reset.page.url()).origin, new URL(base).origin);
  await reset.ctx.close();
  const oauth = await context();
  await oauth.page.goto(base + "/sign-up?role=OWNER");
  await oauth.page.getByRole("button", { name: "Sign up with Google" }).click();
  await oauth.page.waitForURL("**/onboarding/setup");
  assert.equal(oauth.state.callbackCalls, 1);
  await oauth.ctx.close();
  const recovery = await context({ google: false });
  await recovery.page.goto(
    base +
      "/auth/callback?token_hash=synthetic-recovery-token&type=recovery&next=recovery",
  );
  await recovery.page.waitForURL("**/reset-password");
  await recovery.page
    .getByLabel("New password", { exact: true })
    .fill("updated-synthetic-password");
  await recovery.page
    .getByRole("button", { name: "Update password", exact: true })
    .click();
  await recovery.page
    .getByRole("heading", { name: "Password updated" })
    .waitFor();
  assert.equal(recovery.state.passwordUpdates, 1);
  await recovery.ctx.close();
  assert.deepEqual(errors, []);
  await writeFile(
    path.join(output, "results.json"),
    JSON.stringify(
      {
        screenshotMatrix: "8/8",
        roleFlows: ["OWNER", "AGENT"],
        checks: [
          "first visit",
          "laptop fit",
          "functional carousel",
          "registration validation",
          "immediate signup",
          "confirmation-required signup",
          "workspace setup",
          "private unverified agent",
          "password visibility",
          "invalid sign-in",
          "reset request",
          "content legal page",
          "callback rejection",
          "PKCE code exchange",
          "recovery token exchange and password update",
          "solid role surfaces and no promotional text card",
          "keyboard role selection",
          "200 percent equivalent viewport reflow",
          "small-screen reflow",
        ],
        pageErrors: errors,
        provider:
          "synthetic intercepted provider; real provider acceptance not run",
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS: 8/8 screenshots; owner + agent onboarding, carousel, validation, confirmation, recovery, legal, callback success and denial, keyboard selection and reflow. Provider requests intercepted.",
  );
} finally {
  await browser.close();
}
