import { z } from 'zod';

const ISO_DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

export const availabilityQuerySchema = z.object({ from: ISO_DATE, to: ISO_DATE });
export type AvailabilityQueryDto = z.infer<typeof availabilityQuerySchema>;

export const holdBodySchema = z.object({
  listingId: z.guid(),
  startsOn: ISO_DATE,
  endsOn: ISO_DATE,
  guests: z.number().int().min(1).max(50).default(1),
  idempotencyKey: z.guid().nullable().default(null),
});
export type HoldBodyDto = z.infer<typeof holdBodySchema>;

export const organizationBookingsQuerySchema = z.object({
  bucket: z.enum(['UPCOMING', 'CURRENT', 'PAST', 'CANCELLED', 'PENDING_PAYMENT']).optional(),
  q: z.string().trim().min(1).max(80).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});

export const bookingStatusSchema = z.object({
  action: z.enum(['CHECK_IN', 'COMPLETE']),
});
