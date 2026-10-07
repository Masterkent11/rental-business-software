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
  GET_CUSTOMER_THREAD,
  LIST_MY_CONVERSATIONS,
  MARK_CUSTOMER_READ,
  SEND_CUSTOMER_MESSAGE,
  START_CONVERSATION,
} from '@/modules/messaging/messaging.tokens.ts';
import { RESOLVE_PRINCIPAL } from '@/modules/me/me.tokens.ts';
import type { resolvePrincipal } from '@/application/identity/resolve-principal/resolve-principal.use-case.ts';
import type { startConversation } from '@/application/messaging/start-conversation/start-conversation.use-case.ts';
import type { listMyConversations } from '@/application/messaging/list-my-conversations/list-my-conversations.use-case.ts';
import type { getCustomerThread } from '@/application/messaging/get-conversation-messages/get-conversation-messages.use-case.ts';
import type { sendCustomerMessage } from '@/application/messaging/send-message/send-message.use-case.ts';
import type { markCustomerConversationRead } from '@/application/messaging/mark-conversation-read/mark-conversation-read.use-case.ts';
import {
  sendMessageSchema,
  startConversationSchema,
  threadQuerySchema,
} from '@/modules/messaging/dto/messaging.dto.ts';
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

const guid = (value: string) => {
  if (!z.guid().safeParse(value).success) throw new BadRequestException('Not a conversation id');
  return value;
};

@Controller()
export class CustomerConversationsController {
  constructor(
    @Inject(START_CONVERSATION)
    private readonly start: ReturnType<typeof startConversation>,
    @Inject(LIST_MY_CONVERSATIONS)
    private readonly list: ReturnType<typeof listMyConversations>,
    @Inject(GET_CUSTOMER_THREAD)
    private readonly thread: ReturnType<typeof getCustomerThread>,
    @Inject(SEND_CUSTOMER_MESSAGE)
    private readonly send: ReturnType<typeof sendCustomerMessage>,
    @Inject(MARK_CUSTOMER_READ)
    private readonly markRead: ReturnType<typeof markCustomerConversationRead>,
    @Inject(RESOLVE_PRINCIPAL)
    private readonly resolve: ReturnType<typeof resolvePrincipal>,
  ) {}

  @Post('conversations')
  @HttpCode(200)
  async open(@Body() body: unknown, @Headers('authorization') authorization?: string) {
    const input = parse(startConversationSchema, body);
    const principal = await this.resolve({ authorization, organizationId: null });
    const conversation = await this.start({
      principal,
      listingId: input.listingId,
      bookingId: input.bookingId,
    });
    return toConversationHttpResponse(conversation, 'CUSTOMER');
  }

  @Get('me/conversations')
  async mine(@Headers('authorization') authorization?: string) {
    const principal = await this.resolve({ authorization, organizationId: null });
    const conversations = await this.list({ principal });
    return {
      conversations: conversations.map((c) => toConversationHttpResponse(c, 'CUSTOMER')),
      unreadTotal: conversations.reduce((sum, c) => sum + c.unreadCount, 0),
    };
  }

  @Get('conversations/:id/messages')
  async messages(
    @Param('id') id: string,
    @Query() rawQuery: unknown,
    @Headers('authorization') authorization?: string,
  ) {
    const query = parse(threadQuerySchema, rawQuery);
    const principal = await this.resolve({ authorization, organizationId: null });
    const thread = await this.thread({
      principal,
      conversationId: guid(id),
      before: query.before ? new Date(query.before) : null,
      limit: query.limit,
    });
    return toThreadHttpResponse(thread, 'CUSTOMER');
  }

  @Post('conversations/:id/messages')
  async post(
    @Param('id') id: string,
    @Body() body: unknown,
    @Headers('authorization') authorization?: string,
  ) {
    const input = parse(sendMessageSchema, body);
    const principal = await this.resolve({ authorization, organizationId: null });
    const message = await this.send({
      principal,
      conversationId: guid(id),
      body: input.body,
      clientId: input.clientId,
    });
    return toMessageHttpResponse(message);
  }

  @Post('conversations/:id/read')
  @HttpCode(200)
  async read(@Param('id') id: string, @Headers('authorization') authorization?: string) {
    const principal = await this.resolve({ authorization, organizationId: null });
    await this.markRead({ principal, conversationId: guid(id) });
    return { read: true };
  }
}
