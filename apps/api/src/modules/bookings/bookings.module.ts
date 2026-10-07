import { Module } from '@nestjs/common';
import { ViewAvailabilityController } from './controllers/view-availability.controller.ts';
import { PlaceHoldController } from './controllers/place-hold.controller.ts';
import { MyBookingsController } from './controllers/my-bookings.controller.ts';
import { OrganizationBookingsController } from './controllers/organization-bookings.controller.ts';
import {
  BOOKING_LISTING_REPOSITORY,
  CREATE_BOOKING,
  GET_MY_BOOKING,
  GET_ORGANIZATION_BOOKING,
  LIST_MY_BOOKINGS,
  LIST_ORGANIZATION_BOOKINGS,
  OCCUPANCY_REPOSITORY,
  PLACE_HOLD,
  UPDATE_BOOKING_STATUS,
  VIEW_AVAILABILITY,
} from './booking.tokens.ts';
import { BOOKING_REPOSITORY, CLOCK, NOTIFICATION_REPOSITORY } from '@/modules/shared/shared.tokens.ts';
import { postgresOccupancyRepository } from '@/infrastructure/postgres/repositories/postgres-occupancy.repository.ts';
import { postgresListingRepository } from '@/infrastructure/postgres/repositories/postgres-listing.repository.ts';
import { placeHold } from '@/application/bookings/place-hold/place-hold.use-case.ts';
import { createBooking } from '@/application/bookings/create-booking/create-booking.use-case.ts';
import { viewAvailability } from '@/application/bookings/view-availability/view-availability.use-case.ts';
import { listMyBookings } from '@/application/bookings/list-my-bookings/list-my-bookings.use-case.ts';
import { getMyBooking } from '@/application/bookings/get-my-booking/get-my-booking.use-case.ts';
import { listOrganizationBookings } from '@/application/bookings/list-organization-bookings/list-organization-bookings.use-case.ts';
import { getOrganizationBooking } from '@/application/bookings/get-organization-booking/get-organization-booking.use-case.ts';
import { updateBookingStatus } from '@/application/bookings/update-booking-status/update-booking-status.use-case.ts';
import type { OccupancyRepository } from '@/application/ports/repositories/occupancy-repository.port.ts';
import type { ListingRepository } from '@/application/ports/repositories/listing-repository.port.ts';
import type { BookingRepository } from '@/application/ports/repositories/booking-repository.port.ts';
import type { NotificationRepository } from '@/application/ports/repositories/notification-repository.port.ts';
import type { Clock } from '@/application/ports/providers/clock.port.ts';

@Module({
  controllers: [
    ViewAvailabilityController,
    PlaceHoldController,
    MyBookingsController,
    OrganizationBookingsController,
  ],
  providers: [
    { provide: OCCUPANCY_REPOSITORY, useFactory: (): OccupancyRepository => postgresOccupancyRepository() },
    { provide: BOOKING_LISTING_REPOSITORY, useFactory: (): ListingRepository => postgresListingRepository() },
    {
      provide: PLACE_HOLD,
      inject: [OCCUPANCY_REPOSITORY],
      useFactory: (repo: OccupancyRepository) => placeHold(repo),
    },
    {
      provide: CREATE_BOOKING,
      inject: [BOOKING_LISTING_REPOSITORY, PLACE_HOLD],
      useFactory: (listings: ListingRepository, hold: ReturnType<typeof placeHold>) =>
        createBooking(listings, hold),
    },
    {
      provide: VIEW_AVAILABILITY,
      inject: [OCCUPANCY_REPOSITORY],
      useFactory: (repo: OccupancyRepository) => viewAvailability(repo),
    },
    {
      provide: LIST_MY_BOOKINGS,
      inject: [BOOKING_REPOSITORY, CLOCK],
      useFactory: (bookings: BookingRepository, clock: Clock) => listMyBookings(bookings, clock),
    },
    {
      provide: GET_MY_BOOKING,
      inject: [BOOKING_REPOSITORY, CLOCK],
      useFactory: (bookings: BookingRepository, clock: Clock) => getMyBooking(bookings, clock),
    },
    {
      provide: LIST_ORGANIZATION_BOOKINGS,
      inject: [BOOKING_REPOSITORY, CLOCK],
      useFactory: (bookings: BookingRepository, clock: Clock) => listOrganizationBookings(bookings, clock),
    },
    {
      provide: GET_ORGANIZATION_BOOKING,
      inject: [BOOKING_REPOSITORY, CLOCK],
      useFactory: (bookings: BookingRepository, clock: Clock) => getOrganizationBooking(bookings, clock),
    },
    {
      provide: UPDATE_BOOKING_STATUS,
      inject: [BOOKING_REPOSITORY, NOTIFICATION_REPOSITORY, CLOCK],
      useFactory: (bookings: BookingRepository, notifications: NotificationRepository, clock: Clock) =>
        updateBookingStatus(bookings, notifications, clock),
    },
  ],
})
export class BookingsModule {}
