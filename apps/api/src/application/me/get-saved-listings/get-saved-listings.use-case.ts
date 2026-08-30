import type { UserRepository } from '@/application/ports/repositories/user-repository.port.ts';
import type { GetSavedListingsInput, GetSavedListingsResult } from './get-saved-listings.types.ts';

export function getSavedListings(users: UserRepository) {
  return async function execute(input: GetSavedListingsInput): Promise<GetSavedListingsResult> {
    return users.savedListingIds(input.userId);
  };
}
