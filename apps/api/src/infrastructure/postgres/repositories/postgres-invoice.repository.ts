import { sql, withScope } from '@/infrastructure/postgres/db.ts';
import {
  InvoiceNotFoundError,
  PaymentNotInOrganizationError,
  OccupancyNotInOrganizationError,
  type CollectedPayment,
  type CollectionMonth,
  type InvoiceRepository,
  type InvoiceWithContext,
} from '@/application/ports/repositories/invoice-repository.port.ts';
import { assertCanApply, assertPaymentCanCover, deriveState, invoiceTotalCentavos } from '@/domain/collection/collection-rules.ts';
import { PaymentAllocationError } from '@/domain/collection/collection-errors.ts';
import { centavos, type Centavos } from '@/domain/shared/money.ts';
import type { PaymentState } from '@/domain/payments/payment-state.ts';
import type { Invoice, InvoiceLineKind, InvoiceState } from '@/domain/collection/collection.ts';
import type { PaymentOrigin } from '@/domain/payments/payment.ts';

interface InvoiceRow {
  id: string;
  organization_id: string;
  occupancy_id: string;
  tenant_id: string | null;
  number: number;
  period_start: string;
  period_end: string;
  due_on: string;
  total_centavos: string;
  amount_paid_centavos: string;
  state: InvoiceState;
  tenant_name: string | null;
  resource_label: string | null;
  lines: { kind: InvoiceLineKind; description: string; amount_centavos: string }[] | null;
}

/** Postgres hands back bigint as a string and date as a string; both matter. */
const toInvoice = (row: InvoiceRow): InvoiceWithContext => ({
  id: row.id,
  organizationId: row.organization_id,
  occupancyId: row.occupancy_id,
  tenantId: row.tenant_id,
  number: row.number,
  periodStart: row.period_start,
  periodEnd: row.period_end,
  dueOn: row.due_on,
  totalCentavos: centavos(Number(row.total_centavos)),
  amountPaidCentavos: centavos(Number(row.amount_paid_centavos)),
  state: row.state,
  // A claim against someone who has not finished signing up is still a claim.
  tenantName: row.tenant_name ?? 'Unnamed tenant',
  resourceLabel: row.resource_label ?? 'Unknown resource',
  lines: (row.lines ?? []).map((line) => ({
    kind: line.kind,
    description: line.description,
    amountCentavos: centavos(Number(line.amount_centavos)),
  })),
});

/**
 * The select every read here shares.
 *
 * `lower(period)` / `upper(period)` rather than storing two columns: the range
 * is what the exclusion logic elsewhere understands, and two columns that must
 * agree with a range is one more thing to get wrong.
 */
const INVOICE_COLUMNS = sql`
  i.id,
  i.organization_id,
  i.occupancy_id,
  i.tenant_id,
  i.number,
  lower(i.period)::text as period_start,
  upper(i.period)::text as period_end,
  i.due_on::text as due_on,
  i.total_centavos,
  i.amount_paid_centavos,
  i.state,
  p.display_name as tenant_name,
  r.label as resource_label,
  (
    select coalesce(json_agg(
      json_build_object(
        'kind', l.kind,
        'description', l.description,
        'amount_centavos', l.amount_centavos
      ) order by l.position
    ), '[]'::json)
    from invoice_lines l
    where l.invoice_id = i.id
  ) as lines
`;

const INVOICE_JOINS = sql`
  from invoices i
  join occupancies o on o.id = i.occupancy_id
  join rentable_resources r on r.id = o.resource_id
  left join user_profiles p on p.id = i.tenant_id
`;

export function postgresInvoiceRepository(): InvoiceRepository {
  return {
    async outstandingFor(organizationId) {
      return withScope(organizationId, async (tx) => {
        const rows = await tx<InvoiceRow[]>`
          select ${INVOICE_COLUMNS}
          ${INVOICE_JOINS}
          where i.organization_id = ${organizationId}
            and i.state in ('ISSUED', 'PARTIALLY_PAID', 'OVERDUE')
          order by i.due_on asc
        `;
        return rows.map(toInvoice);
      });
    },

    async collectionHistory(organizationId, months) {
      return withScope(organizationId, async (tx) => {
        /*
         * Claimed and received are counted over different dates on purpose:
         * a claim belongs to the month it was issued, and money belongs to the
         * month it arrived. Attributing a late payment back to the month it
         * settles would erase exactly the lag the chart exists to show.
         */
        const rows = await tx<{ month: string; claimed: string; received: string }[]>`
          with span as (
            select generate_series(
              date_trunc('month', current_date) - make_interval(months => ${months - 1}),
              date_trunc('month', current_date),
              interval '1 month'
            )::date as month
          ),
          claimed as (
            select date_trunc('month', i.issued_at)::date as month,
                   sum(i.total_centavos) as total
            from invoices i
            where i.organization_id = ${organizationId}
              and i.state <> 'VOIDED'
              and i.issued_at is not null
            group by 1
          ),
          received as (
            select date_trunc('month', coalesce(pay.received_at, pay.recorded_at))::date as month,
                   sum(pa.amount_centavos) as total
            from payment_applications pa
            join payments pay on pay.id = pa.payment_id
            where pa.organization_id = ${organizationId}
            group by 1
          )
          select to_char(span.month, 'YYYY-MM') as month,
                 coalesce(claimed.total, 0)::text as claimed,
                 coalesce(received.total, 0)::text as received
          from span
          left join claimed on claimed.month = span.month
          left join received on received.month = span.month
          order by span.month asc
        `;

        return rows.map(
          (row): CollectionMonth => ({
            month: row.month,
            claimedCentavos: centavos(Number(row.claimed)),
            receivedCentavos: centavos(Number(row.received)),
          }),
        );
      });
    },

    async recentPayments(organizationId, limit) {
      return withScope(organizationId, async (tx) => {
        const rows = await tx<
          {
            id: string;
            tenant_name: string | null;
            resource_label: string | null;
            amount_centavos: string;
            origin: PaymentOrigin;
            provider_ref: string | null;
            recorded_by_name: string | null;
            received_at: Date | null;
            recorded_at: Date;
          }[]
        >`
          select pay.id,
                 tenant.display_name as tenant_name,
                 r.label as resource_label,
                 pay.amount_centavos,
                 pay.origin,
                 pay.provider_ref,
                 staff.display_name as recorded_by_name,
                 pay.received_at,
                 pay.recorded_at
          from payments pay
          join occupancies o on o.id = pay.occupancy_id
          join rentable_resources r on r.id = o.resource_id
          left join stays s on s.occupancy_id = pay.occupancy_id
          left join user_profiles tenant on tenant.id = s.user_id
          left join user_profiles staff on staff.id = pay.recorded_by
          where pay.organization_id = ${organizationId}
            and pay.state = 'SUCCEEDED'
          order by coalesce(pay.received_at, pay.recorded_at) desc
          limit ${limit}
        `;

        return rows.map(
          (row): CollectedPayment => ({
            id: row.id,
            tenantName: row.tenant_name ?? 'Unnamed tenant',
            resourceLabel: row.resource_label ?? 'Unknown resource',
            amountCentavos: centavos(Number(row.amount_centavos)),
            origin: row.origin,
            reference: row.provider_ref,
            recordedBy: row.recorded_by_name,
            receivedAt: row.received_at,
            recordedAt: row.recorded_at,
          }),
        );
      });
    },

    async findById(organizationId, invoiceId) {
      return withScope(organizationId, async (tx) => {
        const [row] = await tx<InvoiceRow[]>`
          select ${INVOICE_COLUMNS}
          ${INVOICE_JOINS}
          where i.id = ${invoiceId} and i.organization_id = ${organizationId}
        `;
        return row ? toInvoice(row) : null;
      });
    },

    async forTenant(userId) {
      /*
       * No organization scope: a tenant may rent from more than one owner, and
       * the `own_invoice` policy is what makes this safe. Scoping it to a
       * single organization would silently hide the other landlord's claims.
       */
      return sql.begin(async (tx) => {
        await tx`select set_config('app.user_id', ${userId}, true)`;
        const rows = await tx<InvoiceRow[]>`
          select ${INVOICE_COLUMNS}
          ${INVOICE_JOINS}
          where i.tenant_id = ${userId} and i.state <> 'DRAFT'
          order by i.due_on desc
        `;
        return rows.map(toInvoice);
      }) as Promise<InvoiceWithContext[]>;
    },

    async issue(input) {
      return withScope(input.organizationId, async (tx) => {
        const [occupancy] = await tx<{ id: string; tenant_id: string | null }[]>`
          select o.id, s.user_id as tenant_id
          from occupancies o
          left join stays s on s.occupancy_id = o.id
          where o.id = ${input.occupancyId}
            and o.organization_id = ${input.organizationId}
        `;

        // Checked rather than trusted: without this an owner could raise a
        // claim against another organization's occupancy, and RLS would not
        // catch it because the *invoice* row is theirs.
        if (!occupancy) throw new OccupancyNotInOrganizationError(input.occupancyId);

        const total = invoiceTotalCentavos(input.lines);

        const rows = await tx<{ id: string; number: number }[]>`
          insert into invoices (
            organization_id, occupancy_id, tenant_id, number,
            period, due_on, total_centavos, state, issued_at
          ) values (
            ${input.organizationId}, ${input.occupancyId}, ${occupancy.tenant_id}, 0,
            daterange(${input.periodStart}::date, ${input.periodEnd}::date, '[)'),
            ${input.dueOn}::date, ${total}, 'ISSUED', now()
          )
          returning id, number
        `;

        const row = rows[0];
        if (!row) throw new InvoiceNotFoundError(input.occupancyId);

        for (const [index, line] of input.lines.entries()) {
          await tx`
            insert into invoice_lines (
              invoice_id, organization_id, kind, description, amount_centavos, position
            ) values (
              ${row.id}, ${input.organizationId}, ${line.kind},
              ${line.description}, ${line.amountCentavos}, ${index}
            )
          `;
        }

        // Every ledger entry names its cause. This one's cause is the claim.
        await tx`
          insert into ledger_entries (
            organization_id, entry_type, amount_centavos, origin,
            actor_type, cause_type, cause_id, occurred_at
          ) values (
            ${input.organizationId}, 'INVOICE_ISSUED', ${total}, 'ONLINE',
            'SYSTEM', 'INVOICE', ${row.id}, now()
          )
        `;

        return {
          id: row.id,
          organizationId: input.organizationId,
          occupancyId: input.occupancyId,
          tenantId: occupancy.tenant_id,
          number: row.number,
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
          dueOn: input.dueOn,
          totalCentavos: total as Centavos,
          amountPaidCentavos: 0 as Centavos,
          state: 'ISSUED',
          lines: input.lines,
        } satisfies Invoice;
      });
    },

    async applyPayment(input) {
      return withScope(input.organizationId, async (tx) => {
        const [payment] = await tx<{ amount_centavos: string; state: PaymentState }[]>`
          select amount_centavos::text, state from payments
          where id = ${input.paymentId} and organization_id = ${input.organizationId}
          for update
        `;
        if (!payment) throw new PaymentNotInOrganizationError('No applicable payment in this organization.');
        const [invoice] = await tx<{ total_centavos: string; amount_paid_centavos: string; state: InvoiceState; due_on: string }[]>`
          select total_centavos::text, amount_paid_centavos::text, state, due_on::text from invoices
          where id = ${input.invoiceId} and organization_id = ${input.organizationId}
          for update
        `;
        if (!invoice) throw new InvoiceNotFoundError('No applicable invoice in this organization.');
        const [allocated] = await tx<{ amount: string; already_applied: boolean }[]>`
          select coalesce(sum(amount_centavos), 0)::text as amount,
                 coalesce(bool_or(invoice_id = ${input.invoiceId}), false) as already_applied
          from payment_applications
          where payment_id = ${input.paymentId} and organization_id = ${input.organizationId}
        `;
        if (allocated!.already_applied) throw new PaymentAllocationError('That payment has already been allocated to this invoice.');
        assertPaymentCanCover({ state: payment.state, amountCentavos: centavos(Number(payment.amount_centavos)),
          allocatedCentavos: centavos(Number(allocated!.amount)) }, input.amountCentavos);
        const claim = { state: invoice.state, totalCentavos: centavos(Number(invoice.total_centavos)),
          amountPaidCentavos: centavos(Number(invoice.amount_paid_centavos)), dueOn: invoice.due_on };
        assertCanApply({ ...claim, state: deriveState(claim) }, input.amountCentavos);

        /*
         * One transaction: write the application, let the trigger re-derive
         * amount_paid and state, append the ledger entry, read the result. If
         * the application would breach I-04 the check constraint aborts all of
         * it — there is no ordering here that can leave a half-settled claim.
         */
        await tx`
          insert into payment_applications (
            organization_id, payment_id, invoice_id, amount_centavos
          ) values (
            ${input.organizationId}, ${input.paymentId},
            ${input.invoiceId}, ${input.amountCentavos}
          )
        `;

        await tx`
          insert into ledger_entries (
            organization_id, entry_type, amount_centavos, origin,
            actor_type, cause_type, cause_id, occurred_at
          )
          select ${input.organizationId}, 'PAYMENT_RECEIVED', ${input.amountCentavos},
                 pay.origin, 'SYSTEM', 'INVOICE', ${input.invoiceId}, now()
          from payments pay
          where pay.id = ${input.paymentId}
        `;

        const [row] = await tx<InvoiceRow[]>`
          select ${INVOICE_COLUMNS}
          ${INVOICE_JOINS}
          where i.id = ${input.invoiceId} and i.organization_id = ${input.organizationId}
        `;

        if (!row) throw new InvoiceNotFoundError(input.invoiceId);
        return toInvoice(row);
      });
    },
  };
}
