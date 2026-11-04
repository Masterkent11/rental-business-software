import type { PaymentNotificationOutbox } from '@/application/ports/repositories/payment-notification-outbox.port.ts';
import { sql } from '@/infrastructure/postgres/db.ts';

export const postgresPaymentNotificationOutbox = (): PaymentNotificationOutbox => ({
  async deliverPending(limit) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new RangeError('Invalid delivery batch size');
    return sql.begin(async tx => {
      await tx`select set_config('app.notification_delivery', 'true', true)`;
      const rows = await tx<{ id: string; user_id: string | null; organization_id: string; kind: string; title: string; body: string; link: string | null }[]>`
        select id, user_id, organization_id, kind, title, body, link
        from payment_notification_outbox order by created_at, id limit ${limit} for update skip locked
      `;
      for (const row of rows) {
        await tx`select set_config('app.organization_id', ${row.organization_id}, true), set_config('app.user_id', ${row.user_id ?? ''}, true)`;
        await tx`insert into notifications(id, user_id, organization_id, kind, title, body, link)
          values (${row.id}, ${row.user_id}, ${row.user_id ? null : row.organization_id}, ${row.kind}, ${row.title}, ${row.body}, ${row.link})
          on conflict(id) do nothing`;
        await tx`select set_config('app.user_id', '', true)`;
        await tx`delete from payment_notification_outbox where id = ${row.id}`;
      }
      return rows.length;
    }) as Promise<number>;
  },
});
