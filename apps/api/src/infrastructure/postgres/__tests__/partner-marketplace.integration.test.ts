import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sql, withScope, withUser } from '@/infrastructure/postgres/db.ts';
import { postgresListingRepository } from '@/infrastructure/postgres/repositories/postgres-listing.repository.ts';
import { postgresUserRepository } from '@/infrastructure/postgres/repositories/postgres-user.repository.ts';
import { postgresAgentRepository } from '@/infrastructure/postgres/repositories/postgres-agent.repository.ts';
import { postgresRepresentationRepository } from '@/infrastructure/postgres/repositories/postgres-representation.repository.ts';
import { postgresInquiryRepository } from '@/infrastructure/postgres/repositories/postgres-inquiry.repository.ts';
import { postgresViewingRepository } from '@/infrastructure/postgres/repositories/postgres-viewing.repository.ts';
import { postgresMessagingRepository } from '@/infrastructure/postgres/repositories/postgres-messaging.repository.ts';
import { postgresNotificationRepository } from '@/infrastructure/postgres/repositories/postgres-notification.repository.ts';
import { postgresTourRepository } from '@/infrastructure/postgres/repositories/postgres-tour.repository.ts';
import { postgresAgentTaskRepository } from '@/infrastructure/postgres/repositories/postgres-agent-task.repository.ts';
import { postgresAnalyticsRepository } from '@/infrastructure/postgres/repositories/postgres-analytics.repository.ts';
import { postgresLeadAssignmentRepository } from '@/infrastructure/postgres/repositories/postgres-lead-assignment.repository.ts';
import { postgresListingChangeProposalRepository } from '@/infrastructure/postgres/repositories/postgres-listing-change-proposal.repository.ts';
import { createSaleListing } from '@/application/listings/create-sale-listing/create-sale-listing.use-case.ts';
import { registerListingPhoto } from '@/application/listings/register-listing-photo/register-listing-photo.use-case.ts';
import { setListingState } from '@/application/listings/set-listing-state/set-listing-state.use-case.ts';
import { searchListings } from '@/application/listings/search-listings/search-listings.use-case.ts';
import { viewListing } from '@/application/listings/view-listing/view-listing.use-case.ts';
import { getSaleTerms } from '@/application/listings/get-sale-terms/get-sale-terms.use-case.ts';
import { saveSaleTerms } from '@/application/listings/save-sale-terms/save-sale-terms.use-case.ts';
import { updateSaleListing } from '@/application/listings/update-sale-listing/update-sale-listing.use-case.ts';
import { listAreas } from '@/application/listings/list-areas/list-areas.use-case.ts';
import {
  registerAgentProfile,
  requestAgentVerification,
} from '@/application/agents/manage-agent-profile/manage-agent-profile.use-case.ts';
import { decideAgentVerification } from '@/application/agents/review-agent-verification/review-agent-verification.use-case.ts';
import { viewPublicAgent } from '@/application/agents/view-public-agent/view-public-agent.use-case.ts';
import {
  endRepresentation,
  inviteAgentToListing,
  respondToRepresentation,
  updateRepresentationPermissions,
} from '@/application/agents/manage-representation/manage-representation.use-case.ts';
import { getAgentDashboard } from '@/application/agents/agent-dashboard/agent-dashboard.use-case.ts';
import { createAgentTask } from '@/application/agents/manage-agent-tasks/manage-agent-tasks.use-case.ts';
import { listAgentClients } from '@/application/agents/list-agent-clients/list-agent-clients.use-case.ts';
import { getAgentAnalytics, getOrganizationAnalytics } from '@/application/agents/partner-analytics/partner-analytics.use-case.ts';
import { submitInquiry } from '@/application/inquiries/submit-inquiry/submit-inquiry.use-case.ts';
import { listPartnerInquiries } from '@/application/inquiries/list-partner-inquiries/list-partner-inquiries.use-case.ts';
import { updateInquiryStatus } from '@/application/inquiries/update-inquiry-status/update-inquiry-status.use-case.ts';
import { sendAgentMessage, sendCustomerMessage } from '@/application/messaging/send-message/send-message.use-case.ts';
import { getAgentThread, getCustomerThread } from '@/application/messaging/get-conversation-messages/get-conversation-messages.use-case.ts';
import { listAgentConversations } from '@/application/messaging/list-agent-conversations/list-agent-conversations.use-case.ts';
import { requestViewing } from '@/application/viewings/request-viewing/request-viewing.use-case.ts';
import { partnerViewingAction } from '@/application/viewings/partner-viewing-action/partner-viewing-action.use-case.ts';
import { listMyViewings } from '@/application/viewings/list-my-viewings/list-my-viewings.use-case.ts';
import { decideChangeProposal } from '@/application/listings/review-change-proposal/review-change-proposal.use-case.ts';
import { resolveLeadAssignment } from '@/application/assignment/resolve-lead-assignment/resolve-lead-assignment.use-case.ts';
import { reassignLead } from '@/application/assignment/reassign-lead/reassign-lead.use-case.ts';
import { assignLead } from '@/application/assignment/assign-lead/assign-lead.use-case.ts';
import { ensureListingTour } from '@/application/tours/ensure-listing-tour/ensure-listing-tour.use-case.ts';
import { configureTourProvider } from '@/application/tours/configure-tour-provider/configure-tour-provider.use-case.ts';
import { partnerListingGate, partnerTourGate } from '@/application/identity/partner-access.rules.ts';
import { OrganizationForbiddenError } from '@/application/identity/resolve-principal/resolve-principal.use-case.ts';
import { TourNotFoundError } from '@/application/ports/repositories/tour-repository.port.ts';
import type { ListingMediaStorage } from '@/application/ports/storage/listing-media.port.ts';
import {
  ListingAlreadyRepresentedError,
  RepresentationForbiddenError,
} from '@/domain/agents/agent.ts';
import { InquiryNotAllowedError } from '@/domain/inquiries/inquiry.ts';
import { localDayOf, localInstant } from '@/domain/viewings/viewing.ts';
import { ConversationNotFoundError } from '@/domain/messaging/conversation.ts';
import { DuplicatePropertyError, ListingNotFoundError } from '@/domain/listings/listing.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { PUBLIC } from '@/domain/shared/organization-scope.ts';
import { toListingHttpResponse } from '@/modules/listings/mappers/listing-http.mapper.ts';

const live = Boolean(process.env.DATABASE_URL) && Boolean(process.env.TEST_ADMIN_DATABASE_URL);
const suite = live ? describe : describe.skip;

const SANTOS = '11111111-1111-1111-1111-111111111111';
const SKYLINE = '22222222-2222-2222-2222-222222222222';
const OWNER = randomUUID();
const RIVAL = randomUUID();
const MARIA = randomUUID();
const JUN = randomUUID();
const ADMIN = randomUUID();
const ANA = randomUUID();
const BEN = randomUUID();
const ASKING_PRICE = 1_850_000_000;
const HOUSE_NUMBER = String(1000 + Math.floor(Math.random() * 8999));

const owner = (userId: string, organizationId: string): Principal => ({
  userId,
  displayName: 'Owner',
  capabilities: [{ capability: 'OWNER', organizationId }],
  organizationId,
});

const agent = (userId: string, name: string): Principal => ({
  userId,
  displayName: name,
  capabilities: [
    { capability: 'CUSTOMER', organizationId: null },
    { capability: 'AGENT', organizationId: null },
  ],
  organizationId: null,
});

const customer = (userId: string, name: string): Principal => ({
  userId,
  displayName: name,
  capabilities: [{ capability: 'CUSTOMER', organizationId: null }],
  organizationId: null,
});

const admin: Principal = {
  userId: ADMIN,
  displayName: 'Platform admin',
  capabilities: [{ capability: 'PLATFORM_ADMIN', organizationId: null }],
  organizationId: null,
};

const clock = { now: () => new Date() };
const settings = { responseWindowMinutes: 240, sweepIntervalSeconds: 0 };
const DAY_MS = 24 * 60 * 60 * 1000;

const fakeMedia: ListingMediaStorage = {
  publicUrl: (path) => `https://storage.test/${path}`,
  inspect: async () => ({ contentType: 'image/jpeg', sizeBytes: 220_000 }),
};

const profileFor = (displayName: string) => ({
  displayName,
  headline: 'Licensed real estate broker',
  bio: 'Helping families find homes.',
  licenseNumber: `PRC-${displayName.length}${Date.now() % 10_000}`,
  licenseAuthority: 'PRC',
  specialties: ['House & Lot'],
  areasServed: ['Cebu City'],
  languages: ['English'],
  publicState: 'PUBLIC' as const,
  photoUrl: null,
});

suite('partner marketplace: sale listings, agents, inquiries, viewings', { timeout: 90_000 }, () => {
  const adminDb = postgres(process.env.TEST_ADMIN_DATABASE_URL ?? '', { max: 1 });
  const listings = postgresListingRepository();
  const users = postgresUserRepository();
  const agents = postgresAgentRepository();
  const representations = postgresRepresentationRepository();
  const inquiries = postgresInquiryRepository();
  const viewings = postgresViewingRepository();
  const messaging = postgresMessagingRepository();
  const notifications = postgresNotificationRepository();
  const tours = postgresTourRepository();
  const tasks = postgresAgentTaskRepository();
  const analytics = postgresAnalyticsRepository();
  const assignments = postgresLeadAssignmentRepository();
  const proposals = postgresListingChangeProposalRepository();
  const listingGate = partnerListingGate(representations);
  const tourGate = partnerTourGate(representations);
  const resolve = resolveLeadAssignment(assignments, clock);
  const reassign = reassignLead({ assignments, viewings, listings, agents, notifications, resolve, clock, settings });
  const assign = assignLead({ assignments, resolve, reassign, clock, settings });
  const viewingDay = localDayOf(new Date(Date.now() + 2 * DAY_MS));

  let listingId = '';
  let mariaAgentId = '';
  let junAgentId = '';
  let representationId = '';
  let inquiryId = '';
  let conversationId = '';
  let viewingId = '';
  let junRepresentationId = '';

  beforeAll(async () => {
    for (const [id, name] of [
      [OWNER, 'Olive Owner'],
      [RIVAL, 'Rita Rival'],
      [MARIA, 'Maria Santos'],
      [JUN, 'Jun Dela Cruz'],
      [ADMIN, 'Platform Admin'],
      [ANA, 'Ana Buyer'],
      [BEN, 'Ben Buyer'],
    ] as const) {
      await users.createProfile({ id, email: `${id.slice(0, 8)}@example.test`, mobile: null, displayName: name });
    }
    await adminDb`
      insert into user_capabilities (user_id, capability, source_type) values (${ADMIN}, 'PLATFORM_ADMIN', 'PLATFORM')
    `;
  });

  afterAll(async () => {
    await adminDb.end({ timeout: 5 });
    await sql.end({ timeout: 5 });
  });

  const talambanHouse = {
    name: 'Integration Talamban House',
    propertyType: 'HOUSE' as const,
    addressLine: `${HOUSE_NUMBER} Sunrise Drive`,
    areaLabel: 'Brgy. Talamban',
    cityLabel: 'Cebu City',
    location: { latitude: 10.359123, longitude: 123.911234, privacy: 'APPROXIMATE' as const },
  };
  const talambanDetails = {
    title: 'Integration modern house and lot',
    description: 'Two-storey house with a garden, four bedrooms and covered parking.',
    amenities: ['Garden', 'Garage'],
    saleStatus: 'READY_FOR_OCCUPANCY' as const,
    bedrooms: 4,
    bathrooms: 3,
    floorAreaSqm: 220,
    lotAreaSqm: 300,
    parkingSlots: 2,
    availableFrom: null,
  };

  it('owner creates a sale listing whose asking price stays in the private table', async () => {
    const created = await createSaleListing(listings)({
      principal: owner(OWNER, SANTOS),
      organizationId: SANTOS,
      property: talambanHouse,
      listing: talambanDetails,
      saleTerms: { askingPriceInternalCentavos: ASKING_PRICE, priceNegotiable: true, commercialNotes: 'Owner may accept 17.5M' },
      confirmDistinctProperty: false,
    });
    listingId = created.id;
    expect(created.intent).toBe('SALE');
    expect(created.kind).toBeNull();
    expect(created.priceCentavos).toBe(0);

    const [row] = await adminDb<{ price_centavos: string }[]>`select price_centavos::text from listings where id = ${listingId}`;
    expect(row!.price_centavos).toBe('0');

    await registerListingPhoto(listings, fakeMedia)({
      principal: owner(OWNER, SANTOS),
      organizationId: SANTOS,
      listingId,
      storagePath: `${SANTOS}/listings/${listingId}/front.jpg`,
    });
    const published = await setListingState(listings)({
      principal: owner(OWNER, SANTOS),
      organizationId: SANTOS,
      listingId,
      action: 'PUBLISH',
    });
    expect(published.state).toBe('PUBLISHED');
  });

  it('the same physical property cannot be listed twice, even by another organization', async () => {
    const again = createSaleListing(listings)({
      principal: owner(RIVAL, SKYLINE),
      organizationId: SKYLINE,
      property: { ...talambanHouse, addressLine: `${HOUSE_NUMBER} Sunrise Dr.`, location: { ...talambanHouse.location, latitude: 10.35913 } },
      listing: { ...talambanDetails, title: 'Rival copy of the same house' },
      saleTerms: null,
      confirmDistinctProperty: false,
    });
    await expect(again).rejects.toBeInstanceOf(DuplicatePropertyError);
    await expect(again).rejects.toMatchObject({ existingListingId: listingId });
  });

  it('the database refuses to store a public price on a sale listing', async () => {
    await expect(adminDb`update listings set price_centavos = ${ASKING_PRICE} where id = ${listingId}`).rejects.toThrow(
      /listings_sale_price_private/,
    );
  });

  it('public search ranks the listing near the buyer, without its price or exact location', async () => {
    const near = await searchListings(listings)({
      intent: 'SALE',
      near: { latitude: 10.3601, longitude: 123.9101, radiusKm: 5 },
      limit: 20,
      offset: 0,
    });
    const found = near.items.find((item) => item.id === listingId);
    expect(found).toBeDefined();
    expect(found!.distanceKm).toBeLessThanOrEqual(1);
    expect(found!.publicLocation).toEqual({ latitude: 10.36, longitude: 123.91 });

    const http = JSON.stringify(near.items.map(toListingHttpResponse));
    expect(http).not.toContain(String(ASKING_PRICE));
    expect(http).not.toContain('10.359123');
    expect(http).not.toContain('Owner may accept');

    const manila = await searchListings(listings)({
      intent: 'SALE',
      near: { latitude: 14.5995, longitude: 120.9842, radiusKm: 25 },
      limit: 20,
      offset: 0,
    });
    expect(manila.items.some((item) => item.id === listingId)).toBe(false);

    const priced = await searchListings(listings)({ maxPriceCentavos: 10_000_000_000 as never, limit: 50, offset: 0 });
    expect(priced.items.some((item) => item.id === listingId)).toBe(false);

    const areas = await listAreas(listings)();
    expect(areas.some((area) => area.cityLabel === 'Cebu City' && area.saleCount >= 1)).toBe(true);
  });

  it('row-level security hides private sale terms from every other scope', async () => {
    const unscoped = await withScope(null, (tx) => tx<{ n: number }[]>`select count(*)::int as n from listing_sale_terms`);
    expect(unscoped[0]!.n).toBe(0);
    const rival = await withScope(SKYLINE, (tx) => tx<{ n: number }[]>`select count(*)::int as n from listing_sale_terms`);
    expect(rival[0]!.n).toBe(0);
    const buyer = await withUser(ANA, (tx) => tx<{ n: number }[]>`select count(*)::int as n from listing_sale_terms`);
    expect(buyer[0]!.n).toBe(0);
    const own = await withScope(SANTOS, (tx) => tx<{ n: number }[]>`select count(*)::int as n from listing_sale_terms where listing_id = ${listingId}`);
    expect(own[0]!.n).toBe(1);

    await expect(
      adminDb.begin(async (tx) => {
        await tx`set local role anon`;
        await tx`select * from listing_sale_terms`;
      }),
    ).rejects.toThrow(/permission denied/);
    await expect(
      adminDb.begin(async (tx) => {
        await tx`set local role authenticated`;
        await tx`select * from listing_sale_terms`;
      }),
    ).rejects.toThrow(/permission denied/);
  });

  it('agents register, cannot verify themselves, and are verified by the platform', async () => {
    const maria = await registerAgentProfile(agents)({ principal: customer(MARIA, 'Maria Santos'), profile: profileFor('Maria Santos') });
    mariaAgentId = maria.id;
    expect(maria.verificationState).toBe('UNVERIFIED');
    const caps = await users.capabilitiesFor(MARIA);
    expect(caps.some((c) => c.capability === 'AGENT')).toBe(true);

    await expect(
      withUser(MARIA, (tx) =>
        tx`update agent_profiles set verification_state = 'VERIFIED', verified_at = now() where user_id = ${MARIA}`,
      ),
    ).rejects.toThrow(/verification/);

    await requestAgentVerification(agents)({ principal: agent(MARIA, 'Maria Santos') });
    await expect(
      decideAgentVerification(agents, notifications)({ principal: owner(OWNER, SANTOS), agentId: mariaAgentId, decision: 'VERIFY', note: null }),
    ).rejects.toBeInstanceOf(OrganizationForbiddenError);
    const verified = await decideAgentVerification(agents, notifications)({
      principal: admin,
      agentId: mariaAgentId,
      decision: 'VERIFY',
      note: 'License checked',
    });
    expect(verified.verificationState).toBe('VERIFIED');

    const jun = await registerAgentProfile(agents)({ principal: customer(JUN, 'Jun Dela Cruz'), profile: profileFor('Jun Dela Cruz') });
    junAgentId = jun.id;
    await requestAgentVerification(agents)({ principal: agent(JUN, 'Jun Dela Cruz') });
    await decideAgentVerification(agents, notifications)({ principal: admin, agentId: junAgentId, decision: 'VERIFY', note: null });
  });

  it('the owner assigns agents who must accept before gaining any access', async () => {
    const invite = inviteAgentToListing(representations, agents, listings, notifications);
    const rep = await invite({
      principal: owner(OWNER, SANTOS),
      organizationId: SANTOS,
      listingId,
      agentId: mariaAgentId,
      permissions: { canEditListing: true },
      terms: { isPrimary: true },
    });
    representationId = rep.id;
    expect(rep.state).toBe('PENDING');
    expect(rep.terms).toMatchObject({ representationType: 'NON_EXCLUSIVE', isPrimary: true, acceptsLeads: true });

    await expect(
      invite({ principal: owner(OWNER, SANTOS), organizationId: SANTOS, listingId, agentId: mariaAgentId, permissions: {}, terms: {} }),
    ).rejects.toBeInstanceOf(ListingAlreadyRepresentedError);
    await expect(
      invite({ principal: owner(RIVAL, SKYLINE), organizationId: SKYLINE, listingId, agentId: junAgentId, permissions: {}, terms: {} }),
    ).rejects.toBeInstanceOf(ListingNotFoundError);
    const junInvite = await invite({
      principal: owner(OWNER, SANTOS),
      organizationId: SANTOS,
      listingId,
      agentId: junAgentId,
      permissions: { canViewCommercial: false, canManageTour: false },
      terms: {},
    });
    junRepresentationId = junInvite.id;
    await expect(
      invite({ principal: owner(OWNER, SANTOS), organizationId: SANTOS, listingId, agentId: junAgentId, permissions: {}, terms: {} }),
    ).rejects.toBeInstanceOf(ListingAlreadyRepresentedError);

    await expect(
      getSaleTerms(listings, listingGate)({ principal: agent(MARIA, 'Maria Santos'), organizationId: null, listingId }),
    ).rejects.toBeInstanceOf(RepresentationForbiddenError);

    const accepted = await respondToRepresentation(representations, notifications)({
      principal: agent(MARIA, 'Maria Santos'),
      representationId,
      accept: true,
    });
    expect(accepted.state).toBe('ACTIVE');
    const junAccepted = await respondToRepresentation(representations, notifications)({
      principal: agent(JUN, 'Jun Dela Cruz'),
      representationId: junRepresentationId,
      accept: true,
    });
    expect(junAccepted.state).toBe('ACTIVE');
    expect((await representations.listForListing(SANTOS, listingId)).filter((r) => r.state === 'ACTIVE')).toHaveLength(2);

    const terms = await getSaleTerms(listings, listingGate)({ principal: agent(MARIA, 'Maria Santos'), organizationId: null, listingId });
    expect(terms.askingPriceInternalCentavos).toBe(ASKING_PRICE);
    await expect(
      getSaleTerms(listings, listingGate)({ principal: agent(JUN, 'Jun Dela Cruz'), organizationId: null, listingId }),
    ).rejects.toBeInstanceOf(RepresentationForbiddenError);

    const edited = await updateSaleListing(listings, listingGate, proposals, notifications)({
      principal: agent(MARIA, 'Maria Santos'),
      organizationId: null,
      listingId,
      listing: { parkingSlots: 3, description: 'Two-storey house with a garden, four bedrooms, and a covered carport.' },
    });
    expect(edited.listing.parkingSlots).toBe(2);
    expect(edited.listing.description).toContain('covered carport');
    expect(edited.proposal).toMatchObject({ status: 'PENDING', changes: { listing: { parkingSlots: 3 }, property: {} } });
    const approved = await decideChangeProposal(proposals, listings)({
      principal: owner(OWNER, SANTOS),
      organizationId: SANTOS,
      proposalId: edited.proposal!.id,
      approve: true,
    });
    expect(approved.status).toBe('APPROVED');
    expect((await listings.findById(SANTOS, listingId))!.parkingSlots).toBe(3);
    await saveSaleTerms(listings, listingGate)({
      principal: agent(MARIA, 'Maria Santos'),
      organizationId: null,
      listingId,
      terms: { askingPriceInternalCentavos: ASKING_PRICE, priceNegotiable: false, commercialNotes: 'Firm' },
    });

    const listed = await viewListing(listings)(listingId);
    expect(JSON.stringify(toListingHttpResponse(listed!))).not.toContain(mariaAgentId);

    const profile = await viewPublicAgent(agents, listings, clock)({ agentId: mariaAgentId });
    expect(profile.listings.map((l) => l.id)).toContain(listingId);
    expect(profile.stats.activeListings).toBeGreaterThanOrEqual(1);
  });

  it('a buyer inquires once, privately, and the assigned agent receives the lead', async () => {
    const submit = submitInquiry(inquiries, listings, agents, notifications, assign);
    const ref = randomUUID();
    const first = await submit({
      principal: customer(ANA, 'Ana Buyer'),
      listingId,
      message: 'Hi! I am interested in this property.',
      questions: ['Is this available?'],
      buyerBudgetCentavos: 1_700_000_000,
      clientRef: ref,
      referralCode: null,
    });
    expect(first.created).toBe(true);
    expect(first.inquiry.agentId).toBe(mariaAgentId);
    const lead = await assignments.activeFor(ANA, listingId);
    expect(lead).toMatchObject({ agentId: mariaAgentId, purpose: 'INQUIRY', status: 'ASSIGNED', reason: 'PRIMARY_REPRESENTATIVE' });
    inquiryId = first.inquiry.id;
    conversationId = first.inquiry.conversationId;

    const retried = await submit({
      principal: customer(ANA, 'Ana Buyer'),
      listingId,
      message: 'Hi! I am interested in this property.',
      questions: [],
      buyerBudgetCentavos: null,
      clientRef: ref,
      referralCode: null,
    });
    expect(retried).toMatchObject({ created: false, alreadyOpen: false });
    expect(retried.inquiry.id).toBe(inquiryId);

    const again = await submit({
      principal: customer(ANA, 'Ana Buyer'),
      listingId,
      message: 'Following up',
      questions: [],
      buyerBudgetCentavos: null,
      clientRef: randomUUID(),
      referralCode: null,
    });
    expect(again).toMatchObject({ created: false, alreadyOpen: true });

    expect(await inquiries.findForCustomer(BEN, inquiryId)).toBeNull();

    const mine = await listPartnerInquiries(inquiries)({ principal: agent(MARIA, 'Maria Santos'), organizationId: null, filters: {} });
    expect(mine.map((i) => i.id)).toContain(inquiryId);
    expect(mine.find((i) => i.id === inquiryId)!.buyerBudgetCentavos).toBe(1_700_000_000);
    const juns = await listPartnerInquiries(inquiries)({ principal: agent(JUN, 'Jun Dela Cruz'), organizationId: null, filters: {} });
    expect(juns.map((i) => i.id)).not.toContain(inquiryId);
    const rival = await listPartnerInquiries(inquiries)({ principal: owner(RIVAL, SKYLINE), organizationId: SKYLINE, filters: {} });
    expect(rival.map((i) => i.id)).not.toContain(inquiryId);
    const owners = await listPartnerInquiries(inquiries)({ principal: owner(OWNER, SANTOS), organizationId: SANTOS, filters: {} });
    expect(owners.map((i) => i.id)).toContain(inquiryId);

    const agentNotes = await notifications.forUser(MARIA, 20);
    expect(agentNotes.some((n) => n.kind === 'INQUIRY_RECEIVED')).toBe(true);
  });

  it('inquiries are only for properties for sale', async () => {
    const [rental] = await adminDb<{ id: string }[]>`
      select id from listings where intent = 'RENT' and state = 'PUBLISHED' limit 1
    `;
    await expect(
      submitInquiry(inquiries, listings, agents, notifications, assign)({
        principal: customer(BEN, 'Ben Buyer'),
        listingId: rental!.id,
        message: 'Hello',
        questions: [],
        buyerBudgetCentavos: null,
        clientRef: randomUUID(),
        referralCode: null,
      }),
    ).rejects.toBeInstanceOf(InquiryNotAllowedError);
  });

  it('the agent and buyer talk in the shared conversation, and the first reply is tracked', async () => {
    const conversations = await listAgentConversations(messaging)({ principal: agent(MARIA, 'Maria Santos') });
    expect(conversations.map((c) => c.id)).toContain(conversationId);

    const reply = sendAgentMessage(messaging, notifications, clock, assignments, inquiries);
    const message = await reply({
      principal: agent(MARIA, 'Maria Santos'),
      conversationId,
      body: 'Hello Ana! The house is available. When would you like to view it?',
      clientId: randomUUID(),
    });
    expect(message.senderRole).toBe('AGENT');

    const lead = await inquiries.findForAgent(MARIA, inquiryId);
    expect(lead!.status).toBe('CONTACTED');
    expect(lead!.firstResponseAt).not.toBeNull();

    await expect(
      reply({ principal: agent(JUN, 'Jun Dela Cruz'), conversationId, body: 'Hi', clientId: randomUUID() }),
    ).rejects.toBeInstanceOf(ConversationNotFoundError);

    await sendCustomerMessage(messaging, notifications, clock)({
      principal: customer(ANA, 'Ana Buyer'),
      conversationId,
      body: 'Saturday morning works.',
      clientId: randomUUID(),
    });

    const thread = await getCustomerThread(messaging)({ principal: customer(ANA, 'Ana Buyer'), conversationId, before: null });
    expect(thread.conversation.agentName).toBe('Maria Santos');
    expect(thread.messages.map((m) => m.senderRole)).toEqual(['CUSTOMER', 'AGENT', 'CUSTOMER']);
    const agentView = await getAgentThread(messaging)({ principal: agent(MARIA, 'Maria Santos'), conversationId, before: null });
    expect(agentView.conversation.unreadCount).toBe(1);
    expect((await assignments.activeFor(ANA, listingId))!.status).toBe('ACCEPTED');
  });

  it('the buyer requests a viewing with a preferred window; the same specialist continues and confirms', async () => {
    const request = requestViewing({ viewings, listings, inquiries, agents, notifications, resolve, reassign, clock, settings });
    const ref = randomUUID();
    const created = await request({
      principal: customer(ANA, 'Ana Buyer'),
      listingId,
      preferredDate: viewingDay,
      preferredWindow: 'AFTERNOON',
      note: 'I will bring my partner.',
      clientRef: ref,
      referralCode: null,
    });
    viewingId = created.viewing.id;
    expect(created.created).toBe(true);
    expect(created.viewing).toMatchObject({
      status: 'REQUESTED',
      inquiryId,
      conversationId,
      agentId: mariaAgentId,
      preferredDate: viewingDay,
      preferredWindow: 'AFTERNOON',
      scheduledAt: null,
    });
    expect(created.agent).toMatchObject({ agentId: mariaAgentId, displayName: 'Maria Santos', verified: true });

    const [replayed, doubleTap] = await Promise.all([
      request({ principal: customer(ANA, 'Ana Buyer'), listingId, preferredDate: viewingDay, preferredWindow: 'AFTERNOON', note: null, clientRef: ref, referralCode: null }),
      request({ principal: customer(ANA, 'Ana Buyer'), listingId, preferredDate: viewingDay, preferredWindow: 'MORNING', note: null, clientRef: randomUUID(), referralCode: null }),
    ]);
    expect(replayed).toMatchObject({ created: false, viewing: { id: viewingId } });
    expect(doubleTap).toMatchObject({ created: false, viewing: { id: viewingId } });
    const [counts] = await adminDb<{ viewings: number; leads: number; conversations: number }[]>`
      select (select count(*)::int from viewings where listing_id = ${listingId} and customer_id = ${ANA}) as viewings,
             (select count(*)::int from lead_assignments where listing_id = ${listingId} and customer_id = ${ANA}) as leads,
             (select count(*)::int from conversations where listing_id = ${listingId} and customer_id = ${ANA}) as conversations
    `;
    expect(counts).toEqual({ viewings: 1, leads: 1, conversations: 1 });

    const confirmAt = localInstant(viewingDay, 14, 30);
    const confirmed = await partnerViewingAction({ viewings, inquiries, assignments, notifications, reassign, clock })({
      principal: agent(MARIA, 'Maria Santos'),
      organizationId: null,
      viewingId,
      action: 'CONFIRM',
      scheduledAt: confirmAt,
      note: 'See you at the gate.',
    });
    expect(confirmed.status).toBe('CONFIRMED');
    expect(confirmed.scheduledAt!.toISOString()).toBe(confirmAt.toISOString());

    await expect(
      partnerViewingAction({ viewings, inquiries, assignments, notifications, reassign, clock })({
        principal: agent(JUN, 'Jun Dela Cruz'),
        organizationId: null,
        viewingId,
        action: 'CONFIRM',
        scheduledAt: confirmAt,
        note: null,
      }),
    ).rejects.toThrow();

    const buyerSees = await listMyViewings(viewings)({ principal: customer(ANA, 'Ana Buyer') });
    expect(buyerSees.find((v) => v.id === viewingId)!.status).toBe('CONFIRMED');
    expect((await inquiries.findForAgent(MARIA, inquiryId))!.status).toBe('VIEWING_SCHEDULED');
    expect(await viewings.findForCustomer(BEN, viewingId)).toBeNull();
    expect(await viewings.findForAgent(JUN, viewingId)).toBeNull();
  });

  it('the agent workspace reports real workload and pipeline', async () => {
    await createAgentTask(tasks, inquiries)({
      principal: agent(MARIA, 'Maria Santos'),
      title: 'Send Ana the floor plan',
      dueAt: new Date(Date.now() - 60_000),
      inquiryId,
    });
    const dashboard = await getAgentDashboard(agents, inquiries, viewings, tasks, representations, clock)({
      principal: agent(MARIA, 'Maria Santos'),
    });
    expect(dashboard.workload.pipeline.VIEWING_SCHEDULED).toBeGreaterThanOrEqual(1);
    expect(dashboard.workload.activeClients).toBeGreaterThanOrEqual(1);
    expect(dashboard.workload.followUpsDue).toBeGreaterThanOrEqual(1);
    expect(dashboard.representedListings).toBeGreaterThanOrEqual(1);

    const clients = await listAgentClients(inquiries)({ principal: agent(MARIA, 'Maria Santos') });
    expect(clients.find((c) => c.customerId === ANA)).toMatchObject({ customerName: 'Ana Buyer', upcomingViewings: 1 });

    const stats = await getAgentAnalytics(analytics, clock)({ principal: agent(MARIA, 'Maria Santos') });
    expect(stats.listings.find((l) => l.listingId === listingId)!.inquiries).toBe(1);
    const ownerStats = await getOrganizationAnalytics(analytics, clock)({ principal: owner(OWNER, SANTOS), organizationId: SANTOS });
    expect(ownerStats.inquiriesByStatus.VIEWING_SCHEDULED).toBeGreaterThanOrEqual(1);

    const moved = await updateInquiryStatus(inquiries)({
      principal: agent(MARIA, 'Maria Santos'),
      organizationId: null,
      inquiryId,
      status: 'NEGOTIATING',
      lostReason: null,
    });
    expect(moved.status).toBe('NEGOTIATING');
  });

  it('tour authoring follows the representation permissions', async () => {
    const ensured = await ensureListingTour(tours, listingGate)({
      principal: agent(MARIA, 'Maria Santos'),
      organizationId: null,
      listingId,
    });
    const tourId = ensured.tour.id;
    const configure = configureTourProvider(tours, tourGate);
    const configured = await configure({
      principal: agent(MARIA, 'Maria Santos'),
      organizationId: null,
      tourId,
      provider: 'MATTERPORT',
      matterport: 'https://my.matterport.com/show/?m=SxQL3iGyoDo',
    });
    expect(configured.provider).toBe('PLATFORM');
    expect(configured.externalModelId).toBeNull();

    await expect(
      configure({ principal: agent(JUN, 'Jun Dela Cruz'), organizationId: null, tourId, provider: 'PLATFORM', matterport: null }),
    ).rejects.toBeInstanceOf(RepresentationForbiddenError);
    await expect(
      configure({ principal: owner(RIVAL, SKYLINE), organizationId: SKYLINE, tourId, provider: 'PLATFORM', matterport: null }),
    ).rejects.toBeInstanceOf(TourNotFoundError);

    await updateRepresentationPermissions(representations)({
      principal: owner(OWNER, SANTOS),
      organizationId: SANTOS,
      representationId,
      permissions: { canEditListing: true, canManageTour: false, canViewCommercial: true },
    });
    await expect(
      configure({ principal: agent(MARIA, 'Maria Santos'), organizationId: null, tourId, provider: 'PLATFORM', matterport: null }),
    ).rejects.toBeInstanceOf(RepresentationForbiddenError);
  });

  it('ending the primary representation hands the engaged lead to the next specialist with an explicit notice', async () => {
    const ended = await endRepresentation({ representations, agents, assignments, notifications, reassign })({
      principal: owner(OWNER, SANTOS),
      organizationId: SANTOS,
      representationId,
      reason: 'Listing handled directly',
    });
    expect(ended.state).toBe('ENDED');

    expect(await messaging.findForAgent(MARIA, conversationId)).toBeNull();
    expect(await inquiries.findForAgent(MARIA, inquiryId)).toBeNull();
    await expect(
      getSaleTerms(listings, listingGate)({ principal: agent(MARIA, 'Maria Santos'), organizationId: null, listingId }),
    ).rejects.toBeInstanceOf(RepresentationForbiddenError);

    const ownerView = await inquiries.findForOrganization(SANTOS, inquiryId);
    expect(ownerView!.agentId).toBe(junAgentId);
    expect((await messaging.findForAgent(JUN, conversationId))!.id).toBe(conversationId);

    const handedOver = await viewings.findForCustomer(ANA, viewingId);
    expect(handedOver).toMatchObject({ agentId: junAgentId, status: 'REQUESTED', conversationId });
    expect(handedOver!.agentChangeNotice).toBe(
      "Maria is unavailable for this viewing. We've connected you with Jun from the same property team.",
    );

    const history = await assignments.historyFor(SANTOS, listingId, ANA);
    expect(history.map((h) => [h.agentId, h.status, h.releaseReason])).toEqual([
      [mariaAgentId, 'REASSIGNED', 'REPRESENTATION_ENDED'],
      [junAgentId, 'ASSIGNED', null],
    ]);
    expect(history[1]!.previousAssignmentId).toBe(history[0]!.id);
    expect(await listings.findPublicById(PUBLIC, listingId)).not.toBeNull();
  });
});
