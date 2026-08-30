import type { UserRepository } from '@/application/ports/repositories/user-repository.port.ts';
import type { GetMyStaysInput, GetMyStaysResult } from './get-my-stays.types.ts';

export function getMyStays(users: UserRepository) {
  return async function execute(input: GetMyStaysInput): Promise<GetMyStaysResult> {
    return users.staysFor(input.userId);
  };
}
