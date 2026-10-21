import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sql } from '@/infrastructure/postgres/db.ts';
import { postgresUserRepository } from '@/infrastructure/postgres/repositories/postgres-user.repository.ts';
import { postgresVerificationRepository } from '@/infrastructure/postgres/repositories/postgres-verification.repository.ts';
import { postgresApplicationRepository } from '@/infrastructure/postgres/repositories/postgres-application.repository.ts';
import { postgresMessagingRepository } from '@/infrastructure/postgres/repositories/postgres-messaging.repository.ts';
import { postgresListingRepository } from '@/infrastructure/postgres/repositories/postgres-listing.repository.ts';
import { startConversation } from '@/application/messaging/start-conversation/start-conversation.use-case.ts';
import { sendCustomerMessage } from '@/application/messaging/send-message/send-message.use-case.ts';
import type { assignLead } from '@/application/assignment/assign-lead/assign-lead.use-case.ts';
import { ConversationNotAllowedError } from '@/domain/messaging/conversation.ts';
import { VerificationInputError, VerificationRequiredError } from '@/domain/verification/verification.ts';
import type { Principal } from '@/domain/identity/identity.ts';

const suite = process.env.TEST_ADMIN_DATABASE_URL && process.env.DATABASE_URL ? describe : describe.skip;
suite('rental policy and messaging against PostgreSQL', () => {
  const admin = postgres(process.env.TEST_ADMIN_DATABASE_URL!, { max: 1 });
  const user = randomUUID(), other = randomUUID(), resource = randomUUID(), listing = randomUUID();
  const org = '11111111-1111-1111-1111-111111111111';
  const principal: Principal = { userId: user, displayName: 'Renter', capabilities: [], organizationId: null };
  const repo = postgresVerificationRepository(), applications = postgresApplicationRepository(), messages = postgresMessagingRepository();
  const assign: ReturnType<typeof assignLead> = async () => null;
  const start = startConversation(messages, postgresListingRepository(), assign);
  const input = { resourceId: resource, desiredMoveIn: '2029-04-01', desiredTermMonths: 6, occupants: 2, message: '' };
  beforeAll(async () => {
    for (const id of [user, other]) await postgresUserRepository().createProfile({ id, email: `${id}@example.test`, mobile: null });
    await admin`insert into rentable_resources(id,organization_id,property_id,root_id,label,resource_type,rental_mode)
      select ${resource},organization_id,property_id,${resource},${resource},'UNIT','LONG_TERM' from rentable_resources
      where id = 'b1111111-0000-0000-0000-000000000001'`;
    await admin`insert into listings(id,organization_id,resource_id,kind,title,description,price_centavos,state,max_occupants,min_lease_months,max_lease_months)
      values (${listing},${org},${resource},'LONG_TERM','Policy test rental','Rental policy integration fixture',100000,'PUBLISHED',2,3,12)`;
  });
  afterAll(async () => { await admin.end(); await sql.end(); });
  it('rejects short terms, excessive occupants, and pre-transaction direct messaging', async () => {
    await expect(repo.saveDraft(user, { ...input, desiredTermMonths: 2 })).rejects.toThrow(VerificationInputError);
    await expect(repo.saveDraft(user, { ...input, occupants: 3 })).rejects.toThrow(VerificationInputError);
    await expect(start({ principal, listingId: listing, bookingId: null })).rejects.toThrow(ConversationNotAllowedError);
    const conversation = await messages.openForCustomer({ organizationId: org, listingId: listing, customerId: user, occupancyId: null });
    const send = sendCustomerMessage(messages, { publish: async () => {} } as never, { now: () => new Date() });
    await expect(send({ principal, conversationId: conversation.id, body: 'bypass', clientId: randomUUID() })).rejects.toThrow(ConversationNotAllowedError);
  });
  it('requires explicit pending policy, deduplicates submission, and gates approval', async () => {
    const draft = await repo.saveDraft(user, input), session = await repo.resume(user, draft.id);
    await repo.save({ ...session, status: 'MANUAL_REVIEW' }, session.version);
    const submit = () => applications.submit({ ...input, applicantId: user, draftId: draft.id });
    await expect(submit()).rejects.toThrow(VerificationRequiredError);
    await admin`update listings set allow_pending_identity_application = true where id = ${listing}`;
    const results = await Promise.all([submit(), submit()]);
    expect(results[0]!.id).toBe(results[1]!.id);
    expect(await messages.customerMayMessageListing(user, listing)).toBe(true);
    expect(await messages.customerMayMessageListing(other, listing)).toBe(false);
    expect((await start({ principal, listingId: listing, bookingId: null })).customerId).toBe(user);
    await expect(applications.decide({ organizationId: org, applicationId: results[0]!.id, deciderId: user, next: 'APPROVED', reason: null })).rejects.toThrow(VerificationRequiredError);
    const pending = await repo.get(user, session.id);
    const approved = await repo.save({ ...pending, status: 'VERIFIED', review: { reviewerId: user, approved: true, decidedAt: new Date().toISOString(), validUntil: '2099-01-01T00:00:00Z' } }, pending.version);
    expect(approved.status).toBe('VERIFIED');
    await admin`update identity_verification_sessions set status = 'EXPIRED', expires_at = now() - interval '1 day', data = data - 'extracted' - 'reviewed' - 'evidence' where id = ${session.id}`;
    expect((await applications.decide({ organizationId: org, applicationId: results[0]!.id, deciderId: user, next: 'APPROVED', reason: null })).state).toBe('APPROVED');
  });
  it('reuses a valid reviewed identity after private evidence has expired, never another user’s', async () => {
    const draft = await repo.saveDraft(user, input);
    const reused = await repo.resume(user, draft.id);
    expect(reused.status).toBe('VERIFIED'); expect(reused.evidence).toEqual([]); expect(reused.reviewed).toBeNull();
    const foreignDraft = await repo.saveDraft(other, input);
    expect((await repo.resume(other, foreignDraft.id)).status).toBe('CONSENT_REQUIRED');
    await admin`update identity_verification_sessions set data = jsonb_set(data, '{review,validUntil}', '"2020-01-01T00:00:00Z"'), expires_at = now() + interval '30 minutes' where user_id = ${user}`;
    expect((await repo.get(user, reused.id)).status).toBe('EXPIRED');
    await expect(applications.submit({ ...input, applicantId: user, draftId: draft.id })).rejects.toThrow(VerificationRequiredError);
    const expired = await repo.resume(user, draft.id);
    expect(expired.status).toBe('CONSENT_REQUIRED');
  });
  it('keeps legitimate post-application communication after withdrawal', async () => {
    const draft = (await repo.findDraft(other, resource))!;
    const session = await repo.resume(other, draft.id);
    await repo.save({ ...session, status: 'MANUAL_REVIEW' }, session.version);
    const application = await applications.submit({ ...input, applicantId: other, draftId: draft.id });
    await applications.withdraw(other, application.id);
    expect(await messages.customerMayMessageListing(other, listing)).toBe(true);
  });
  it('keeps communication for a previously confirmed stay after cancellation, but rejects an unpaid hold', async () => {
    const guest = randomUUID(), booking = randomUUID(), unpaid = randomUUID();
    await postgresUserRepository().createProfile({ id: guest, email: `${guest}@example.test`, mobile: null });
    await admin`insert into occupancies(id,organization_id,resource_id,root_id,subtree,kind,state,during,held_by)
      select ${booking},organization_id,id,root_id,subtree,'BOOKING','CANCELLED',daterange('2028-01-01','2028-01-03','[)'),${guest} from rentable_resources where id = ${resource}`;
    await admin`insert into stays(organization_id,occupancy_id,user_id,state) values (${org},${booking},${guest},'CANCELLED')`;
    expect(await messages.customerMayMessageListing(guest, listing)).toBe(true);
    expect(await messages.customerHasBookingFor(guest, listing, booking)).toBe(true);
    await admin`insert into occupancies(id,organization_id,resource_id,root_id,subtree,kind,state,during,held_by,expires_at)
      select ${unpaid},organization_id,id,root_id,subtree,'BOOKING','HELD',daterange('2028-01-04','2028-01-06','[)'),${guest},now() + interval '5 minutes' from rentable_resources where id = ${resource}`;
    expect(await messages.customerHasBookingFor(guest, listing, unpaid)).toBe(false);
  });

});
