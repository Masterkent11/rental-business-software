/**
 * Boundary Zod DTO: Applications
 */

import { z } from "zod";

export const ApplicationStateDtoSchema = z.enum([
  "SUBMITTED",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "WITHDRAWN",
  "EXPIRED",
]);

export const OwnerApplicationDtoSchema = z.object({
  id: z.string(),
  reference: z.string(),
  state: ApplicationStateDtoSchema,
  listingTitle: z.string().default(""),
  propertyName: z.string().default(""),
  areaLabel: z.string().default(""),
  cityLabel: z.string().default(""),
  monthlyRentCentavos: z.number().int().nonnegative().default(0),
  desiredMoveIn: z.string().default(""),
  desiredTermMonths: z.number().int().positive().default(1),
  message: z.string().default(""),
  decisionReason: z.string().nullable().default(null),
  decidedAt: z.string().nullable().default(null),
  createdAt: z.string().default(""),
  holdExpiresAt: z.string().nullable().default(null),
  documentCount: z.number().int().nonnegative().default(0),
  reservation: z
    .object({
      state: z.string(),
      feeCentavos: z.number(),
      expiresAt: z.string().nullable(),
    })
    .nullable()
    .default(null),
});
export type OwnerApplicationDto = z.infer<typeof OwnerApplicationDtoSchema>;

export const DecisionInputDtoSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED", "UNDER_REVIEW"]),
  reason: z.string().trim().min(3, "Please provide a reason").optional(),
});
export type DecisionInputDto = z.infer<typeof DecisionInputDtoSchema>;
