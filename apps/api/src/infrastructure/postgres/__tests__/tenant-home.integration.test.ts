import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sql } from '@/infrastructure/postgres/db.ts';
import { postgresUserRepository } from '@/infrastructure/postgres/repositories/postgres-user.repository.ts';
import { postgresTenantHomeRepository } from '@/infrastructure/postgres/repositories/postgres-tenant-home.repository.ts';
import { getTenantHome } from '@/application/me/get-tenant-home/get-tenant-home.use-case.ts';
import { TenancyNotFoundError } from '@/domain/occupancy/tenant-home.ts';
import { requestTenantMaintenance } from '@/application/me/get-tenant-home/request-tenant-maintenance.use-case.ts';
import { startConversation } from '@/application/messaging/start-conversation/start-conversation.use-case.ts';
import { sendCustomerMessage } from '@/application/messaging/send-message/send-message.use-case.ts';
import { postgresMessagingRepository } from '@/infrastructure/postgres/repositories/postgres-messaging.repository.ts';
import { postgresListingRepository } from '@/infrastructure/postgres/repositories/postgres-listing.repository.ts';
import { postgresNotificationRepository } from '@/infrastructure/postgres/repositories/postgres-notification.repository.ts';

const suite = process.env.TEST_ADMIN_DATABASE_URL && process.env.DATABASE_URL ? describe : describe.skip;
suite('tenant home with PostgreSQL RLS', () => {
  const admin = postgres(process.env.TEST_ADMIN_DATABASE_URL!, { max: 1 });
  const user = randomUUID(), other = randomUUID();
  const own = randomUUID(), foreign = randomUUID(), booking = randomUUID(), second = randomUUID();
  const repository = postgresTenantHomeRepository();
  const get = getTenantHome(repository, { now: () => new Date('2026-10-24T00:00:00Z') });
  const messaging = postgresMessagingRepository();
  const maintenance = requestTenantMaintenance(get,
    startConversation(messaging, postgresListingRepository(), async () => null),
    sendCustomerMessage(messaging, postgresNotificationRepository(), { now: () => new Date('2026-10-24T00:00:00Z') }));
  const principal = { userId: user, displayName: 'Tenant', capabilities: [], organizationId: null };
  beforeAll(async () => {
    for (const id of [user, other]) await postgresUserRepository().createProfile({ id, email: `${id}@example.test`, mobile: null });
    for (const [id, tenant, kind] of [[own, user, 'LEASE'], [foreign, other, 'LEASE'], [booking, user, 'BOOKING'], [second, user, 'LEASE']] as const) {
      const resource = randomUUID();
      await admin`insert into rentable_resources(id, organization_id, property_id, root_id, label, resource_type, rental_mode)
        select ${resource}, organization_id, property_id, ${resource}, 'Tenant unit', 'UNIT', 'HYBRID'
        from rentable_resources where id = 'b1111111-0000-0000-0000-000000000001'`;
      await admin`insert into listings(organization_id, resource_id, kind, title, state, price_centavos) select organization_id, id, 'LONG_TERM', 'Tenancy integration test', 'PUBLISHED', 900000 from rentable_resources where id = ${resource}`;
      await admin`insert into occupancies(id, organization_id, resource_id, root_id, subtree, kind, state, during, held_by)
        select ${id}, organization_id, id, root_id, subtree, ${kind}, 'COMMITTED', daterange('2026-01-01','2027-01-01','[)'), ${tenant}
        from rentable_resources where id = ${resource}`;
    }
    await admin`insert into invoices(organization_id, occupancy_id, tenant_id, number, period, due_on, total_centavos, state, issued_at)
      select organization_id, id, ${user}, 986543, daterange('2026-10-01','2026-11-01','[)'), '2026-11-05', 2500000, 'ISSUED', now() from occupancies where id = ${own}`;
  });
  afterAll(async () => { await admin.end(); await sql.end(); });
  it('reads own active homes and actual invoice obligations with customer RLS', async () => {
    const result = await get({ userId: user });
    expect(result.tenancies.map(home => home.id).sort()).toEqual([own, second].sort());
    const invoice = result.tenancies.find(home => home.id === own)!.invoices[0]!;
    expect(invoice.outstandingCentavos).toBe(2500000);
    expect(invoice.onlinePaymentAvailable).toBe(false);
    expect(result.tenancies.find(home => home.id === second)!.invoices).toEqual([]);
    expect(result.tenancies[0]!.landlordName).toBeTruthy();
  });
  it('rejects foreign tenancy access and does not expose a committed short stay', async () => {
    await expect(get({ userId: user, tenancyId: foreign })).rejects.toThrow(TenancyNotFoundError);
    await expect(get({ userId: user, tenancyId: booking })).rejects.toThrow(TenancyNotFoundError);
    expect((await repository.listForCustomer(other)).map(home => home.id)).toEqual([foreign]);
  });
  it('sends an authorized maintenance message once when a request is retried', async () => {
    const input = { principal, tenancyId: own, description: 'Please repair the leaking kitchen tap.', clientId: randomUUID() };
    const first = await maintenance(input);
    const retry = await maintenance(input);
    expect(retry).toEqual(first);
    const messages = await admin`select * from messages where id = ${first.messageId}`;
    expect(messages).toHaveLength(1);
    expect(messages[0]!.sender_id).toBe(user);
    expect(messages[0]!.body).toContain(input.description);
    await expect(maintenance({ ...input, tenancyId: foreign })).rejects.toThrow(TenancyNotFoundError);
    await expect(maintenance({ ...input, tenancyId: booking })).rejects.toThrow(TenancyNotFoundError);
  });
  it('revokes an ended tenancy while preserving authorized invoices in rental history', async () => {
    await admin`update occupancies set state = 'RELEASED' where id = ${own}`;
    const context = await get({ userId: user });
    expect(context.tenancies.map(home => home.id)).toEqual([second]);
    expect(context.rentalHistory?.find(home => home.id === own)?.invoices).toHaveLength(1);
    await expect(get({ userId: user, tenancyId: own })).rejects.toThrow(TenancyNotFoundError);
    await expect(maintenance({ principal, tenancyId: own, description: 'Please repair the leaking tap.', clientId: randomUUID() })).rejects.toThrow(TenancyNotFoundError);
  });
});
