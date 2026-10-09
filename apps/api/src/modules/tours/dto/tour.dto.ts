import { z } from 'zod';

export const angleSchema = z.object({
  yaw: z.number().min(-360).max(360),
  pitch: z.number().min(-90).max(90),
});

export const createTourSchema = z.object({
  resourceId: z.guid(),
});

export const addSceneSchema = z.object({
  label: z.string().trim().min(1).max(80),
  panoramaBase64: z.string().min(1),
});

export const reorderScenesSchema = z.object({
  sceneIds: z.array(z.guid()).min(1),
});

export const renameSceneSchema = z.object({
  label: z.string().trim().min(1).max(80),
});

export const setEntrySceneSchema = z.object({
  sceneId: z.guid(),
});

export const addHotspotSchema = angleSchema.extend({
  kind: z.enum(['NAVIGATION', 'INFO']),
  label: z.string().trim().max(120).default(''),
  targetSceneId: z.guid().nullable().default(null),
});

export const updateHotspotSchema = angleSchema.extend({
  label: z.string().trim().max(120).default(''),
  targetSceneId: z.guid().nullable().default(null),
});

export const sceneViewSchema = z.object({
  yaw: z.number().min(-360).max(360),
  pitch: z.number().min(-85).max(85),
  fov: z.number().min(30).max(110),
});

export const tourProviderSchema = z.object({
  provider: z.enum(['PLATFORM', 'MATTERPORT']),
  matterport: z.string().trim().max(300).nullable().default(null),
});

export const tileCoordsSchema = z.object({
  sceneId: z.guid(),
  level: z.coerce.number().int().min(0).max(8),
  x: z.coerce.number().int().min(0).max(64),
  y: z.coerce.number().int().min(0).max(64),
});

export type AngleDto = z.infer<typeof angleSchema>;
export type CreateTourDto = z.infer<typeof createTourSchema>;
export type AddSceneDto = z.infer<typeof addSceneSchema>;
export type ReorderScenesDto = z.infer<typeof reorderScenesSchema>;
export type RenameSceneDto = z.infer<typeof renameSceneSchema>;
export type SetEntrySceneDto = z.infer<typeof setEntrySceneSchema>;
export type AddHotspotDto = z.infer<typeof addHotspotSchema>;
export type TileCoordsDto = z.infer<typeof tileCoordsSchema>;
