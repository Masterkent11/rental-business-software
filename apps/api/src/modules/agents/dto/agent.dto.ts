import { z } from 'zod';

const shortList = (max: number) => z.array(z.string().trim().min(1).max(60)).max(max);

export const agentProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  headline: z.string().trim().min(2).max(80).default('Real estate agent'),
  bio: z.string().trim().max(2000).default(''),
  licenseNumber: z.string().trim().max(40).nullable().default(null),
  licenseAuthority: z.string().trim().max(80).nullable().default(null),
  specialties: shortList(12).default([]),
  areasServed: shortList(20).default([]),
  languages: shortList(10).default([]),
  publicState: z.enum(['PUBLIC', 'HIDDEN']).default('PUBLIC'),
  photoUrl: z.string().trim().url().max(500).nullable().default(null),
});

export const permissionsSchema = z.object({
  canEditListing: z.boolean(),
  canManageTour: z.boolean(),
  canViewCommercial: z.boolean(),
});

export const termsSchema = z.object({
  representationType: z.enum(['EXCLUSIVE', 'NON_EXCLUSIVE', 'OWNER_DIRECT']),
  isPrimary: z.boolean(),
  acceptsLeads: z.boolean(),
  validFrom: z.iso.datetime({ offset: true }).nullable(),
  validUntil: z.iso.datetime({ offset: true }).nullable(),
});

export const inviteAgentSchema = z.object({
  agentId: z.guid(),
  permissions: permissionsSchema.partial().default({}),
  terms: termsSchema.partial().default({}),
});

export const respondSchema = z.object({
  accept: z.boolean(),
});

export const endRepresentationSchema = z.object({
  reason: z.string().trim().max(300).nullable().default(null),
});

export const agentSearchSchema = z.object({
  q: z.string().trim().max(80).optional(),
  area: z.string().trim().max(80).optional(),
});

export const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  dueAt: z.iso.datetime({ offset: true }),
  inquiryId: z.guid().nullable().default(null),
});

export const taskDoneSchema = z.object({
  done: z.boolean(),
});

export const taskListQuerySchema = z.object({
  includeDone: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((value) => value === true || value === 'true')
    .default(false),
});

export const verificationDecisionSchema = z.object({
  decision: z.enum(['VERIFY', 'REJECT', 'SUSPEND']),
  note: z.string().trim().max(500).nullable().default(null),
});
