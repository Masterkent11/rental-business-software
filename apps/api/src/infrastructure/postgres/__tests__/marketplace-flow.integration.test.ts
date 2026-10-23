import { postgresPaymentNotificationOutbox } from '@/infrastructure/postgres/repositories/postgres-payment-notification-outbox.repository.ts';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sql } from '@/infrastructure/postgres/db.ts';
import { postgresListingRepository } from '@/infrastructure/postgres/repositories/postgres-listing.repository.ts';
import { postgresOccupancyRepository } from '@/infrastructure/postgres/repositories/postgres-occupancy.repository.ts';
import { postgresBookingRepository } from '@/infrastructure/postgres/repositories/postgres-booking.repository.ts';
import { postgresMessagingRepository } from '@/infrastructure/postgres/repositories/postgres-messaging.repository.ts';
import { postgresNotificationRepository } from '@/infrastructure/postgres/repositories/postgres-notification.repository.ts';
import { postgresUserRepository } from '@/infrastructure/postgres/repositories/postgres-user.repository.ts';
import { postgresPaymentRepository } from '@/infrastructure/postgres/repositories/postgres-payment.repository.ts';
import { postgresAgentRepository } from '@/infrastructure/postgres/repositories/postgres-agent.repository.ts';
import { postgresViewingRepository } from '@/infrastructure/postgres/repositories/postgres-viewing.repository.ts';
import { postgresLeadAssignmentRepository } from '@/infrastructure/postgres/repositories/postgres-lead-assignment.repository.ts';
import { resolveLeadAssignment } from '@/application/assignment/resolve-lead-assignment/resolve-lead-assignment.use-case.ts';
import { reassignLead } from '@/application/assignment/reassign-lead/reassign-lead.use-case.ts';
import { assignLead } from '@/application/assignment/assign-lead/assign-lead.use-case.ts';
import { sandboxPaymentGateway } from '@/infrastructure/payments/sandbox-payment-gateway.adapter.ts';
import { createPropertyListing } from '@/application/listings/create-property-listing/create-property-listing.use-case.ts';
import { updateListing } from '@/application/listings/update-listing/update-listing.use-case.ts';
import { setListingState } from '@/application/listings/set-listing-state/set-listing-state.use-case.ts';
import { registerListingPhoto } from '@/application/listings/register-listing-photo/register-listing-photo.use-case.ts';
import { searchListings } from '@/application/listings/search-listings/search-listings.use-case.ts';
import { quoteStayForListing } from '@/application/listings/quote-stay/quote-stay.use-case.ts';
import { placeHold } from '@/application/bookings/place-hold/place-hold.use-case.ts';
import { createBooking } from '@/application/bookings/create-booking/create-booking.use-case.ts';
import { listOrganizationBookings } from '@/application/bookings/list-organization-bookings/list-organization-bookings.use-case.ts';
import { listMyBookings } from '@/application/bookings/list-my-bookings/list-my-bookings.use-case.ts';
import { getMyBooking } from '@/application/bookings/get-my-booking/get-my-booking.use-case.ts';
import { addAvailabilityBlock } from '@/application/bookings/manage-availability-blocks/manage-availability-blocks.use-case.ts';
import { startBookingPayment } from '@/application/payments/start-booking-payment/start-booking-payment.use-case.ts';
import { simulateBookingPayment } from '@/application/payments/simulate-booking-payment/simulate-booking-payment.use-case.ts';
import { confirmBookingPayment } from '@/application/payments/confirm-booking-payment/confirm-booking-payment.use-case.ts';
import { startConversation } from '@/application/messaging/start-conversation/start-conversation.use-case.ts';
import { sendCustomerMessage, sendOwnerMessage } from '@/application/messaging/send-message/send-message.use-case.ts';
import { getCustomerThread, getOrganizationThread } from '@/application/messaging/get-conversation-messages/get-conversation-messages.use-case.ts';
import { listOrganizationConversations } from '@/application/messaging/list-organization-conversations/list-organization-conversations.use-case.ts';
import { markOrganizationConversationRead } from '@/application/messaging/mark-conversation-read/mark-conversation-read.use-case.ts';
import { OccupancyConflictError } from '@/application/ports/repositories/occupancy-repository.port.ts';
import { OrganizationForbiddenError } from '@/application/identity/resolve-principal/resolve-principal.use-case.ts';
import type { ListingMediaStorage } from '@/application/ports/storage/listing-media.port.ts';
import { ConversationNotFoundError } from '@/domain/messaging/conversation.ts';
import { BookingNotHeldError, GuestLimitExceededError, StayTooShortError } from '@/domain/bookings/booking.ts';
import { InvalidListingTransitionError, ListingNotPublishableError } from '@/domain/listings/listing.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { centavos } from '@/domain/shared/money.ts';

const live = Boolean(process.env.DATABASE_URL);
const suite = live ? describe : describe.skip;

const SANTOS = '11111111-1111-1111-1111-111111111111';
const SKYLINE = '22222222-2222-2222-2222-222222222222';
const OWNER = randomUUID();
const RIVAL = randomUUID();
const ANA = randomUUID();
const BEN = randomUUID();

const ownerOf = (userId: string, organizationId: string): Principal => ({
  userId,
  displayName: 'Owner',
  capabilities: [{ capability: 'OWNER', organizationId }],
  organizationId,
});

const customer = (userId: string): Principal => ({
  userId,
  displayName: 'Guest',
  capabilities: [{ capability: 'CUSTOMER', organizationId: null }],
  organizationId: null,
});

const clock = { now: () => new Date() };

const fakeMedia: ListingMediaStorage = {
  publicUrl: (path) => `https://storage.test/${path}`,
  inspect: async () => ({ contentType: 'image/jpeg', sizeBytes: 120_000 }),
};

const day = (offset: number) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
};

suite('marketplace vertical flow against real PostgreSQL', { timeout: 60_000 }, () => {
  const listings = postgresListingRepository();
  const occupancies = postgresOccupancyRepository();
  const bookings = postgresBookingRepository();
  const messaging = postgresMessagingRepository();
  const notifications = postgresNotificationRepository();
  const users = postgresUserRepository();
  const payments = postgresPaymentRepository();
  const assignments = postgresLeadAssignmentRepository();
  const settings = { responseWindowMinutes: 240, sweepIntervalSeconds: 0 };
  const resolve = resolveLeadAssignment(assignments, clock);
  const reassign = reassignLead({
    assignments,
    viewings: postgresViewingRepository(),
    listings,
    agents: postgresAgentRepository(),
    notifications,
    resolve,
    clock,
    settings,
  });
  const assign = assignLead({ assignments, resolve, reassign, clock, settings });
  const gateway = sandboxPaymentGateway('test-secret');
  const hold = placeHold(occupancies);
  const book = createBooking(listings, hold);
  let listingId = '';

  beforeAll(async () => {
    for (const [id, name] of [
      [OWNER, 'Olive Owner'],
      [RIVAL, 'Rita Rival'],
      [ANA, 'Ana Guest'],
      [BEN, 'Ben Guest'],
    ] as const) {
      await users.createProfile({ id, email: `${id.slice(0, 8)}@example.test`, mobile: null, displayName: name });
    }

    const created = await createPropertyListing(listings)({
      principal: ownerOf(OWNER, SANTOS),
      organizationId: SANTOS,
      property: {
        name: 'Integration Loft',
        propertyType: 'CONDO',
        addressLine: '12 Test Street',
        areaLabel: 'Brgy. Lahug',
        cityLabel: 'Cebu City',
      },
      unitLabel: 'Loft 7',
      rentalMode: 'SHORT_TERM',
      listing: {
        kind: 'SHORT_TERM',
        title: 'Integration loft near IT Park',
        description: 'A bright loft used by the integration suite to prove the full flow.',
        priceCentavos: centavos(250_000),
        amenities: ['Wi-Fi', 'Aircon'],
        houseRules: ['No smoking'],
        terms: ['Check-in 2 PM'],
        minStayNights: 2,
        advanceMonths: 0,
        depositMonths: 0,
        maxOccupants: 3,
        bedrooms: 1,
        bathrooms: 1,
        floorAreaSqm: 36,
        cleaningFeeCentavos: centavos(50_000),
        availableFrom: null,
      },
    });
    listingId = created.id;
  });

  afterAll(async () => {
    await sql.end({ timeout: 5 });
  });

  it('creates the listing as a draft, invisible to customers', async () => {
    const found = await searchListings(listings)({ text: 'Integration loft', limit: 10, offset: 0 });
    expect(found.items.find((item) => item.id === listingId)).toBeUndefined();
  });

  it('refuses to publish without a photo', async () => {
    await expect(
      setListingState(listings)({
        principal: ownerOf(OWNER, SANTOS),
        organizationId: SANTOS,
        listingId,
        action: 'PUBLISH',
      }),
    ).rejects.toBeInstanceOf(ListingNotPublishableError);
  });

  it('refuses a photo path that belongs to another listing', async () => {
    await expect(
      registerListingPhoto(listings, fakeMedia)({
        principal: ownerOf(OWNER, SANTOS),
        organizationId: SANTOS,
        listingId,
        storagePath: `${SANTOS}/listings/${randomUUID()}/cover.jpg`,
      }),
    ).rejects.toThrow(/not uploaded for this listing/);
  });

  it('registers a photo, publishes, and appears in search with its details', async () => {
    const photo = await registerListingPhoto(listings, fakeMedia)({
      principal: ownerOf(OWNER, SANTOS),
      organizationId: SANTOS,
      listingId,
      storagePath: `${SANTOS}/listings/${listingId}/cover.jpg`,
    });
    expect(photo.url).toContain(`/listings/${listingId}/cover.jpg`);

    await setListingState(listings)({
      principal: ownerOf(OWNER, SANTOS),
      organizationId: SANTOS,
      listingId,
      action: 'PUBLISH',
    });

    const found = await searchListings(listings)({
      text: 'Integration loft',
      propertyType: 'CONDO',
      guests: 2,
      limit: 10,
      offset: 0,
    });
    const item = found.items.find((row) => row.id === listingId);
    expect(item).toBeDefined();
    expect(item!.photos[0]).toBe(photo.url);
    expect(item!.maxOccupants).toBe(3);
    expect(item!.amenities).toEqual(['Wi-Fi', 'Aircon']);
    expect(item!.cityLabel).toBe('Cebu City');
  });

  it('filters out listings that cannot fit the party', async () => {
    const found = await searchListings(listings)({ text: 'Integration loft', guests: 5, limit: 10, offset: 0 });
    expect(found.items.find((row) => row.id === listingId)).toBeUndefined();
  });

  it('lets the owner edit details and keeps them consistent', async () => {
    const updated = await updateListing(listings)({
      principal: ownerOf(OWNER, SANTOS),
      organizationId: SANTOS,
      listingId,
      listing: { title: 'Integration loft with balcony', priceCentavos: centavos(260_000) },
      property: { areaLabel: 'Brgy. Apas' },
    });
    expect(updated.title).toBe('Integration loft with balcony');
    expect(updated.priceCentavos).toBe(260_000);
    expect(updated.areaLabel).toBe('Brgy. Apas');
  });

  it('refuses another organization editing or publishing the listing', async () => {
    await expect(
      updateListing(listings)({
        principal: ownerOf(RIVAL, SKYLINE),
        organizationId: SANTOS,
        listingId,
        listing: { title: 'Hijacked' },
      }),
    ).rejects.toBeInstanceOf(OrganizationForbiddenError);

    await expect(
      updateListing(listings)({
        principal: ownerOf(RIVAL, SKYLINE),
        organizationId: SKYLINE,
        listingId,
        listing: { title: 'Hijacked' },
      }),
    ).rejects.toThrow(/not found/i);
  });

  it('refuses to archive a published listing', async () => {
    await expect(
      setListingState(listings)({
        principal: ownerOf(OWNER, SANTOS),
        organizationId: SANTOS,
        listingId,
        action: 'ARCHIVE',
      }),
    ).rejects.toBeInstanceOf(InvalidListingTransitionError);
  });

  it('prices a stay on the server, including the cleaning fee', async () => {
    const quote = await quoteStayForListing(listings, occupancies)({
      listingId,
      startsOn: day(30),
      endsOn: day(33),
      guests: 2,
    });
    expect(quote.nights).toBe(3);
    expect(quote.totalCentavos).toBe(260_000 * 3 + 50_000);
    expect(quote.available).toBe(true);
  });

  it('refuses stays that break the owner rules', async () => {
    await expect(
      book({ principal: customer(ANA), listingId, startsOn: day(40), endsOn: day(41), guests: 1, idempotencyKey: null }),
    ).rejects.toBeInstanceOf(StayTooShortError);
    await expect(
      book({ principal: customer(ANA), listingId, startsOn: day(40), endsOn: day(43), guests: 4, idempotencyKey: null }),
    ).rejects.toBeInstanceOf(GuestLimitExceededError);
  });

  it('returns the same hold for a repeated submission', async () => {
    const key = randomUUID();
    const first = await book({ principal: customer(ANA), listingId, startsOn: day(50), endsOn: day(52), guests: 2, idempotencyKey: key });
    const again = await book({ principal: customer(ANA), listingId, startsOn: day(50), endsOn: day(52), guests: 2, idempotencyKey: key });
    expect(again.hold.id).toBe(first.hold.id);
  });

  it('rejects a stale second booking for the same nights', async () => {
    await book({ principal: customer(ANA), listingId, startsOn: day(60), endsOn: day(63), guests: 2, idempotencyKey: null });
    await expect(
      book({ principal: customer(BEN), listingId, startsOn: day(61), endsOn: day(64), guests: 2, idempotencyKey: null }),
    ).rejects.toBeInstanceOf(OccupancyConflictError);
  });

  it('allows exactly one of two concurrent bookings for the same nights', async () => {
    const results = await Promise.allSettled([
      book({ principal: customer(ANA), listingId, startsOn: day(70), endsOn: day(72), guests: 1, idempotencyKey: null }),
      book({ principal: customer(BEN), listingId, startsOn: day(70), endsOn: day(72), guests: 1, idempotencyKey: null }),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
    expect(rejected.reason).toBeInstanceOf(OccupancyConflictError);
  });

  it('confirms a paid booking that both sides can see, and keeps customers apart', async () => {
    const created = await book({ principal: customer(ANA), listingId, startsOn: day(80), endsOn: day(83), guests: 2, idempotencyKey: null });
    const intent = await startBookingPayment(payments, gateway)({ occupancyId: created.hold.id, userId: ANA });
    expect(intent.amountCentavos).toBe(created.quote.totalCentavos);

    await expect(
      startBookingPayment(payments, gateway)({ occupancyId: created.hold.id, userId: BEN }),
    ).rejects.toThrow(/does not belong/);

    const confirm = confirmBookingPayment(payments, gateway);
    const result = await simulateBookingPayment(payments, gateway, confirm)({
      occupancyId: created.hold.id,
      paymentId: intent.paymentId,
      userId: ANA,
    });
    expect(result?.applied).toBe(true);
    await postgresPaymentNotificationOutbox().deliverPending(100);

    const mine = await listMyBookings(bookings, clock)({ principal: customer(ANA) });
    const booking = mine.find((b) => b.id === created.hold.id);
    expect(booking?.stayState).toBe('CONFIRMED');
    expect(booking?.paidCentavos).toBe(created.quote.totalCentavos);
    expect(booking?.bucket).toBe('UPCOMING');

    const theirs = await listMyBookings(bookings, clock)({ principal: customer(BEN) });
    expect(theirs.find((b) => b.id === created.hold.id)).toBeUndefined();
    await expect(
      getMyBooking(bookings, clock)({ principal: customer(BEN), bookingId: created.hold.id }),
    ).rejects.toBeInstanceOf(BookingNotHeldError);

    const ownerView = await listOrganizationBookings(bookings, clock)({
      principal: ownerOf(OWNER, SANTOS),
      organizationId: SANTOS,
      limit: 100,
      offset: 0,
    });
    const seen = ownerView.items.find((b) => b.id === created.hold.id);
    expect(seen?.guestName).toBe('Ana Guest');
    expect(seen?.stayState).toBe('CONFIRMED');

    const rival = await listOrganizationBookings(bookings, clock)({
      principal: ownerOf(RIVAL, SKYLINE),
      organizationId: SKYLINE,
      limit: 100,
      offset: 0,
    });
    expect(rival.items.find((b) => b.id === created.hold.id)).toBeUndefined();

    const inbox = await notifications.forUser(ANA, 10);
    expect(inbox.some((n) => n.kind === 'BOOKING_CONFIRMED')).toBe(true);
    const ownerInbox = await notifications.forOrganization(SANTOS, 20);
    expect(ownerInbox.some((n) => n.kind === 'BOOKING_RECEIVED')).toBe(true);
  });

  it('blocks owner dates so customers cannot book them', async () => {
    await addAvailabilityBlock(listings, bookings)({
      principal: ownerOf(OWNER, SANTOS),
      organizationId: SANTOS,
      listingId,
      startsOn: day(90),
      endsOn: day(95),
      note: 'Repainting',
    });
    await expect(
      book({ principal: customer(BEN), listingId, startsOn: day(92), endsOn: day(94), guests: 1, idempotencyKey: null }),
    ).rejects.toBeInstanceOf(OccupancyConflictError);
  });

  describe('messaging', () => {
    let conversationId = '';

    it('delivers customer and owner messages with persistent ids and dedupes retries', async () => {
      const conversation = await startConversation(messaging, listings, assign)({
        principal: customer(ANA),
        listingId,
        bookingId: null,
      });
      conversationId = conversation.id;

      const clientId = randomUUID();
      const send = sendCustomerMessage(messaging, notifications, clock);
      const first = await send({ principal: customer(ANA), conversationId, body: 'Is parking available?', clientId });
      const retry = await send({ principal: customer(ANA), conversationId, body: 'Is parking available?', clientId });
      expect(retry.id).toBe(first.id);

      await sendOwnerMessage(messaging, notifications, clock)({
        principal: ownerOf(OWNER, SANTOS),
        organizationId: SANTOS,
        conversationId,
        body: 'Yes, one slot is included.',
        clientId: randomUUID(),
      });

      const thread = await getCustomerThread(messaging)({ principal: customer(ANA), conversationId, before: null });
      expect(thread.messages.map((m) => m.body)).toEqual(['Is parking available?', 'Yes, one slot is included.']);
      expect(thread.messages.map((m) => m.senderRole)).toEqual(['CUSTOMER', 'OWNER']);
    });

    it('shows the owner an unread inbox entry until it is read', async () => {
      await sendCustomerMessage(messaging, notifications, clock)({
        principal: customer(ANA),
        conversationId,
        body: 'Thanks!',
        clientId: randomUUID(),
      });
      const list = await listOrganizationConversations(messaging)({ principal: ownerOf(OWNER, SANTOS), organizationId: SANTOS });
      const entry = list.find((c) => c.id === conversationId);
      expect(entry?.unreadCount).toBe(1);
      expect(entry?.customerName).toBe('Ana Guest');
      expect(entry?.lastMessagePreview).toBe('Thanks!');

      await markOrganizationConversationRead(messaging)({ principal: ownerOf(OWNER, SANTOS), organizationId: SANTOS, conversationId });
      const after = await listOrganizationConversations(messaging)({ principal: ownerOf(OWNER, SANTOS), organizationId: SANTOS });
      expect(after.find((c) => c.id === conversationId)?.unreadCount).toBe(0);
    });

    it('never lets another customer read or post into the conversation', async () => {
      await expect(
        getCustomerThread(messaging)({ principal: customer(BEN), conversationId, before: null }),
      ).rejects.toBeInstanceOf(ConversationNotFoundError);
      await expect(
        sendCustomerMessage(messaging, notifications, clock)({
          principal: customer(BEN),
          conversationId,
          body: 'Forged',
          clientId: randomUUID(),
        }),
      ).rejects.toBeInstanceOf(ConversationNotFoundError);
    });

    it('never lets another organization read the conversation', async () => {
      await expect(
        getOrganizationThread(messaging)({
          principal: ownerOf(RIVAL, SKYLINE),
          organizationId: SKYLINE,
          conversationId,
          before: null,
        }),
      ).rejects.toBeInstanceOf(ConversationNotFoundError);
      await expect(
        getOrganizationThread(messaging)({
          principal: ownerOf(RIVAL, SKYLINE),
          organizationId: SANTOS,
          conversationId,
          before: null,
        }),
      ).rejects.toBeInstanceOf(OrganizationForbiddenError);
      const rivalInbox = await listOrganizationConversations(messaging)({ principal: ownerOf(RIVAL, SKYLINE), organizationId: SKYLINE });
      expect(rivalInbox.find((c) => c.id === conversationId)).toBeUndefined();
    });
  });
});
