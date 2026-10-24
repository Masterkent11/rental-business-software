import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadSource, loadStore, deferred } from './helpers/load-store.mjs';

test('tenancy confirmation requires a deliberate review before delegating to the authorized API', async () => {
  const { ConfirmTenancyUseCase } = loadSource('application/use-cases/applications/applications.use-cases.ts');
  const calls = [];
  const useCase = new ConfirmTenancyUseCase({ confirmTenancy: async (...args) => calls.push(args) });
  await assert.rejects(useCase.execute('org', 'app', false), /Review/);
  assert.deepEqual(calls, []);
  await useCase.execute('org', 'app', true);
  assert.deepEqual(calls, [['org', 'app']]);
});

test('application scope switches clear confirmation state and ignore late responses', async () => {
  const first = deferred();
  const { useApplicationsStore: store } = loadStore('use-applications-store.ts', {
    loadApplicationsUseCase: { execute: async org => org === 'a' ? first.promise : [{ id: 'b', state: 'APPROVED' }] },
  });
  const pending = store.getState().loadApplications('a');
  store.getState().setConfirmingId('a');
  store.getState().setRequirementsReviewed(true);
  await store.getState().loadApplications('b');
  first.resolve([{ id: 'a' }]);
  await pending;
  assert.deepEqual(store.getState().applications, [{ id: 'b', state: 'APPROVED' }]);
  assert.equal(store.getState().confirmingId, null);
  assert.equal(store.getState().requirementsReviewed, false);
});

test('duplicate confirmation taps produce one command and reload authoritative tenancy state', async () => {
  const pending = deferred();
  let calls = 0;
  const { useApplicationsStore: store } = loadStore('use-applications-store.ts', {
    loadApplicationsUseCase: { execute: async () => [{ id: 'app', tenancy: { state: calls ? 'COMMITTED' : 'HELD' } }] },
    confirmTenancyUseCase: { execute: async () => { calls++; await pending.promise; } },
  });
  await store.getState().loadApplications('org');
  const result = store.getState().confirmTenancy('org', 'app', true);
  assert.equal(await store.getState().confirmTenancy('org', 'app', true), false);
  assert.equal(calls, 1);
  pending.resolve();
  assert.equal(await result, true);
  assert.equal(store.getState().applications[0].tenancy.state, 'COMMITTED');
});
