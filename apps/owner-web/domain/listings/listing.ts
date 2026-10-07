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

export type PropertyType = "APARTMENT" | "CONDO" | "HOUSE" | "ROOM" | "BOARDING_HOUSE";

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
  readonly kind: ListingKind;
  readonly resourceType: ResourceType;
  readonly priceCentavos: number;
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

export function propertyTypeLabel(type: PropertyType | null): string {
  return PROPERTY_TYPES.find((t) => t.value === type)?.label ?? "Property";
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
