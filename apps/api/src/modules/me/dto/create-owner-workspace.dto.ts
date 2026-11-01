import { z } from "zod";

export const createOwnerWorkspaceSchema = z
  .object({
    workspaceName: z.string().trim().min(2).max(80),
  })
  .strict();
