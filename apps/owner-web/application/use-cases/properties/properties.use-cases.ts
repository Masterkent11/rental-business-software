/**
 * Application Use Cases: Property & Unit Management
 */

import type { OwnerRepositoryPort } from "../../ports/owner-repository.port";
import type { Property, CreatePropertyInput } from "../../../domain/properties/property";

export class LoadPropertiesUseCase {
  constructor(private readonly repository: OwnerRepositoryPort) {}

  async execute(organizationId: string): Promise<readonly Property[]> {
    if (!organizationId) {
      throw new Error("Organization ID is required to load properties");
    }
    return this.repository.getProperties(organizationId);
  }
}

export class CreatePropertyUseCase {
  constructor(private readonly repository: OwnerRepositoryPort) {}

  async execute(organizationId: string, input: CreatePropertyInput): Promise<Property> {
    if (!organizationId) {
      throw new Error("Organization ID is required to create a property");
    }
    if (!input.name.trim()) {
      throw new Error("Property name is required");
    }
    return this.repository.createProperty(organizationId, input);
  }
}
