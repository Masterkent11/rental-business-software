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
  GET_AGENT_THREAD,
  LIST_AGENT_CONVERSATIONS,
  MARK_AGENT_READ,
  SEND_AGENT_MESSAGE,
} from '@/modules/messaging/messaging.tokens.ts';
import { RESOLVE_PRINCIPAL } from '@/modules/me/me.tokens.ts';
import type { resolvePrincipal } from '@/application/identity/resolve-principal/resolve-principal.use-case.ts';
import type { listAgentConversations } from '@/application/messaging/list-agent-conversations/list-agent-conversations.use-case.ts';
import type { getAgentThread } from '@/application/messaging/get-conversation-messages/get-conversation-messages.use-case.ts';
import type { sendAgentMessage } from '@/application/messaging/send-message/send-message.use-case.ts';
import type { markAgentConversationRead } from '@/application/messaging/mark-conversation-read/mark-conversation-read.use-case.ts';
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

@Controller('agent/conversations')
export class AgentConversationsController {
  constructor(
    @Inject(LIST_AGENT_CONVERSATIONS)
    private readonly list: ReturnType<typeof listAgentConversations>,
    @Inject(GET_AGENT_THREAD)
    private readonly thread: ReturnType<typeof getAgentThread>,
    @Inject(SEND_AGENT_MESSAGE)
    private readonly send: ReturnType<typeof sendAgentMessage>,
    @Inject(MARK_AGENT_READ)
    private readonly markRead: ReturnType<typeof markAgentConversationRead>,
    @Inject(RESOLVE_PRINCIPAL)
    private readonly resolve: ReturnType<typeof resolvePrincipal>,
  ) {}

  private principal(authorization: string | undefined) {
    return this.resolve({ authorization, organizationId: null });
  }

  @Get()
  async index(
    @Headers('authorization') authorization?: string,
  ) {
    const principal = await this.principal(authorization);
    const conversations = await this.list({ principal });
    return {
      conversations: conversations.map((c) => toConversationHttpResponse(c, 'AGENT')),
      unreadTotal: conversations.reduce((sum, c) => sum + c.unreadCount, 0),
    };
  }

  @Get(':id/messages')
  async messages(
    @Param('id') id: string,
    @Query() rawQuery: unknown,
    @Headers('authorization') authorization?: string,
  ) {
    const query = parse(threadQuerySchema, rawQuery);
    const principal = await this.principal(authorization);
    const thread = await this.thread({
      principal,
      conversationId: guid(id, 'conversation'),
      before: query.before ? new Date(query.before) : null,
      limit: query.limit,
    });
    return toThreadHttpResponse(thread, 'AGENT');
  }

  @Post(':id/messages')
  async post(
    @Param('id') id: string,
    @Body() body: unknown,
    @Headers('authorization') authorization?: string,
  ) {
    const input = parse(sendMessageSchema, body);
    const principal = await this.principal(authorization);
    const message = await this.send({
      principal,
      conversationId: guid(id, 'conversation'),
      body: input.body,
      clientId: input.clientId,
    });
    return toMessageHttpResponse(message);
  }

  @Post(':id/read')
  @HttpCode(200)
  async read(
    @Param('id') id: string,
    @Headers('authorization') authorization?: string,
  ) {
    const principal = await this.principal(authorization);
    await this.markRead({ principal, conversationId: guid(id, 'conversation') });
    return { read: true };
  }
}
