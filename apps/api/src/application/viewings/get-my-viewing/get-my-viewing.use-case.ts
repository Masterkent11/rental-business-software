import type { AgentRepository } from '@/application/ports/repositories/agent-repository.port.ts';
import type { ViewingRepository } from '@/application/ports/repositories/viewing-repository.port.ts';
import type { CustomerViewingView } from '@/application/viewings/viewing.types.ts';
import { customerViewingView } from '@/application/viewings/customer-viewing-view.rules.ts';
import { ViewingNotFoundError } from '@/domain/viewings/viewing.ts';
import type { Principal } from '@/domain/identity/identity.ts';

export const getMyViewing =
  (viewings: ViewingRepository, agents: AgentRepository) =>
  async (input: { readonly principal: Principal; readonly viewingId: string }): Promise<CustomerViewingView> => {
    const viewing = await viewings.findForCustomer(input.principal.userId, input.viewingId);
    if (!viewing) throw new ViewingNotFoundError('Viewing not found');
    return customerViewingView(viewing, agents);
  };
