export * from './messaging-rules.ts';
export * from './messaging-errors.ts';

export type ParticipantRole = 'CUSTOMER' | 'OWNER' | 'AGENT';

export const isPartnerRole = (role: ParticipantRole): boolean => role === 'OWNER' || role === 'AGENT';

export interface Conversation {
  readonly id: string;
  readonly organizationId: string;
  readonly organizationName: string;
  readonly listingId: string;
  readonly listingTitle: string;
  readonly listingPhoto: string | null;
  readonly customerId: string;
  readonly customerName: string;
  readonly listingIntent: 'RENT' | 'SALE';
  readonly agentId: string | null;
  readonly agentName: string | null;
  readonly agentUserId: string | null;
  readonly agentLastReadAt: Date | null;
  readonly occupancyId: string | null;
  readonly bookingStartsOn: string | null;
  readonly bookingEndsOn: string | null;
  readonly lastMessageAt: Date | null;
  readonly lastMessagePreview: string;
  readonly lastSenderRole: ParticipantRole | null;
  readonly customerLastReadAt: Date | null;
  readonly ownerLastReadAt: Date | null;
  readonly unreadCount: number;
  readonly createdAt: Date;
}

export interface Message {
  readonly id: string;
  readonly conversationId: string;
  readonly senderId: string;
  readonly senderRole: ParticipantRole;
  readonly body: string;
  readonly clientId: string;
  readonly createdAt: Date;
}
