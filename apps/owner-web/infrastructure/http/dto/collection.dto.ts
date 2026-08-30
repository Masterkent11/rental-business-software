/**
 * Boundary Zod DTO: Collection & Payments
 */

import { z } from "zod";

export const PaymentOriginDtoSchema = z.enum(["ONLINE", "OFFLINE_RECORDED"]);

export const ArrearsRecordDtoSchema = z.object({
  tenantId: z.string().nullable().default(null),
  tenantName: z.string().default("Unknown Tenant"),
  occupancyId: z.string(),
  resourceLabel: z.string().default("Unit"),
  owedCentavos: z.number().int().nonnegative().default(0),
  oldestDueOn: z.string().default(""),
  daysOverdue: z.number().int().nonnegative().default(0),
  invoiceCount: z.number().int().nonnegative().default(0),
});
export type ArrearsRecordDto = z.infer<typeof ArrearsRecordDtoSchema>;

export const RecentPaymentDtoSchema = z.object({
  id: z.string(),
  tenantName: z.string().default("Unknown Tenant"),
  resourceLabel: z.string().default("Unit"),
  amountCentavos: z.number().int().positive(),
  origin: PaymentOriginDtoSchema.default("ONLINE"),
  reference: z.string().nullable().default(null),
  recordedBy: z.string().nullable().default(null),
  receivedAt: z.string().nullable().default(null),
  recordedAt: z.string().default(""),
});
export type RecentPaymentDto = z.infer<typeof RecentPaymentDtoSchema>;

export const CollectionDtoSchema = z.object({
  month: z.string(),
  claimedCentavos: z.number().int().nonnegative().default(0),
  receivedCentavos: z.number().int().nonnegative().default(0),
  outstandingCentavos: z.number().int().nonnegative().default(0),
  offlineSharePercent: z.number().nonnegative().default(0),
  history: z
    .array(
      z.object({
        month: z.string(),
        claimedCentavos: z.number().default(0),
        receivedCentavos: z.number().default(0),
      }),
    )
    .default([]),
  arrears: z.array(ArrearsRecordDtoSchema).default([]),
  recentPayments: z.array(RecentPaymentDtoSchema).default([]),
});
export type CollectionDto = z.infer<typeof CollectionDtoSchema>;
