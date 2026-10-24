/**
 * Application Use Cases: Application & Tenant Decision Management
 */

import type { OwnerRepositoryPort } from "../../ports/owner-repository.port";
import type {
  OwnerApplication,
  DecisionInput,
} from "../../../domain/applications/application";

export class LoadApplicationsUseCase {
  constructor(private readonly repository: OwnerRepositoryPort) {}

  async execute(organizationId: string): Promise<readonly OwnerApplication[]> {
    if (!organizationId) {
      throw new Error("Organization ID is required to load applications");
    }
    return this.repository.getApplications(organizationId);
  }
}

export class DecideApplicationUseCase {
  constructor(private readonly repository: OwnerRepositoryPort) {}

  async execute(
    organizationId: string,
    applicationId: string,
    input: DecisionInput,
  ): Promise<{ id: string; state: string; decisionReason: string | null }> {
    if (!organizationId || !applicationId) {
      throw new Error("Organization ID and Application ID are required");
    }
    if (input.decision === "REJECTED" && !input.reason?.trim()) {
      throw new Error("A reason is required when rejecting an application");
    }
    return this.repository.decideApplication(organizationId, applicationId, input);
  }
}

export class ConfirmTenancyUseCase {
  constructor(private readonly repository: OwnerRepositoryPort) {}

  async execute(organizationId: string, applicationId: string, requirementsReviewed: boolean): Promise<void> {
    if (!organizationId || !applicationId || !requirementsReviewed) {
      throw new Error("Review the move-in requirements before confirming the tenancy");
    }
    return this.repository.confirmTenancy(organizationId, applicationId);
  }
}
