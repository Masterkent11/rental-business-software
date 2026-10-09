import type {
  ClientSummary,
  InquiryRepository,
} from '@/application/ports/repositories/inquiry-repository.port.ts';
import type { Principal } from '@/domain/identity/identity.ts';

export const listAgentClients =
  (inquiries: InquiryRepository) =>
  async (input: { readonly principal: Principal }): Promise<readonly ClientSummary[]> =>
    inquiries.clientsForAgent(input.principal.userId);
