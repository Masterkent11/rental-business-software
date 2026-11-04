import type { OwnerOnboardingResult } from "@/domain/identity/partner-onboarding.ts";

export function toOwnerWorkspaceHttp(result: OwnerOnboardingResult) {
  return { organizationId: result.organizationId };
}
