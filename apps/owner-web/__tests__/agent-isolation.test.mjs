import test from "node:test";
import assert from "node:assert/strict";
import { loadSources, deferred } from "./helpers/load-store.mjs";

const agent = id => ({ user: {id}, memberships: [], workspaces: [{kind:"AGENT",key:"agent",agentId:id,title:id,subtitle:"Agent workspace",verified:false}], activeWorkspaceKey:"agent", agent:{id} });
const owner = { user:{id:"owner"}, memberships:[], workspaces:[{kind:"OWNER",key:"owner:one",organizationId:"one",title:"One"}], activeWorkspaceKey:"owner:one", agent:null };
function fixture(adapters = {}) {
  let current = agent("A");
  const container = { getCurrentSessionUseCase:{execute:async()=>current}, refreshSessionUseCase:{execute:async()=>current}, signOutUseCase:{execute:async()=>{}}, switchWorkspaceUseCase:{execute:()=>{}}, ...adapters };
  const [{useAgentStore:store},{useSessionStore:session}] = loadSources(["stores/use-agent-store.ts","stores/use-session-store.ts"],container);
  return {store,session,select:value=>{current=value;}};
}

test("Agent A late dashboard cannot appear after logout and Agent B login", async()=>{
  const pending=deferred(),f=fixture({loadAgentDashboardUseCase:{execute:()=>pending.promise}});
  await f.session.getState().initialize();
  const load=f.store.getState().loadDashboard();
  await f.session.getState().signOut();f.select(agent("B"));await f.session.getState().initialize();
  pending.resolve({agent:{id:"A"},privateMarker:"A ONLY"});await load;
  assert.equal(f.store.getState().dashboard,null);
  assert.equal(f.store.getState().profile,null);
  assert.deepEqual(f.store.getState().clients,[]);
});

test("only the latest same account Agent read may commit",async()=>{
  const a=deferred(),b=deferred();let calls=0;
  const f=fixture({loadAgentDashboardUseCase:{execute:()=>++calls===1?a.promise:b.promise}});
  await f.session.getState().initialize();const old=f.store.getState().loadDashboard(),fresh=f.store.getState().loadDashboard();
  b.resolve({agent:{id:"A"},revision:2});await fresh;a.resolve({agent:{id:"A"},revision:1});await old;
  assert.equal(f.store.getState().dashboard.revision,2);
});

test("old Agent mutation acknowledgement cannot update the new account or report success",async()=>{
  const pending=deferred(),f=fixture({createAgentTaskUseCase:{execute:()=>pending.promise}});
  await f.session.getState().initialize();f.store.getState().setTaskField("taskTitle","Private A task");
  const save=f.store.getState().addTask();await f.session.getState().signOut();f.select(agent("B"));await f.session.getState().initialize();
  pending.resolve({id:"privateA",dueAt:new Date().toISOString()});assert.equal(await save,false);
  assert.deepEqual(f.store.getState().tasks,[]);assert.equal(f.store.getState().saving,false);
});

test("Owner context cannot load the Agent dashboard",async()=>{
  let calls=0;const f=fixture({loadAgentDashboardUseCase:{execute:async()=>{calls++;return {};}}});
  f.select(owner);await f.session.getState().initialize();await f.store.getState().loadDashboard();assert.equal(calls,0);
});

test("workspace switch revalidates and refuses revoked membership",async()=>{
  let remembered=0;const f=fixture({switchWorkspaceUseCase:{execute:()=>remembered++}});
  await f.session.getState().initialize();f.select({...agent("A"),workspaces:[],activeWorkspaceKey:null,agent:null});
  assert.equal(await f.session.getState().setWorkspace("agent"),false);
  assert.equal(f.session.getState().activeWorkspace,null);assert.equal(remembered,0);
});

test("a forged workspace key cannot create an organization or start a switch",async()=>{
  let reads=0;const f=fixture({refreshSessionUseCase:{execute:async()=>{reads++;return owner;}}});
  f.select(owner);await f.session.getState().initialize();
  assert.equal(await f.session.getState().setWorkspace("owner:foreign"),false);
  assert.equal(f.session.getState().activeWorkspace.organizationId,"one");assert.equal(reads,0);
});

test("logout during workspace revalidation cannot restore a previous identity",async()=>{
  const pending=deferred(),f=fixture({refreshSessionUseCase:{execute:()=>pending.promise}});
  await f.session.getState().initialize();const switching=f.session.getState().setWorkspace("agent");await f.session.getState().signOut();
  pending.resolve(agent("A"));assert.equal(await switching,false);assert.equal(f.session.getState().user,null);assert.equal(f.session.getState().workspaceBusy,false);
});

test("auth identity signout event clears Agent private state immediately",async()=>{
  let notify;const f=fixture({watchSessionUseCase:{execute:callback=>{notify=callback;return()=>{};}}});
  await f.session.getState().initialize();f.store.setState({dashboard:{agent:{id:"A"}},clients:[{customerId:"private"}]});
  const stop=f.session.getState().watchIdentity();notify(null);
  assert.equal(f.session.getState().status,"unauthenticated");assert.equal(f.store.getState().dashboard,null);assert.deepEqual(f.store.getState().clients,[]);stop();
});
