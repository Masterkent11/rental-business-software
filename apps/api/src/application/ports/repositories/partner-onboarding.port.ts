import type { OwnerOnboardingResult } from "@/domain/identity/partner-onboarding.ts";

export interface PartnerOnboardingRepository {
  createOwnerWorkspace(input: {
    readonly userId: string;
    readonly workspaceName: string;
  }): Promise<OwnerOnboardingResult>;
}
