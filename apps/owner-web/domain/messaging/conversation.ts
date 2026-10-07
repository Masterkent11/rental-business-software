export type SenderRole = "CUSTOMER" | "OWNER";

export interface Conversation {
  readonly id: string;
  readonly listingId: string;
  readonly listingTitle: string;
  readonly listingPhoto: string | null;
  readonly customerName: string;
  readonly bookingId: string | null;
  readonly bookingStartsOn: string | null;
  readonly bookingEndsOn: string | null;
  readonly lastMessageAt: string | null;
  readonly lastMessagePreview: string;
  readonly lastSenderRole: SenderRole | null;
  readonly unreadCount: number;
}

export interface Message {
  readonly id: string;
  readonly conversationId: string;
  readonly senderRole: SenderRole;
  readonly body: string;
  readonly clientId: string;
  readonly createdAt: string;
}

export type DeliveryState = "sent" | "sending" | "failed";

export interface ChatMessage extends Message {
  readonly delivery: DeliveryState;
}

export function mergeMessages(
  current: readonly ChatMessage[],
  incoming: readonly Message[],
): readonly ChatMessage[] {
  const byClient = new Map<string, ChatMessage>();
  for (const message of current) byClient.set(message.clientId, message);
  for (const message of incoming) {
    byClient.set(message.clientId, { ...message, delivery: "sent" });
  }
  return [...byClient.values()].sort((a, b) => {
    if (a.createdAt === b.createdAt) return a.id.localeCompare(b.id);
    return a.createdAt < b.createdAt ? -1 : 1;
  });
}

export function upsertConversation(
  list: readonly Conversation[],
  next: Conversation,
): readonly Conversation[] {
  const others = list.filter((c) => c.id !== next.id);
  return [next, ...others].sort((a, b) => (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? ""));
}

export const MAX_MESSAGE_LENGTH = 4000;
