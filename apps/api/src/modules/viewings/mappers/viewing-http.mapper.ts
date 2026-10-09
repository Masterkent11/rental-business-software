import type { Viewing, ViewingDay } from '@/domain/viewings/viewing.ts';

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
  scheduledAt: viewing.scheduledAt.toISOString(),
  durationMinutes: viewing.durationMinutes,
  status: viewing.status,
  customerNote: viewing.customerNote,
  partnerNote: viewing.partnerNote,
  confirmedAt: viewing.confirmedAt?.toISOString() ?? null,
  cancelledAt: viewing.cancelledAt?.toISOString() ?? null,
  cancelledByRole: viewing.cancelledByRole,
  createdAt: viewing.createdAt.toISOString(),
  updatedAt: viewing.updatedAt.toISOString(),
});

export const toCustomerViewingHttpResponse = (viewing: Viewing) => base(viewing);

export const toPartnerViewingHttpResponse = (viewing: Viewing) => ({
  ...base(viewing),
  customerId: viewing.customerId,
  customerName: viewing.customerName,
});

export const toViewingDaysHttpResponse = (days: readonly ViewingDay[]) => ({
  timeZone: 'Asia/Manila',
  days: days.map((day) => ({
    date: day.date,
    slots: day.slots.map((slot) => ({ startsAt: slot.startsAt.toISOString(), available: slot.available })),
  })),
});
