/**
 * Application Port: OwnerRepositoryPort
 *
 * Rules:
 * - Depends ONLY on Domain
 * - No Infrastructure / Supabase / Fetch imports
 */

import type { Property, CreatePropertyInput } from "../../domain/properties/property";
import type {
  OwnerListing,
  CreateListingInput,
  OrganizationResource,
} from "../../domain/listings/listing";
import type {
  OwnerApplication,
  DecisionInput,
} from "../../domain/applications/application";
import type { Collection } from "../../domain/payments/collection";

export interface OwnerRepositoryPort {
  getProperties(organizationId: string): Promise<readonly Property[]>;
  createProperty(organizationId: string, input: CreatePropertyInput): Promise<Property>;
  getOrganizationResources(organizationId: string): Promise<readonly OrganizationResource[]>;
  getOrganizationListings(organizationId: string): Promise<readonly OwnerListing[]>;
  createListing(organizationId: string, input: CreateListingInput): Promise<OwnerListing>;
  uploadListingPhoto(
    organizationId: string,
    listingId: string,
    photoBase64: string,
    contentType?: string,
  ): Promise<{ listingId: string; photos: string[]; uploadedUrl: string }>;
  publishListing(
    organizationId: string,
    listingId: string,
    publish: boolean,
  ): Promise<OwnerListing>;
  getApplications(organizationId: string): Promise<readonly OwnerApplication[]>;
  decideApplication(
    organizationId: string,
    applicationId: string,
    input: DecisionInput,
  ): Promise<{ id: string; state: string; decisionReason: string | null }>;
  getCollection(organizationId: string): Promise<Collection>;
}
