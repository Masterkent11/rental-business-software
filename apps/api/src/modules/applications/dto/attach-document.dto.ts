import { z } from 'zod';

export const ALLOWED_DOCUMENT_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024; // 10 MB

export const attachDocumentSchema = z.object({
  kind: z.enum([
    'GOVERNMENT_ID',
    'PROOF_OF_INCOME',
    'EMPLOYMENT_LETTER',
    'BUSINESS_PERMIT',
    'OTHER',
  ]),
  fileName: z.string().trim().min(1).max(255),
  contentType: z.string().trim().min(1),
  sizeBytes: z.number().int().positive(),
  storagePath: z.string().trim().min(1).optional(),
});

export type AttachDocumentDto = z.infer<typeof attachDocumentSchema>;
