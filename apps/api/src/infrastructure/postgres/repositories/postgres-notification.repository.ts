import type { NotificationRepository } from '@/application/ports/repositories/notification-repository.port.ts';
import type {
  Notification,
  NotificationKind,
} from '@/domain/notifications/notification.ts';
import { sql, withScope, withUser } from '@/infrastructure/postgres/db.ts';

interface Row {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  link: string | null;
  read_at: Date | null;
  created_at: Date;
}

const toNotification = (row: Row): Notification => ({
  id: row.id,
  kind: row.kind,
  title: row.title,
  body: row.body,
  link: row.link,
  readAt: row.read_at,
  createdAt: row.created_at,
});

export const postgresNotificationRepository = (): NotificationRepository => ({
  async publish(notifications) {
    for (const notification of notifications) {
      const userId = notification.audience.userId ?? null;
      const organizationId = notification.audience.organizationId ?? null;
      await sql.begin(async (tx) => {
        if (userId) await tx`select set_config('app.user_id', ${userId}, true)`;
        if (organizationId) await tx`select set_config('app.organization_id', ${organizationId}, true)`;
        await tx`
          insert into notifications (user_id, organization_id, kind, title, body, link)
          values (${userId}, ${organizationId}, ${notification.kind}, ${notification.title},
                  ${notification.body}, ${notification.link})
        `;
      });
    }
  },

  async forUser(userId, limit) {
    return withUser(userId, async (tx) => {
      const rows = await tx<Row[]>`
        select id, kind, title, body, link, read_at, created_at
          from notifications
         where user_id = ${userId}
         order by created_at desc
         limit ${limit}
      `;
      return rows.map(toNotification);
    });
  },

  async forOrganization(organizationId, limit) {
    return withScope(organizationId, async (tx) => {
      const rows = await tx<Row[]>`
        select id, kind, title, body, link, read_at, created_at
          from notifications
         where organization_id = ${organizationId} and user_id is null
         order by created_at desc
         limit ${limit}
      `;
      return rows.map(toNotification);
    });
  },

  async markUserRead(userId, ids) {
    await withUser(userId, async (tx) => {
      await tx`
        update notifications set read_at = now()
         where user_id = ${userId} and read_at is null
           ${ids === 'ALL' ? tx`` : tx`and id = any(${tx.array([...ids])}::uuid[])`}
      `;
    });
  },

  async markOrganizationRead(organizationId, ids) {
    await withScope(organizationId, async (tx) => {
      await tx`
        update notifications set read_at = now()
         where organization_id = ${organizationId} and user_id is null and read_at is null
           ${ids === 'ALL' ? tx`` : tx`and id = any(${tx.array([...ids])}::uuid[])`}
      `;
    });
  },
});
