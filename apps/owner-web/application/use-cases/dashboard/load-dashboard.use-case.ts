/**
 * Application Use Case: Load Dashboard Collection Data
 */

import type { OwnerRepositoryPort } from "../../ports/owner-repository.port";
import type { Collection } from "../../../domain/payments/collection";

export class LoadDashboardUseCase {
  constructor(private readonly repository: OwnerRepositoryPort) {}

  async execute(organizationId: string): Promise<Collection> {
    if (!organizationId) {
      throw new Error("Organization ID is required to load dashboard");
    }
    return this.repository.getCollection(organizationId);
  }
}
