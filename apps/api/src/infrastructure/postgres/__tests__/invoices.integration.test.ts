import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { postgresInvoiceRepository } from '../invoice-repository.pg.ts';
import { sql, withScope } from '../db.ts';
import { ownerCollection } from '../../../features/collect-rent/collect-rent.ts';
import { OccupancyNotInOrganizationError } from '../../../application/ports/invoice-repository.ts';
import type { Centavos } from '../../../domain/shared/money.ts';

const live = Boolean(process.env.DATABASE_URL);
const suite = live ? describe : describe.skip;

const SANTOS_ORG = '11111111-1111-1111-1111-111111111111';
const VILLA_ORG = '33333333-3333-3333-3333-333333333333';

const peso = (amount: number) => (amount * 100) as Centavos;

/** Dates as the API takes them, relative to today so nothing goes stale. */
const day = (offset: number) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
};

suite('invoices against real PostgreSQL', { timeout: 45_000 }, () => {
  const invoices = postgresInvoiceRepository();
  const collection = ownerCollection(invoices);

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
});
