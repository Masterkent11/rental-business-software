import type { ViewingRepository } from '@/application/ports/repositories/viewing-repository.port.ts';
import type { Viewing } from '@/domain/viewings/viewing.ts';
import type { Principal } from '@/domain/identity/identity.ts';

export const listMyViewings =
  (viewings: ViewingRepository) =>
  async (input: { readonly principal: Principal }): Promise<readonly Viewing[]> =>
    viewings.listForCustomer(input.principal.userId);
