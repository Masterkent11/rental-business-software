import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadStore, deferred } from './helpers/load-store.mjs';
import * as fixture from './fixtures/owner-dashboard.mjs';

const owner = {kind:'OWNER',organizationId:fixture.org};
const other = {kind:'OWNER',organizationId:fixture.otherOrg};
const noSubscription = {execute:()=>()=>{}};

test('analytics accepts only the newest same-scope response, including A/B/A switches', async () => {
  const requests = [];
  const {useAnalyticsStore:store} = loadStore('use-analytics-store.ts',{loadAnalyticsUseCase:{execute:()=>{const d=deferred();requests.push(d);return d.promise;}}});
  const first = store.getState().load(owner);
  const second = store.getState().load(other);
  const third = store.getState().load(owner);
  requests[2].resolve({...fixture.analytics,listings:[{title:'current'}]}); await third;
  requests[0].resolve(fixture.analytics); await first;
  requests[1].reject(new Error('old error')); await second;
  assert.equal(store.getState().data.listings[0].title,'current');
  assert.equal(store.getState().error,null);
});

test('message pagination cannot append old workspace messages to the current thread', async () => {
  const older = deferred();
  const conversation = fixture.conversations[0];
  const message = {id:'old',clientId:'old',conversationId:conversation.id,senderRole:'CUSTOMER',body:'private old thread',createdAt:'2026-10-01T00:00:00Z'};
  const {useMessagesStore:store} = loadStore('use-messages-store.ts',{
    watchMessagesUseCase:noSubscription,
    loadConversationsUseCase:{execute:async()=>({conversations:[],unreadTotal:0})},
    loadThreadUseCase:{execute:()=>older.promise},
  });
  await store.getState().start(owner);
  store.setState({activeId:conversation.id,thread:[{...message,id:'seed',clientId:'seed'}],hasMore:true});
  const request = store.getState().loadOlder();
  await store.getState().start(other);
  store.setState({activeId:'other-thread',thread:[]});
  older.resolve({messages:[message],conversation,hasMore:false});await request;
  assert.deepEqual(store.getState().thread,[]);
});

test('message send acknowledgement from the previous workspace is ignored', async () => {
  const sent = deferred();
  let loadCount = 0;
  const {useMessagesStore:store} = loadStore('use-messages-store.ts',{
    watchMessagesUseCase:noSubscription,
    loadConversationsUseCase:{execute:async()=>{loadCount++;return {conversations:[],unreadTotal:0};}},
    sendMessageUseCase:{execute:()=>sent.promise},
  });
  await store.getState().start(owner);
  store.setState({activeId:'thread-a',composer:'hello'});
  const request=store.getState().send();
  await store.getState().start(other);
  sent.resolve({id:'saved',clientId:'saved',conversationId:'thread-a',senderRole:'OWNER',body:'hello',createdAt:'2026-10-01T00:00:00Z'});await request;
  assert.equal(loadCount,2,'Old send completion refreshed the new workspace');
});

test('engagement old mutation failure cannot surface in a new workspace', async () => {
  const action = deferred();
  const {useEngagementStore:store} = loadStore('use-engagement-store.ts',{
    watchActivityUseCase:noSubscription,
    loadInquiriesUseCase:{execute:async()=>[]},loadViewingsUseCase:{execute:async()=>[]},
    moveInquiryUseCase:{execute:()=>action.promise},
  });
  await store.getState().start(owner);
  const request = store.getState().move({id:'lead-a'},'CONTACTED');
  await store.getState().start(other);
  action.reject(new Error('private old failure'));await request;
  assert.equal(store.getState().actionError,null);
});

test('notifications ignore a late old-organization response', async () => {
  const first = deferred();
  const {useNotificationsStore:store} = loadStore('use-notifications-store.ts',{
    watchNotificationsUseCase:noSubscription,
    loadNotificationsUseCase:{execute:scope=>scope.organizationId===fixture.org?first.promise:Promise.resolve({notifications:[],unreadCount:0})},
  });
  const request=store.getState().start(owner,'user');
  await store.getState().start(other,'user');
  first.resolve({notifications:[{id:'private-old'}],unreadCount:1});await request;
  assert.deepEqual(store.getState().items,[]);
  assert.equal(store.getState().unreadCount,0);
});

test('message open errors and read acknowledgements cannot affect a newly opened thread', async () => {
  const read = deferred();
  const conversation = fixture.conversations[0];
  const {useMessagesStore:store} = loadStore('use-messages-store.ts',{
    watchMessagesUseCase:noSubscription,
    loadConversationsUseCase:{execute:async()=>({conversations:[conversation],unreadTotal:2})},
    loadThreadUseCase:{execute:async()=>({messages:[],conversation,hasMore:false})},
    markConversationReadUseCase:{execute:()=>read.promise},
  });
  await store.getState().start(owner);
  const first=store.getState().open(conversation.id);
  await Promise.resolve();
  store.getState().close();
  store.setState({unreadTotal:7});
  read.reject(new Error('old read error'));await first;
  assert.equal(store.getState().unreadTotal,7);
  assert.equal(store.getState().threadError,null);
  assert.equal(store.getState().activeConversation,null);
});

test('stopped message subscriptions cannot deliver into a later lifetime', async () => {
  const callbacks=[];
  const {useMessagesStore:store} = loadStore('use-messages-store.ts',{
    watchMessagesUseCase:{execute:(_scope,onMessage,onStatus)=>{callbacks.push({onMessage,onStatus});return ()=>{};}},
    loadConversationsUseCase:{execute:async()=>({conversations:[],unreadTotal:0})},
  });
  await store.getState().start(owner);
  await store.getState().start(other);
  callbacks[0].onMessage({id:'old',senderRole:'CUSTOMER',body:'private',conversationId:'old'});
  callbacks[0].onStatus('offline');
  assert.equal(store.getState().lastIncoming,null);
  assert.equal(store.getState().realtime,'connecting');
});

test('engagement loaders reject old A responses after A/B/A and retain current form state', async () => {
  const old=deferred();let calls=0;
  const {useEngagementStore:store} = loadStore('use-engagement-store.ts',{
    watchActivityUseCase:noSubscription,
    loadInquiriesUseCase:{execute:()=>++calls===1?old.promise:Promise.resolve([{id:'current'}])},
    loadViewingsUseCase:{execute:async()=>[]},
  });
  const first=store.getState().start(owner);
  await store.getState().start(other);
  await store.getState().start(owner);
  store.getState().setViewingNote('current form');
  old.resolve([{id:'private-old'}]);await first;
  assert.equal(store.getState().inquiries[0].id,'current');
  assert.equal(store.getState().viewingNote,'current form');
  store.getState().stop();
  assert.deepEqual(store.getState().inquiries,[]);
  assert.equal(store.getState().viewingNote,'');
});

test('dashboard reset invalidates pending financial data and preserves direct collection loading', async () => {
  const old=deferred();let calls=0;
  const {useDashboardStore:store} = loadStore('use-dashboard-store.ts',{
    loadDashboardUseCase:{execute:()=>++calls===1?old.promise:Promise.resolve(fixture.collection)},
  });
  const request=store.getState().loadCollection(fixture.org);
  store.getState().reset();
  old.resolve({...fixture.collection,receivedCentavos:9});await request;
  assert.equal(store.getState().collection,null);
  assert.equal(store.getState().organizationId,null);
  await store.getState().loadCollection(fixture.org);
  assert.equal(store.getState().collection.receivedCentavos,1850000);
});

test('dashboard retains only the latest org previews and does not turn failed collections into zero', async () => {
  const old=deferred();
  const {useDashboardStore:store} = loadStore('use-dashboard-store.ts',{
    loadDashboardUseCase:{execute:async()=>{throw new Error('money unavailable');}},
    loadListingsUseCase:{execute:org=>org===fixture.org?old.promise:Promise.resolve([])},
    loadBookingsUseCase:{execute:async()=>({items:[],total:0})},
  });
  const first=store.getState().load(fixture.org);
  await store.getState().load(fixture.otherOrg);
  old.resolve(fixture.listings);await first;
  assert.deepEqual(store.getState().listings,[]);
  assert.equal(store.getState().collection,null);
  assert.equal(store.getState().collectionError,'money unavailable');
  assert.equal(store.getState().loading,false);
});

test('booking list responses and closed detail requests cannot restore another organization data', async () => {
  const old=deferred(), detail=deferred();
  const {useBookingsStore:store} = loadStore('use-bookings-store.ts',{
    loadBookingsUseCase:{execute:org=>org===fixture.org?old.promise:Promise.resolve({items:[],total:0})},
    loadBookingUseCase:{execute:()=>detail.promise},
  });
  const first=store.getState().load(fixture.org);
  await store.getState().load(fixture.otherOrg);
  old.resolve({items:[fixture.booking],total:1});await first;
  assert.deepEqual(store.getState().items,[]);
  const selected=store.getState().select(fixture.otherOrg,fixture.bookingId);
  await store.getState().select(fixture.otherOrg,null);
  detail.resolve(fixture.booking);await selected;
  assert.equal(store.getState().selected,null);
});

test('listing responses and actions from prior organizations cannot replace current rows', async () => {
  const old=deferred(), action=deferred();let loads=0;
  const {useListingsStore:store} = loadStore('use-listings-store.ts',{
    loadListingsUseCase:{execute:()=>++loads===1?old.promise:Promise.resolve([])},
    changeListingStateUseCase:{execute:()=>action.promise},
  });
  const first=store.getState().load(fixture.org);
  await store.getState().load(fixture.otherOrg);
  old.resolve(fixture.listings);await first;
  assert.deepEqual(store.getState().listings,[]);
  const change=store.getState().runAction(fixture.otherOrg,fixture.listings[0],'PUBLISH');
  store.getState().reset();
  action.resolve(fixture.listings[0]);
  assert.equal(await change,false);
  assert.deepEqual(store.getState().listings,[]);
});

test('replayed realtime messages increment unread counts only once', async () => {
  const conversation=fixture.conversations[0];
  const {useMessagesStore:store}=loadStore('use-messages-store.ts',{
    watchMessagesUseCase:noSubscription,
    loadConversationsUseCase:{execute:async()=>({conversations:[conversation],unreadTotal:2})},
  });
  await store.getState().start(owner);
  const message={id:'new-message',clientId:'new-message',conversationId:conversation.id,senderRole:'CUSTOMER',body:'new',createdAt:'2026-10-22T00:00:00Z'};
  store.getState().receive(message);store.getState().receive(message);
  assert.equal(store.getState().unreadTotal,3);
  assert.equal(store.getState().conversations[0].unreadCount,3);
});

test('booking pagination and bucket presets preserve their public command arguments on first load', async () => {
  const queries=[];
  const {useBookingsStore:store}=loadStore('use-bookings-store.ts',{
    loadBookingsUseCase:{execute:async(org,query)=>{queries.push({org,query});return {items:[],total:0};}},
  });
  await store.getState().goToPage(fixture.org,2);
  assert.equal(queries[0].query.offset,40);
  await store.getState().setBucket(fixture.otherOrg,'UPCOMING');
  assert.equal(queries[1].query.bucket,'UPCOMING');
  assert.equal(queries[1].query.offset,0);
});
