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
  Query,
} from '@nestjs/common';
import { z } from 'zod';
import {
  GET_ORGANIZATION_THREAD,
  LIST_ORGANIZATION_CONVERSATIONS,
  MARK_ORGANIZATION_READ,
  SEND_OWNER_MESSAGE,
} from '@/modules/messaging/messaging.tokens.ts';
import { RESOLVE_PRINCIPAL } from '@/modules/me/me.tokens.ts';
import type { resolvePrincipal } from '@/application/identity/resolve-principal/resolve-principal.use-case.ts';
import type { listOrganizationConversations } from '@/application/messaging/list-organization-conversations/list-organization-conversations.use-case.ts';
import type { getOrganizationThread } from '@/application/messaging/get-conversation-messages/get-conversation-messages.use-case.ts';
import type { sendOwnerMessage } from '@/application/messaging/send-message/send-message.use-case.ts';
import type { markOrganizationConversationRead } from '@/application/messaging/mark-conversation-read/mark-conversation-read.use-case.ts';
import { sendMessageSchema, threadQuerySchema } from '@/modules/messaging/dto/messaging.dto.ts';
import {
  toConversationHttpResponse,
  toMessageHttpResponse,
  toThreadHttpResponse,
} from '@/modules/messaging/mappers/messaging-http.mapper.ts';

const parse = <T>(schema: z.ZodType<T>, raw: unknown): T => {
  const parsed = schema.safeParse(raw ?? {});
  if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message ?? 'Invalid request');
  return parsed.data;
};

const guid = (value: string, what: string) => {
  if (!z.guid().safeParse(value).success) throw new BadRequestException(`Not a valid ${what} id`);
  return value;
};

@Controller('organizations/:organizationId/conversations')
export class OrganizationConversationsController {
  constructor(
    @Inject(LIST_ORGANIZATION_CONVERSATIONS)
    private readonly list: ReturnType<typeof listOrganizationConversations>,
    @Inject(GET_ORGANIZATION_THREAD)
    private readonly thread: ReturnType<typeof getOrganizationThread>,
    @Inject(SEND_OWNER_MESSAGE)
    private readonly send: ReturnType<typeof sendOwnerMessage>,
    @Inject(MARK_ORGANIZATION_READ)
    private readonly markRead: ReturnType<typeof markOrganizationConversationRead>,
    @Inject(RESOLVE_PRINCIPAL)
    private readonly resolve: ReturnType<typeof resolvePrincipal>,
  ) {}

  private principal(organizationId: string, authorization: string | undefined) {
    return this.resolve({ authorization, organizationId: guid(organizationId, 'organization') });
  }

  @Get()
  async index(
    @Param('organizationId') organizationId: string,
    @Headers('authorization') authorization?: string,
  ) {
    const principal = await this.principal(organizationId, authorization);
    const conversations = await this.list({ principal, organizationId });
    return {
      conversations: conversations.map((c) => toConversationHttpResponse(c, 'OWNER')),
      unreadTotal: conversations.reduce((sum, c) => sum + c.unreadCount, 0),
    };
  }

  @Get(':id/messages')
  async messages(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @Query() rawQuery: unknown,
    @Headers('authorization') authorization?: string,
  ) {
    const query = parse(threadQuerySchema, rawQuery);
    const principal = await this.principal(organizationId, authorization);
    const thread = await this.thread({
      principal,
      organizationId,
      conversationId: guid(id, 'conversation'),
      before: query.before ? new Date(query.before) : null,
      limit: query.limit,
    });
    return toThreadHttpResponse(thread, 'OWNER');
  }

  @Post(':id/messages')
  async post(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @Body() body: unknown,
    @Headers('authorization') authorization?: string,
  ) {
    const input = parse(sendMessageSchema, body);
    const principal = await this.principal(organizationId, authorization);
    const message = await this.send({
      principal,
      organizationId,
      conversationId: guid(id, 'conversation'),
      body: input.body,
      clientId: input.clientId,
    });
    return toMessageHttpResponse(message);
  }

  @Post(':id/read')
  @HttpCode(200)
  async read(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @Headers('authorization') authorization?: string,
  ) {
    const principal = await this.principal(organizationId, authorization);
    await this.markRead({ principal, organizationId, conversationId: guid(id, 'conversation') });
    return { read: true };
  }
}
