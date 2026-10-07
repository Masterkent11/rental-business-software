import type { Conversation, Message, ParticipantRole } from '@/domain/messaging/conversation.ts';

export interface ConversationContext {
  readonly listingId: string;
  readonly organizationId: string;
  readonly listingTitle: string;
  readonly listingPublished: boolean;
}

export interface MessagingRepository {
  listingContext(listingId: string): Promise<ConversationContext | null>;
  customerHasBookingFor(customerId: string, listingId: string, occupancyId: string): Promise<boolean>;
  openForCustomer(input: {
    readonly organizationId: string;
    readonly listingId: string;
    readonly customerId: string;
    readonly occupancyId: string | null;
  }): Promise<Conversation>;
  findForCustomer(customerId: string, conversationId: string): Promise<Conversation | null>;
  findForOrganization(organizationId: string, conversationId: string): Promise<Conversation | null>;
  listForCustomer(customerId: string): Promise<readonly Conversation[]>;
  listForOrganization(organizationId: string): Promise<readonly Conversation[]>;
  messages(input: {
    readonly conversationId: string;
    readonly scope: { readonly customerId: string } | { readonly organizationId: string };
    readonly before: Date | null;
    readonly limit: number;
  }): Promise<readonly Message[]>;
  append(input: {
    readonly conversation: Conversation;
    readonly senderId: string;
    readonly senderRole: ParticipantRole;
    readonly body: string;
    readonly preview: string;
    readonly clientId: string;
    readonly scope: { readonly customerId: string } | { readonly organizationId: string };
  }): Promise<{ readonly message: Message; readonly created: boolean }>;
  markRead(input: {
    readonly conversationId: string;
    readonly role: ParticipantRole;
    readonly scope: { readonly customerId: string } | { readonly organizationId: string };
  }): Promise<void>;
}
