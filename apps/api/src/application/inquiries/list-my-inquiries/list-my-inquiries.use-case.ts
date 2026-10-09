import type { InquiryRepository } from '@/application/ports/repositories/inquiry-repository.port.ts';
import { InquiryNotFoundError, type Inquiry } from '@/domain/inquiries/inquiry.ts';
import type { Principal } from '@/domain/identity/identity.ts';

export const listMyInquiries =
  (inquiries: InquiryRepository) =>
  async (input: { readonly principal: Principal }): Promise<readonly Inquiry[]> =>
    inquiries.listForCustomer(input.principal.userId);

export const getMyInquiry =
  (inquiries: InquiryRepository) =>
  async (input: { readonly principal: Principal; readonly inquiryId: string }): Promise<Inquiry> => {
    const inquiry = await inquiries.findForCustomer(input.principal.userId, input.inquiryId);
    if (!inquiry) throw new InquiryNotFoundError('Inquiry not found');
    return inquiry;
  };

export const getMyOpenInquiryForListing =
  (inquiries: InquiryRepository) =>
  async (input: { readonly principal: Principal; readonly listingId: string }): Promise<Inquiry | null> =>
    inquiries.openForCustomerListing(input.principal.userId, input.listingId);
