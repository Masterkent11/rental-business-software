import { z } from 'zod';

export const contentSlugSchema = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(60);

export const contentListQuerySchema = z.object({
  kind: z.enum(['LEGAL', 'HELP']).default('LEGAL'),
});

export const acceptPoliciesSchema = z.object({
  documents: z
    .array(z.object({ slug: contentSlugSchema, version: z.number().int().positive() }))
    .min(1)
    .max(5),
  context: z.enum(['SIGN_UP', 'BOOKING', 'INQUIRY', 'VIEWING', 'POLICY_UPDATE']),
  relatedId: z.guid().nullable().default(null),
});

export const supportRequestSchema = z.object({
  email: z.string().trim().max(254),
  topic: z.enum(['ACCOUNT', 'BOOKING', 'PAYMENT', 'LISTING_REPORT', 'INQUIRY_VIEWING', 'PRIVACY', 'OTHER']),
  message: z.string().max(4000),
  listingId: z.guid().nullable().default(null),
  clientRef: z.guid(),
});
