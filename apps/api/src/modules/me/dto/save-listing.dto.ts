import { z } from 'zod';

export const saveListingBodySchema = z.object({
  listingId: z.guid(),
});

export type SaveListingDto = z.infer<typeof saveListingBodySchema>;
