import type { Conversation, Message } from '@/domain/messaging/conversation.ts';
import type { ConversationThread } from '@/application/messaging/get-conversation-messages/get-conversation-messages.use-case.ts';

export const toConversationHttpResponse = (conversation: Conversation, viewer: 'CUSTOMER' | 'OWNER') => ({
  id: conversation.id,
  listingId: conversation.listingId,
  listingTitle: conversation.listingTitle,
  listingPhoto: conversation.listingPhoto,
  organizationId: conversation.organizationId,
  organizationName: conversation.organizationName,
  customerName: conversation.customerName,
  ...(viewer === 'OWNER' ? { customerId: conversation.customerId } : {}),
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

export const toThreadHttpResponse = (thread: ConversationThread, viewer: 'CUSTOMER' | 'OWNER') => ({
  conversation: toConversationHttpResponse(thread.conversation, viewer),
  messages: thread.messages.map(toMessageHttpResponse),
  hasMore: thread.hasMore,
});
