import type { AgentRepository } from '@/application/ports/repositories/agent-repository.port.ts';
import type { InquiryRepository } from '@/application/ports/repositories/inquiry-repository.port.ts';
import type { ListingRepository } from '@/application/ports/repositories/listing-repository.port.ts';
import type { NotificationRepository } from '@/application/ports/repositories/notification-repository.port.ts';
import type { ViewingAssignmentInput, ViewingRepository } from '@/application/ports/repositories/viewing-repository.port.ts';
import type { Clock } from '@/application/ports/providers/clock.port.ts';
import type { LeadAssignmentSettings } from '@/application/assignment/assignment.types.ts';
import type { CustomerViewingView } from '@/application/viewings/viewing.types.ts';
import type { reassignLead } from '@/application/assignment/reassign-lead/reassign-lead.use-case.ts';
import { assignableListing } from '@/application/assignment/assignable-listing.rules.ts';
import {
  newAssignmentFrom,
  type resolveLeadAssignment,
} from '@/application/assignment/resolve-lead-assignment/resolve-lead-assignment.use-case.ts';
import { customerViewingView } from '@/application/viewings/customer-viewing-view.rules.ts';
import { agentViewingNotice, organizationViewingNotice } from '@/application/viewings/viewing-notifications.rules.ts';
import { ListingNotFoundError } from '@/domain/listings/listing.ts';
import { InquiryNotAllowedError } from '@/domain/inquiries/inquiry.ts';
import {
  VIEWING_DURATION_MINUTES,
  VIEWING_TIME_ZONE,
  assertPreferredSchedule,
  describePreferredSchedule,
  normaliseViewingNote,
} from '@/domain/viewings/viewing.ts';
import type { PreferredTimeWindow } from '@/domain/assignment/lead-assignment.ts';
import { previewOf } from '@/domain/messaging/conversation.ts';
import { PUBLIC } from '@/domain/shared/organization-scope.ts';
import type { NewNotification } from '@/domain/notifications/notification.ts';
import type { Principal } from '@/domain/identity/identity.ts';

export interface ViewingRequestResult extends CustomerViewingView {
  readonly created: boolean;
}

export const requestViewing =
  (deps: {
    readonly viewings: ViewingRepository;
    readonly listings: ListingRepository;
    readonly inquiries: InquiryRepository;
    readonly agents: AgentRepository;
    readonly notifications: NotificationRepository;
    readonly resolve: ReturnType<typeof resolveLeadAssignment>;
    readonly reassign: ReturnType<typeof reassignLead>;
    readonly clock: Clock;
    readonly settings: LeadAssignmentSettings;
  }) =>
  async (input: {
    readonly principal: Principal;
    readonly listingId: string;
    readonly preferredDate: string;
    readonly preferredWindow: PreferredTimeWindow;
    readonly note: string | null;
    readonly clientRef: string;
    readonly referralCode: string | null;
  }): Promise<ViewingRequestResult> => {
    const customerId = input.principal.userId;
    const replay = await deps.viewings.findByClientRef(customerId, input.clientRef);
    if (replay) return { ...(await customerViewingView(replay, deps.agents)), created: false };

    const found = await deps.listings.findPublicById(PUBLIC, input.listingId);
    if (!found || found.state !== 'PUBLISHED') throw new ListingNotFoundError('That property is no longer listed');
    if (found.intent !== 'SALE') throw new InquiryNotAllowedError('Viewings are requested for properties for sale');

    const now = deps.clock.now();
    assertPreferredSchedule(input.preferredDate, input.preferredWindow, now);
    const note = normaliseViewingNote(input.note);

    const active = await deps.viewings.activeForCustomerListing(customerId, found.id);
    if (active) return { ...(await customerViewingView(active, deps.agents)), created: false };

    const listing = assignableListing(found);
    const schedule = { date: input.preferredDate, window: input.preferredWindow };
    const { decision, existing } = await deps.resolve({
      listing,
      customerId,
      purpose: 'VIEWING',
      schedule,
      referralCode: input.referralCode,
    });

    let assignment: ViewingAssignmentInput = { kind: 'NONE' };
    if (existing && decision.kind === 'ASSIGNED' && decision.continued) {
      assignment = { kind: 'EXISTING', assignmentId: existing.id };
    } else if (existing) {
      const next = await deps.reassign({
        organizationId: listing.organizationId,
        assignment: existing,
        releaseReason: 'AGENT_UNAVAILABLE',
        listing,
        schedule,
        viewingStatusWithoutAgent: 'MATCHING',
      });
      if (next) assignment = { kind: 'EXISTING', assignmentId: next.id };
    } else if (decision.kind === 'ASSIGNED') {
      assignment = {
        kind: 'NEW',
        assignment: newAssignmentFrom(decision, {
          listing,
          customerId,
          purpose: 'VIEWING',
          previousAssignmentId: null,
          settings: deps.settings,
          now,
        }),
      };
    }

    const openInquiry = await deps.inquiries.openForCustomerListing(customerId, found.id);
    const when = describePreferredSchedule(input.preferredDate, input.preferredWindow);
    const requestMessage = note
      ? `I'd like to view this property. Preferred schedule: ${when}.\n\n${note}`
      : `I'd like to view this property. Preferred schedule: ${when}.`;

    const result = await deps.viewings.submitRequest({
      organizationId: listing.organizationId,
      listingId: listing.id,
      customerId,
      inquiryId: openInquiry?.id ?? null,
      preferredDate: input.preferredDate,
      preferredWindow: input.preferredWindow,
      timeZone: VIEWING_TIME_ZONE,
      durationMinutes: VIEWING_DURATION_MINUTES,
      customerNote: note,
      clientRef: input.clientRef,
      assignment,
      requestMessage,
      requestPreview: previewOf(requestMessage),
    });

    if (result.created) {
      const viewing = result.viewing;
      const outgoing: NewNotification[] = [
        organizationViewingNotice(viewing, `${viewing.customerName} requested a viewing`),
      ];
      if (viewing.agentId) {
        const agent = await deps.agents.findAssigned(customerId, viewing.agentId);
        if (agent) {
          outgoing.push(
            agentViewingNotice(viewing, agent.userId, 'VIEWING_REQUESTED', `New viewing request from ${viewing.customerName}`),
          );
        }
      }
      await deps.notifications.publish(outgoing);
    }
    return { ...(await customerViewingView(result.viewing, deps.agents)), created: result.created };
  };
