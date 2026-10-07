import type { OwnerRepositoryPort, ThreadPage } from "../../ports/owner-repository.port";
import type { RealtimePort, RealtimeStatus, Unsubscribe } from "../../ports/realtime.port";
import type { Conversation, Message } from "../../../domain/messaging/conversation";
import { MAX_MESSAGE_LENGTH } from "../../../domain/messaging/conversation";

export class LoadConversationsUseCase {
  constructor(private readonly repository: OwnerRepositoryPort) {}
  async execute(organizationId: string): Promise<{ conversations: readonly Conversation[]; unreadTotal: number }> {
    if (!organizationId) throw new Error("Organization ID is required");
    return this.repository.getConversations(organizationId);
  }
}

export class LoadThreadUseCase {
  constructor(private readonly repository: OwnerRepositoryPort) {}
  async execute(organizationId: string, conversationId: string, before?: string): Promise<ThreadPage> {
    if (!organizationId) throw new Error("Organization ID is required");
    return this.repository.getThread(organizationId, conversationId, before);
  }
}

export class SendMessageUseCase {
  constructor(private readonly repository: OwnerRepositoryPort) {}
  async execute(organizationId: string, conversationId: string, body: string, clientId: string): Promise<Message> {
    const trimmed = body.trim();
    if (!trimmed) throw new Error("Write a message before sending");
    if (trimmed.length > MAX_MESSAGE_LENGTH) throw new Error(`Messages are limited to ${MAX_MESSAGE_LENGTH} characters`);
    return this.repository.sendMessage(organizationId, conversationId, trimmed, clientId);
  }
}

export class MarkConversationReadUseCase {
  constructor(private readonly repository: OwnerRepositoryPort) {}
  async execute(organizationId: string, conversationId: string): Promise<void> {
    return this.repository.markConversationRead(organizationId, conversationId);
  }
}

export class WatchMessagesUseCase {
  constructor(private readonly realtime: RealtimePort) {}
  execute(
    organizationId: string,
    onMessage: (message: Message) => void,
    onStatus: (status: RealtimeStatus) => void,
  ): Unsubscribe {
    return this.realtime.watchOrganizationMessages(organizationId, onMessage, onStatus);
  }
}
