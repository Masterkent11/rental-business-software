import { z } from 'zod';

const intent = z.enum(['RENT', 'SALE']);

export const suggestionQuerySchema = z.object({
  q: z.string().trim().max(80).default(''),
  intent: intent.optional(),
});

export const popularAreasQuerySchema = z.object({
  intent: intent.optional(),
  city: z.string().trim().min(2).max(80).optional(),
  limit: z.coerce.number().int().min(1).max(20).default(8),
});

export const resolveLocationQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

export const recommendationQuerySchema = z
  .object({
    intent: intent.default('RENT'),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
    city: z.string().trim().min(2).max(80).optional(),
    propertyType: z
      .enum(['APARTMENT', 'CONDO', 'HOUSE', 'ROOM', 'BOARDING_HOUSE', 'TOWNHOUSE', 'LOT', 'COMMERCIAL'])
      .optional(),
    limit: z.coerce.number().int().min(1).max(30).default(10),
  })
  .refine((q) => (q.lat === undefined) === (q.lng === undefined), { message: 'Send both lat and lng' });

export const listingViewSchema = z.object({
  listingId: z.guid(),
});
