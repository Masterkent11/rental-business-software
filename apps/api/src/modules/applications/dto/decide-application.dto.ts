import { z } from 'zod';

export const decideApplicationSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED', 'UNDER_REVIEW']),
  reason: z.string().max(1000).optional(),
});

export type DecideApplicationDto = z.infer<typeof decideApplicationSchema>;
