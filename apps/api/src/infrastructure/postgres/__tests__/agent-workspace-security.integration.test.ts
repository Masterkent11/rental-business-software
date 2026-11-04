import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { postgresUserRepository } from '@/infrastructure/postgres/repositories/postgres-user.repository.ts';
import { postgresAgentTaskRepository } from '@/infrastructure/postgres/repositories/postgres-agent-task.repository.ts';
import { resolvePrincipal, OrganizationForbiddenError, UnauthenticatedError } from '@/application/identity/resolve-principal/resolve-principal.use-case.ts';
import { sql, withUser } from '@/infrastructure/postgres/db.ts';

const local = Boolean(process.env.TEST_ADMIN_DATABASE_URL && ['localhost','127.0.0.1'].includes(new URL(process.env.TEST_ADMIN_DATABASE_URL).hostname));
const suite = local ? describe : describe.skip;
const ownerA = randomUUID(), ownerB = randomUUID(), agentA = randomUUID(), agentB = randomUUID();
const orgA = randomUUID(), orgB = randomUUID(), profileA = randomUUID(), profileB = randomUUID();
const users = postgresUserRepository(), tasks = postgresAgentTaskRepository();
const resolve = (userId: string) => resolvePrincipal({ verify: async () => ({ userId, email: null, mobile: null }) }, users);

suite('Agent and Owner actual PostgreSQL authority', {timeout: 30000}, () => {
  let admin: ReturnType<typeof postgres>;
  beforeAll(async () => {
    admin = postgres(process.env.TEST_ADMIN_DATABASE_URL!, {max:1});
    for (const id of [ownerA,ownerB,agentA,agentB]) await admin`insert into user_profiles(id,display_name) values (${id},'Synthetic partner')`;
    await admin`insert into organizations(id,legal_name,trading_name,state) values (${orgA},'Synthetic Owner A','Owner A','VERIFIED'),(${orgB},'Synthetic Owner B','Owner B','VERIFIED')`;
    await admin`insert into organization_members(user_id,organization_id,role) values (${ownerA},${orgA},'OWNER'),(${ownerB},${orgB},'OWNER')`;
    await admin`insert into user_capabilities(user_id,organization_id,capability,source_type) values (${ownerA},${orgA},'OWNER','MEMBERSHIP'),(${ownerB},${orgB},'OWNER','MEMBERSHIP'),(${agentA},null,'AGENT','REGISTRATION'),(${agentB},null,'AGENT','REGISTRATION')`;
    await admin`insert into agent_profiles(id,user_id,display_name,headline) values (${profileA},${agentA},'Synthetic Agent A','Agent'),(${profileB},${agentB},'Synthetic Agent B','Agent')`;
    await admin`insert into agent_tasks(agent_id,title,due_at) values (${profileA},'A private follow up',now()),(${profileB},'B private follow up',now())`;
  });
  afterAll(async () => {
    if (admin) {
      await admin`delete from agent_tasks where agent_id in (${profileA},${profileB})`;
      await admin`delete from agent_profiles where id in (${profileA},${profileB})`;
      await admin`delete from user_capabilities where user_id in (${ownerA},${ownerB},${agentA},${agentB})`;
      await admin`delete from organization_members where user_id in (${ownerA},${ownerB})`;
      await admin`delete from user_profiles where id in (${ownerA},${ownerB},${agentA},${agentB})`;
      await admin`delete from organizations where id in (${orgA},${orgB})`;
      await admin.end({timeout:3});
    }
    await sql.end({timeout:3});
  });
  it('resolves Owner A own organization and refuses Owner B',async()=>{
    expect((await resolve(ownerA)({authorization:'Bearer synthetic',organizationId:orgA})).organizationId).toBe(orgA);
    await expect(resolve(ownerA)({authorization:'Bearer synthetic',organizationId:orgB})).rejects.toBeInstanceOf(OrganizationForbiddenError);
  });
  it('Owner only identity cannot request Agent context and Agent cannot request Owner organization',async()=>{
    await expect(resolve(ownerA)({authorization:'Bearer synthetic',organizationId:null,requiredCapability:'AGENT'})).rejects.toBeInstanceOf(OrganizationForbiddenError);
    await expect(resolve(agentA)({authorization:'Bearer synthetic',organizationId:orgA})).rejects.toBeInstanceOf(OrganizationForbiddenError);
  });
  it('Agent A and B private tasks remain isolated by repository and raw RLS',async()=>{
    const principal=await resolve(agentA)({authorization:'Bearer synthetic',organizationId:null,requiredCapability:'AGENT'});
    expect(principal.userId).toBe(agentA);
    expect((await tasks.list(agentA,false)).map(t=>t.title)).toEqual(['A private follow up']);
    expect((await tasks.list(agentB,false)).map(t=>t.title)).toEqual(['B private follow up']);
    const rows=await withUser(agentA,tx=>tx`select title from agent_tasks where agent_id = ${profileB}`);
    expect(rows).toHaveLength(0);
  });
  it('revoked Agent capability and suspended Agent profile fail current API context',async()=>{
    await admin`update user_capabilities set revoked_at=now() where user_id=${agentA} and capability='AGENT'`;
    await expect(resolve(agentA)({authorization:'Bearer synthetic',organizationId:null,requiredCapability:'AGENT'})).rejects.toBeInstanceOf(OrganizationForbiddenError);
    await admin.begin(async tx=>{
      await tx`select set_config('app.verification_actor',${ownerA},true)`;
      await tx`update agent_profiles set verification_state='SUSPENDED' where id=${profileB}`;
    });
    const facts=await users.loadPrincipal(agentB,null);
    expect(facts.agentAvailable).toBe(false);expect(facts.capabilities.some(c=>c.capability==='AGENT')).toBe(false);
    await expect(resolve(agentB)({authorization:'Bearer synthetic',organizationId:null,requiredCapability:'AGENT'})).rejects.toBeInstanceOf(OrganizationForbiddenError);
  });
  it('suspended Owner organization and deactivated identity fail closed',async()=>{
    await admin`update organizations set state='SUSPENDED' where id=${orgA}`;
    expect(await users.organizationsFor(ownerA)).toEqual([]);
    await expect(resolve(ownerA)({authorization:'Bearer synthetic',organizationId:orgA})).rejects.toBeInstanceOf(OrganizationForbiddenError);
    await admin`update user_profiles set deactivated_at=now() where id=${ownerB}`;
    await expect(resolve(ownerB)({authorization:'Bearer synthetic',organizationId:orgB})).rejects.toBeInstanceOf(UnauthenticatedError);
  });
});
