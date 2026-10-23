import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sql } from '@/infrastructure/postgres/db.ts';
import { postgresListingRepository } from '@/infrastructure/postgres/repositories/postgres-listing.repository.ts';
import { postgresUserRepository } from '@/infrastructure/postgres/repositories/postgres-user.repository.ts';
import { postgresAgentRepository } from '@/infrastructure/postgres/repositories/postgres-agent.repository.ts';
import { postgresRepresentationRepository } from '@/infrastructure/postgres/repositories/postgres-representation.repository.ts';
import { postgresInquiryRepository } from '@/infrastructure/postgres/repositories/postgres-inquiry.repository.ts';
import { postgresViewingRepository } from '@/infrastructure/postgres/repositories/postgres-viewing.repository.ts';
import { postgresMessagingRepository } from '@/infrastructure/postgres/repositories/postgres-messaging.repository.ts';
import { postgresNotificationRepository } from '@/infrastructure/postgres/repositories/postgres-notification.repository.ts';
import { postgresLeadAssignmentRepository } from '@/infrastructure/postgres/repositories/postgres-lead-assignment.repository.ts';
import { UuidGenerator } from '@/infrastructure/system/uuid-generator.provider.ts';
import { createSaleListing } from '@/application/listings/create-sale-listing/create-sale-listing.use-case.ts';
import { registerListingPhoto } from '@/application/listings/register-listing-photo/register-listing-photo.use-case.ts';
import { setListingState } from '@/application/listings/set-listing-state/set-listing-state.use-case.ts';
import {
  registerAgentProfile,
  requestAgentVerification,
} from '@/application/agents/manage-agent-profile/manage-agent-profile.use-case.ts';
import { decideAgentVerification } from '@/application/agents/review-agent-verification/review-agent-verification.use-case.ts';
import {
  inviteAgentToListing,
  respondToRepresentation,
} from '@/application/agents/manage-representation/manage-representation.use-case.ts';
import { resolveLeadAssignment } from '@/application/assignment/resolve-lead-assignment/resolve-lead-assignment.use-case.ts';
import { reassignLead } from '@/application/assignment/reassign-lead/reassign-lead.use-case.ts';
import { assignLead } from '@/application/assignment/assign-lead/assign-lead.use-case.ts';
import { sweepLeadAssignments } from '@/application/assignment/sweep-lead-assignments/sweep-lead-assignments.use-case.ts';
import { issueReferralCode } from '@/application/assignment/issue-referral-code/issue-referral-code.use-case.ts';
import { requestViewing } from '@/application/viewings/request-viewing/request-viewing.use-case.ts';
import { getMyViewing } from '@/application/viewings/get-my-viewing/get-my-viewing.use-case.ts';
import { partnerViewingAction } from '@/application/viewings/partner-viewing-action/partner-viewing-action.use-case.ts';
import { customerViewingAction } from '@/application/viewings/customer-viewing-action/customer-viewing-action.use-case.ts';
import { submitInquiry } from '@/application/inquiries/submit-inquiry/submit-inquiry.use-case.ts';
import { sendAgentMessage } from '@/application/messaging/send-message/send-message.use-case.ts';
import type { ListingMediaStorage } from '@/application/ports/storage/listing-media.port.ts';
import { ViewingNotFoundError, localDayOf, localInstant, windowBounds } from '@/domain/viewings/viewing.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { toViewingRequestHttpResponse } from '@/modules/viewings/mappers/viewing-http.mapper.ts';

const live = Boolean(process.env.DATABASE_URL) && Boolean(process.env.TEST_ADMIN_DATABASE_URL);
const suite = live ? describe : describe.skip;

const SANTOS = '11111111-1111-1111-1111-111111111111';
const OWNER = randomUUID();
const ADMIN = randomUUID();
const AGENT_USERS = [randomUUID(), randomUUID(), randomUUID()] as const;
const AGENT_NAMES = ['Paolo Lim', 'Rina Uy', 'Teo Cruz'] as const;
const BUYERS = [randomUUID(), randomUUID(), randomUUID()] as const;
const ASKING_PRICE = 2_350_000_000;
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

const owner: Principal = {
  userId: OWNER,
  displayName: 'Owner',
  capabilities: [{ capability: 'OWNER', organizationId: SANTOS }],
  organizationId: SANTOS,
};

const admin: Principal = {
  userId: ADMIN,
  displayName: 'Platform admin',
  capabilities: [{ capability: 'PLATFORM_ADMIN', organizationId: null }],
  organizationId: null,
};

const agentPrincipal = (index: number): Principal => ({
  userId: AGENT_USERS[index]!,
  displayName: AGENT_NAMES[index]!,
  capabilities: [
    { capability: 'CUSTOMER', organizationId: null },
    { capability: 'AGENT', organizationId: null },
  ],
  organizationId: null,
});

const buyer = (index: number): Principal => ({
  userId: BUYERS[index]!,
  displayName: `Buyer ${index + 1}`,
  capabilities: [{ capability: 'CUSTOMER', organizationId: null }],
  organizationId: null,
});

const fakeMedia: ListingMediaStorage = {
  publicUrl: (path) => `https://storage.test/${path}`,
  inspect: async () => ({ contentType: 'image/jpeg', sizeBytes: 220_000 }),
};

suite('lead assignment: one canonical property, several representing agents', { timeout: 90_000 }, () => {
  const adminDb = postgres(process.env.TEST_ADMIN_DATABASE_URL ?? '', { max: 1 });
  let now = new Date();
  const clock = { now: () => now };
  const settings = { responseWindowMinutes: 240, sweepIntervalSeconds: 0 };

  const listings = postgresListingRepository();
  const users = postgresUserRepository();
  const agents = postgresAgentRepository();
  const representations = postgresRepresentationRepository();
  const inquiries = postgresInquiryRepository();
  const viewings = postgresViewingRepository();
  const messaging = postgresMessagingRepository();
  const notifications = postgresNotificationRepository();
  const assignments = postgresLeadAssignmentRepository();

  const resolve = resolveLeadAssignment(assignments, clock);
  const reassign = reassignLead({ assignments, viewings, listings, agents, notifications, resolve, clock, settings });
  const assign = assignLead({ assignments, resolve, reassign, clock, settings });
  const request = requestViewing({ viewings, listings, inquiries, agents, notifications, resolve, reassign, clock, settings });
  const sweep = sweepLeadAssignments({ assignments, viewings, listings, agents, notifications, resolve, reassign, clock, settings });
  const partnerAct = partnerViewingAction({ viewings, inquiries, assignments, notifications, reassign, clock });

  const agentIds: string[] = [];
  const viewingIds: string[] = [];
  let listingId = '';
  const viewingDay = localDayOf(new Date(Date.now() + 3 * DAY_MS));
  const agentIndexOf = (agentId: string | null) => agentIds.indexOf(agentId ?? '');

  beforeAll(async () => {
    const people: [string, string][] = [
      [OWNER, 'Olive Owner'],
      [ADMIN, 'Platform Admin'],
      ...AGENT_USERS.map((id, index): [string, string] => [id, AGENT_NAMES[index]!]),
      ...BUYERS.map((id, index): [string, string] => [id, `Buyer ${index + 1}`]),
    ];
    for (const [id, name] of people) {
      await users.createProfile({ id, email: `${id.slice(0, 8)}@example.test`, mobile: null, displayName: name });
    }
    await adminDb`insert into user_capabilities (user_id, capability, source_type) values (${ADMIN}, 'PLATFORM_ADMIN', 'PLATFORM')`;

    const created = await createSaleListing(listings)({
      principal: owner,
      organizationId: SANTOS,
      property: {
        name: 'Assignment Banilad Residence',
        propertyType: 'HOUSE',
        addressLine: `${1000 + Math.floor(Math.random() * 8999)} Banilad Road`,
        areaLabel: 'Brgy. Banilad',
        cityLabel: 'Cebu City',
        location: { latitude: 10.3466 + Math.random() / 100, longitude: 123.9118, privacy: 'APPROXIMATE' },
      },
      listing: {
        title: 'Assignment test residence',
        description: 'A family house used to exercise multi-agent lead assignment end to end.',
        amenities: ['Garden'],
        saleStatus: 'READY_FOR_OCCUPANCY',
        bedrooms: 3,
        bathrooms: 2,
        floorAreaSqm: 160,
        lotAreaSqm: 200,
        parkingSlots: 1,
        availableFrom: null,
      },
      saleTerms: { askingPriceInternalCentavos: ASKING_PRICE, priceNegotiable: true, commercialNotes: 'Private note' },
      confirmDistinctProperty: false,
    });
    listingId = created.id;
    await registerListingPhoto(listings, fakeMedia)({
      principal: owner,
      organizationId: SANTOS,
      listingId,
      storagePath: `${SANTOS}/listings/${listingId}/front.jpg`,
    });
    await setListingState(listings)({ principal: owner, organizationId: SANTOS, listingId, action: 'PUBLISH' });

    for (let index = 0; index < AGENT_USERS.length; index += 1) {
      const profile = await registerAgentProfile(agents)({
        principal: { ...agentPrincipal(index), capabilities: [{ capability: 'CUSTOMER', organizationId: null }] },
        profile: {
          displayName: AGENT_NAMES[index]!,
          headline: 'Property specialist',
          bio: 'Assignment test agent.',
          licenseNumber: `PRC-${index}${Date.now() % 100_000}`,
          licenseAuthority: 'PRC',
          specialties: ['House & Lot'],
          areasServed: ['Cebu City'],
          languages: ['English'],
          publicState: 'PUBLIC',
          photoUrl: null,
        },
      });
      agentIds.push(profile.id);
      await requestAgentVerification(agents)({ principal: agentPrincipal(index) });
      await decideAgentVerification(agents, notifications)({ principal: admin, agentId: profile.id, decision: 'VERIFY', note: null });
      const invited = await inviteAgentToListing(representations, agents, listings, notifications)({
        principal: owner,
        organizationId: SANTOS,
        listingId,
        agentId: profile.id,
        permissions: {},
        terms: {},
      });
      await respondToRepresentation(representations, notifications)({
        principal: agentPrincipal(index),
        representationId: invited.id,
        accept: true,
      });
    }
  });

  afterAll(async () => {
    await adminDb.end({ timeout: 5 });
    await sql.end({ timeout: 5 });
  });

  it('assigns the best available agent by score, persists the audit trail, and exposes no score or price', async () => {
    const result = await request({
      principal: buyer(0),
      listingId,
      preferredDate: viewingDay,
      preferredWindow: 'AFTERNOON',
      note: null,
      clientRef: randomUUID(),
      referralCode: null,
    });
    viewingIds.push(result.viewing.id);
    expect(result.viewing.status).toBe('REQUESTED');
    expect(agentIndexOf(result.viewing.agentId)).toBeGreaterThanOrEqual(0);

    const lead = await assignments.activeFor(BUYERS[0], listingId);
    expect(lead).toMatchObject({ reason: 'BEST_AVAILABLE', purpose: 'VIEWING', candidatesConsidered: 3, status: 'ASSIGNED' });
    expect(lead!.score).not.toBeNull();
    const breakdown = Object.values(lead!.breakdown!).reduce((sum, value) => sum + value, 0);
    expect(Math.abs(breakdown - lead!.score!)).toBeLessThan(0.05);
    expect(lead!.responseDueAt!.getTime() - now.getTime()).toBe(240 * 60_000);

    const http = JSON.stringify(toViewingRequestHttpResponse(result));
    expect(http).not.toContain('score');
    expect(http).not.toContain('breakdown');
    expect(http).not.toContain(String(ASKING_PRICE));
    expect(http).not.toContain('Private note');
  });

  it('spreads a second buyer to a different specialist through the fairness factor', async () => {
    const result = await request({
      principal: buyer(1),
      listingId,
      preferredDate: viewingDay,
      preferredWindow: 'AFTERNOON',
      note: null,
      clientRef: randomUUID(),
      referralCode: null,
    });
    viewingIds.push(result.viewing.id);
    const first = await viewings.findForCustomer(BUYERS[0], viewingIds[0]!);
    expect(result.viewing.agentId).not.toBe(first!.agentId);
  });

  it('keeps customers and unassigned agents out of each other’s viewings', async () => {
    await expect(getMyViewing(viewings, agents)({ principal: buyer(1), viewingId: viewingIds[0]! })).rejects.toBeInstanceOf(
      ViewingNotFoundError,
    );
    const assigned = agentIndexOf((await viewings.findForCustomer(BUYERS[0], viewingIds[0]!))!.agentId);
    const outsiders = [0, 1, 2].filter((index) => index !== assigned);
    expect(outsiders).toHaveLength(2);
    for (const index of outsiders) {
      await expect(
        partnerAct({
          principal: agentPrincipal(index),
          organizationId: null,
          viewingId: viewingIds[0]!,
          action: 'CONFIRM',
          scheduledAt: localInstant(viewingDay, 13),
          note: null,
        }),
      ).rejects.toBeInstanceOf(ViewingNotFoundError);
    }
  });

  it('an engaged lead is never silently swapped when its response window lapses', async () => {
    const second = (await viewings.findForCustomer(BUYERS[1], viewingIds[1]!))!;
    const index = agentIndexOf(second.agentId);
    const stale = (await assignments.activeFor(BUYERS[1], listingId))!;
    await sendAgentMessage(messaging, notifications, clock, assignments, inquiries)({
      principal: agentPrincipal(index),
      conversationId: second.conversationId,
      body: 'Hi! I can show you the house that afternoon.',
      clientId: randomUUID(),
    });
    expect((await assignments.activeFor(BUYERS[1], listingId))!.status).toBe('ACCEPTED');
    await assignments.reassign({ organizationId: SANTOS, current: stale, releaseReason: 'RESPONSE_TIMEOUT',
      next: null, viewingStatusWithoutAgent: 'MATCHING', notice: null, at: new Date() });
    expect((await assignments.activeFor(BUYERS[1], listingId))?.status).toBe('ACCEPTED');
  });

  it('the SLA sweep silently hands an unanswered request to the next specialist and keeps history', async () => {
    const before = (await viewings.findForCustomer(BUYERS[0], viewingIds[0]!))!;
    now = new Date(Date.now() + 5 * HOUR_MS);
    const report = await sweep();
    expect(report.reassigned).toBeGreaterThanOrEqual(1);

    const after = (await viewings.findForCustomer(BUYERS[0], viewingIds[0]!))!;
    expect(after.agentId).not.toBe(before.agentId);
    expect(after.status).toBe('REQUESTED');
    expect(after.agentChangeNotice).toBeNull();

    const history = await assignments.historyFor(SANTOS, listingId, BUYERS[0]);
    expect(history.map((h) => [h.status, h.releaseReason])).toEqual([
      ['REASSIGNED', 'RESPONSE_TIMEOUT'],
      ['ASSIGNED', null],
    ]);
    expect(history[1]!.previousAssignmentId).toBe(history[0]!.id);

    const engaged = (await viewings.findForCustomer(BUYERS[1], viewingIds[1]!))!;
    expect(engaged.agentId).not.toBeNull();
    expect((await assignments.historyFor(SANTOS, listingId, BUYERS[1])).length).toBe(1);
  });

  it('declines pass the request along; with no one left it waits in matching and then expires', async () => {
    for (let round = 0; round < 2; round += 1) {
      const current = (await viewings.findForCustomer(BUYERS[0], viewingIds[0]!))!;
      expect(current.agentId).not.toBeNull();
      await partnerAct({
        principal: agentPrincipal(agentIndexOf(current.agentId)),
        organizationId: null,
        viewingId: viewingIds[0]!,
        action: 'DECLINE',
        scheduledAt: null,
        note: null,
      });
    }
    const waiting = (await viewings.findForCustomer(BUYERS[0], viewingIds[0]!))!;
    expect(waiting).toMatchObject({ status: 'MATCHING', agentId: null });
    const history = await assignments.historyFor(SANTOS, listingId, BUYERS[0]);
    expect(new Set(history.map((h) => h.agentId)).size).toBe(3);
    expect(history.at(-1)).toMatchObject({ status: 'RELEASED', releaseReason: 'AGENT_DECLINED' });
    expect(await assignments.activeFor(BUYERS[0], listingId)).toBeNull();

    const view = await getMyViewing(viewings, agents)({ principal: buyer(0), viewingId: viewingIds[0]! });
    expect(toViewingRequestHttpResponse(view)).toMatchObject({ assignmentState: 'MATCHING', assignedAgent: null });

    await sweep();
    expect((await viewings.findForCustomer(BUYERS[0], viewingIds[0]!))!.status).toBe('MATCHING');

    now = new Date(windowBounds(viewingDay, 'AFTERNOON').to.getTime() + 60_000);
    const report = await sweep();
    expect(report.expired).toBeGreaterThanOrEqual(1);
    expect((await viewings.findForCustomer(BUYERS[0], viewingIds[0]!))!.status).toBe('DECLINED');
    now = new Date();
  });

  it('a customer can move the preference and cancel without touching the agent choice', async () => {
    const act = customerViewingAction({ viewings, agents, notifications, clock });
    const nextDay = localDayOf(new Date(Date.now() + 4 * DAY_MS));
    const moved = await act({
      principal: buyer(1),
      viewingId: viewingIds[1]!,
      action: 'RESCHEDULE',
      preferredDate: nextDay,
      preferredWindow: 'MORNING',
      note: null,
    });
    expect(moved.viewing).toMatchObject({ status: 'REQUESTED', preferredDate: nextDay, preferredWindow: 'MORNING' });
    const cancelled = await act({
      principal: buyer(1),
      viewingId: viewingIds[1]!,
      action: 'CANCEL',
      preferredDate: null,
      preferredWindow: null,
      note: null,
    });
    expect(cancelled.viewing.status).toBe('CANCELLED');
  });

  it('a valid referral link attributes the lead to the referring agent', async () => {
    const code = await issueReferralCode(assignments, new UuidGenerator())({ principal: agentPrincipal(2), listingId });
    expect(code.code).toMatch(/^[A-Z0-9]{10}$/);
    const again = await issueReferralCode(assignments, new UuidGenerator())({ principal: agentPrincipal(2), listingId });
    expect(again.code).toBe(code.code);

    const submitted = await submitInquiry(inquiries, listings, agents, notifications, assign)({
      principal: buyer(2),
      listingId,
      message: 'Hello, I was referred by your agent.',
      questions: [],
      buyerBudgetCentavos: null,
      clientRef: randomUUID(),
      referralCode: code.code,
    });
    expect(submitted.inquiry.agentId).toBe(agentIds[2]);
    expect(await assignments.activeFor(BUYERS[2], listingId)).toMatchObject({
      agentId: agentIds[2],
      reason: 'REFERRAL_ATTRIBUTION',
      purpose: 'INQUIRY',
    });
  });
  it('does not create a lead when its target viewing is no longer matching', async () => {
    const representation = (await representations.listForAgent(AGENT_USERS[0])).find(rep => rep.listingId === listingId)!;
    const result = await assignments.attachToViewing(SANTOS, viewingIds[0]!, {
      organizationId: SANTOS, listingId, customerId: BUYERS[0], representationId: representation.id, agentId: agentIds[0]!,
      purpose: 'VIEWING', reason: 'BEST_AVAILABLE', score: null, breakdown: null, considered: 3,
      previousAssignmentId: null, responseDueAt: new Date(Date.now() + HOUR_MS), assignedAt: new Date(),
    });
    expect(result).toBeNull();
    expect(await assignments.activeFor(BUYERS[0], listingId)).toBeNull();
  });

});
