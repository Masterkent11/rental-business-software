import { z } from 'zod';

export const referralCodeSchema = z
  .string()
  .regex(/^[A-Za-z0-9]{10}$/, 'That referral link is not valid')
  .transform((value) => value.toUpperCase())
  .nullable()
  .default(null);
