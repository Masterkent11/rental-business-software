import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { sql, withUser, withUserAndScope } from '@/infrastructure/postgres/db.ts';
import { postgresPaymentNotificationOutbox } from '@/infrastructure/postgres/repositories/postgres-payment-notification-outbox.repository.ts';

const local = Boolean(process.env.TEST_ADMIN_DATABASE_URL &&
  ['127.0.0.1', 'localhost'].includes(new URL(process.env.TEST_ADMIN_DATABASE_URL).hostname));
const suite = local ? describe : describe.skip;
const customerA = randomUUID(), customerB = randomUUID();
const orgA = randomUUID(), orgB = randomUUID();
const resourceA = randomUUID(), resourceB = randomUUID();
const applicationA = randomUUID(), applicationB = randomUUID(), applicationC = randomUUID();
const occupancyA = randomUUID(), occupancyB = randomUUID(), occupancyC = randomUUID();
const reservationA = randomUUID(), reservationB = randomUUID(), reservationC = randomUUID();
const paymentA = randomUUID(), paymentB = randomUUID();

suite('customer application tenant boundaries against PostgreSQL', () => {
  let admin: ReturnType<typeof postgres>;
  beforeAll(async () => {
    admin = postgres(process.env.TEST_ADMIN_DATABASE_URL!, { max: 1 });
    for (const [customer, organization, resource, application, occupancy, reservation, payment] of [
      [customerA, orgA, resourceA, applicationA, occupancyA, reservationA, paymentA],
      [customerB, orgB, resourceB, applicationB, occupancyB, reservationB, paymentB],
    ]) {
      await admin`insert into user_profiles(id, display_name) values (${customer!}, 'Synthetic customer')`;
      await admin`insert into organizations(id, legal_name, trading_name, state)
        values (${organization!}, 'Synthetic organization', 'Synthetic organization', 'VERIFIED')`;
      const property = randomUUID();
      await admin`insert into properties(id, organization_id, name, area_label, city_label)
        values (${property}, ${organization!}, 'Synthetic property', 'Area', 'City')`;
      await admin`insert into rentable_resources(id, organization_id, property_id, root_id, label, resource_type, rental_mode)
        values (${resource!}, ${organization!}, ${property}, ${resource!}, 'Unit', 'UNIT', 'LONG_TERM')`;
      await admin`insert into listings(organization_id, resource_id, kind, title, state, price_centavos, reservation_fee_centavos)
        values (${organization!}, ${resource!}, 'LONG_TERM', 'Synthetic rental', 'PUBLISHED', 2500000, 200000)`;
      await admin`insert into applications(id, organization_id, resource_id, applicant_id, desired_move_in, desired_term_months)
        values (${application!}, ${organization!}, ${resource!}, ${customer!}, '2029-03-01', 12)`;
      await admin`insert into application_documents(organization_id, application_id, kind, storage_path, file_name, content_type, size_bytes)
        values (${organization!}, ${application!}, 'OTHER', ${organization! + '/' + application! + '/evidence.pdf'}, 'evidence.pdf', 'application/pdf', 10)`;
      await admin`insert into occupancies(id, organization_id, resource_id, root_id, subtree, during, kind, state, expires_at, held_by, application_id)
        select ${occupancy!}, organization_id, id, root_id, subtree, daterange('2029-03-01','2030-03-01','[)'), 'RESERVATION', 'HELD', now() + interval '1 hour', ${customer!}, ${application!}
        from rentable_resources where id = ${resource!}`;
      await admin`insert into reservations(id, organization_id, application_id, occupancy_id, fee_centavos)
        values (${reservation!}, ${organization!}, ${application!}, ${occupancy!}, 200000)`;
      await admin`insert into payments(id, organization_id, occupancy_id, amount_centavos, origin)
        values (${payment!}, ${organization!}, ${occupancy!}, 200000, 'ONLINE')`;
    }
    await admin`insert into applications(id, organization_id, resource_id, applicant_id, desired_move_in, desired_term_months)
      values (${applicationC}, ${orgA}, ${resourceA}, ${customerB}, '2033-03-01', 12)`;
    await admin`insert into application_documents(organization_id, application_id, kind, storage_path, file_name, content_type, size_bytes)
      values (${orgA}, ${applicationC}, 'OTHER', ${randomUUID()}, 'evidence.pdf', 'application/pdf', 10)`;
    await admin`insert into occupancies(id, organization_id, resource_id, root_id, subtree, during, kind, state, expires_at, held_by, application_id)
      select ${occupancyC}, organization_id, id, root_id, subtree, daterange('2033-03-01','2034-03-01','[)'), 'RESERVATION', 'HELD', now() + interval '1 hour', ${customerB}, ${applicationC}
      from rentable_resources where id = ${resourceA}`;
    await admin`insert into reservations(id, organization_id, application_id, occupancy_id, fee_centavos)
      values (${reservationC}, ${orgA}, ${applicationC}, ${occupancyC}, 200000)`;
  });
  beforeEach(async () => {
    await admin`update user_profiles set deactivated_at = null where id = ${customerA}`;
    await admin`update organizations set state = 'VERIFIED' where id = ${orgA}`;
  });
  afterAll(async () => {
    if (admin) {
      await admin`update occupancies set state = 'RELEASED' where id in (${occupancyA}, ${occupancyB}, ${occupancyC})`;
      await admin.end();
    }
    await sql.end();
  });

  it('reads only its own applications and evidence despite a forged tenant hint', async () => {
    for (const organization of [orgA, orgB, null]) {
      const result = await withUserAndScope(customerA, organization, async tx => ({
        applications: await tx`select id from applications where id in (${applicationA}, ${applicationB}, ${applicationC})`,
        documents: await tx`select application_id from application_documents where application_id in (${applicationA}, ${applicationB}, ${applicationC})`,
        reservations: await tx`select id from reservations where id in (${reservationA}, ${reservationB}, ${reservationC})`,
      }));
      const permitted = organization !== orgB;
      expect(result.applications).toEqual(permitted ? [{ id: applicationA }] : []);
      expect(result.documents).toEqual(permitted ? [{ application_id: applicationA }] : []);
      expect(result.reservations).toEqual(permitted ? [{ id: reservationA }] : []);
    }
  });

  it('does not grant partner dashboards, financial records or unrelated holds', async () => {
    const result = await withUserAndScope(customerA, orgA, async tx => ({
      memberships: await tx`select * from app_private.partner_tenants`,
      payments: await tx`select id from payments where id in (${paymentA}, ${paymentB})`,
      holds: await tx`select id from occupancies where id in (${occupancyA}, ${occupancyB}, ${occupancyC})`,
    }));
    expect(result.memberships).toEqual([]);
    expect(result.payments).toEqual([]);
    expect(result.holds).toEqual([{ id: occupancyA }]);
  });

  it('denies self approval and changing the applicant', async () => {
    await expect(withUserAndScope(customerA, orgA, tx => tx`
      update applications set state = 'APPROVED', decided_by = ${customerA}, decided_at = now()
      where id = ${applicationA}`)).rejects.toMatchObject({ code: '42501' });
    await expect(withUserAndScope(customerA, orgA, tx => tx`
      update applications set state = 'WITHDRAWN', applicant_id = ${customerB}
      where id = ${applicationA}`)).rejects.toMatchObject({ code: '42501' });
    expect(await withUserAndScope(customerA, orgB, tx => tx`
      update applications set state = 'WITHDRAWN' where id = ${applicationB} returning id`)).toEqual([]);
  });

  it('denies forged application resource and tenant relationships', async () => {
    await expect(withUserAndScope(customerA, orgA, tx => tx`
      insert into applications(organization_id, resource_id, applicant_id, desired_move_in, desired_term_months)
      values (${orgA}, ${resourceB}, ${customerA}, '2029-03-01', 12)`)).rejects.toMatchObject({ code: '42501' });
  });

  it('denies attaching evidence to another customer even in the matching tenant', async () => {
    await expect(withUserAndScope(customerA, orgB, tx => tx`
      insert into application_documents(organization_id, application_id, kind, storage_path, file_name, content_type, size_bytes)
      values (${orgB}, ${applicationB}, 'OTHER', ${randomUUID()}, 'evidence.pdf', 'application/pdf', 10)`))
      .rejects.toMatchObject({ code: '42501' });
  });

  it('denies another customer evidence in its own organization', async () => {
    await expect(withUserAndScope(customerA, orgA, tx => tx`
      insert into application_documents(organization_id, application_id, kind, storage_path, file_name, content_type, size_bytes)
      values (${orgA}, ${applicationC}, 'OTHER', ${randomUUID()}, 'evidence.pdf', 'application/pdf', 10)`))
      .rejects.toMatchObject({ code: '42501' });
    expect(await withUserAndScope(customerA, orgA, tx => tx`
      update reservations set state = 'EXPIRED' where id = ${reservationC} returning id`)).toEqual([]);
  });

  it('denies fabricated paid reservations and unrelated occupancy bindings', async () => {
    await expect(withUserAndScope(customerA, orgA, tx => tx`
      update reservations set state = 'ACTIVE', payment_id = ${paymentA} where id = ${reservationA}`))
      .rejects.toMatchObject({ code: '42501' });
    await expect(withUserAndScope(customerA, orgA, tx => tx`
      insert into occupancies(organization_id, resource_id, root_id, subtree, during, kind, state, expires_at, held_by, application_id)
      select organization_id, id, root_id, subtree, daterange('2031-03-01','2032-03-01','[)'), 'RESERVATION', 'HELD', now() + interval '1 hour', ${customerA}, ${applicationB}
      from rentable_resources where id = ${resourceA}`)).rejects.toMatchObject({ code: '42501' });
  });

  it('denies arbitrary financial entries and tenant notifications', async () => {
    await expect(withUserAndScope(customerA, orgA, tx => tx`
      insert into ledger_entries(organization_id, entry_type, amount_centavos, origin, actor_type, actor_id, cause_type, cause_id, occurred_at)
      values (${orgA}, 'RESERVATION_FEE_CREDITED', 200000, 'ONLINE', 'SYSTEM', 'reservation-outcome', 'RESERVATION', ${reservationA}, now())`))
      .rejects.toMatchObject({ code: '42501' });
    await expect(withUserAndScope(customerA, orgA, tx => tx`
      insert into notifications(organization_id, kind, title, body, link)
      values (${orgA}, 'BOOKING_CONFIRMED', 'Forged', 'Forged', ${'/applications/' + applicationA})`))
      .rejects.toMatchObject({ code: '42501' });
    await expect(withUserAndScope(customerA, orgB, tx => tx`
      insert into notifications(organization_id, kind, title, body, link)
      values (${orgB}, 'APPLICATION_RECEIVED', 'New rental application', 'A customer submitted an application.', ${'/applications/' + applicationB})`))
      .rejects.toMatchObject({ code: '42501' });
  });

  it('denies suspended organization reads and writes with or without an organization hint', async () => {
    await admin`update organizations set state = 'SUSPENDED' where id = ${orgA}`;
    for (const organization of [orgA, null]) {
      expect(await withUserAndScope(customerA, organization, tx => tx`
        select id from applications where id = ${applicationA}`)).toEqual([]);
    }
    await expect(withUserAndScope(customerA, orgA, tx => tx`
      insert into application_documents(organization_id, application_id, kind, storage_path, file_name, content_type, size_bytes)
      values (${orgA}, ${applicationA}, 'OTHER', ${randomUUID()}, 'evidence.pdf', 'application/pdf', 10)`))
      .rejects.toMatchObject({ code: '42501' });
  });

  it('denies deactivated customers immediately', async () => {
    await admin`update user_profiles set deactivated_at = now() where id = ${customerA}`;
    expect(await withUser(customerA, tx => tx`select id from applications where id = ${applicationA}`)).toEqual([]);
    await expect(withUserAndScope(customerA, orgA, tx => tx`
      insert into applications(organization_id, resource_id, applicant_id, desired_move_in, desired_term_months)
      values (${orgA}, ${resourceA}, ${customerA}, '2031-03-01', 12)`)).rejects.toMatchObject({ code: '42501' });
  });

  it('allows withdrawal without permitting financial terms or resource reassignment', async () => {
    await expect(withUserAndScope(customerA, orgA, tx => tx`
      update applications set state = 'WITHDRAWN', desired_term_months = 1 where id = ${applicationA}`))
      .rejects.toMatchObject({ code: '42501' });
    await withUserAndScope(customerA, orgA, tx => tx`update applications set state = 'WITHDRAWN' where id = ${applicationA}`);
    await expect(withUserAndScope(customerA, orgA, tx => tx`
      update reservations set state = 'FORFEITED', fee_centavos = 1 where id = ${reservationA}`))
      .rejects.toMatchObject({ code: '42501' });
    await withUserAndScope(customerA, orgA, async tx => {
      expect(await tx`update reservations set state = 'EXPIRED', resolved_at = now() where id = ${reservationA} returning id`)
        .toEqual([{ id: reservationA }]);
      expect(await tx`update occupancies set state = 'RELEASED' where id = ${occupancyA} returning id`)
        .toEqual([{ id: occupancyA }]);
    });
  });

  it('delivers and acknowledges a batch spanning tenant and personal recipients exactly once', async () => {
    const first = randomUUID(), second = randomUUID();
    await admin`insert into payment_notification_outbox(id, payment_id, organization_id, user_id, kind, title, body)
      values (${first}, ${paymentA}, ${orgA}, ${customerA}, 'BOOKING_CONFIRMED', 'Confirmed', 'Confirmed'),
             (${second}, ${paymentB}, ${orgB}, null, 'BOOKING_RECEIVED', 'Received', 'Received')`;
    const delivery = postgresPaymentNotificationOutbox();
    await delivery.deliverPending(100);
    expect(await admin`select id from notifications where id in (${first}, ${second})`).toHaveLength(2);
    expect(await admin`select id from payment_notification_outbox where id in (${first}, ${second})`).toEqual([]);
    expect(await delivery.deliverPending(100)).toBe(0);
    expect(await withUserAndScope(customerB, orgB, tx => tx`select id from notifications where id = ${first}`)).toEqual([]);
  });
});
