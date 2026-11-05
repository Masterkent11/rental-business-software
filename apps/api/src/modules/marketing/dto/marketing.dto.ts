import { z } from "zod";
export const marketingDraftSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    caption: z.string().max(2200),
    listingId: z.guid().nullable(),
    sourcePhotos: z.array(z.string().url().max(2000)).max(10),
    mediaIds: z.array(z.guid()).max(10),
    state: z.enum(["DRAFT", "READY_FOR_REVIEW"]),
  })
  .strict();
export const marketingDraftUpdateSchema = marketingDraftSchema
  .extend({ version: z.number().int().positive() })
  .strict();
export const marketingUploadSchema = z
  .object({
    fileName: z.string().trim().min(1).max(120),
    contentType: z.enum(["image/jpeg", "image/png", "image/webp", "video/mp4"]),
    data: z.string().min(1).max(16_777_216),
  })
  .strict();

export const facebookAuthorizationSchema = z.strictObject({
  state: z.string().regex(/^[\w-]{43}$/),
  code: z.string().min(1).max(4096).nullable(),
});

export const facebookPageSelectionSchema = z.strictObject({
  selectionId: z.string().regex(/^[\da-f]{64}$/),
  pageId: z.string().regex(/^\d{1,64}$/),
});
