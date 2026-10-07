import { z } from 'zod';

export const markReadSchema = z.union([
  z.object({ all: z.literal(true) }),
  z.object({ ids: z.array(z.guid()).min(1).max(100) }),
]);
