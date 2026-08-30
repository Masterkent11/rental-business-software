import type { UserRepository } from '@/application/ports/repositories/user-repository.port.ts';
import type { GetMeInput, GetMeResult } from './get-me.types.ts';

export function getMe(users: UserRepository) {
  return async function execute(input: GetMeInput): Promise<GetMeResult> {
    const profile = await users.findProfile(input.principal.userId);
    return {
      principal: input.principal,
      profile,
    };
  };
}
