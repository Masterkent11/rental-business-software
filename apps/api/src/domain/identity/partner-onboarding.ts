import type { Principal } from '@/domain/identity/identity.ts';
import { normaliseDisplayName } from "@/domain/identity/identity.ts";

export class OnboardingUnavailableError extends Error {}

export function normaliseWorkspaceName(value: string): string {
  return normaliseDisplayName(value);
}

export interface OwnerOnboardingResult {
  readonly organizationId: string;
}

export function assertPartnerEnrollment(principal: Principal, kind: 'OWNER'|'AGENT'): void {
 const opposite=kind==='OWNER' ? ['AGENT','PLATFORM_ADMIN'] : ['OWNER','STAFF','PLATFORM_ADMIN'];
 if (principal.capabilities.some(c=>opposite.includes(c.capability))) throw new OnboardingUnavailableError('An additional partner role requires explicit platform provisioning.');
}
