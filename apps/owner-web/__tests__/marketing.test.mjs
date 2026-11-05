import test from "node:test";
import assert from "node:assert/strict";
import { loadSource, deferred } from "./helpers/load-store.mjs";
const { navigationFor } = loadSource("domain/workspace/navigation.ts");
const { validateMarketingFile } = loadSource("domain/marketing/marketing.ts");
test("marketing belongs only to Agent navigation with one sidebar destination", () => {
  const owner = navigationFor({ kind: "OWNER" }),
    agent = navigationFor({ kind: "AGENT" });
  assert.equal(
    owner.some((i) => i.href.includes("marketing")),
    false,
  );
  assert.equal(agent.filter((i) => i.href.includes("marketing")).length, 1);
  assert.equal(
    agent.find((i) => i.href.includes("marketing")).section,
    "Marketing",
  );
  assert.equal(
    agent.find((i) => i.href === "/agent/profile").label,
    "Agent Profile",
  );
});
test("file validation rejects unsupported and oversized files before reading", () => {
  assert.throws(() =>
    validateMarketingFile({ type: "image/svg+xml", size: 20 }),
  );
  assert.throws(() =>
    validateMarketingFile({ type: "image/jpeg", size: 9 * 1024 * 1024 }),
  );
  assert.doesNotThrow(() =>
    validateMarketingFile({ type: "video/mp4", size: 12 * 1024 * 1024 }),
  );
});
test("workspace changes erase marketing state and fence a late response", async () => {
  const pending = deferred();
  const { useMarketingStore: store } = loadSource(
    "stores/use-marketing-store.ts",
    { marketing: { load: () => pending.promise } },
  );
  store.getState().setScope("userA:agentA");
  const loading = store.getState().load();
  store.getState().setScope(null);
  pending.resolve({ drafts: [{ id: "private" }], media: [], properties: [] });
  await loading;
  assert.equal(store.getState().snapshot, null);
  assert.equal(store.getState().loading, false);
  assert.equal(store.getState().editorOpen, false);
});
test("a slower previous load cannot replace a fresh snapshot", async () => {
  const old = deferred(),
    fresh = deferred();
  let calls = 0;
  const { useMarketingStore: store } = loadSource(
    "stores/use-marketing-store.ts",
    {
      marketing: { load: () => (++calls === 1 ? old.promise : fresh.promise) },
    },
  );
  store.getState().setScope("A");
  const first = store.getState().load(),
    second = store.getState().load();
  fresh.resolve({ drafts: [{ id: "fresh" }], media: [], properties: [] });
  await second;
  old.resolve({ drafts: [{ id: "old" }], media: [], properties: [] });
  await first;
  assert.equal(store.getState().snapshot.drafts[0].id, "fresh");
});

test("a failed upload refreshes failed media without reporting success", async () => {
  const { useMarketingStore: store } = loadSource(
    "stores/use-marketing-store.ts",
    {
      marketing: {
        upload: async () => {
          throw new Error("Upload did not finish.");
        },
        load: async () => ({
          drafts: [],
          media: [{ id: "failed", state: "FAILED" }],
          properties: [],
        }),
      },
    },
  );
  store.getState().setScope("A");
  await store.getState().upload({});
  assert.equal(store.getState().snapshot.media[0].state, "FAILED");
  assert.equal(store.getState().problem, "Upload did not finish.");
  assert.equal(store.getState().busy, false);
});

test("draft title is optional and tab links open the composer only from Content", () => {
  const { emptyMarketingDraft, marketingDraftTitle, marketingHref } =
    loadSource("domain/marketing/marketing.ts");
  const draft = emptyMarketingDraft();
  assert.equal(marketingDraftTitle(draft), "Untitled draft");
  assert.equal(
    marketingDraftTitle({ ...draft, caption: " First line\nSecond line" }),
    "First line",
  );
  assert.equal(
    marketingDraftTitle({
      ...draft,
      title: " Custom title ",
      caption: "Caption",
    }),
    "Custom title",
  );
  assert.equal(
    marketingHref("posts", "new"),
    "/agent/marketing?tab=posts&draft=new",
  );
  assert.equal(
    marketingHref("overview", "new"),
    "/agent/marketing?tab=overview",
  );
});

test("one save can run at a time and a rejected save keeps edits recoverable", async () => {
  const pending = deferred();
  let calls = 0;
  const { useMarketingStore: store, isMarketingEditorDirty } = loadSource(
    "stores/use-marketing-store.ts",
    {
      marketing: {
        save: () => {
          calls++;
          return pending.promise;
        },
        load: async () => ({ drafts: [], media: [], properties: [] }),
      },
    },
  );
  store.getState().setScope("A");
  store.getState().edit();
  assert.equal(isMarketingEditorDirty(store.getState()), false);
  store.getState().field("caption", "Keep this caption");
  const save = store.getState().save();
  assert.equal(await store.getState().save(), false);
  assert.equal(calls, 1);
  pending.reject(new Error("Draft was updated by someone else."));
  assert.equal(await save, false);
  assert.equal(store.getState().problem, "Draft was updated by someone else.");
  assert.equal(store.getState().editor.caption, "Keep this caption");
  assert.equal(isMarketingEditorDirty(store.getState()), true);
});

test("a pending upload cannot attach private media after a workspace change", async () => {
  const pending = deferred();
  const { useMarketingStore: store } = loadSource(
    "stores/use-marketing-store.ts",
    { marketing: { upload: () => pending.promise } },
  );
  store.getState().setScope("A");
  store.getState().edit();
  const upload = store.getState().upload({ type: "image/png" }, true);
  store.getState().setScope("B");
  store.getState().edit();
  pending.resolve({ id: "private" });
  await upload;
  assert.equal(store.getState().editor.mediaIds.length, 0);
  assert.equal(store.getState().notice, null);
});
