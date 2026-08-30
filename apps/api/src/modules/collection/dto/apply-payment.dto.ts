import { z } from 'zod';

export const applyPaymentSchema = z.object({
  paymentId: z.guid(),
  amountCentavos: z.number().int().positive(),
});

export type ApplyPaymentDto = z.infer<typeof applyPaymentSchema>;
