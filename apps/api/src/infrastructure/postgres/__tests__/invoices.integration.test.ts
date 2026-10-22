import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { postgresInvoiceRepository } from '@/infrastructure/postgres/repositories/postgres-invoice.repository.ts';
import { sql, withScope } from '@/infrastructure/postgres/db.ts';
import { getOwnerCollection } from '@/application/collection/get-owner-collection/get-owner-collection.use-case.ts';
import { PaymentAllocationError } from '@/domain/collection/collection-errors.ts';
import { OccupancyNotInOrganizationError } from '@/application/ports/repositories/invoice-repository.port.ts';
import type { Centavos } from '@/domain/shared/money.ts';
import type { Principal } from '@/domain/identity/identity.ts';

const live = Boolean(process.env.DATABASE_URL);
const suite = live ? describe : describe.skip;

const SANTOS_ORG = '11111111-1111-1111-1111-111111111111';
const VILLA_ORG = '33333333-3333-3333-3333-333333333333';

const principalFor = (organizationId: string): Principal => ({
  userId: 'test-user',
  displayName: 'Test User',
  capabilities: [{ capability: 'OWNER', organizationId }],
  organizationId,
});

const peso = (amount: number) => (amount * 100) as Centavos;

/** Dates as the API takes them, relative to today so nothing goes stale. */
const day = (offset: number) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
};

suite('invoices against real PostgreSQL', { timeout: 45_000 }, () => {
  const invoices = postgresInvoiceRepository();
  const collectionUseCase = getOwnerCollection(invoices);
  const collection = (organizationId: string) =>
    collectionUseCase({ principal: principalFor(organizationId), organizationId });

  /**
   * An occupancy to bill, created per organization.
   *
   * Made by the suite rather than assumed from the seed: a test that depends on
   * a hand-seeded row passes on one machine and fails on the next.
   */
  const anOccupancy = async (organizationId: string): Promise<string> =>
    withScope(organizationId, async (tx) => {
      const [row] = await tx<{ id: string }[]>`
        select id from occupancies
        where organization_id = ${organizationId}
        limit 1
      `;
      if (row) return row.id;

      const [resource] = await tx<{ id: string; root_id: string; subtree: string }[]>`
        select id, root_id, subtree::text as subtree
        from rentable_resources
        where organization_id = ${organizationId}
        limit 1
      `;

      const [created] = await tx<{ id: string }[]>`
        insert into occupancies (
          organization_id, resource_id, root_id, subtree, during, kind, state
        ) values (
          ${organizationId}, ${resource!.id}, ${resource!.root_id},
          ${resource!.subtree}::int4range,
          daterange(${day(0)}::date, ${day(365)}::date, '[)'),
          'LEASE', 'COMMITTED'
        )
        returning id
      `;
      return created!.id;
    });

  const aPayment = async (organizationId: string, occupancyId: string, amount: Centavos) =>
    withScope(organizationId, async (tx) => {
      const [row] = await tx<{ id: string }[]>`
        insert into payments (
          organization_id, occupancy_id, amount_centavos, origin, state, received_at
        ) values (
          ${organizationId}, ${occupancyId}, ${amount}, 'OFFLINE_RECORDED', 'SUCCEEDED', now()
        )
        returning id
      `;
      return row!.id;
    });

  /**
   * Retire what previous tests raised.
   *
   * Voided, not deleted: `rental_app` holds no DELETE on invoices or payment
   * applications, and that is the production posture the domain asks for — a
   * claim raised in error is voided with a reason, and an application is
   * corrected rather than erased. So the suite cleans up the only way the
   * application itself could, which is also the only way worth testing.
   */
  const reset = async () => {
    await sql.begin(async (tx) => {
      for (const organizationId of [SANTOS_ORG, VILLA_ORG]) {
        await tx`select set_config('app.organization_id', ${organizationId}, true)`;
        await tx`
          update invoices
             set state = 'VOIDED', void_reason = 'integration test cleanup'
           where organization_id = ${organizationId} and state <> 'VOIDED'
        `;
      }
    });
  };

  beforeEach(reset);
  afterAll(reset);

  it('answers "who owes me money" with a name, an amount, and an age', async () => {
    const occupancy = await anOccupancy(SANTOS_ORG);

    await invoices.issue({
      organizationId: SANTOS_ORG,
      occupancyId: occupancy,
      periodStart: day(-40),
      periodEnd: day(-10),
      dueOn: day(-15),
      lines: [{ kind: 'RENT', description: 'Rent', amountCentavos: peso(8_500) }],
    });

    const answer = await collection(SANTOS_ORG);

    expect(answer.outstandingCentavos).toBe(peso(8_500));
    expect(answer.arrears).toHaveLength(1);
    expect(answer.arrears[0]!.owedCentavos).toBe(peso(8_500));
    // Overdue is derived from the date, not from whoever last touched the row.
    expect(answer.arrears[0]!.daysOverdue).toBeGreaterThanOrEqual(14);
    expect(answer.arrears[0]!.resourceLabel).not.toBe('');
    expect(answer.arrears[0]!.invoiceCount).toBe(1);
  });

  it('counts a claim against what actually arrived, and never nets them', async () => {
    const occupancy = await anOccupancy(SANTOS_ORG);
    const before = await collection(SANTOS_ORG);

    const invoice = await invoices.issue({
      organizationId: SANTOS_ORG,
      occupancyId: occupancy,
      periodStart: day(0),
      periodEnd: day(30),
      dueOn: day(5),
      lines: [{ kind: 'RENT', description: 'Rent', amountCentavos: peso(10_000) }],
    });

    const payment = await aPayment(SANTOS_ORG, occupancy, peso(4_000));
    const settled = await invoices.applyPayment({
      organizationId: SANTOS_ORG,
      invoiceId: invoice.id,
      paymentId: payment,
      amountCentavos: peso(4_000),
    });

    // Derived by the database trigger, not asserted by the caller.
    expect(settled.state).toBe('PARTIALLY_PAID');
    expect(settled.amountPaidCentavos).toBe(peso(4_000));

    const answer = await collection(SANTOS_ORG);
    expect(answer.claimedCentavos).toBe(peso(10_000));
    // Received is measured as a delta: applications outlive the cleanup, so an
    // absolute here would pass once and fail on the second run.
    expect(answer.receivedCentavos - before.receivedCentavos).toBe(peso(4_000));
    expect(answer.outstandingCentavos).toBe(peso(6_000));
  });

  it('refuses to overpay an invoice — I-04, in the database', async () => {
    const occupancy = await anOccupancy(SANTOS_ORG);

    const invoice = await invoices.issue({
      organizationId: SANTOS_ORG,
      occupancyId: occupancy,
      periodStart: day(0),
      periodEnd: day(30),
      dueOn: day(5),
      lines: [{ kind: 'RENT', description: 'Rent', amountCentavos: peso(5_000) }],
    });

    const payment = await aPayment(SANTOS_ORG, occupancy, peso(6_000));

    await expect(
      invoices.applyPayment({
        organizationId: SANTOS_ORG,
        invoiceId: invoice.id,
        paymentId: payment,
        amountCentavos: peso(5_001),
      }),
    ).rejects.toThrow();

    // And the refusal left nothing behind: no half-settled claim, no ledger
    // entry for money that was never applied.
    const after = await invoices.findById(SANTOS_ORG, invoice.id);
    expect(after!.amountPaidCentavos).toBe(0);
    expect(after!.state).toBe('ISSUED');
  });

  it('refuses a second payment against an invoice already PAID — I-04, not just against overpaying ISSUED', async () => {
    // The test above only exercises paying too much in one application. This
    // is the other half of the same invariant: a second, individually
    // reasonable application against a claim the *first* one already settled
    // in full — the database has to refuse this on its own, because nothing
    // upstream can be trusted to remember an invoice was already paid.
    const occupancy = await anOccupancy(SANTOS_ORG);

    const invoice = await invoices.issue({
      organizationId: SANTOS_ORG,
      occupancyId: occupancy,
      periodStart: day(0),
      periodEnd: day(30),
      dueOn: day(5),
      lines: [{ kind: 'RENT', description: 'Rent', amountCentavos: peso(5_000) }],
    });

    const firstPayment = await aPayment(SANTOS_ORG, occupancy, peso(5_000));
    const settled = await invoices.applyPayment({
      organizationId: SANTOS_ORG,
      invoiceId: invoice.id,
      paymentId: firstPayment,
      amountCentavos: peso(5_000),
    });
    expect(settled.state).toBe('PAID');

    const secondPayment = await aPayment(SANTOS_ORG, occupancy, peso(1_000));
    await expect(
      invoices.applyPayment({
        organizationId: SANTOS_ORG,
        invoiceId: invoice.id,
        paymentId: secondPayment,
        amountCentavos: peso(1_000),
      }),
    ).rejects.toThrow();

    const after = await invoices.findById(SANTOS_ORG, invoice.id);
    expect(after!.amountPaidCentavos).toBe(peso(5_000));
    expect(after!.state).toBe('PAID');
  });

  it('numbers invoices gap-free, per organization', async () => {
    const santos = await anOccupancy(SANTOS_ORG);
    const villa = await anOccupancy(VILLA_ORG);

    const line = [{ kind: 'RENT' as const, description: 'Rent', amountCentavos: peso(1_000) }];
    const period = { periodStart: day(0), periodEnd: day(30), dueOn: day(5), lines: line };

    const a = await invoices.issue({ organizationId: SANTOS_ORG, occupancyId: santos, ...period });
    const b = await invoices.issue({ organizationId: SANTOS_ORG, occupancyId: santos, ...period });
    const other = await invoices.issue({
      organizationId: VILLA_ORG,
      occupancyId: villa,
      ...period,
    });

    expect(b.number).toBe(a.number + 1);
    // Numbering is per organization: the other owner's sequence is their own,
    // and says nothing about where Santos happens to have reached.
    const [villaHighest] = await withScope(VILLA_ORG, async (tx) =>
      tx<{ n: number }[]>`
        select coalesce(max(number), 0) as n from invoices
        where organization_id = ${VILLA_ORG} and id <> ${other.id}
      `,
    );
    expect(other.number).toBe((villaHighest?.n ?? 0) + 1);
  });

  it('shows one organization nothing of another organization’s money', async () => {
    const santos = await anOccupancy(SANTOS_ORG);

    await invoices.issue({
      organizationId: SANTOS_ORG,
      occupancyId: santos,
      periodStart: day(-40),
      periodEnd: day(-10),
      dueOn: day(-15),
      lines: [{ kind: 'RENT', description: 'Rent', amountCentavos: peso(9_999) }],
    });

    const neighbour = await collection(VILLA_ORG);

    expect(neighbour.outstandingCentavos).toBe(0);
    expect(neighbour.arrears).toHaveLength(0);
    expect(
      neighbour.recentPayments.every((p) => p.amountCentavos !== peso(9_999)),
    ).toBe(true);
  });

  it('refuses to bill an occupancy that belongs to someone else', async () => {
    const villa = await anOccupancy(VILLA_ORG);

    // RLS would not catch this: the *invoice* row would be Santos's own. The
    // occupancy has to be checked explicitly.
    await expect(
      invoices.issue({
        organizationId: SANTOS_ORG,
        occupancyId: villa,
        periodStart: day(0),
        periodEnd: day(30),
        dueOn: day(5),
        lines: [{ kind: 'RENT', description: 'Rent', amountCentavos: peso(1_000) }],
      }),
    ).rejects.toBeInstanceOf(OccupancyNotInOrganizationError);
  });
  it('cannot allocate more money than the source payment across invoices', async () => {
    const occupancy = await anOccupancy(SANTOS_ORG);
    const input = { organizationId: SANTOS_ORG, occupancyId: occupancy,
      periodStart: day(0), periodEnd: day(30), dueOn: day(5),
      lines: [{ kind: 'RENT' as const, description: 'Rent', amountCentavos: peso(1_000) }] };
    const first = await invoices.issue(input);
    const second = await invoices.issue(input);
    const paymentId = await aPayment(SANTOS_ORG, occupancy, peso(500));
    await invoices.applyPayment({ organizationId: SANTOS_ORG, invoiceId: first.id, paymentId, amountCentavos: peso(400) });
    await expect(invoices.applyPayment({ organizationId: SANTOS_ORG, invoiceId: second.id,
      paymentId, amountCentavos: peso(200) })).rejects.toThrow();
    expect((await invoices.findById(SANTOS_ORG, second.id))!.amountPaidCentavos).toBe(0);
  });

  it('cannot use a foreign organization payment to settle a local invoice', async () => {
    const occupancy = await anOccupancy(SANTOS_ORG);
    const foreignOccupancy = await anOccupancy(VILLA_ORG);
    const invoice = await invoices.issue({ organizationId: SANTOS_ORG, occupancyId: occupancy,
      periodStart: day(0), periodEnd: day(30), dueOn: day(5),
      lines: [{ kind: 'RENT', description: 'Rent', amountCentavos: peso(500) }] });
    const paymentId = await aPayment(VILLA_ORG, foreignOccupancy, peso(500));
    await expect(invoices.applyPayment({ organizationId: SANTOS_ORG, invoiceId: invoice.id,
      paymentId, amountCentavos: peso(500) })).rejects.toThrow();
    expect((await invoices.findById(SANTOS_ORG, invoice.id))!.amountPaidCentavos).toBe(0);
  });

  it.each(['PENDING', 'FAILED', 'REFUNDED'])('cannot allocate a %s payment', async (state) => {
    const occupancy = await anOccupancy(SANTOS_ORG);
    const invoice = await invoices.issue({ organizationId: SANTOS_ORG, occupancyId: occupancy,
      periodStart: day(0), periodEnd: day(30), dueOn: day(5),
      lines: [{ kind: 'RENT', description: 'Rent', amountCentavos: peso(500) }] });
    const paymentId = await aPayment(SANTOS_ORG, occupancy, peso(500));
    await withScope(SANTOS_ORG, tx => tx`update payments set state = ${state} where id = ${paymentId}`);
    await expect(invoices.applyPayment({ organizationId: SANTOS_ORG, invoiceId: invoice.id,
      paymentId, amountCentavos: peso(500) })).rejects.toThrow();
    expect((await invoices.findById(SANTOS_ORG, invoice.id))!.amountPaidCentavos).toBe(0);
  });

  it('serializes allocations drawing on the same payment', async () => {
    const occupancy = await anOccupancy(SANTOS_ORG);
    const input = { organizationId: SANTOS_ORG, occupancyId: occupancy,
      periodStart: day(0), periodEnd: day(30), dueOn: day(5),
      lines: [{ kind: 'RENT' as const, description: 'Rent', amountCentavos: peso(500) }] };
    const first = await invoices.issue(input), second = await invoices.issue(input);
    const paymentId = await aPayment(SANTOS_ORG, occupancy, peso(500));
    const results = await Promise.allSettled([first, second].map(invoice => invoices.applyPayment({
      organizationId: SANTOS_ORG, invoiceId: invoice.id, paymentId, amountCentavos: peso(400) })));
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    const amounts = await Promise.all([first, second].map(invoice => invoices.findById(SANTOS_ORG, invoice.id)));
    expect(amounts.reduce((sum, invoice) => sum + invoice!.amountPaidCentavos, 0)).toBe(peso(400));
  });

  it('serializes different payments settling the same invoice', async () => {
    const occupancy = await anOccupancy(SANTOS_ORG);
    const invoice = await invoices.issue({ organizationId: SANTOS_ORG, occupancyId: occupancy,
      periodStart: day(0), periodEnd: day(30), dueOn: day(5),
      lines: [{ kind: 'RENT', description: 'Rent', amountCentavos: peso(500) }] });
    const payments = await Promise.all([aPayment(SANTOS_ORG, occupancy, peso(400)), aPayment(SANTOS_ORG, occupancy, peso(400))]);
    const results = await Promise.allSettled(payments.map(paymentId => invoices.applyPayment({
      organizationId: SANTOS_ORG, invoiceId: invoice.id, paymentId, amountCentavos: peso(400) })));
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect((await invoices.findById(SANTOS_ORG, invoice.id))!.amountPaidCentavos).toBe(peso(400));
  });

  it('guards the payment budget when SQL bypasses the repository', async () => {
    const occupancy = await anOccupancy(SANTOS_ORG);
    const input = { organizationId: SANTOS_ORG, occupancyId: occupancy,
      periodStart: day(0), periodEnd: day(30), dueOn: day(5),
      lines: [{ kind: 'RENT' as const, description: 'Rent', amountCentavos: peso(500) }] };
    const first = await invoices.issue(input), second = await invoices.issue(input);
    const paymentId = await aPayment(SANTOS_ORG, occupancy, peso(500));
    const allocate = (invoiceId: string) => withScope(SANTOS_ORG, tx => tx`
      insert into payment_applications (organization_id, payment_id, invoice_id, amount_centavos)
      values (${SANTOS_ORG}, ${paymentId}, ${invoiceId}, ${peso(400)})
    `);
    const results = await Promise.allSettled([allocate(first.id), allocate(second.id)]);
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find(r => r.status === 'rejected') as PromiseRejectedResult;
    expect(rejected.reason).toMatchObject({ code: '23514', constraint_name: 'payment_application_payment_balance' });
  });

  it('guards invoice totals when concurrent SQL bypasses the repository', async () => {
    const occupancy = await anOccupancy(SANTOS_ORG);
    const invoice = await invoices.issue({ organizationId: SANTOS_ORG, occupancyId: occupancy,
      periodStart: day(0), periodEnd: day(30), dueOn: day(5),
      lines: [{ kind: 'RENT', description: 'Rent', amountCentavos: peso(500) }] });
    const payments = await Promise.all([aPayment(SANTOS_ORG, occupancy, peso(400)), aPayment(SANTOS_ORG, occupancy, peso(400))]);
    const results = await Promise.allSettled(payments.map(paymentId => withScope(SANTOS_ORG, tx => tx`
      insert into payment_applications (organization_id, payment_id, invoice_id, amount_centavos)
      values (${SANTOS_ORG}, ${paymentId}, ${invoice.id}, ${peso(400)})
    `)));
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find(r => r.status === 'rejected') as PromiseRejectedResult;
    expect(rejected.reason).toMatchObject({ code: '23514', constraint_name: 'payment_application_invoice_balance' });
  });

  it('guards foreign payment references when SQL bypasses the repository', async () => {
    const occupancy = await anOccupancy(SANTOS_ORG);
    const foreign = await anOccupancy(VILLA_ORG);
    const invoice = await invoices.issue({ organizationId: SANTOS_ORG, occupancyId: occupancy,
      periodStart: day(0), periodEnd: day(30), dueOn: day(5),
      lines: [{ kind: 'RENT', description: 'Rent', amountCentavos: peso(500) }] });
    const paymentId = await aPayment(VILLA_ORG, foreign, peso(500));
    await expect(withScope(SANTOS_ORG, tx => tx`
      insert into payment_applications (organization_id, payment_id, invoice_id, amount_centavos)
      values (${SANTOS_ORG}, ${paymentId}, ${invoice.id}, ${peso(500)})
    `)).rejects.toMatchObject({ code: '23514', constraint_name: 'payment_application_payment_scope' });
  });

  it('rejects duplicate allocations without repeating their ledger entry', async () => {
    const occupancy = await anOccupancy(SANTOS_ORG);
    const invoice = await invoices.issue({ organizationId: SANTOS_ORG, occupancyId: occupancy,
      periodStart: day(0), periodEnd: day(30), dueOn: day(5),
      lines: [{ kind: 'RENT', description: 'Rent', amountCentavos: peso(500) }] });
    const paymentId = await aPayment(SANTOS_ORG, occupancy, peso(500));
    const input = { organizationId: SANTOS_ORG, invoiceId: invoice.id, paymentId, amountCentavos: peso(100) };
    await invoices.applyPayment(input);
    await expect(invoices.applyPayment(input)).rejects.toBeInstanceOf(PaymentAllocationError);
    const counts = await withScope(SANTOS_ORG, tx => tx`
      select (select count(*)::int from payment_applications where invoice_id = ${invoice.id}) as allocations,
             (select count(*)::int from ledger_entries where cause_id = ${invoice.id} and entry_type = 'PAYMENT_RECEIVED') as ledger
    `);
    expect(counts[0]).toMatchObject({ allocations: 1, ledger: 1 });
  });

  it('guards foreign invoice references when SQL bypasses the repository', async () => {
    const occupancy = await anOccupancy(SANTOS_ORG);
    const foreign = await anOccupancy(VILLA_ORG);
    const invoice = await invoices.issue({ organizationId: VILLA_ORG, occupancyId: foreign,
      periodStart: day(0), periodEnd: day(30), dueOn: day(5),
      lines: [{ kind: 'RENT', description: 'Rent', amountCentavos: peso(500) }] });
    const paymentId = await aPayment(SANTOS_ORG, occupancy, peso(500));
    await expect(withScope(SANTOS_ORG, tx => tx`
      insert into payment_applications (organization_id, payment_id, invoice_id, amount_centavos)
      values (${SANTOS_ORG}, ${paymentId}, ${invoice.id}, ${peso(500)})
    `)).rejects.toMatchObject({ code: '23514', constraint_name: 'payment_application_invoice_scope' });
  });

  it.each(['PENDING', 'FAILED', 'REFUNDED'])('guards %s payments when SQL bypasses the repository', async state => {
    const occupancy = await anOccupancy(SANTOS_ORG);
    const invoice = await invoices.issue({ organizationId: SANTOS_ORG, occupancyId: occupancy,
      periodStart: day(0), periodEnd: day(30), dueOn: day(5),
      lines: [{ kind: 'RENT', description: 'Rent', amountCentavos: peso(500) }] });
    const paymentId = await aPayment(SANTOS_ORG, occupancy, peso(500));
    await withScope(SANTOS_ORG, tx => tx`update payments set state = ${state} where id = ${paymentId}`);
    await expect(withScope(SANTOS_ORG, tx => tx`
      insert into payment_applications (organization_id, payment_id, invoice_id, amount_centavos)
      values (${SANTOS_ORG}, ${paymentId}, ${invoice.id}, ${peso(500)})
    `)).rejects.toMatchObject({ code: '23514', constraint_name: 'payment_application_payment_state' });
  });

  it('keeps the allocation guard private and subject to invoker permissions', async () => {
    const [guard] = await sql<{ prosecdef: boolean; proconfig: string[]; public_execute: boolean }[]>`
      select p.prosecdef, p.proconfig, has_function_privilege('anon', p.oid, 'EXECUTE') as public_execute
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'app_private' and p.proname = 'guard_payment_allocation'
    `;
    expect(guard).toMatchObject({ prosecdef: false, public_execute: false });
    expect(guard!.proconfig).toContain('search_path=public, pg_temp');
  });

});
