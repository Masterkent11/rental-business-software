import type {
  UserProfile,
  UserRepository,
} from '@/application/ports/repositories/user-repository.port.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { InvalidProfileError, normaliseDisplayName } from '@/domain/identity/identity.ts';

export const updateMyProfile =
  (users: UserRepository) =>
  async (input: {
    readonly principal: Principal;
    readonly displayName: string;
  }): Promise<UserProfile> => {
    const displayName = normaliseDisplayName(input.displayName);
    const updated = await users.updateProfile(input.principal.userId, { displayName });
    if (!updated) throw new InvalidProfileError('Your profile could not be found');
    return updated;
  };
