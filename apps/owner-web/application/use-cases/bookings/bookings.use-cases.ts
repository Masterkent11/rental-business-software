import type { OwnerRepositoryPort } from "../../ports/owner-repository.port";
import type { BookingAction, BookingBucket, BookingPage, OwnerBooking } from "../../../domain/bookings/booking";

export class LoadBookingsUseCase {
  constructor(private readonly repository: OwnerRepositoryPort) {}
  async execute(
    organizationId: string,
    query: { bucket?: BookingBucket; q?: string; limit: number; offset: number },
  ): Promise<BookingPage> {
    if (!organizationId) throw new Error("Organization ID is required");
    return this.repository.getBookings(organizationId, query);
  }
}

export class LoadBookingUseCase {
  constructor(private readonly repository: OwnerRepositoryPort) {}
  async execute(organizationId: string, bookingId: string): Promise<OwnerBooking> {
    if (!organizationId) throw new Error("Organization ID is required");
    return this.repository.getBooking(organizationId, bookingId);
  }
}

export class UpdateBookingStatusUseCase {
  constructor(private readonly repository: OwnerRepositoryPort) {}
  async execute(organizationId: string, bookingId: string, action: BookingAction): Promise<OwnerBooking> {
    if (!organizationId) throw new Error("Organization ID is required");
    return this.repository.updateBookingStatus(organizationId, bookingId, action);
  }
}
