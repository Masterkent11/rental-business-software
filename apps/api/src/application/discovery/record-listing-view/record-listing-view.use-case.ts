import type { DiscoveryRepository } from '@/application/ports/repositories/discovery-repository.port.ts';
import type { Principal } from '@/domain/identity/identity.ts';

export const recordListingView =
  (discovery: DiscoveryRepository) =>
  async (input: { readonly principal: Principal; readonly listingId: string }): Promise<{ readonly recorded: boolean }> => ({
    recorded: await discovery.recordListingView(input.principal.userId, input.listingId),
  });
