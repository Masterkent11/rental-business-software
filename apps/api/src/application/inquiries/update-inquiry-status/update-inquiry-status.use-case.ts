import type { InquiryRepository } from '@/application/ports/repositories/inquiry-repository.port.ts';
import {
  InquiryNotFoundError,
  nextInquiryStatus,
  type Inquiry,
  type InquiryStatus,
} from '@/domain/inquiries/inquiry.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { partnerScopeFor } from '@/application/identity/partner-access.rules.ts';

export const updateInquiryStatus =
  (inquiries: InquiryRepository) =>
  async (input: {
    readonly principal: Principal;
    readonly organizationId: string | null;
    readonly inquiryId: string;
    readonly status: InquiryStatus;
    readonly lostReason: string | null;
  }): Promise<Inquiry> => {
    const scope = partnerScopeFor(input.principal, input.organizationId);
    const current =
      'organizationId' in scope
        ? await inquiries.findForOrganization(scope.organizationId, input.inquiryId)
        : await inquiries.findForAgent(input.principal.userId, input.inquiryId);
    if (!current) throw new InquiryNotFoundError('Inquiry not found');
    const next = nextInquiryStatus(current.status, input.status);
    return inquiries.setStatus(scope, input.inquiryId, next, input.lostReason?.trim().slice(0, 500) || null);
  };
