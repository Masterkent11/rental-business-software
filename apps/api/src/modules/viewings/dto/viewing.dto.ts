import { z } from 'zod';
import { referralCodeSchema } from '@/modules/assignment/dto/referral.dto.ts';

const NOTE_MAX = 300;
const preferredDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a valid date');
const preferredTimeWindow = z.enum(['MORNING', 'AFTERNOON', 'EVENING']);

export const requestViewingSchema = z.object({
  preferredDate,
  preferredTimeWindow,
  note: z.string().max(NOTE_MAX).nullable().default(null),
  idempotencyKey: z.guid(),
  referralCode: referralCodeSchema,
});

export const customerViewingActionSchema = z
  .object({
    action: z.enum(['CANCEL', 'RESCHEDULE', 'ACCEPT_SUGGESTION']),
    preferredDate: preferredDate.nullable().default(null),
    preferredTimeWindow: preferredTimeWindow.nullable().default(null),
    note: z.string().max(NOTE_MAX).nullable().default(null),
  })
  .refine((v) => v.action !== 'RESCHEDULE' || (v.preferredDate !== null && v.preferredTimeWindow !== null), {
    message: 'Choose a new date and time',
  });

export const partnerViewingActionSchema = z
  .object({
    action: z.enum(['CONFIRM', 'REQUEST_RESCHEDULE', 'DECLINE', 'CANCEL', 'COMPLETE']),
    scheduledAt: z.iso.datetime({ offset: true }).nullable().default(null),
    note: z.string().max(1000).nullable().default(null),
  })
  .refine((v) => v.action !== 'CONFIRM' || v.scheduledAt !== null, { message: 'Choose the exact viewing time' });

export const viewingRangeSchema = z.object({
  from: z.iso.datetime({ offset: true }).optional(),
  to: z.iso.datetime({ offset: true }).optional(),
});
