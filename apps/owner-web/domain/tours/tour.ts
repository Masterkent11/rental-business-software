export type TourProvider = "PLATFORM" | "MATTERPORT";
export type TourState = "DRAFT" | "PROCESSING" | "READY" | "PUBLISHED" | "UNPUBLISHED" | "FAILED";
export type SceneState = "UPLOADING" | "PROCESSING" | "READY" | "FAILED";

export interface TourHotspot {
  readonly id: string;
  readonly kind: "NAVIGATION" | "INFO";
  readonly yaw: number;
  readonly pitch: number;
  readonly label: string;
  readonly targetSceneId: string | null;
}

export interface TourScene {
  readonly id: string;
  readonly label: string;
  readonly position: number;
  readonly state: SceneState;
  readonly failureReason: string | null;
  readonly initialYaw: number;
  readonly initialPitch: number;
  readonly initialFov: number;
  readonly sourceUrl: string | null;
  readonly previewUrl: string | null;
  readonly thumbnailUrl: string | null;
  readonly hotspots: readonly TourHotspot[];
}

export interface StudioTour {
  readonly id: string;
  readonly resourceId: string;
  readonly state: TourState;
  readonly provider: TourProvider;
  readonly externalModelId: string | null;
  readonly embedUrl: string | null;
  readonly entrySceneId: string | null;
  readonly scenes: readonly TourScene[];
  readonly publishable: boolean;
  readonly problems: string | null;
}

export interface TourOverview {
  readonly tourId: string | null;
  readonly listingId: string;
  readonly listingTitle: string;
  readonly listingIntent: "RENT" | "SALE";
  readonly listingState: string;
  readonly listingPhoto: string | null;
  readonly provider: TourProvider;
  readonly state: TourState | "NONE";
  readonly sceneCount: number;
  readonly thumbnailUrl: string | null;
}

export const TOUR_STATE_LABEL: Record<TourState | "NONE", string> = {
  NONE: "No tour yet",
  DRAFT: "Draft",
  PROCESSING: "Processing",
  READY: "Ready to publish",
  PUBLISHED: "Published",
  UNPUBLISHED: "Unpublished",
  FAILED: "Needs attention",
};

export const MAX_PANORAMA_BYTES = 30 * 1024 * 1024;

export function panoramaProblem(file: { type: string; size: number }): string | null {
  if (!["image/jpeg", "image/png"].includes(file.type)) return "Upload a JPEG or PNG 360° photo.";
  if (file.size > MAX_PANORAMA_BYTES) return "360° photos must be smaller than 30 MB.";
  return null;
}

export function panoramaShapeProblem(width: number, height: number): string | null {
  if (width <= 0 || height <= 0) return "We could not read that image.";
  const ratio = width / height;
  if (Math.abs(ratio - 2) > 0.04) return "A 360° photo is twice as wide as it is tall. This looks like a regular photo.";
  if (width < 2048) return "This photo is too small to look sharp. Use one at least 2048 pixels wide.";
  return null;
}

export const normaliseYaw = (degrees: number) => {
  const wrapped = ((((degrees + 180) % 360) + 360) % 360) - 180;
  return wrapped === -180 ? 180 : wrapped;
};

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function directionFromScreen(input: {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly yaw: number;
  readonly pitch: number;
  readonly fov: number;
}): { yaw: number; pitch: number } {
  const toRad = Math.PI / 180;
  const aspect = input.width / input.height;
  const tanHalf = Math.tan((input.fov * toRad) / 2);
  const nx = ((input.x / input.width) * 2 - 1) * tanHalf * aspect;
  const ny = (1 - (input.y / input.height) * 2) * tanHalf;
  const yaw = input.yaw * toRad;
  const pitch = input.pitch * toRad;
  const forward = [Math.cos(pitch) * Math.sin(yaw), Math.sin(pitch), Math.cos(pitch) * Math.cos(yaw)];
  const right = [Math.cos(yaw), 0, -Math.sin(yaw)];
  const up = [-Math.sin(pitch) * Math.sin(yaw), Math.cos(pitch), -Math.sin(pitch) * Math.cos(yaw)];
  const dir = [0, 1, 2].map((i) => forward[i]! + nx * right[i]! + ny * up[i]!);
  const length = Math.hypot(dir[0]!, dir[1]!, dir[2]!);
  const [x, y, z] = dir.map((v) => v / length) as [number, number, number];
  return {
    yaw: normaliseYaw(Math.atan2(x, z) / toRad),
    pitch: clamp(Math.asin(y) / toRad, -89, 89),
  };
}

export function screenFromDirection(input: {
  readonly yaw: number;
  readonly pitch: number;
  readonly viewYaw: number;
  readonly viewPitch: number;
  readonly fov: number;
  readonly width: number;
  readonly height: number;
}): { x: number; y: number } | null {
  const toRad = Math.PI / 180;
  const point = [
    Math.cos(input.pitch * toRad) * Math.sin(input.yaw * toRad),
    Math.sin(input.pitch * toRad),
    Math.cos(input.pitch * toRad) * Math.cos(input.yaw * toRad),
  ];
  const yaw = input.viewYaw * toRad;
  const pitch = input.viewPitch * toRad;
  const forward = [Math.cos(pitch) * Math.sin(yaw), Math.sin(pitch), Math.cos(pitch) * Math.cos(yaw)];
  const right = [Math.cos(yaw), 0, -Math.sin(yaw)];
  const up = [-Math.sin(pitch) * Math.sin(yaw), Math.cos(pitch), -Math.sin(pitch) * Math.cos(yaw)];
  const dot = (a: number[], b: number[]) => a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;
  const depth = dot(point, forward);
  if (depth <= 0.05) return null;
  const tanHalf = Math.tan((input.fov * toRad) / 2);
  const aspect = input.width / input.height;
  const nx = dot(point, right) / depth / (tanHalf * aspect);
  const ny = dot(point, up) / depth / tanHalf;
  if (Math.abs(nx) > 1.1 || Math.abs(ny) > 1.1) return null;
  return { x: ((nx + 1) / 2) * input.width, y: ((1 - ny) / 2) * input.height };
}

export function parseMatterportInput(raw: string): string | null {
  const value = raw.trim();
  if (/^[A-Za-z0-9]{8,24}$/.test(value)) return value;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "my.matterport.com" || url.pathname !== "/show/") return null;
    const model = url.searchParams.get("m") ?? "";
    return /^[A-Za-z0-9]{8,24}$/.test(model) ? model : null;
  } catch {
    return null;
  }
}
