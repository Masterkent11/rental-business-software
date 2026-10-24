import type {
  CreatePropertyListingInput,
  ListingAction,
  ListingCalendar,
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

export interface OwnerRepositoryPort {
  getListings(organizationId: string): Promise<readonly OwnerListing[]>;
  createPropertyListing(organizationId: string, input: CreatePropertyListingInput): Promise<OwnerListing>;
  updateListing(organizationId: string, listingId: string, input: UpdateListingInput): Promise<OwnerListing>;
  changeListingState(organizationId: string, listingId: string, action: ListingAction): Promise<OwnerListing>;
  getCalendar(organizationId: string, listingId: string, from: string, to: string): Promise<ListingCalendar>;
  addBlock(organizationId: string, listingId: string, startsOn: string, endsOn: string, note: string | null): Promise<AvailabilityBlock>;
  removeBlock(organizationId: string, blockId: string): Promise<void>;

  getBookings(
    organizationId: string,
    query: { bucket?: BookingBucket; q?: string; limit: number; offset: number },
  ): Promise<BookingPage>;
  getBooking(organizationId: string, bookingId: string): Promise<OwnerBooking>;
  updateBookingStatus(organizationId: string, bookingId: string, action: BookingAction): Promise<OwnerBooking>;

  getApplications(organizationId: string): Promise<readonly OwnerApplication[]>;
  confirmTenancy(organizationId: string, applicationId: string): Promise<void>;
  decideApplication(
    organizationId: string,
    applicationId: string,
    input: DecisionInput,
  ): Promise<{ id: string; state: string; decisionReason: string | null }>;
  getCollection(organizationId: string): Promise<Collection>;
}
