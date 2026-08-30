/**
 * Pure TypeScript Domain Entity: Property & RentableResource
 *
 * Rules:
 * - NO Zod
 * - NO React
 * - NO Supabase
 * - NO Zustand
 * - NO Infrastructure/HTTP imports
 */

export type ResourceType =
  | "UNIT"
  | "ROOM"
  | "BED_SPACE"
  | "PARKING"
  | "STORAGE";

export type RentalMode = "LONG_TERM" | "SHORT_TERM" | "HYBRID";

export type ResourceState = "DRAFT" | "ACTIVE" | "ARCHIVED";

export interface RentableResource {
  readonly id: string;
  readonly organizationId: string;
  readonly propertyId: string;
  readonly label: string;
  readonly resourceType: ResourceType;
  readonly rentalMode: RentalMode;
  readonly state?: ResourceState;
  readonly sharedFacilities?: readonly string[];
}

export interface Property {
  readonly id: string;
  readonly organizationId: string;
  readonly name: string;
  readonly areaLabel: string;
  readonly cityLabel: string;
  readonly photo?: string;
  readonly resourceCount: number;
  readonly occupied: number;
  readonly reserved: number;
  readonly vacant: number;
  readonly monthlyPotentialCentavos: number;
  readonly monthlyContractedCentavos: number;
  readonly resources?: readonly RentableResource[];
}

export interface CreatePropertyInput {
  readonly name: string;
  readonly areaLabel: string;
  readonly cityLabel: string;
  readonly unitCount: number;
  readonly baseRentCentavos: number;
  readonly photoUrl?: string;
}
