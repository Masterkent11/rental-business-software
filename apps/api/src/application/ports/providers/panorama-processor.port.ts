export interface PanoramaTile {
  readonly level: number;
  readonly x: number;
  readonly y: number;
  readonly body: Buffer;
}

export interface ProcessedPanorama {
  readonly preview: Buffer;
  readonly thumbnail: Buffer;
  readonly tiles: readonly PanoramaTile[];
  readonly levels: number;
  readonly widthPx: number;
  readonly heightPx: number;
}

export class NotAPanoramaError extends Error {}

export interface PanoramaProcessor {
  process(source: Buffer): Promise<ProcessedPanorama>;
}

export const PANORAMA_ASPECT_RATIO = 2;
export const PANORAMA_ASPECT_TOLERANCE = 0.02;
export const MIN_PANORAMA_WIDTH = 2048;
