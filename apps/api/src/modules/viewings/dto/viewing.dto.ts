import { z } from 'zod';

export const requestViewingSchema = z.object({
  scheduledAt: z.iso.datetime({ offset: true }),
  note: z.string().max(1000).nullable().default(null),
  clientRef: z.guid(),
});

export const customerViewingActionSchema = z
  .object({
    action: z.enum(['CANCEL', 'RESCHEDULE']),
    scheduledAt: z.iso.datetime({ offset: true }).nullable().default(null),
    note: z.string().max(1000).nullable().default(null),
  })
  .refine((v) => v.action !== 'RESCHEDULE' || v.scheduledAt !== null, { message: 'Choose a new viewing time' });

export const partnerViewingActionSchema = z.object({
  action: z.enum(['CONFIRM', 'REQUEST_RESCHEDULE', 'CANCEL', 'COMPLETE']),
  note: z.string().max(1000).nullable().default(null),
});

export const viewingRangeSchema = z.object({
  from: z.iso.datetime({ offset: true }).optional(),
  to: z.iso.datetime({ offset: true }).optional(),
});
