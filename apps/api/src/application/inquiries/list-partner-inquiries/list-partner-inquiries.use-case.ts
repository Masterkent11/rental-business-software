import type {
  InquiryFilters,
  InquiryRepository,
} from '@/application/ports/repositories/inquiry-repository.port.ts';
import { InquiryNotFoundError, type Inquiry } from '@/domain/inquiries/inquiry.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { partnerScopeFor } from '@/application/identity/partner-access.rules.ts';

export const listPartnerInquiries =
  (inquiries: InquiryRepository) =>
  async (input: {
    readonly principal: Principal;
    readonly organizationId: string | null;
    readonly filters: InquiryFilters;
  }): Promise<readonly Inquiry[]> => {
    const scope = partnerScopeFor(input.principal, input.organizationId);
    return 'organizationId' in scope
      ? inquiries.listForOrganization(scope.organizationId, input.filters)
      : inquiries.listForAgent(input.principal.userId, input.filters);
  };

export const getPartnerInquiry =
  (inquiries: InquiryRepository) =>
  async (input: {
    readonly principal: Principal;
    readonly organizationId: string | null;
    readonly inquiryId: string;
  }): Promise<Inquiry> => {
    const scope = partnerScopeFor(input.principal, input.organizationId);
    const inquiry =
      'organizationId' in scope
        ? await inquiries.findForOrganization(scope.organizationId, input.inquiryId)
        : await inquiries.findForAgent(input.principal.userId, input.inquiryId);
    if (!inquiry) throw new InquiryNotFoundError('Inquiry not found');
    return inquiry;
  };
