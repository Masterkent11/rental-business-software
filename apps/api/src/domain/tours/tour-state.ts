export type SceneState = 'UPLOADING' | 'PROCESSING' | 'READY' | 'FAILED';

export type HotspotKind = 'NAVIGATION' | 'INFO';

export type TourState =
  | 'DRAFT'
  | 'PROCESSING'
  | 'READY'
  | 'PUBLISHED'
  | 'UNPUBLISHED'
  | 'FAILED';

export interface Hotspot {
  readonly id: string;
  readonly kind: HotspotKind;
  /** Degrees on the sphere. Yaw wraps at ±180; pitch is clamped at ±90. */
  readonly yaw: number;
  readonly pitch: number;
  readonly label: string;
  /** Set for NAVIGATION, null for INFO. */
  readonly targetSceneId: string | null;
}

export interface Scene {
  readonly id: string;
  readonly label: string;
  readonly position: number;
  readonly state: SceneState;
  readonly failureReason: string | null;
  /** Kilobyte-sized, shown immediately while tiles stream in. */
  readonly previewPath: string | null;
  readonly thumbnailPath: string | null;
  readonly tilePrefix: string | null;
  readonly tileLevels: number;
  readonly hotspots: readonly Hotspot[];
}
