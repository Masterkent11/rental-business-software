import test from "node:test";
import assert from "node:assert/strict";
import { mergeMessages, upsertConversation } from "../domain/messaging/conversation.ts";
import { allowedActions, photoProblem } from "../domain/listings/listing.ts";
import { emptyForm, listingDetailsFrom, validateStep } from "../domain/listings/listing-form.ts";

const message = (over) => ({
  id: "m1",
  conversationId: "c1",
  senderRole: "CUSTOMER",
  body: "Hello",
  clientId: "k1",
  createdAt: "2027-01-01T10:00:00.000Z",
  ...over,
});

test("Realtime: an echoed message replaces its optimistic copy instead of duplicating it", () => {
  const optimistic = { ...message({ id: "local-k9", clientId: "k9", senderRole: "OWNER" }), delivery: "sending" };
  const merged = mergeMessages([optimistic], [message({ id: "m9", clientId: "k9", senderRole: "OWNER", createdAt: "2027-01-01T10:00:01.000Z" })]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].id, "m9");
  assert.equal(merged[0].delivery, "sent");
});

test("Realtime: duplicate events and API responses for the same message collapse to one", () => {
  const first = mergeMessages([], [message()]);
  const again = mergeMessages(first, [message(), message()]);
  assert.equal(again.length, 1);
});

test("Realtime: messages are ordered by server time even when events arrive out of order", () => {
  const merged = mergeMessages([], [
    message({ id: "b", clientId: "kb", createdAt: "2027-01-01T10:00:05.000Z" }),
    message({ id: "a", clientId: "ka", createdAt: "2027-01-01T10:00:01.000Z" }),
    message({ id: "c", clientId: "kc", createdAt: "2027-01-01T10:00:09.000Z" }),
  ]);
  assert.deepEqual(merged.map((m) => m.id), ["a", "b", "c"]);
});

test("Inbox: the conversation with the newest message moves to the top", () => {
  const list = [
    { id: "x", lastMessageAt: "2027-01-01T09:00:00.000Z" },
    { id: "y", lastMessageAt: "2027-01-01T08:00:00.000Z" },
  ];
  const updated = upsertConversation(list, { id: "y", lastMessageAt: "2027-01-01T11:00:00.000Z" });
  assert.deepEqual(updated.map((c) => c.id), ["y", "x"]);
});

test("Listings: lifecycle actions follow the listing state", () => {
  assert.deepEqual(allowedActions("DRAFT"), ["PUBLISH", "ARCHIVE"]);
  assert.deepEqual(allowedActions("PUBLISHED"), ["UNPUBLISH"]);
  assert.deepEqual(allowedActions("ARCHIVED"), []);
});

test("Photos: type, size and count are validated before upload", () => {
  assert.equal(photoProblem({ type: "image/jpeg", size: 1000 }, 0), null);
  assert.match(photoProblem({ type: "image/gif", size: 1000 }, 0), /JPEG/);
  assert.match(photoProblem({ type: "image/png", size: 11 * 1024 * 1024 }, 0), /10 MB/);
  assert.match(photoProblem({ type: "image/webp", size: 1000 }, 12), /up to 12/);
});

test("Wizard: each step validates only its own fields", () => {
  const form = emptyForm();
  assert.ok(validateStep(form, 0).name);
  assert.deepEqual(validateStep({ ...form, name: "Skyline" }, 0), {});
  assert.ok(validateStep({ ...form, areaLabel: "" }, 1).areaLabel);
  assert.ok(validateStep({ ...form, price: "0" }, 3).price);
  assert.ok(validateStep({ ...form, price: "2800", minStayNights: "0" }, 3).minStayNights);
});

test("Wizard: pesos convert to integer centavos and mode-specific fields are normalised", () => {
  const nightly = listingDetailsFrom({ ...emptyForm(), title: "Studio", price: "2,800.50", cleaningFee: "500" });
  assert.equal(nightly.priceCentavos, 280050);
  assert.equal(nightly.cleaningFeeCentavos, 50000);
  assert.equal(nightly.advanceMonths, 0);
  const monthly = listingDetailsFrom({ ...emptyForm(), rentalMode: "LONG_TERM", price: "18000", cleaningFee: "500" });
  assert.equal(monthly.cleaningFeeCentavos, 0);
  assert.equal(monthly.minStayNights, null);
  assert.equal(monthly.depositMonths, 2);
});
