import { z } from 'zod';
export const verificationId = z.guid();
export const draftSchema = z.object({
  resourceId: z.guid(), desiredMoveIn: z.string().max(10), desiredTermMonths: z.number().int(),
  occupants: z.number().int(), message: z.string().trim().max(2000).default(''),
}).strict();
export const identityDetailsSchema = z.object({
  fullName: z.string().max(200), dateOfBirth: z.string().max(10),
  documentType: z.string().max(100), documentNumber: z.string().max(100),
}).strict();
export const frontCaptureSchema = z.object({
  ocrConfidence: z.partialRecord(z.enum(['fullName','dateOfBirth','documentType','documentNumber']), z.number().min(0).max(1)).default({}),
  extracted: identityDetailsSchema, captureId: z.guid(), imageBase64: z.string().min(1).max(11_184_812).regex(/^[A-Za-z0-9+/]+={0,2}$/),
}).strict();
export const faceCaptureSchema = z.object({
  evidenceId: z.guid(), challengeId: z.string().min(1).max(200),
  instruction: z.enum(['ALIGN','RIGHT','LEFT','UP']),
  imageBase64: frontCaptureSchema.shape.imageBase64,
}).strict();
export const consentSchema = z.object({ version: z.string().max(100), accepted: z.literal(true) }).strict();
export const resumeSchema = z.object({ draftId: z.guid() }).strict();

export const identityReviewSchema = z.object({ version: z.number().int().nonnegative(), approved: z.boolean(), validUntil: z.iso.datetime().nullable(), evidenceReviewed: z.literal(true) }).strict();
