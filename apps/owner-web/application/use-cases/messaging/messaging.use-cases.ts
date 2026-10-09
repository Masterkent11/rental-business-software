import type { PartnerRepositoryPort, PartnerThreadPage } from "../../ports/partner-repository.port";
import type { RealtimePort, RealtimeStatus, Unsubscribe } from "../../ports/realtime.port";
import type { Conversation, Message } from "../../../domain/messaging/conversation";
import { MAX_MESSAGE_LENGTH } from "../../../domain/messaging/conversation";
import type { PartnerScope } from "../../../domain/workspace/workspace";

export class LoadConversationsUseCase {
  constructor(private readonly repository: PartnerRepositoryPort) {}
  async execute(scope: PartnerScope): Promise<{ conversations: readonly Conversation[]; unreadTotal: number }> {
    return this.repository.getConversations(scope);
  }
}

export class LoadThreadUseCase {
  constructor(private readonly repository: PartnerRepositoryPort) {}
  async execute(scope: PartnerScope, conversationId: string, before?: string): Promise<PartnerThreadPage> {
    return this.repository.getThread(scope, conversationId, before);
  }
}

export class SendMessageUseCase {
  constructor(private readonly repository: PartnerRepositoryPort) {}
  async execute(scope: PartnerScope, conversationId: string, body: string, clientId: string): Promise<Message> {
    const trimmed = body.trim();
    if (!trimmed) throw new Error("Write a message before sending");
    if (trimmed.length > MAX_MESSAGE_LENGTH) throw new Error(`Messages are limited to ${MAX_MESSAGE_LENGTH} characters`);
    return this.repository.sendMessage(scope, conversationId, trimmed, clientId);
  }
}

export class MarkConversationReadUseCase {
  constructor(private readonly repository: PartnerRepositoryPort) {}
  async execute(scope: PartnerScope, conversationId: string): Promise<void> {
    return this.repository.markConversationRead(scope, conversationId);
  }
}

export class WatchMessagesUseCase {
  constructor(private readonly realtime: RealtimePort) {}
  execute(
    scope: PartnerScope,
    onMessage: (message: Message) => void,
    onStatus: (status: RealtimeStatus) => void,
  ): Unsubscribe {
    return this.realtime.watchMessages(scope, onMessage, onStatus);
  }
}
