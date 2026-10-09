import { z } from 'zod';

const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Dates must be YYYY-MM-DD');
const textList = z.array(z.string().trim().min(1).max(120)).max(40);

export const createListingSchema = z.object({
  resourceId: z.guid(),
  kind: z.enum(['LONG_TERM', 'SHORT_TERM']),
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(4000).default(''),
  priceCentavos: z.number().int().nonnegative(),
  amenities: textList.default([]),
  houseRules: textList.default([]),
  terms: textList.default([]),
  minStayNights: z.number().int().positive().nullable().optional(),
  advanceMonths: z.number().int().nonnegative().default(0),
  depositMonths: z.number().int().nonnegative().default(0),
});

const furnishingSchema = z.enum(['FURNISHED', 'SEMI_FURNISHED', 'UNFURNISHED']);

const listingDetailsShape = {
  kind: z.enum(['LONG_TERM', 'SHORT_TERM']),
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(4000),
  priceCentavos: z.number().int().positive().max(100_000_000_00),
  amenities: textList,
  houseRules: textList,
  terms: textList,
  minStayNights: z.number().int().min(1).max(90).nullable(),
  advanceMonths: z.number().int().min(0).max(6),
  depositMonths: z.number().int().min(0).max(6),
  maxOccupants: z.number().int().min(1).max(50),
  bedrooms: z.number().int().min(0).max(50),
  bathrooms: z.number().int().min(0).max(50),
  floorAreaSqm: z.number().int().positive().max(100_000).nullable(),
  cleaningFeeCentavos: z.number().int().min(0).max(10_000_000),
  availableFrom: isoDay.nullable(),
  furnishing: furnishingSchema.nullable().optional(),
  petsAllowed: z.boolean().nullable().optional(),
};

const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  privacy: z.enum(['EXACT', 'APPROXIMATE']).default('APPROXIMATE'),
});

const propertyShape = {
  name: z.string().trim().min(2).max(120),
  propertyType: z.enum(['APARTMENT', 'CONDO', 'HOUSE', 'ROOM', 'BOARDING_HOUSE', 'TOWNHOUSE', 'LOT', 'COMMERCIAL']),
  addressLine: z.string().trim().max(200),
  areaLabel: z.string().trim().min(2).max(120),
  cityLabel: z.string().trim().min(2).max(120),
  location: locationSchema.nullable().optional(),
};

const saleListingShape = {
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(4000),
  amenities: textList,
  saleStatus: z.enum(['READY_FOR_OCCUPANCY', 'PRE_SELLING', 'UNDER_CONSTRUCTION']),
  bedrooms: z.number().int().min(0).max(50),
  bathrooms: z.number().int().min(0).max(50),
  floorAreaSqm: z.number().int().positive().max(100_000).nullable(),
  lotAreaSqm: z.number().int().positive().max(10_000_000).nullable(),
  parkingSlots: z.number().int().min(0).max(50),
  availableFrom: isoDay.nullable(),
  furnishing: furnishingSchema.nullable().optional(),
};

export const saleTermsSchema = z.object({
  askingPriceInternalCentavos: z.number().int().positive().max(10_000_000_000_00).nullable(),
  priceNegotiable: z.boolean().default(true),
  commercialNotes: z.string().max(4000).default(''),
});

export const createSaleListingSchema = z.object({
  property: z.object({
    ...propertyShape,
    propertyType: z.enum(['HOUSE', 'CONDO', 'TOWNHOUSE', 'LOT', 'COMMERCIAL']),
    addressLine: propertyShape.addressLine.default(''),
    location: locationSchema,
  }),
  listing: z.object({
    ...saleListingShape,
    description: saleListingShape.description.default(''),
    amenities: textList.default([]),
    bedrooms: saleListingShape.bedrooms.default(0),
    bathrooms: saleListingShape.bathrooms.default(0),
    floorAreaSqm: saleListingShape.floorAreaSqm.default(null),
    lotAreaSqm: saleListingShape.lotAreaSqm.default(null),
    parkingSlots: saleListingShape.parkingSlots.default(0),
    availableFrom: saleListingShape.availableFrom.default(null),
  }),
  saleTerms: saleTermsSchema.nullable().default(null),
});

export const updateSaleListingSchema = z.object({
  listing: z.object(saleListingShape).partial().default({}),
  property: z
    .object({ ...propertyShape, propertyType: z.enum(['HOUSE', 'CONDO', 'TOWNHOUSE', 'LOT', 'COMMERCIAL']) })
    .partial()
    .optional(),
});

export const registerFloorPlanSchema = z.object({
  storagePath: z.string().trim().min(10).max(300),
  label: z.string().trim().min(2).max(60),
});

export const createPropertyListingSchema = z.object({
  property: z.object({ ...propertyShape, addressLine: propertyShape.addressLine.default('') }),
  unitLabel: z.string().trim().max(80).default(''),
  rentalMode: z.enum(['LONG_TERM', 'SHORT_TERM', 'HYBRID']),
  listing: z.object({
    ...listingDetailsShape,
    description: listingDetailsShape.description.default(''),
    amenities: textList.default([]),
    houseRules: textList.default([]),
    terms: textList.default([]),
    minStayNights: listingDetailsShape.minStayNights.default(null),
    advanceMonths: listingDetailsShape.advanceMonths.default(0),
    depositMonths: listingDetailsShape.depositMonths.default(0),
    maxOccupants: listingDetailsShape.maxOccupants.default(2),
    bedrooms: listingDetailsShape.bedrooms.default(1),
    bathrooms: listingDetailsShape.bathrooms.default(1),
    floorAreaSqm: listingDetailsShape.floorAreaSqm.default(null),
    cleaningFeeCentavos: listingDetailsShape.cleaningFeeCentavos.default(0),
    availableFrom: listingDetailsShape.availableFrom.default(null),
  }),
});

export const updateListingSchema = z.object({
  listing: z.object(listingDetailsShape).partial().default({}),
  property: z.object(propertyShape).partial().optional(),
});

export const registerPhotoSchema = z.object({
  storagePath: z.string().trim().min(10).max(300),
});

export const reorderPhotosSchema = z.object({
  photoIds: z.array(z.guid()).min(1).max(20),
});

export const setListingStateSchema = z.object({
  publish: z.boolean().default(true),
});

export const listingActionSchema = z.object({
  action: z.enum(['PUBLISH', 'UNPUBLISH', 'ARCHIVE']),
});

export const calendarQuerySchema = z.object({
  from: isoDay,
  to: isoDay,
});

export const addBlockSchema = z.object({
  startsOn: isoDay,
  endsOn: isoDay,
  note: z.string().trim().max(200).nullable().default(null),
});

export type CreateListingDto = z.infer<typeof createListingSchema>;
export type CreatePropertyListingDto = z.infer<typeof createPropertyListingSchema>;
export type UpdateListingDto = z.infer<typeof updateListingSchema>;
