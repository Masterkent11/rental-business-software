import { z } from 'zod';

export const createListingSchema = z.object({
  resourceId: z.guid(),
  kind: z.enum(['LONG_TERM', 'SHORT_TERM']),
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(4000).default(''),
  priceCentavos: z.number().int().nonnegative(),
  amenities: z.array(z.string().trim()).default([]),
  houseRules: z.array(z.string().trim()).default([]),
  terms: z.array(z.string().trim()).default([]),
  minStayNights: z.number().int().positive().nullable().optional(),
  advanceMonths: z.number().int().nonnegative().default(0),
  depositMonths: z.number().int().nonnegative().default(0),
  photos: z.array(z.string().trim()).default([]),
});

export const uploadPhotoSchema = z.object({
  photoBase64: z.string().min(1),
  contentType: z.string().default('image/jpeg'),
});

export const setListingStateSchema = z.object({
  publish: z.boolean().default(true),
});

export type CreateListingDto = z.infer<typeof createListingSchema>;
export type UploadPhotoDto = z.infer<typeof uploadPhotoSchema>;
export type SetListingStateDto = z.infer<typeof setListingStateSchema>;
