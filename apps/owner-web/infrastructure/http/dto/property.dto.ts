/**
 * Boundary Zod DTO: Properties & Resources
 */

import { z } from "zod";

export const CreatePropertyInputDtoSchema = z.object({
  name: z.string().trim().min(2, "Property name must be at least 2 characters").max(100),
  areaLabel: z.string().trim().min(2, "Area/Barangay label is required"),
  cityLabel: z.string().trim().default("Cebu City"),
  unitCount: z.coerce.number().int().positive("Unit count must be at least 1"),
  baseRentCentavos: z.coerce.number().int().positive("Base rent must be greater than zero"),
  photoUrl: z.string().url().optional(),
});
export type CreatePropertyInputDto = z.infer<typeof CreatePropertyInputDtoSchema>;

export const PropertyResponseDtoSchema = z.object({
  id: z.string(),
  organization_id: z.string().optional(),
  organizationId: z.string().optional(),
  name: z.string(),
  area_label: z.string().optional(),
  areaLabel: z.string().optional(),
  city_label: z.string().optional(),
  cityLabel: z.string().optional(),
  photo: z.string().optional(),
  resourceCount: z.number().default(0),
  occupied: z.number().default(0),
  reserved: z.number().default(0),
  vacant: z.number().default(0),
  monthlyPotentialCentavos: z.number().default(0),
  monthlyContractedCentavos: z.number().default(0),
});
export type PropertyResponseDto = z.infer<typeof PropertyResponseDtoSchema>;
