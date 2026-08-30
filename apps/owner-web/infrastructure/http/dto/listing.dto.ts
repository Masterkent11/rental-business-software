/**
 * Boundary Zod DTO: Listings
 */

import { z } from "zod";

export const ListingKindDtoSchema = z.enum(["LONG_TERM", "SHORT_TERM"]);
export const ResourceTypeDtoSchema = z.enum([
  "UNIT",
  "ROOM",
  "BED_SPACE",
  "PARKING",
  "STORAGE",
]);
export const ListingStateDtoSchema = z.enum([
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "PUBLISHED",
  "UNPUBLISHED",
  "REJECTED",
  "ARCHIVED",
]);

export const CreateListingInputDtoSchema = z.object({
  resourceId: z.string().min(1, "Please select a resource unit"),
  kind: ListingKindDtoSchema,
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(120),
  description: z.string().trim().max(4000).default(""),
  pricePesos: z.coerce.number().positive("Price must be greater than zero"),
  amenities: z.array(z.string()).default([]),
  houseRules: z.array(z.string()).default([]),
  terms: z.array(z.string()).default([]),
  minStayNights: z.coerce.number().int().positive().nullable().optional(),
  advanceMonths: z.coerce.number().int().nonnegative().default(1),
  depositMonths: z.coerce.number().int().nonnegative().default(2),
  photos: z.array(z.string()).default([]),
});
export type CreateListingInputDto = z.infer<typeof CreateListingInputDtoSchema>;

export const OwnerListingDtoSchema = z.object({
  id: z.string(),
  resourceId: z.string(),
  title: z.string(),
  description: z.string().default(""),
  propertyName: z.string().default(""),
  areaLabel: z.string().default(""),
  cityLabel: z.string().default(""),
  kind: ListingKindDtoSchema,
  resourceType: ResourceTypeDtoSchema.default("UNIT"),
  priceCentavos: z.number().int().nonnegative(),
  currency: z.string().default("PHP"),
  hasTour: z.boolean().default(false),
  sceneCount: z.number().default(0),
  photos: z.array(z.string()).default([]),
  state: ListingStateDtoSchema.default("DRAFT"),
  availabilityLabel: z.string().default(""),
  isAvailable: z.boolean().default(true),
  amenities: z.array(z.string()).default([]),
  houseRules: z.array(z.string()).default([]),
  terms: z.array(z.string()).default([]),
  minStayNights: z.number().int().positive().nullable().optional().default(null),
  advanceMonths: z.number().int().nonnegative().default(0),
  depositMonths: z.number().int().nonnegative().default(0),
  sharedFacilities: z.array(z.string()).default([]),
  ownerName: z.string().default(""),
  ownerVerified: z.boolean().default(false),
});
export type OwnerListingDto = z.infer<typeof OwnerListingDtoSchema>;

export const OrganizationResourceDtoSchema = z.object({
  id: z.string(),
  propertyId: z.string(),
  propertyName: z.string(),
  areaLabel: z.string(),
  cityLabel: z.string(),
  label: z.string(),
  resourceType: ResourceTypeDtoSchema,
  rentalMode: z.string(),
});
export type OrganizationResourceDto = z.infer<typeof OrganizationResourceDtoSchema>;
