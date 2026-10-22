import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadStore, deferred } from './helpers/load-store.mjs';
import * as fixture from './fixtures/owner-dashboard.mjs';

test('properties suppress duplicate mutations and preserve activity when an action response omits it', async () => {
  const pending = deferred();
  let calls = 0;
  const listing = {...fixture.listings[0],activity:{views:12,inquiries:3,viewings:1}};
  const {useListingsStore:store} = loadStore('use-listings-store.ts', {
    loadListingsUseCase:{execute:async()=>[listing]},
    changeListingStateUseCase:{execute:()=>{calls++;return pending.promise;}},
  });
  await store.getState().load(fixture.org);
  const first = store.getState().runAction(fixture.org,listing,'UNPUBLISH');
  assert.equal(await store.getState().runAction(fixture.org,listing,'UNPUBLISH'),false);
  assert.equal(calls,1);
  pending.resolve({...fixture.listings[0],state:'UNPUBLISHED'});
  assert.equal(await first,true);
  assert.deepEqual(store.getState().listings[0].activity,listing.activity);
});

test('properties presentation and private rows reset on workspace switch', async () => {
  const {useListingsStore:store} = loadStore('use-listings-store.ts', {loadListingsUseCase:{execute:async()=>[]}});
  await store.getState().load(fixture.org);
  store.getState().setPresentation({page:3,view:'map',mappedId:'private-id'});
  store.getState().setDraftFilters({location:'Cebu City',propertyType:'CONDO'});
  store.getState().applyFilters();
  await store.getState().load(fixture.otherOrg);
  assert.equal(store.getState().page,1);
  assert.equal(store.getState().view,'list');
  assert.equal(store.getState().appliedFilters.location,'ALL');
  assert.equal(store.getState().draftFilters.propertyType,'ALL');
  assert.equal(store.getState().mappedId,'');
});

test('property filters are staged until Apply, reset pagination and clear both selections', () => {
  const {useListingsStore:store} = loadStore('use-listings-store.ts', {});
  store.getState().setPresentation({page:3});
  store.getState().setDraftFilters({location:'Davao City',sort:'VIEWS'});
  assert.equal(store.getState().appliedFilters.location,'ALL');
  store.getState().applyFilters();
  assert.equal(store.getState().appliedFilters.location,'Davao City');
  assert.equal(store.getState().page,1);
  store.getState().setDraftFilters({location:'Cebu City'});
  assert.equal(store.getState().appliedFilters.location,'Davao City');
  store.getState().clearFilters();
  assert.equal(store.getState().appliedFilters.location,'ALL');
  assert.equal(store.getState().draftFilters.sort,'NEWEST');
});
