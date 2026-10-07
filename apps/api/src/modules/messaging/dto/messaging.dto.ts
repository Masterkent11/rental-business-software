import { z } from 'zod';

export const startConversationSchema = z.object({
  listingId: z.guid(),
  bookingId: z.guid().nullable().default(null),
});

export const sendMessageSchema = z.object({
  body: z.string().max(4000),
  clientId: z.guid(),
});

export const threadQuerySchema = z.object({
  before: z.iso.datetime({ offset: true }).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
