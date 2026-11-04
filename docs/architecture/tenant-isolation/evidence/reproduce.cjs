const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict');
const root='/Users/admin/Documents/GitHub/rental-business-software';
const ts=require(root+'/apps/owner-web/node_modules/typescript');
const {create}=require(root+'/apps/owner-web/node_modules/zustand');
const results=[];
function loader(base,overrides={},stubs={}) {
 const cache=new Map();
 function load(file){
  if(cache.has(file))return cache.get(file).exports;
  const mod={exports:{}};cache.set(file,mod);
  const source=overrides[file]??fs.readFileSync(file,'utf8');
  const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  function req(name){
   if(name in stubs)return stubs[name];
   if(name.startsWith('@/'))return load(path.join(base,'src',name.slice(2)));
   if(name.startsWith('.')){let f=path.resolve(path.dirname(file),name);if(!f.endsWith('.ts'))f+='.ts';return load(f);}
   return require(name);
  }
  new Function('require','module','exports',compiled)(req,mod,mod.exports);return mod.exports;
 }
 return load;
}
function check(name,fn){return Promise.resolve().then(fn).then(()=>results.push({name,result:'PASS'}));}
(async()=>{
 const web=root+'/apps/owner-web',api=root+'/apps/api';
 const head=file=>cp.execFileSync('git',['show','HEAD:'+path.relative(root,file)],{cwd:root,encoding:'utf8'});
 const session=create(()=>({status:'authenticated',user:{id:'A'},activeWorkspace:{kind:'AGENT',key:'agent',agentId:'agentA'}}));
 let complete;const pending=new Promise(r=>complete=r);
 const file=web+'/stores/use-agent-store.ts';
 const store=loader(web,{[file]:head(file)},{zustand:{create},'../infrastructure/composition/owner-web-container':{container:{loadAgentDashboardUseCase:{execute:()=>pending}}},'./use-session-store':{useSessionStore:session}})(file).useAgentStore;
 await check('HEAD baseline late Agent A response repopulates store after logout and Agent B login',async()=>{
  const wait=store.getState().loadDashboard();
  session.setState({status:'unauthenticated',user:null,activeWorkspace:null});
  session.setState({status:'authenticated',user:{id:'B'},activeWorkspace:{kind:'AGENT',key:'agent',agentId:'agentB'}});
  complete({agent:{id:'agentA'},privateMarker:'A_ONLY'});await wait;
  assert.equal(store.getState().dashboard.privateMarker,'A_ONLY');
 });
 const app=loader(api);
 const principal={userId:'A',displayName:'A',organizationId:null,capabilities:[]};
 const agent={id:'agentA',userId:'A',displayName:'A',verificationState:'SUSPENDED'};
 const dashboardFile=api+'/src/application/agents/agent-dashboard/agent-dashboard.use-case.ts';
 const baseline=loader(api,{[dashboardFile]:head(dashboardFile)})(dashboardFile).getAgentDashboard;
 await check('HEAD baseline dashboard accepts capability revoked and suspended own Agent profile',async()=>{
  const value=await baseline({findByUser:async()=>agent,responseSamples:async()=>[]},{listForAgent:async()=>[]},{listForAgent:async()=>[]},{list:async()=>[]},{listForAgent:async()=>[]},{now:()=>new Date('2026-11-01T00:00:00Z')})({principal});
  assert.equal(value.agent.verificationState,'SUSPENDED');
 });
 const {partnerListingGate}=app(api+'/src/application/identity/partner-access.rules.ts');
 await check('Current listing gate accepts ACTIVE representation whose validity expired',async()=>{
  const result=await partnerListingGate({currentForAgentListing:async()=>({state:'ACTIVE',organizationId:'ownerA',permissions:{canEditListing:true},terms:{validUntil:new Date('2000-01-01')}})})({principal:{...principal,capabilities:[{capability:'AGENT',organizationId:null}]},organizationId:null,listingId:'listingA',permission:'canEditListing'});
  assert.equal(result.role,'AGENT');
 });
 const {resolvePrincipal}=app(api+'/src/application/identity/resolve-principal/resolve-principal.use-case.ts');
 await check('Resolver denies foreign organization membership despite scoped capability',async()=>{
  await assert.rejects(resolvePrincipal({verify:async()=>({userId:'A'})},{loadPrincipal:async()=>({profile:{displayName:'A'},capabilities:[{capability:'OWNER',organizationId:'ownerA'}],isMember:false})})({authorization:'Bearer synthetic',organizationId:'ownerB'}),/Not a member/);
 });
 await check('Resolver returns principal after inactive profile remains unavailable',async()=>{
  const result=await resolvePrincipal({verify:async()=>({userId:'A'})},{loadPrincipal:async()=>({profile:null,capabilities:[{capability:'OWNER',organizationId:'ownerA'}],isMember:true}),createProfile:async()=>{}})({authorization:'Bearer synthetic',organizationId:'ownerA'});
  assert.equal(result.userId,'A');assert.equal(result.capabilities[0].capability,'OWNER');
 });
 await check('Owner scoped capability cannot authorize another Owner tenant',()=>{
  const {assertMayManageOrganization}=app(api+'/src/application/identity/application-authorization.rules.ts');
  assert.throws(()=>assertMayManageOrganization({...principal,capabilities:[{capability:'OWNER',organizationId:'ownerA'}]},'ownerB'));
 });
 const workspace=loader(web)(web+'/domain/workspace/workspace.ts');
 await check('Foreign remembered workspace key cannot create Owner B or Agent membership',()=>{
  const workspaces=workspace.workspacesFor([{organizationId:'ownerA',organizationName:'A',role:'OWNER',verified:true}],null);
  assert.equal(workspace.chooseWorkspace(workspaces,'owner:ownerB').key,'owner:ownerA');
  assert.equal(workspaces.some(w=>w.kind==='AGENT'),false);
  assert.equal(workspace.pathBelongsTo('/agent',workspaces[0]),false);
 });
 fs.writeFileSync(root+'/docs/architecture/tenant-isolation/evidence/reproduction-results.json',JSON.stringify({boundary:'Source level synthetic fixtures. Observed vulnerability assertions passing means the gap was reproduced, not that security acceptance passed. No live account, DB or provider writes.',baseline:cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),results},null,2)+'\n');
 console.log(results);
})().catch(e=>{console.error(e);process.exitCode=1;});
