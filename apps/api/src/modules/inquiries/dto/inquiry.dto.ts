import { z } from 'zod';
import { referralCodeSchema } from '@/modules/assignment/dto/referral.dto.ts';

export const submitInquirySchema = z.object({
  message: z.string().max(2000),
  questions: z.array(z.string().max(120)).max(8).default([]),
  buyerBudgetCentavos: z.number().int().positive().max(10_000_000_000_00).nullable().default(null),
  clientRef: z.guid(),
  referralCode: referralCodeSchema,
});

export const inquiryFiltersSchema = z.object({
  status: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'VIEWING_SCHEDULED', 'NEGOTIATING', 'CLOSED', 'LOST']).optional(),
  listingId: z.guid().optional(),
});

export const inquiryStatusSchema = z.object({
  status: z.enum(['CONTACTED', 'QUALIFIED', 'VIEWING_SCHEDULED', 'NEGOTIATING', 'CLOSED', 'LOST']),
  lostReason: z.string().trim().max(500).nullable().default(null),
});
