export type ListingKind = "LONG_TERM" | "SHORT_TERM";

export type ListingState =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "PUBLISHED"
  | "UNPUBLISHED"
  | "REJECTED"
  | "ARCHIVED";

export type ResourceType = "UNIT" | "ROOM" | "BED_SPACE" | "PARKING" | "STORAGE";

export type PropertyType =
  | "APARTMENT"
  | "CONDO"
  | "HOUSE"
  | "ROOM"
  | "BOARDING_HOUSE"
  | "TOWNHOUSE"
  | "LOT"
  | "COMMERCIAL";

export type ListingIntent = "RENT" | "SALE";

export type SaleStatus = "READY_FOR_OCCUPANCY" | "PRE_SELLING" | "UNDER_CONSTRUCTION";

export type LocationPrivacy = "EXACT" | "APPROXIMATE";

export interface ListingLocation {
  readonly latitude: number;
  readonly longitude: number;
  readonly privacy: LocationPrivacy;
}

export interface FloorPlan {
  readonly id: string;
  readonly url: string;
  readonly label: string;
  readonly storagePath: string | null;
  readonly position: number;
}

export interface ListingRepresentative {
  readonly agentId: string;
  readonly displayName: string;
  readonly headline: string;
  readonly photoUrl: string | null;
  readonly verified: boolean;
}

export const SALE_STATUSES: readonly { value: SaleStatus; label: string; hint: string }[] = [
  { value: "READY_FOR_OCCUPANCY", label: "Ready for occupancy", hint: "Built and ready to move in" },
  { value: "PRE_SELLING", label: "Pre-selling", hint: "Reserved before turnover" },
  { value: "UNDER_CONSTRUCTION", label: "Under construction", hint: "Construction is ongoing" },
];

export const SALE_PROPERTY_TYPES: readonly { value: PropertyType; label: string; hint: string }[] = [
  { value: "HOUSE", label: "House & Lot", hint: "A detached house with its lot" },
  { value: "CONDO", label: "Condo", hint: "A unit in a condominium" },
  { value: "TOWNHOUSE", label: "Townhouse", hint: "A unit in a row of houses" },
  { value: "LOT", label: "Lot", hint: "Land only" },
  { value: "COMMERCIAL", label: "Commercial", hint: "Office, shop or mixed use" },
];

export const saleStatusLabel = (status: SaleStatus | null): string =>
  SALE_STATUSES.find((s) => s.value === status)?.label ?? "For sale";

export type RentalMode = "LONG_TERM" | "SHORT_TERM" | "HYBRID";

export type ListingAction = "PUBLISH" | "UNPUBLISH" | "ARCHIVE";

export const PROPERTY_TYPES: readonly { value: PropertyType; label: string; hint: string }[] = [
  { value: "APARTMENT", label: "Apartment", hint: "A unit in a low- or mid-rise building" },
  { value: "CONDO", label: "Condo", hint: "A unit in a condominium tower" },
  { value: "HOUSE", label: "House", hint: "A whole house or townhouse" },
  { value: "ROOM", label: "Room", hint: "A private room inside a home" },
  { value: "BOARDING_HOUSE", label: "Boarding house", hint: "A bed space in a shared room" },
];

export const RENTAL_MODES: readonly { value: RentalMode; label: string; hint: string }[] = [
  { value: "SHORT_TERM", label: "Nightly stays", hint: "Guests book dates and pay up front" },
  { value: "LONG_TERM", label: "Monthly lease", hint: "Tenants apply and move in for months" },
];

export interface ListingPhoto {
  readonly id: string;
  readonly url: string;
  readonly storagePath: string | null;
  readonly position: number;
}

export interface OwnerListing {
  readonly id: string;
  readonly resourceId: string;
  readonly propertyId: string | null;
  readonly title: string;
  readonly description: string;
  readonly propertyName: string;
  readonly propertyType: PropertyType | null;
  readonly addressLine: string;
  readonly areaLabel: string;
  readonly cityLabel: string;
  readonly intent: ListingIntent;
  readonly kind: ListingKind | null;
  readonly resourceType: ResourceType;
  readonly priceCentavos: number | null;
  readonly cleaningFeeCentavos: number;
  readonly state: ListingState;
  readonly hasTour: boolean;
  readonly sceneCount: number;
  readonly photos: readonly string[];
  readonly media: readonly ListingPhoto[];
  readonly amenities: readonly string[];
  readonly houseRules: readonly string[];
  readonly terms: readonly string[];
  readonly minStayNights: number | null;
  readonly maxOccupants: number;
  readonly bedrooms: number;
  readonly bathrooms: number;
  readonly floorAreaSqm: number | null;
  readonly availableFrom: string | null;
  readonly advanceMonths: number;
  readonly depositMonths: number;
  readonly availabilityLabel: string;
  readonly publishProblems: readonly string[] | null;
  readonly updatedAt: string | null;
  readonly publishedAt: string | null;
  readonly saleStatus: SaleStatus | null;
  readonly lotAreaSqm: number | null;
  readonly parkingSlots: number;
  readonly location: ListingLocation | null;
  readonly floorPlans: readonly FloorPlan[];
  readonly representative: ListingRepresentative | null;
  readonly organizationId: string | null;
  readonly permissions: AgentPermissions | null;
}

export interface AgentPermissions {
  readonly canEditListing: boolean;
  readonly canManageTour: boolean;
  readonly canViewCommercial: boolean;
}

export interface SaleTerms {
  readonly askingPriceInternalCentavos: number | null;
  readonly priceNegotiable: boolean;
  readonly commercialNotes: string;
  readonly updatedAt: string | null;
}

export interface SaleListingDetailsInput {
  readonly title: string;
  readonly description: string;
  readonly amenities: readonly string[];
  readonly saleStatus: SaleStatus;
  readonly bedrooms: number;
  readonly bathrooms: number;
  readonly floorAreaSqm: number | null;
  readonly lotAreaSqm: number | null;
  readonly parkingSlots: number;
  readonly availableFrom: string | null;
}

export interface CreateSaleListingInput {
  readonly property: PropertyDetailsInput & { readonly location: ListingLocation };
  readonly listing: SaleListingDetailsInput;
  readonly saleTerms: Omit<SaleTerms, "updatedAt"> | null;
}

export interface UpdateSaleListingInput {
  readonly listing: Partial<SaleListingDetailsInput>;
  readonly property?: Partial<PropertyDetailsInput>;
}

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

export interface PropertyDetailsInput {
  readonly name: string;
  readonly propertyType: PropertyType;
  readonly addressLine: string;
  readonly areaLabel: string;
  readonly cityLabel: string;
  readonly location?: ListingLocation | null;
}

export interface ListingDetailsInput {
  readonly kind: ListingKind;
  readonly title: string;
  readonly description: string;
  readonly priceCentavos: number;
  readonly amenities: readonly string[];
  readonly houseRules: readonly string[];
  readonly terms: readonly string[];
  readonly minStayNights: number | null;
  readonly advanceMonths: number;
  readonly depositMonths: number;
  readonly maxOccupants: number;
  readonly bedrooms: number;
  readonly bathrooms: number;
  readonly floorAreaSqm: number | null;
  readonly cleaningFeeCentavos: number;
  readonly availableFrom: string | null;
}

export interface CreatePropertyListingInput {
  readonly property: PropertyDetailsInput;
  readonly unitLabel: string;
  readonly rentalMode: RentalMode;
  readonly listing: ListingDetailsInput;
}

export interface UpdateListingInput {
  readonly listing: Partial<ListingDetailsInput>;
  readonly property?: Partial<PropertyDetailsInput>;
}

export interface CalendarNight {
  readonly night: string;
  readonly status: "OPEN" | "HELD" | "BOOKED" | "LEASED" | "BLOCKED";
}

export interface AvailabilityBlock {
  readonly id: string;
  readonly startsOn: string;
  readonly endsOn: string;
  readonly note: string | null;
}

export interface ListingCalendar {
  readonly nights: readonly CalendarNight[];
  readonly blocks: readonly AvailabilityBlock[];
}

export const LISTING_STATE_LABEL: Record<ListingState, string> = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "In review",
  APPROVED: "Approved",
  PUBLISHED: "Published",
  UNPUBLISHED: "Unpublished",
  REJECTED: "Rejected",
  ARCHIVED: "Archived",
};

export function allowedActions(state: ListingState): readonly ListingAction[] {
  switch (state) {
    case "DRAFT":
      return ["PUBLISH", "ARCHIVE"];
    case "UNPUBLISHED":
      return ["PUBLISH", "ARCHIVE"];
    case "APPROVED":
      return ["PUBLISH"];
    case "PUBLISHED":
      return ["UNPUBLISH"];
    case "REJECTED":
      return ["ARCHIVE"];
    default:
      return [];
  }
}

export function propertyTypeLabel(type: PropertyType | null, intent: ListingIntent = "RENT"): string {
  const list = intent === "SALE" ? SALE_PROPERTY_TYPES : PROPERTY_TYPES;
  return list.find((t) => t.value === type)?.label ?? PROPERTY_TYPES.find((t) => t.value === type)?.label ?? "Property";
}

export const MAX_FLOOR_PLANS = 6;

export function floorPlanProblem(file: { type: string; size: number }, currentCount: number, label: string): string | null {
  if (label.trim().length < 2) return "Name the floor plan, for example “Ground floor”.";
  if (!(ACCEPTED_PHOTO_TYPES as readonly string[]).includes(file.type)) return "Use a JPEG, PNG, or WebP image.";
  if (file.size > MAX_PHOTO_BYTES) return "Floor plans must be smaller than 10 MB.";
  if (currentCount >= MAX_FLOOR_PLANS) return `A listing can have up to ${MAX_FLOOR_PLANS} floor plans.`;
  return null;
}

export function mapEmbedUrl(location: { latitude: number; longitude: number }, zoomKm = 0.6): string {
  const d = zoomKm / 111;
  const bbox = [location.longitude - d, location.latitude - d, location.longitude + d, location.latitude + d]
    .map((n) => n.toFixed(5))
    .join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${location.latitude.toFixed(5)},${location.longitude.toFixed(5)}`;
}

export const ACCEPTED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
export const MAX_PHOTOS = 12;

export function photoProblem(file: { type: string; size: number }, currentCount: number): string | null {
  if (!(ACCEPTED_PHOTO_TYPES as readonly string[]).includes(file.type)) {
    return "Use a JPEG, PNG, or WebP photo.";
  }
  if (file.size > MAX_PHOTO_BYTES) return "Photos must be smaller than 10 MB.";
  if (currentCount >= MAX_PHOTOS) return `A listing can have up to ${MAX_PHOTOS} photos.`;
  return null;
}
