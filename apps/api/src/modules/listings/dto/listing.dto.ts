import { z } from 'zod';

export const listingQuerySchema = z.object({
  q: z.string().trim().min(1).optional(),
  ids: z
    .string()
    .transform((raw) => raw.split(',').map((id) => id.trim()).filter(Boolean))
    .pipe(z.array(z.guid()).min(1).max(50))
    .optional(),
  kind: z.enum(['LONG_TERM', 'SHORT_TERM']).optional(),
  type: z.enum(['UNIT', 'ROOM', 'BED_SPACE', 'PARKING', 'STORAGE']).optional(),
  maxPrice: z.coerce.number().int().nonnegative().optional(),
  hasTour: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type ListingQueryDto = z.infer<typeof listingQuerySchema>;
