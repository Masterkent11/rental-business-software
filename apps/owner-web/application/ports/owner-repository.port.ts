import type {
  CreatePropertyListingInput,
  ListingAction,
  ListingCalendar,
  ListingPhoto,
  OwnerListing,
  UpdateListingInput,
  AvailabilityBlock,
} from "../../domain/listings/listing";
import type {
  OwnerApplication,
  DecisionInput,
} from "../../domain/applications/application";
import type { Collection } from "../../domain/payments/collection";
import type { BookingAction, BookingBucket, BookingPage, OwnerBooking } from "../../domain/bookings/booking";
import type { Conversation, Message } from "../../domain/messaging/conversation";
import type { AppNotification } from "../../domain/notifications/notification";

export interface ThreadPage {
  readonly conversation: Conversation;
  readonly messages: readonly Message[];
  readonly hasMore: boolean;
}

export interface OwnerRepositoryPort {
  getListings(organizationId: string): Promise<readonly OwnerListing[]>;
  getListing(organizationId: string, listingId: string): Promise<OwnerListing>;
  createPropertyListing(organizationId: string, input: CreatePropertyListingInput): Promise<OwnerListing>;
  updateListing(organizationId: string, listingId: string, input: UpdateListingInput): Promise<OwnerListing>;
  changeListingState(organizationId: string, listingId: string, action: ListingAction): Promise<OwnerListing>;
  registerPhoto(organizationId: string, listingId: string, storagePath: string): Promise<ListingPhoto>;
  removePhoto(organizationId: string, listingId: string, photoId: string): Promise<{ storagePath: string | null }>;
  reorderPhotos(organizationId: string, listingId: string, photoIds: readonly string[]): Promise<OwnerListing>;
  getCalendar(organizationId: string, listingId: string, from: string, to: string): Promise<ListingCalendar>;
  addBlock(organizationId: string, listingId: string, startsOn: string, endsOn: string, note: string | null): Promise<AvailabilityBlock>;
  removeBlock(organizationId: string, blockId: string): Promise<void>;

  getBookings(
    organizationId: string,
    query: { bucket?: BookingBucket; q?: string; limit: number; offset: number },
  ): Promise<BookingPage>;
  getBooking(organizationId: string, bookingId: string): Promise<OwnerBooking>;
  updateBookingStatus(organizationId: string, bookingId: string, action: BookingAction): Promise<OwnerBooking>;

  getConversations(organizationId: string): Promise<{ conversations: readonly Conversation[]; unreadTotal: number }>;
  getThread(organizationId: string, conversationId: string, before?: string): Promise<ThreadPage>;
  sendMessage(organizationId: string, conversationId: string, body: string, clientId: string): Promise<Message>;
  markConversationRead(organizationId: string, conversationId: string): Promise<void>;

  getNotifications(organizationId: string): Promise<{ notifications: readonly AppNotification[]; unreadCount: number }>;
  markNotificationsRead(organizationId: string): Promise<void>;

  getApplications(organizationId: string): Promise<readonly OwnerApplication[]>;
  decideApplication(
    organizationId: string,
    applicationId: string,
    input: DecisionInput,
  ): Promise<{ id: string; state: string; decisionReason: string | null }>;
  getCollection(organizationId: string): Promise<Collection>;
}
