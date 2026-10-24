import { z } from 'zod';

export const tenantMaintenanceSchema = z.object({ description: z.string().trim().min(10).max(1500), clientId: z.guid() }).strict();
