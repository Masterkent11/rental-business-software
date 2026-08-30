/**
 * Application Use Cases: Listing Management
 */

import type { OwnerRepositoryPort } from "../../ports/owner-repository.port";
import type {
  OwnerListing,
  CreateListingInput,
  OrganizationResource,
} from "../../../domain/listings/listing";

export class LoadListingsUseCase {
  constructor(private readonly repository: OwnerRepositoryPort) {}

  async execute(organizationId: string): Promise<readonly OwnerListing[]> {
    if (!organizationId) {
      throw new Error("Organization ID is required to load listings");
    }
    return this.repository.getOrganizationListings(organizationId);
  }
}

export class LoadResourcesUseCase {
  constructor(private readonly repository: OwnerRepositoryPort) {}

  async execute(organizationId: string): Promise<readonly OrganizationResource[]> {
    if (!organizationId) {
      throw new Error("Organization ID is required to load resources");
    }
    return this.repository.getOrganizationResources(organizationId);
  }
}

export class CreateListingUseCase {
  constructor(private readonly repository: OwnerRepositoryPort) {}

  async execute(organizationId: string, input: CreateListingInput): Promise<OwnerListing> {
    if (!organizationId) {
      throw new Error("Organization ID is required to create a listing");
    }
    if (!input.title.trim()) {
      throw new Error("Listing title is required");
    }
    if (input.pricePesos <= 0) {
      throw new Error("Price must be greater than zero");
    }
    return this.repository.createListing(organizationId, input);
  }
}

export class TogglePublishListingUseCase {
  constructor(private readonly repository: OwnerRepositoryPort) {}

  async execute(
    organizationId: string,
    listingId: string,
    publish: boolean,
  ): Promise<OwnerListing> {
    if (!organizationId || !listingId) {
      throw new Error("Organization ID and Listing ID are required");
    }
    return this.repository.publishListing(organizationId, listingId, publish);
  }
}
