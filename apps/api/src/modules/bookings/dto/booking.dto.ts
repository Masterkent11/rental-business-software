import { z } from 'zod';

const ISO_DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

export const availabilityQuerySchema = z.object({ from: ISO_DATE, to: ISO_DATE });
export type AvailabilityQueryDto = z.infer<typeof availabilityQuerySchema>;

export const holdBodySchema = z.object({
  resourceId: z.guid(),
  startsOn: ISO_DATE,
  endsOn: ISO_DATE,
});
export type HoldBodyDto = z.infer<typeof holdBodySchema>;
