import test from "node:test";
import assert from "node:assert/strict";
import { chooseWorkspace, pathBelongsTo, scopeOf, workspaceHome, workspacesFor } from "../domain/workspace/workspace.ts";
import { isActivePath, navigationFor } from "../domain/workspace/navigation.ts";
import { groupByStatus, nextStatuses } from "../domain/inquiries/inquiry.ts";
import { actionsFor, dayKey } from "../domain/viewings/viewing.ts";
import { directionFromScreen, panoramaProblem, panoramaShapeProblem, screenFromDirection } from "../domain/tours/tour.ts";
import { emptyForm, locationFrom, saleTermsFrom, stepsFor, validateStep } from "../domain/listings/listing-form.ts";
import { canRequestVerification, validateAgentForm, emptyAgentForm } from "../domain/agents/agent.ts";

const membership = (id, name) => ({ organizationId: id, organizationName: name, role: "OWNER", verified: true });
const agent = { id: "agent-1", displayName: "Maria Santos", headline: "Broker", photoUrl: null, verificationState: "VERIFIED" };

test("Workspaces: an owner who is also an agent gets both workspaces from one sign-in", () => {
  const workspaces = workspacesFor([membership("org-1", "Santos Realty")], agent);
  assert.deepEqual(workspaces.map((w) => w.kind), ["OWNER", "AGENT"]);
  assert.equal(chooseWorkspace(workspaces, null), null);
  assert.equal(chooseWorkspace(workspaces, "agent")?.kind, "AGENT");
  assert.equal(chooseWorkspace(workspaces, "owner:org-1")?.kind, "OWNER");
});

test("Workspaces: a single workspace is opened directly and an unknown remembered key prompts again", () => {
  const ownerOnly = workspacesFor([membership("org-1", "A")], null);
  assert.equal(chooseWorkspace(ownerOnly, "agent")?.key, "owner:org-1");
  const both = workspacesFor([membership("org-1", "A")], agent);
  assert.equal(chooseWorkspace(both, "owner:missing"), null);
  assert.deepEqual(workspacesFor([], null), []);
});

test("Workspaces: scope and routes follow the active workspace", () => {
  const [owner, agentWorkspace] = workspacesFor([membership("org-1", "A")], agent);
  assert.deepEqual(scopeOf(owner), { kind: "OWNER", organizationId: "org-1" });
  assert.deepEqual(scopeOf(agentWorkspace), { kind: "AGENT", agentId: "agent-1" });
  assert.equal(workspaceHome(owner), "/");
  assert.equal(workspaceHome(agentWorkspace), "/agent");
  assert.equal(pathBelongsTo("/agent/leads", owner), false);
  assert.equal(pathBelongsTo("/properties", agentWorkspace), false);
  assert.equal(pathBelongsTo("/agent/properties/x", agentWorkspace), true);
  assert.equal(pathBelongsTo("/account", agentWorkspace), true);
  assert.equal(pathBelongsTo("/account", owner), true);
});

test("Navigation: each workspace shows its own sidebar and every link stays inside it", () => {
  const [owner, agentWorkspace] = workspacesFor([membership("org-1", "A")], agent);
  for (const workspace of [owner, agentWorkspace]) {
    for (const item of navigationFor(workspace)) assert.equal(pathBelongsTo(item.href, workspace), true, item.href);
  }
  assert.ok(navigationFor(owner).some((i) => i.href === "/inquiries"));
  assert.ok(navigationFor(agentWorkspace).some((i) => i.href === "/agent/leads"));
  assert.equal(isActivePath("/agent/leads", "/agent"), false);
  assert.equal(isActivePath("/properties/abc", "/properties"), true);
});

test("Inquiries: closed leads cannot move, others never go back to New", () => {
  assert.deepEqual(nextStatuses("CLOSED"), []);
  assert.ok(!nextStatuses("CONTACTED").includes("NEW"));
  assert.ok(nextStatuses("NEW").includes("LOST"));
  const groups = groupByStatus([{ id: "1", status: "NEW" }, { id: "2", status: "LOST" }]);
  assert.equal(groups.NEW.length, 1);
  assert.equal(groups.LOST.length, 1);
  assert.equal(groups.QUALIFIED.length, 0);
});

test("Viewings: partner actions depend on status and whether the slot has started", () => {
  const now = new Date("2026-10-08T02:00:00Z");
  assert.deepEqual(actionsFor({ status: "REQUESTED", scheduledAt: "2026-10-09T02:00:00Z" }, now), ["CONFIRM", "REQUEST_RESCHEDULE", "CANCEL"]);
  assert.deepEqual(actionsFor({ status: "CONFIRMED", scheduledAt: "2026-10-07T02:00:00Z" }, now), ["COMPLETE", "CANCEL"]);
  assert.deepEqual(actionsFor({ status: "COMPLETED", scheduledAt: "2026-10-07T02:00:00Z" }, now), []);
  assert.equal(dayKey("2026-10-08T17:00:00Z"), "2026-10-09");
});

test("Tour studio: a clicked point maps to a direction that projects back to the same pixel", () => {
  const view = { yaw: 35, pitch: -10, fov: 80, width: 1280, height: 720 };
  const direction = directionFromScreen({ x: 900, y: 250, ...view });
  const point = screenFromDirection({ yaw: direction.yaw, pitch: direction.pitch, viewYaw: view.yaw, viewPitch: view.pitch, fov: view.fov, width: view.width, height: view.height });
  assert.ok(point);
  assert.ok(Math.abs(point.x - 900) < 0.5);
  assert.ok(Math.abs(point.y - 250) < 0.5);
  const centre = directionFromScreen({ x: 640, y: 360, ...view });
  assert.ok(Math.abs(centre.yaw - 35) < 1e-6);
  assert.ok(Math.abs(centre.pitch + 10) < 1e-6);
});

test("Tour studio: panoramas must be 2:1 equirectangular JPEG, PNG, or WebP under 30MB", () => {
  assert.equal(panoramaProblem({ type: "image/jpeg", size: 10 * 1024 * 1024 }), null);
  assert.equal(panoramaProblem({ type: "image/webp", size: 10 * 1024 * 1024 }), null);
  assert.ok(panoramaProblem({ type: "image/gif", size: 1024 }));
  assert.ok(panoramaProblem({ type: "image/jpeg", size: 35 * 1024 * 1024 }));
  assert.equal(panoramaShapeProblem(4096, 2048), null);
  assert.ok(panoramaShapeProblem(4000, 3000));
  assert.ok(panoramaShapeProblem(1024, 512));
  assert.ok(panoramaShapeProblem(2000, 3000));
});

test("Sale wizard: location is required, internal price is optional and never negative", () => {
  const form = { ...emptyForm("SALE"), name: "Talamban house", areaLabel: "Talamban", cityLabel: "Cebu City" };
  assert.deepEqual(stepsFor("SALE"), ["Type", "Location", "Details", "Private terms"]);
  assert.ok(validateStep(form, 1).latitude);
  const located = { ...form, latitude: "10.3540", longitude: "123.9110" };
  assert.deepEqual(validateStep(located, 1), {});
  assert.deepEqual(locationFrom(located), { latitude: 10.354, longitude: 123.911, privacy: "APPROXIMATE" });
  assert.ok(validateStep({ ...located, askingPrice: "-5" }, 3).askingPrice);
  assert.deepEqual(validateStep({ ...located, askingPrice: "" }, 3), {});
  assert.equal(saleTermsFrom({ ...located, askingPrice: "18,500,000" }).askingPriceInternalCentavos, 1850000000);
  assert.equal(saleTermsFrom({ ...located, askingPrice: "" }).askingPriceInternalCentavos, null);
});

test("Sale wizard: a lot needs a lot area while other sale types need a floor area", () => {
  const base = { ...emptyForm("SALE"), title: "Corner lot", description: "A flat corner lot near the highway, clean title.", bedrooms: "0", bathrooms: "0" };
  assert.ok(validateStep({ ...base, propertyType: "LOT" }, 2).lotArea);
  assert.equal(validateStep({ ...base, propertyType: "LOT", lotArea: "300" }, 2).floorArea, undefined);
  assert.ok(validateStep({ ...base, propertyType: "HOUSE" }, 2).floorArea);
});

test("Rental wizard: coordinates stay optional for rentals", () => {
  const form = { ...emptyForm("RENT"), areaLabel: "Lahug", cityLabel: "Cebu City" };
  assert.deepEqual(validateStep(form, 1), {});
  assert.ok(validateStep({ ...form, latitude: "200", longitude: "10" }, 1).latitude);
});

test("Agent profile: verification can only be requested with a license, and only the platform verifies", () => {
  assert.deepEqual(validateAgentForm({ ...emptyAgentForm("Maria Santos") }), {});
  assert.ok(validateAgentForm({ ...emptyAgentForm("M") }).displayName);
  assert.ok(validateAgentForm({ ...emptyAgentForm("Maria"), licenseNumber: "bad license!" }).licenseNumber);
  const profile = { verificationState: "UNVERIFIED", licenseNumber: null };
  assert.equal(canRequestVerification(profile), false);
  assert.equal(canRequestVerification({ ...profile, licenseNumber: "PRC-12345" }), true);
  assert.equal(canRequestVerification({ ...profile, licenseNumber: "PRC-12345", verificationState: "VERIFIED" }), false);
  assert.equal(canRequestVerification({ ...profile, licenseNumber: "PRC-12345", verificationState: "PENDING" }), false);
});
