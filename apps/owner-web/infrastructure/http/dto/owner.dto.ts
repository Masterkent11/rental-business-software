import { z } from "zod";

const listingState = z.enum([
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "PUBLISHED",
  "UNPUBLISHED",
  "REJECTED",
  "ARCHIVED",
]);

export const ListingPhotoDtoSchema = z.object({
  id: z.string(),
  url: z.string(),
  storagePath: z.string().nullable().default(null),
  position: z.number(),
});

const propertyType = z.enum(["APARTMENT", "CONDO", "HOUSE", "ROOM", "BOARDING_HOUSE", "TOWNHOUSE", "LOT", "COMMERCIAL"]);

export const PermissionsDtoSchema = z.object({
  canEditListing: z.boolean(),
  canManageTour: z.boolean(),
  canViewCommercial: z.boolean(),
});

const OwnerListingBase = z.object({
  activity: z.object({ views: z.number().int().nonnegative(), inquiries: z.number().int().nonnegative(), viewings: z.number().int().nonnegative() }).nullable().default(null),
  id: z.string(),
  resourceId: z.string(),
  propertyId: z.string().nullable().default(null),
  intent: z.enum(["RENT", "SALE"]).default("RENT"),
  title: z.string(),
  description: z.string().default(""),
  propertyName: z.string().default(""),
  propertyType: propertyType.nullable().default(null),
  addressLine: z.string().default(""),
  areaLabel: z.string().default(""),
  cityLabel: z.string().default(""),
  kind: z.enum(["LONG_TERM", "SHORT_TERM"]).nullable().default(null),
  resourceType: z.enum(["UNIT", "ROOM", "BED_SPACE", "PARKING", "STORAGE"]),
  priceCentavos: z.number().nullable().default(null),
  cleaningFeeCentavos: z.number().nullable().default(0).transform((v) => v ?? 0),
  state: listingState,
  hasTour: z.boolean().default(false),
  sceneCount: z.number().default(0),
  photos: z.array(z.string()).default([]),
  media: z.array(ListingPhotoDtoSchema).default([]),
  amenities: z.array(z.string()).default([]),
  houseRules: z.array(z.string()).default([]),
  terms: z.array(z.string()).default([]),
  minStayNights: z.number().nullable().default(null),
  maxOccupants: z.number().nullable().default(1).transform((v) => v ?? 1),
  bedrooms: z.number().nullable().default(0).transform((v) => v ?? 0),
  bathrooms: z.number().nullable().default(0).transform((v) => v ?? 0),
  floorAreaSqm: z.number().nullable().default(null),
  availableFrom: z.string().nullable().default(null),
  advanceMonths: z.number().default(0),
  depositMonths: z.number().default(0),
  availabilityLabel: z.string().default(""),
  publishProblems: z.array(z.string()).nullable().default(null),
  updatedAt: z.string().nullable().default(null),
  publishedAt: z.string().nullable().default(null),
  saleStatus: z.enum(["READY_FOR_OCCUPANCY", "PRE_SELLING", "UNDER_CONSTRUCTION"]).nullable().default(null),
  lotAreaSqm: z.number().nullable().default(null),
  parkingSlots: z.number().default(0),
  exactLocation: z
    .object({ latitude: z.number(), longitude: z.number(), privacy: z.enum(["EXACT", "APPROXIMATE"]) })
    .nullable()
    .default(null),
  floorPlanMedia: z
    .array(z.object({ id: z.string(), url: z.string(), label: z.string(), storagePath: z.string().nullable(), position: z.number() }))
    .default([]),
  representative: z
    .object({
      agentId: z.string(),
      displayName: z.string(),
      headline: z.string(),
      photoUrl: z.string().nullable(),
      verified: z.boolean(),
    })
    .nullable()
    .default(null),
  organizationId: z.string().nullable().default(null),
  permissions: PermissionsDtoSchema.nullable().default(null),
});

export const OwnerListingDtoSchema = OwnerListingBase.transform(({ exactLocation, floorPlanMedia, ...rest }) => ({
  ...rest,
  location: exactLocation,
  floorPlans: floorPlanMedia,
}));

export const CalendarDtoSchema = z.object({
  nights: z.array(
    z.object({ night: z.string(), status: z.enum(["OPEN", "HELD", "BOOKED", "LEASED", "BLOCKED"]) }),
  ),
  blocks: z.array(
    z.object({ id: z.string(), startsOn: z.string(), endsOn: z.string(), note: z.string().nullable() }),
  ),
});

export const BlockDtoSchema = z.object({
  id: z.string(),
  startsOn: z.string(),
  endsOn: z.string(),
  note: z.string().nullable(),
});

export const OwnerBookingDtoSchema = z.object({
  id: z.string(),
  reference: z.string(),
  listingId: z.string().nullable(),
  listingTitle: z.string(),
  propertyName: z.string(),
  resourceLabel: z.string(),
  areaLabel: z.string(),
  cityLabel: z.string(),
  photo: z.string().nullable(),
  guestName: z.string(),
  guestEmail: z.string().nullable().default(null),
  guests: z.number().nullable(),
  startsOn: z.string(),
  endsOn: z.string(),
  nights: z.number(),
  bucket: z.enum(["UPCOMING", "CURRENT", "PAST", "CANCELLED", "PENDING_PAYMENT"]),
  status: z.string(),
  statusLabel: z.string(),
  paidCentavos: z.number(),
  paymentState: z.string().nullable(),
  paidAt: z.string().nullable(),
  holdExpiresAt: z.string().nullable(),
  conversationId: z.string().nullable(),
  createdAt: z.string(),
  allowedActions: z.array(z.enum(["CHECK_IN", "COMPLETE"])).default([]),
});

export const ConversationDtoSchema = z.object({
  id: z.string(),
  listingId: z.string(),
  listingTitle: z.string(),
  listingPhoto: z.string().nullable(),
  customerName: z.string(),
  listingIntent: z.enum(["RENT", "SALE"]).default("RENT"),
  agentName: z.string().nullable().default(null),
  bookingId: z.string().nullable(),
  bookingStartsOn: z.string().nullable(),
  bookingEndsOn: z.string().nullable(),
  lastMessageAt: z.string().nullable(),
  lastMessagePreview: z.string(),
  lastSenderRole: z.enum(["CUSTOMER", "OWNER", "AGENT"]).nullable(),
  unreadCount: z.number(),
});

export const MessageDtoSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  senderRole: z.enum(["CUSTOMER", "OWNER", "AGENT"]),
  body: z.string(),
  clientId: z.string(),
  createdAt: z.string(),
});

export const NotificationDtoSchema = z.object({
  id: z.string(),
  kind: z.enum([
    "BOOKING_CONFIRMED",
    "BOOKING_RECEIVED",
    "BOOKING_UPDATED",
    "MESSAGE_RECEIVED",
    "APPLICATION_RECEIVED",
    "APPLICATION_DECIDED",
    "INQUIRY_RECEIVED",
    "INQUIRY_UPDATED",
    "VIEWING_REQUESTED",
    "VIEWING_UPDATED",
    "REPRESENTATION_INVITED",
    "REPRESENTATION_UPDATED",
  ]),
  title: z.string(),
  body: z.string(),
  link: z.string().nullable(),
  readAt: z.string().nullable(),
  createdAt: z.string(),
});

export const MeDtoSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  email: z.string().nullable().default(null),
  organizations: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        role: z.enum(["OWNER", "STAFF"]),
        verified: z.boolean(),
      }),
    )
    .default([]),
  capabilities: z.array(z.object({ capability: z.string(), organizationId: z.string().nullable() })).default([]),
  agentProfile: z
    .object({
      id: z.string(),
      displayName: z.string(),
      headline: z.string(),
      photoUrl: z.string().nullable(),
      verificationState: z.enum(["UNVERIFIED", "PENDING", "VERIFIED", "REJECTED", "SUSPENDED"]),
    })
    .nullable()
    .default(null),
});
