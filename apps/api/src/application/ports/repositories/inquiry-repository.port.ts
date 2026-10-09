import type { Inquiry, InquiryStatus } from '@/domain/inquiries/inquiry.ts';
import type { PartyScope } from './party-scope.port.ts';

export interface NewInquiry {
  readonly organizationId: string;
  readonly listingId: string;
  readonly customerId: string;
  readonly agentId: string | null;
  readonly message: string;
  readonly questions: readonly string[];
  readonly buyerBudgetCentavos: number | null;
  readonly clientRef: string;
  readonly opening: string;
  readonly openingPreview: string;
}

export interface InquiryFilters {
  readonly status?: InquiryStatus;
  readonly listingId?: string;
}

export interface SubmittedInquiry {
  readonly inquiry: Inquiry;
  readonly created: boolean;
  readonly alreadyOpen: boolean;
}

export interface ClientSummary {
  readonly customerId: string;
  readonly customerName: string;
  readonly openInquiries: number;
  readonly totalInquiries: number;
  readonly upcomingViewings: number;
  readonly lastActivityAt: Date;
  readonly latestConversationId: string | null;
  readonly latestListingTitle: string;
  readonly latestStatus: InquiryStatus;
}

export interface InquiryRepository {
  submit(input: NewInquiry): Promise<SubmittedInquiry>;
  findForCustomer(customerId: string, id: string): Promise<Inquiry | null>;
  listForCustomer(customerId: string): Promise<readonly Inquiry[]>;
  openForCustomerListing(customerId: string, listingId: string): Promise<Inquiry | null>;
  findForOrganization(organizationId: string, id: string): Promise<Inquiry | null>;
  listForOrganization(organizationId: string, filters: InquiryFilters): Promise<readonly Inquiry[]>;
  findForAgent(agentUserId: string, id: string): Promise<Inquiry | null>;
  listForAgent(agentUserId: string, filters: InquiryFilters): Promise<readonly Inquiry[]>;
  setStatus(scope: PartyScope, id: string, status: InquiryStatus, lostReason: string | null): Promise<Inquiry>;
  openForConversation(scope: PartyScope, conversationId: string): Promise<Inquiry | null>;
  recordFirstResponse(scope: PartyScope, id: string, at: Date, status: InquiryStatus): Promise<void>;
  clientsForAgent(agentUserId: string): Promise<readonly ClientSummary[]>;
}
