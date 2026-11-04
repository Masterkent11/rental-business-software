import { z } from "zod";
export const partnerSearchQuery = z.object({
  q: z.string().max(80).default(""),
}).strict();
export const partnerLogoInput = z.object({
  data: z.string().min(1).max(2796204),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
}).strict();
