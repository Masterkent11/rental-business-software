import { z } from 'zod';

const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Dates must be YYYY-MM-DD');
const booleanish = z
  .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
  .transform((value) => value === true || value === 'true' || value === '1');

export const listingQuerySchema = z
  .object({
    q: z.string().trim().min(1).max(120).optional(),
    ids: z
      .string()
      .transform((raw) => raw.split(',').map((id) => id.trim()).filter(Boolean))
      .pipe(z.array(z.guid()).min(1).max(50))
      .optional(),
    kind: z.enum(['LONG_TERM', 'SHORT_TERM']).optional(),
    type: z.enum(['UNIT', 'ROOM', 'BED_SPACE', 'PARKING', 'STORAGE']).optional(),
    propertyType: z.enum(['APARTMENT', 'CONDO', 'HOUSE', 'ROOM', 'BOARDING_HOUSE']).optional(),
    minPrice: z.coerce.number().int().nonnegative().optional(),
    maxPrice: z.coerce.number().int().nonnegative().optional(),
    guests: z.coerce.number().int().min(1).max(50).optional(),
    bedrooms: z.coerce.number().int().min(0).max(20).optional(),
    hasTour: booleanish.optional(),
    checkIn: isoDay.optional(),
    checkOut: isoDay.optional(),
    moveIn: isoDay.optional(),
    sort: z.enum(['NEWEST', 'PRICE_ASC', 'PRICE_DESC']).optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    offset: z.coerce.number().int().min(0).max(10_000).default(0),
  })
  .refine((q) => q.minPrice === undefined || q.maxPrice === undefined || q.minPrice <= q.maxPrice, {
    message: 'The minimum price must not exceed the maximum price',
  })
  .refine((q) => (q.checkIn === undefined) === (q.checkOut === undefined), {
    message: 'Give both a check-in and a check-out date',
  })
  .refine((q) => !q.checkIn || !q.checkOut || q.checkIn < q.checkOut, {
    message: 'Check-out must be after check-in',
  });

export type ListingQueryDto = z.infer<typeof listingQuerySchema>;

export const quoteQuerySchema = z.object({
  checkIn: isoDay,
  checkOut: isoDay,
  guests: z.coerce.number().int().min(1).max(50).default(1),
});
