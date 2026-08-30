import { z } from 'zod';

export const submitApplicationSchema = z.object({
  resourceId: z.guid(),
  desiredMoveIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  desiredTermMonths: z.number().int().min(1).max(60),
  message: z.string().trim().max(2000).default(''),
});

export type SubmitApplicationDto = z.infer<typeof submitApplicationSchema>;
