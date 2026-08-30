import { z } from 'zod';

const ISO_DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

export const issueInvoiceSchema = z.object({
  occupancyId: z.guid(),
  periodStart: ISO_DATE,
  periodEnd: ISO_DATE,
  dueOn: ISO_DATE,
  lines: z
    .array(
      z.object({
        kind: z.enum(['RENT', 'ADVANCE', 'DEPOSIT', 'UTILITY', 'PENALTY', 'OTHER']),
        description: z.string().min(1).max(200),
        amountCentavos: z.number().int().nonnegative(),
      }),
    )
    .min(1, 'An invoice needs at least one line'),
});

export type IssueInvoiceDto = z.infer<typeof issueInvoiceSchema>;
