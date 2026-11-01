import { test } from "node:test";
import assert from "node:assert/strict";
import { loadSources } from "./helpers/load-store.mjs";
const [domain, app] = loadSources([
  "domain/workspace/partner-shell.ts",
  "application/use-cases/partner/partner-shell.use-cases.ts",
]);
const agent = {
  kind: "AGENT",
  key: "agent",
  agentId: "agent-a",
  title: "Agent",
  subtitle: "Agent workspace",
  verified: false,
};
const owner = {
  kind: "OWNER",
  key: "owner:a",
  organizationId: "org-a",
  title: "Partner",
  subtitle: "Owner workspace",
  verified: true,
};
test("search destinations and navigation remain within portal boundaries", () => {
  assert.equal(
    domain.partnerResultHref(owner, "PROPERTY", "listing-a"),
    "/properties/listing-a",
  );
  assert.equal(
    domain.partnerResultHref(agent, "INQUIRY", "lead-a"),
    "/agent/leads?inquiry=lead-a",
  );
  assert.equal(
    domain.navigationMatches(agent, "mark")[0].href,
    "/agent/marketing",
  );
  assert.deepEqual(domain.navigationMatches(owner, "mark"), []);
  assert.deepEqual(domain.navigationMatches(owner, "p"), []);
});
test("search uses current scope, abort signal and canonical route for each result", async () => {
  const signal = new AbortController().signal;
  const actions = new app.PartnerShellUseCases(
    {
      search: async (scope, query, s) => {
        assert.deepEqual(scope, { kind: "AGENT", agentId: "agent-a" });
        assert.equal(s, signal);
        assert.equal(query, "cebu");
        return [
          {
            id: "task-a",
            kind: "TASK",
            title: "Cebu callback",
            subtitle: "Task",
          },
        ];
      },
    },
    {},
  );
  assert.equal(
    (await actions.search(agent, "cebu", signal))[0].href,
    "/agent/tasks#search-task-task-a",
  );
});
test("image validation rejects invalid files before reading or uploading and uses Owner scope", async () => {
  let reads = 0,
    uploads = 0;
  const actions = new app.PartnerShellUseCases(
    {
      saveLogo: async (scope, input) => {
        uploads++;
        assert.deepEqual(scope, { kind: "OWNER", organizationId: "org-a" });
        return { logo: input ? "normalized" : null, canEdit: true };
      },
    },
    {
      readBase64: async () => {
        reads++;
        return "raw";
      },
    },
  );
  await assert.rejects(
    actions.upload(owner, { type: "image/svg+xml", size: 300 }),
  );
  await assert.rejects(
    actions.upload(owner, { type: "image/png", size: 3 * 1024 * 1024 }),
  );
  assert.equal(reads, 0);
  assert.equal(uploads, 0);
  await actions.upload(owner, { type: "image/png", size: 300 });
  assert.equal(reads, 1);
  assert.equal(uploads, 1);
  assert.equal((await actions.remove(owner)).logo, null);
});
const [storeModule] = loadSources(["stores/partner-shell-store.ts"], {
  partnerShell: {},
});
const wait = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));
const deferred = () => {
  let resolve;
  const promise = new Promise((yes) => {
    resolve = yes;
  });
  return { promise, resolve };
};
test("search debounce cancels previous query and ignores late results", async () => {
  const first = deferred(),
    second = deferred();
  let calls = 0;
  const store = storeModule.createPartnerShellStore(agent, {
    search: async (_w, q) => {
      calls++;
      return q === "old" ? first.promise : second.promise;
    },
  });
  store.getState().search("o");
  await wait(280);
  assert.equal(calls, 0);
  store.getState().search("old");
  await wait(280);
  store.getState().search("new");
  await wait(280);
  first.resolve([
    {
      id: "foreign",
      kind: "TASK",
      title: "Old account result",
      subtitle: "",
      href: "/agent/tasks",
    },
  ]);
  await wait(5);
  assert.equal(store.getState().results.length, 0);
  second.resolve([
    {
      id: "own",
      kind: "TASK",
      title: "New result",
      subtitle: "",
      href: "/agent/tasks",
    },
  ]);
  await wait(5);
  assert.equal(store.getState().results[0].id, "own");
  store.getState().dispose();
});
test("disposal synchronously clears branding and results and ignores late logo upload", async () => {
  const upload = deferred();
  const store = storeModule.createPartnerShellStore(owner, {
    branding: async () => ({ logo: "old", canEdit: true }),
    upload: async () => upload.promise,
  });
  await store.getState().loadBranding();
  const pending = store.getState().upload({});
  store.getState().dispose();
  assert.equal(store.getState().branding, null);
  assert.deepEqual(store.getState().results, []);
  upload.resolve({ logo: "late", canEdit: true });
  assert.equal(await pending, false);
  assert.equal(store.getState().branding, null);
});
test("search failure preserves role appropriate shortcuts and exposes explicit error", async () => {
  const store = storeModule.createPartnerShellStore(agent, {
    search: async () => {
      throw new Error("Unavailable");
    },
  });
  store.getState().search("mark");
  await wait(280);
  assert.equal(store.getState().results[0].href, "/agent/marketing");
  assert.equal(store.getState().searchError, "Unavailable");
  assert.equal(store.getState().searchBusy, false);
  store.getState().dispose();
});
