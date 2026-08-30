import { z } from 'zod';

export const confirmSandboxBodySchema = z.object({ paymentId: z.guid() });
export type ConfirmSandboxBodyDto = z.infer<typeof confirmSandboxBodySchema>;
