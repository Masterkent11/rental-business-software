import type { NewNotification } from '@/domain/notifications/notification.ts';
import { describeViewingSchedule, type Viewing } from '@/domain/viewings/viewing.ts';

export const organizationViewingNotice = (viewing: Viewing, title: string): NewNotification => ({
  audience: { organizationId: viewing.organizationId },
  kind: 'VIEWING_REQUESTED',
  title,
  body: `${viewing.listingTitle} · ${describeViewingSchedule(viewing)}`,
  link: `/viewings?v=${viewing.id}`,
});

export const agentViewingNotice = (
  viewing: Viewing,
  agentUserId: string,
  kind: NewNotification['kind'],
  title: string,
): NewNotification => ({
  audience: { userId: agentUserId },
  kind,
  title,
  body: `${viewing.listingTitle} · ${describeViewingSchedule(viewing)}`,
  link: `/agent/viewings?v=${viewing.id}`,
});

export const customerViewingNotice = (viewing: Viewing, title: string, body?: string): NewNotification => ({
  audience: { userId: viewing.customerId },
  kind: 'VIEWING_UPDATED',
  title,
  body: body ?? `${viewing.listingTitle} · ${describeViewingSchedule(viewing)}`,
  link: `/viewings/${viewing.id}`,
});
