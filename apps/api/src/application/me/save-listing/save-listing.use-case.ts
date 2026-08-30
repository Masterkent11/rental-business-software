import type { UserRepository } from '@/application/ports/repositories/user-repository.port.ts';
import type { SaveListingInput, SaveListingResult } from './save-listing.types.ts';

export function saveListing(users: UserRepository) {
  return async function execute(input: SaveListingInput): Promise<SaveListingResult> {
    await users.saveListing(input.userId, input.listingId);
    return users.savedListingIds(input.userId);
  };
}
