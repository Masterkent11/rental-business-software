/**
 * Turns an uploaded panorama into what a phone can actually stream.
 *
 * ADR-0009: **process at upload, never at view time.** The viewer downloads a
 * preview measured in kilobytes and refines as tiles arrive — that is what
 * makes a tour usable on a mid-range phone over Philippine mobile data, and
 * story 6.4 treats it as a gate rather than a metric.
 *
 * A port, because the work is CPU-bound image processing that will eventually
 * move out of the API process. Nothing above this interface knows what library
 * does it.
 */
export interface PanoramaTile {
  readonly level: number;
  readonly x: number;
  readonly y: number;
  readonly body: Buffer;
}

export interface ProcessedPanorama {
  /** Shown immediately. Kilobytes, not megabytes. */
  readonly preview: Buffer;
  readonly thumbnail: Buffer;
  readonly tiles: readonly PanoramaTile[];
  readonly levels: number;
  readonly widthPx: number;
  readonly heightPx: number;
}

/** The upload was not a panorama this pipeline can use. */
export class NotAPanoramaError extends Error {}

export interface PanoramaProcessor {
  process(source: Buffer): Promise<ProcessedPanorama>;
}

/**
 * Equirectangular panoramas are 2:1 — 360° across by 180° down.
 *
 * Checked rather than assumed: a phone photo uploaded by mistake would
 * otherwise be tiled into a tour and shown to a customer as a room, stretched
 * around a sphere.
 */
export const PANORAMA_ASPECT_RATIO = 2;
export const PANORAMA_ASPECT_TOLERANCE = 0.02;

/** Below this there is nothing to zoom into and the tour looks like a smear. */
export const MIN_PANORAMA_WIDTH = 2048;
