import type { Conversation, Message } from '@/domain/messaging/conversation.ts';
import type { ConversationThread } from '@/application/messaging/get-conversation-messages/get-conversation-messages.use-case.ts';

export type ConversationViewer = 'CUSTOMER' | 'OWNER' | 'AGENT';

export const toConversationHttpResponse = (conversation: Conversation, viewer: ConversationViewer) => ({
  id: conversation.id,
  listingId: conversation.listingId,
  listingTitle: conversation.listingTitle,
  listingPhoto: conversation.listingPhoto,
  organizationId: conversation.organizationId,
  organizationName: conversation.organizationName,
  customerName: conversation.customerName,
  ...(viewer !== 'CUSTOMER' ? { customerId: conversation.customerId } : {}),
  listingIntent: conversation.listingIntent,
  agentId: conversation.agentId,
  agentName: conversation.agentName,
  bookingId: conversation.occupancyId,
  bookingStartsOn: conversation.bookingStartsOn,
  bookingEndsOn: conversation.bookingEndsOn,
  lastMessageAt: conversation.lastMessageAt?.toISOString() ?? null,
  lastMessagePreview: conversation.lastMessagePreview,
  lastSenderRole: conversation.lastSenderRole,
  unreadCount: conversation.unreadCount,
  createdAt: conversation.createdAt.toISOString(),
});

export const toMessageHttpResponse = (message: Message) => ({
  id: message.id,
  conversationId: message.conversationId,
  senderRole: message.senderRole,
  body: message.body,
  clientId: message.clientId,
  createdAt: message.createdAt.toISOString(),
});

export const toThreadHttpResponse = (thread: ConversationThread, viewer: ConversationViewer) => ({
  conversation: toConversationHttpResponse(thread.conversation, viewer),
  messages: thread.messages.map(toMessageHttpResponse),
  hasMore: thread.hasMore,
});
