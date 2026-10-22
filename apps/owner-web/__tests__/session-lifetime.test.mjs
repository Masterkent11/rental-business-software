import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadStore,deferred} from './helpers/load-store.mjs';

const session = (name) => ({user:{id:name,displayName:name},memberships:[],workspaces:[],agent:null,activeWorkspaceKey:null});

test('a late initialization cannot restore identity after sign-out', async () => {
  const pending=deferred();
  const {useSessionStore:store}=loadStore('use-session-store.ts',{
    getCurrentSessionUseCase:{execute:()=>pending.promise},signOutUseCase:{execute:async()=>{}},
  });
  const init=store.getState().initialize();
  await store.getState().signOut();
  pending.resolve(session('old'));await init;
  assert.equal(store.getState().status,'unauthenticated');
  assert.equal(store.getState().user,null);
});

test('a refresh from the previous identity cannot replace a new sign-in', async () => {
  const pending=deferred();
  const {useSessionStore:store}=loadStore('use-session-store.ts',{
    refreshSessionUseCase:{execute:()=>pending.promise},signOutUseCase:{execute:async()=>{}},
    signInUseCase:{execute:async()=>session('new')},
  });
  const refresh=store.getState().reload();
  await store.getState().signOut();
  store.setState({signInEmail:'synthetic@example.com',signInPassword:'synthetic-test-password'});
  await store.getState().submitSignIn();
  pending.resolve(session('old'));await refresh;
  assert.equal(store.getState().user.id,'new');
});

test('duplicate sign-in taps invoke authentication once', async () => {
  const pending=deferred();let calls=0;
  const {useSessionStore:store}=loadStore('use-session-store.ts',{
    signInUseCase:{execute:()=>{calls++;return pending.promise;}},
  });
  store.setState({signInEmail:'synthetic@example.com',signInPassword:'synthetic-test-password'});
  const first=store.getState().submitSignIn();const second=store.getState().submitSignIn();
  pending.resolve(session('new'));await Promise.all([first,second]);
  assert.equal(calls,1);
});
