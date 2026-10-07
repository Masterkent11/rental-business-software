import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Inject,
  Param,
  Post,
} from '@nestjs/common';
import { z } from 'zod';
import {
  LIST_MY_NOTIFICATIONS,
  LIST_ORGANIZATION_NOTIFICATIONS,
  MARK_MY_NOTIFICATIONS_READ,
  MARK_ORGANIZATION_NOTIFICATIONS_READ,
} from '@/modules/notifications/notifications.tokens.ts';
import { RESOLVE_PRINCIPAL } from '@/modules/me/me.tokens.ts';
import type { resolvePrincipal } from '@/application/identity/resolve-principal/resolve-principal.use-case.ts';
import type {
  listMyNotifications,
  listOrganizationNotifications,
} from '@/application/notifications/list-notifications/list-notifications.use-case.ts';
import type {
  markMyNotificationsRead,
  markOrganizationNotificationsRead,
} from '@/application/notifications/mark-notifications-read/mark-notifications-read.use-case.ts';
import { markReadSchema } from '@/modules/notifications/dto/notifications.dto.ts';
import { toNotificationHttpResponse } from '@/modules/notifications/mappers/notification-http.mapper.ts';

const idsFrom = (body: unknown): readonly string[] | 'ALL' => {
  const parsed = markReadSchema.safeParse(body ?? {});
  if (!parsed.success) throw new BadRequestException('Send { all: true } or { ids: [...] }');
  return 'all' in parsed.data ? 'ALL' : parsed.data.ids;
};

@Controller()
export class NotificationsController {
  constructor(
    @Inject(LIST_MY_NOTIFICATIONS)
    private readonly listMine: ReturnType<typeof listMyNotifications>,
    @Inject(LIST_ORGANIZATION_NOTIFICATIONS)
    private readonly listOrganization: ReturnType<typeof listOrganizationNotifications>,
    @Inject(MARK_MY_NOTIFICATIONS_READ)
    private readonly markMine: ReturnType<typeof markMyNotificationsRead>,
    @Inject(MARK_ORGANIZATION_NOTIFICATIONS_READ)
    private readonly markOrganization: ReturnType<typeof markOrganizationNotificationsRead>,
    @Inject(RESOLVE_PRINCIPAL)
    private readonly resolve: ReturnType<typeof resolvePrincipal>,
  ) {}

  @Get('me/notifications')
  async mine(@Headers('authorization') authorization?: string) {
    const principal = await this.resolve({ authorization, organizationId: null });
    const items = await this.listMine({ principal });
    return {
      notifications: items.map(toNotificationHttpResponse),
      unreadCount: items.filter((n) => n.readAt === null).length,
    };
  }

  @Post('me/notifications/read')
  @HttpCode(200)
  async readMine(@Body() body: unknown, @Headers('authorization') authorization?: string) {
    const ids = idsFrom(body);
    const principal = await this.resolve({ authorization, organizationId: null });
    await this.markMine({ principal, ids });
    return { read: true };
  }

  @Get('organizations/:organizationId/notifications')
  async forOrganization(
    @Param('organizationId') organizationId: string,
    @Headers('authorization') authorization?: string,
  ) {
    if (!z.guid().safeParse(organizationId).success) throw new BadRequestException('Not an organization id');
    const principal = await this.resolve({ authorization, organizationId });
    const items = await this.listOrganization({ principal, organizationId });
    return {
      notifications: items.map(toNotificationHttpResponse),
      unreadCount: items.filter((n) => n.readAt === null).length,
    };
  }

  @Post('organizations/:organizationId/notifications/read')
  @HttpCode(200)
  async readOrganization(
    @Param('organizationId') organizationId: string,
    @Body() body: unknown,
    @Headers('authorization') authorization?: string,
  ) {
    if (!z.guid().safeParse(organizationId).success) throw new BadRequestException('Not an organization id');
    const ids = idsFrom(body);
    const principal = await this.resolve({ authorization, organizationId });
    await this.markOrganization({ principal, organizationId, ids });
    return { read: true };
  }
}
