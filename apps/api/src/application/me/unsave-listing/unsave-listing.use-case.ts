import type { UserRepository } from '@/application/ports/repositories/user-repository.port.ts';
import type { UnsaveListingInput, UnsaveListingResult } from './unsave-listing.types.ts';

export function unsaveListing(users: UserRepository) {
  return async function execute(input: UnsaveListingInput): Promise<UnsaveListingResult> {
    await users.unsaveListing(input.userId, input.listingId);
    return users.savedListingIds(input.userId);
  };
}
