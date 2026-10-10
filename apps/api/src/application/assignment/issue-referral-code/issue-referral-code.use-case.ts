import type { LeadAssignmentRepository } from '@/application/ports/repositories/lead-assignment-repository.port.ts';
import type { IdGenerator } from '@/application/ports/providers/id-generator.port.ts';
import { RepresentationForbiddenError } from '@/domain/agents/agent.ts';
import { hasCapability, type Principal } from '@/domain/identity/identity.ts';

export const REFERRAL_CODE_LENGTH = 10;

export const issueReferralCode =
  (assignments: LeadAssignmentRepository, ids: IdGenerator) =>
  async (input: { readonly principal: Principal; readonly listingId: string }): Promise<{ readonly code: string }> => {
    if (!hasCapability(input.principal, 'AGENT')) throw new RepresentationForbiddenError('Only agents can share referral links');
    const candidate = ids.generateId().replace(/-/g, '').slice(0, REFERRAL_CODE_LENGTH).toUpperCase();
    const code = await assignments.issueReferralCode(input.principal.userId, input.listingId, candidate);
    return { code };
  };
