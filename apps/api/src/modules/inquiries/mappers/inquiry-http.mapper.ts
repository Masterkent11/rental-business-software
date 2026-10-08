import type { Inquiry } from '@/domain/inquiries/inquiry.ts';
import { isOpenInquiry } from '@/domain/inquiries/inquiry.ts';
import type { SubmittedInquiry } from '@/application/ports/repositories/inquiry-repository.port.ts';

const base = (inquiry: Inquiry) => ({
  id: inquiry.id,
  listingId: inquiry.listingId,
  listingTitle: inquiry.listingTitle,
  listingPhoto: inquiry.listingPhoto,
  areaLabel: inquiry.areaLabel,
  cityLabel: inquiry.cityLabel,
  organizationName: inquiry.organizationName,
  agentId: inquiry.agentId,
  agentName: inquiry.agentName,
  conversationId: inquiry.conversationId,
  message: inquiry.message,
  questions: inquiry.questions,
  buyerBudgetCentavos: inquiry.buyerBudgetCentavos,
  createdAt: inquiry.createdAt.toISOString(),
});

export const toCustomerInquiryHttpResponse = (inquiry: Inquiry) => ({
  ...base(inquiry),
  status: !isOpenInquiry(inquiry.status) ? 'CLOSED' : inquiry.status === 'NEW' ? 'SENT' : 'IN_PROGRESS',
  responded: inquiry.firstResponseAt !== null,
});

export const toPartnerInquiryHttpResponse = (inquiry: Inquiry) => ({
  ...base(inquiry),
  customerId: inquiry.customerId,
  customerName: inquiry.customerName,
  status: inquiry.status,
  lostReason: inquiry.lostReason,
  updatedAt: inquiry.updatedAt.toISOString(),
  statusChangedAt: inquiry.statusChangedAt.toISOString(),
  firstResponseAt: inquiry.firstResponseAt?.toISOString() ?? null,
});

export const toSubmittedInquiryHttpResponse = (result: SubmittedInquiry) => ({
  inquiry: toCustomerInquiryHttpResponse(result.inquiry),
  created: result.created,
  alreadyOpen: result.alreadyOpen,
});
