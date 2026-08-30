/**
 * Pure TypeScript Domain Entity: OwnerListing & OrganizationResource
 *
 * Rules:
 * - NO Zod
 * - NO React
 * - NO Supabase
 * - NO Zustand
 * - NO Infrastructure/HTTP imports
 */

import type { ResourceType } from "../properties/property";

export type ListingKind = "LONG_TERM" | "SHORT_TERM";

export type ListingState =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "PUBLISHED"
  | "UNPUBLISHED"
  | "REJECTED"
  | "ARCHIVED";

export interface OrganizationResource {
  readonly id: string;
  readonly propertyId: string;
  readonly propertyName: string;
  readonly areaLabel: string;
  readonly cityLabel: string;
  readonly label: string;
  readonly resourceType: ResourceType;
  readonly rentalMode: string;
}

export interface OwnerListing {
  readonly id: string;
  readonly resourceId: string;
  readonly resourceType: ResourceType;
  readonly propertyName: string;
  readonly areaLabel: string;
  readonly cityLabel: string;
  readonly kind: ListingKind;
  readonly title: string;
  readonly description: string;
  readonly state: ListingState;
  readonly priceCentavos: number;
  readonly currency: string;
  readonly photos: readonly string[];
  readonly amenities: readonly string[];
  readonly houseRules: readonly string[];
  readonly terms: readonly string[];
  readonly minStayNights: number | null;
  readonly advanceMonths: number;
  readonly depositMonths: number;
  readonly availabilityLabel: string;
  readonly isAvailable: boolean;
  readonly sharedFacilities: readonly string[];
  readonly ownerName: string;
  readonly ownerVerified: boolean;
  readonly hasTour: boolean;
  readonly sceneCount: number;
}

export interface CreateListingInput {
  readonly resourceId: string;
  readonly kind: ListingKind;
  readonly title: string;
  readonly description: string;
  readonly pricePesos: number;
  readonly amenities: readonly string[];
  readonly houseRules: readonly string[];
  readonly terms: readonly string[];
  readonly minStayNights?: number | null;
  readonly advanceMonths: number;
  readonly depositMonths: number;
  readonly photos: readonly string[];
}
