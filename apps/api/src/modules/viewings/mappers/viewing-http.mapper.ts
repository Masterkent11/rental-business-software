import type { AssignedAgentView, CustomerViewingView } from '@/application/viewings/viewing.types.ts';
import type { Viewing } from '@/domain/viewings/viewing.ts';

const base = (viewing: Viewing) => ({
  id: viewing.id,
  listingId: viewing.listingId,
  listingTitle: viewing.listingTitle,
  listingPhoto: viewing.listingPhoto,
  areaLabel: viewing.areaLabel,
  cityLabel: viewing.cityLabel,
  organizationName: viewing.organizationName,
  agentId: viewing.agentId,
  agentName: viewing.agentName,
  inquiryId: viewing.inquiryId,
  conversationId: viewing.conversationId,
  preferredDate: viewing.preferredDate,
  preferredTimeWindow: viewing.preferredWindow,
  timeZone: viewing.timeZone,
  scheduledAt: viewing.scheduledAt?.toISOString() ?? null,
  durationMinutes: viewing.durationMinutes,
  status: viewing.status,
  customerNote: viewing.customerNote,
  partnerNote: viewing.partnerNote,
  agentChangeNotice: viewing.agentChangeNotice,
  confirmedAt: viewing.confirmedAt?.toISOString() ?? null,
  declinedAt: viewing.declinedAt?.toISOString() ?? null,
  cancelledAt: viewing.cancelledAt?.toISOString() ?? null,
  cancelledByRole: viewing.cancelledByRole,
  createdAt: viewing.createdAt.toISOString(),
  updatedAt: viewing.updatedAt.toISOString(),
});

const toAssignedAgentHttpResponse = (agent: AssignedAgentView) => ({
  id: agent.agentId,
  displayName: agent.displayName,
  role: agent.headline,
  photoUrl: agent.photoUrl,
  verified: agent.verified,
  organizationName: agent.organizationName,
});

export const toCustomerViewingHttpResponse = (viewing: Viewing) => base(viewing);

export const toViewingRequestHttpResponse = (view: CustomerViewingView) => ({
  viewingRequest: base(view.viewing),
  assignmentState: view.viewing.agentId ? 'ASSIGNED' : view.viewing.status === 'MATCHING' ? 'MATCHING' : 'UNASSIGNED',
  assignedAgent: view.agent ? toAssignedAgentHttpResponse(view.agent) : null,
});

export const toPartnerViewingHttpResponse = (viewing: Viewing) => ({
  ...base(viewing),
  customerId: viewing.customerId,
  customerName: viewing.customerName,
  leadAssignmentId: viewing.leadAssignmentId,
  assignedAt: viewing.assignedAt?.toISOString() ?? null,
  responseDueAt: viewing.responseDueAt?.toISOString() ?? null,
});
