import type { AgentProfile, Representation } from '@/domain/agents/agent.ts';
import type { AgentDashboard } from '@/application/agents/agent-dashboard/agent-dashboard.use-case.ts';
import type { PublicAgentView } from '@/application/agents/view-public-agent/view-public-agent.use-case.ts';
import type { ClientSummary } from '@/application/ports/repositories/inquiry-repository.port.ts';
import type { AgentTask } from '@/application/ports/repositories/agent-task-repository.port.ts';
import type { PartnerAnalytics } from '@/application/ports/repositories/analytics-repository.port.ts';
import { toListingHttpResponse } from '@/modules/listings/mappers/listing-http.mapper.ts';

export const toPublicAgentHttpResponse = (agent: AgentProfile) => ({
  id: agent.id,
  displayName: agent.displayName,
  headline: agent.headline,
  bio: agent.bio,
  photoUrl: agent.photoUrl,
  verified: agent.verificationState === 'VERIFIED',
  licenseAuthority: agent.verificationState === 'VERIFIED' ? agent.licenseAuthority : null,
  specialties: agent.specialties,
  areasServed: agent.areasServed,
  languages: agent.languages,
  memberSince: agent.createdAt.toISOString(),
});

export const toOwnAgentHttpResponse = (agent: AgentProfile) => ({
  ...toPublicAgentHttpResponse(agent),
  licenseNumber: agent.licenseNumber,
  licenseAuthority: agent.licenseAuthority,
  verificationState: agent.verificationState,
  verifiedAt: agent.verifiedAt?.toISOString() ?? null,
  publicState: agent.publicState,
  updatedAt: agent.updatedAt.toISOString(),
});

export const toPublicAgentViewHttpResponse = (view: PublicAgentView) => ({
  agent: toPublicAgentHttpResponse(view.agent),
  stats: {
    activeListings: view.stats.activeListings,
    respondedWithinDayRate: view.stats.respondedWithinDayRate,
    medianResponseMinutes: view.stats.medianResponseMinutes,
    sampleSize: view.stats.sampleSize,
  },
  listings: view.listings.map(toListingHttpResponse),
});

export const toRepresentationHttpResponse = (representation: Representation) => ({
  id: representation.id,
  organizationId: representation.organizationId,
  organizationName: representation.organizationName,
  listingId: representation.listingId,
  listingTitle: representation.listingTitle,
  listingIntent: representation.listingIntent,
  listingState: representation.listingState,
  listingPhoto: representation.listingPhoto,
  areaLabel: representation.areaLabel,
  cityLabel: representation.cityLabel,
  agentId: representation.agentId,
  agentName: representation.agentName,
  state: representation.state,
  permissions: representation.permissions,
  terms: {
    representationType: representation.terms.representationType,
    isPrimary: representation.terms.isPrimary,
    acceptsLeads: representation.terms.acceptsLeads,
    validFrom: representation.terms.validFrom?.toISOString() ?? null,
    validUntil: representation.terms.validUntil?.toISOString() ?? null,
  },
  initiatedBy: representation.initiatedBy,
  endReason: representation.endReason,
  invitedAt: representation.invitedAt.toISOString(),
  respondedAt: representation.respondedAt?.toISOString() ?? null,
  endedAt: representation.endedAt?.toISOString() ?? null,
});

export const toTaskHttpResponse = (task: AgentTask) => ({
  id: task.id,
  title: task.title,
  dueAt: task.dueAt.toISOString(),
  doneAt: task.doneAt?.toISOString() ?? null,
  inquiryId: task.inquiryId,
  customerName: task.customerName,
  listingTitle: task.listingTitle,
  createdAt: task.createdAt.toISOString(),
});

export const toClientHttpResponse = (client: ClientSummary) => ({
  customerId: client.customerId,
  customerName: client.customerName,
  openInquiries: client.openInquiries,
  totalInquiries: client.totalInquiries,
  upcomingViewings: client.upcomingViewings,
  lastActivityAt: client.lastActivityAt.toISOString(),
  latestConversationId: client.latestConversationId,
  latestListingTitle: client.latestListingTitle,
  latestStatus: client.latestStatus,
});

export const toAgentDashboardHttpResponse = (dashboard: AgentDashboard) => ({
  agent: toOwnAgentHttpResponse(dashboard.agent),
  metrics: {
    newInquiries: dashboard.workload.newInquiries,
    activeClients: dashboard.workload.activeClients,
    viewingsToday: dashboard.workload.viewingsToday,
    followUpsDue: dashboard.workload.followUpsDue,
    dealsInProgress: dashboard.workload.dealsInProgress,
    pendingInvitations: dashboard.pendingInvitations,
    representedListings: dashboard.representedListings,
  },
  response: dashboard.response,
  pipeline: dashboard.workload.pipeline,
  today: dashboard.workload.today.map((item) => ({ ...item, at: item.at.toISOString() })),
  recentInquiries: dashboard.recentInquiries.map((inquiry) => ({
    id: inquiry.id,
    listingTitle: inquiry.listingTitle,
    customerName: inquiry.customerName,
    status: inquiry.status,
    createdAt: inquiry.createdAt.toISOString(),
    conversationId: inquiry.conversationId,
  })),
});

export const toAnalyticsHttpResponse = (analytics: PartnerAnalytics) => ({
  inquiriesByStatus: analytics.inquiriesByStatus,
  viewingsByStatus: analytics.viewingsByStatus,
  weekly: analytics.weekly,
  listings: analytics.listings,
});
