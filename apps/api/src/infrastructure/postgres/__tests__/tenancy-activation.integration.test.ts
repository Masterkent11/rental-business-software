import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sql } from '@/infrastructure/postgres/db.ts';
import { postgresUserRepository } from '@/infrastructure/postgres/repositories/postgres-user.repository.ts';
import { postgresTenancyActivationRepository } from '@/infrastructure/postgres/repositories/postgres-tenancy-activation.repository.ts';
import { postgresTenantHomeRepository } from '@/infrastructure/postgres/repositories/postgres-tenant-home.repository.ts';
import { postgresInvoiceRepository } from '@/infrastructure/postgres/repositories/postgres-invoice.repository.ts';
import { centavos } from '@/domain/shared/money.ts';
import { confirmTenancy } from '@/application/applications/confirm-tenancy/confirm-tenancy.use-case.ts';
import { getTenantHome } from '@/application/me/get-tenant-home/get-tenant-home.use-case.ts';
import { InvalidTransitionError } from '@/domain/applications/application-errors.ts';
import { ApplicationNotFoundError } from '@/application/ports/repositories/application-repository.port.ts';

const suite = process.env.TEST_ADMIN_DATABASE_URL && process.env.DATABASE_URL ? describe : describe.skip;
suite('tenancy activation with customer and organization isolation', () => {
  const admin = postgres(process.env.TEST_ADMIN_DATABASE_URL!, { max: 1 });
  const owner = randomUUID(), customer = randomUUID();
  let organizationId: string;
  let now = new Date('2026-10-24T00:00:00Z');
  const clock = { now: () => now };
  const activate = confirmTenancy(postgresTenancyActivationRepository(), clock);
  const home = getTenantHome(postgresTenantHomeRepository(), clock);
  const principal = () => ({ userId: owner, displayName: 'Owner', organizationId, capabilities: [{ capability: 'OWNER' as const, organizationId }] });
  beforeAll(async () => {
    for (const id of [owner, customer]) await postgresUserRepository().createProfile({ id, email: `${id}@example.test`, mobile: null });
    const [row] = await admin`select organization_id from rentable_resources where id = 'b1111111-0000-0000-0000-000000000001'`;
    organizationId = row!.organization_id;
  });
  afterAll(async () => { await admin.end(); await sql.end(); });
  async function fixture(kind = 'LEASE', state = 'HELD', expiresAt = '2026-10-26T00:00:00Z') {
    const resource = randomUUID(), application = randomUUID(), occupancy = randomUUID();
    await admin`insert into rentable_resources(id, organization_id, property_id, root_id, label, resource_type, rental_mode)
      select ${resource}, organization_id, property_id, ${resource}, 'Activation unit', 'UNIT', 'LONG_TERM'
      from rentable_resources where id = 'b1111111-0000-0000-0000-000000000001'`;
    await admin`insert into listings(organization_id, resource_id, kind, title, state, price_centavos)
      values (${organizationId}, ${resource}, 'LONG_TERM', 'Confirmed rental', 'PUBLISHED', 2500000)`;
    await admin`insert into applications(id, organization_id, resource_id, applicant_id, desired_move_in, desired_term_months, state, decided_by, decided_at)
      values (${application}, ${organizationId}, ${resource}, ${customer}, '2026-10-25', 3, 'APPROVED', ${owner}, now())`;
    await admin`insert into occupancies(id, organization_id, resource_id, root_id, subtree, kind, state, during, held_by, application_id, expires_at)
      select ${occupancy}, organization_id, id, root_id, subtree, ${kind}, ${state}, daterange('2026-10-25','2027-01-25','[)'), ${customer}, ${application}, ${expiresAt}
      from rentable_resources where id = ${resource}`;
    return { application, occupancy };
  }
  it('confirms once under concurrent retries, records the reviewer, and waits for the effective lease date', async () => {
    const item = await fixture();
    expect((await home({ userId: customer })).tenancies).toEqual([]);
    const input = { principal: principal(), organizationId, applicationId: item.application, requirementsReviewed: true };
    const [first, retry] = await Promise.all([activate(input), activate(input)]);
    expect(retry).toEqual(first);
    const [stored] = await admin`select kind, state, expires_at, activation_confirmed_by from occupancies where id = ${item.occupancy}`;
    expect(stored).toMatchObject({ kind: 'LEASE', state: 'COMMITTED', expires_at: null, activation_confirmed_by: owner });
    const notifications = await admin`select id from notifications where user_id = ${customer} and title = 'Your tenancy is confirmed'`;
    expect(notifications).toHaveLength(1);
    expect((await home({ userId: customer })).upcomingMoveIns).toHaveLength(1);
    now = new Date('2026-10-24T16:00:00Z');
    expect((await home({ userId: customer })).tenancies.map(value => value.id)).toContain(item.occupancy);
    const invoice = await postgresInvoiceRepository().issue({
      organizationId, occupancyId: item.occupancy, periodStart: '2026-10-25', periodEnd: '2026-11-25', dueOn: '2026-10-25',
      lines: [{ kind: 'RENT', description: 'First monthly rent', amountCentavos: centavos(2500000) }],
    });
    expect(invoice.tenantId).toBe(customer);
    expect((await home({ userId: customer })).tenancies.find(value => value.id === item.occupancy)?.invoices[0]?.outstandingCentavos).toBe(2500000);
    expect((await home({ userId: owner })).tenancies).toEqual([]);
  });
  it('converts a credited reservation into a lease without duplicating occupancy', async () => {
    const item = await fixture('RESERVATION', 'COMMITTED');
    const result = await activate({ principal: principal(), organizationId, applicationId: item.application, requirementsReviewed: true });
    expect(result.id).toBe(item.occupancy);
    const records = await admin`select kind from occupancies where application_id = ${item.application}`;
    expect(records).toEqual([{ kind: 'LEASE' }]);
  });
  it('rejects expired holds and forged organization scopes without mutating occupancy', async () => {
    const item = await fixture('LEASE', 'HELD', '2026-10-23T00:00:00Z');
    await expect(activate({ principal: principal(), organizationId, applicationId: item.application, requirementsReviewed: true })).rejects.toThrow(InvalidTransitionError);
    const other = randomUUID();
    await expect(activate({ principal: { ...principal(), organizationId: other, capabilities: [{ capability: 'OWNER', organizationId: other }] }, organizationId: other, applicationId: item.application, requirementsReviewed: true })).rejects.toThrow(ApplicationNotFoundError);
    const [stored] = await admin`select state, activation_confirmed_by from occupancies where id = ${item.occupancy}`;
    expect(stored).toMatchObject({ state: 'HELD', activation_confirmed_by: null });
  });
});
