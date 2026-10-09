import sharp from 'sharp';
import {
  MIN_PANORAMA_WIDTH,
  NotAPanoramaError,
  PANORAMA_ASPECT_RATIO,
  PANORAMA_ASPECT_TOLERANCE,
  type PanoramaProcessor,
  type PanoramaTile,
  type ProcessedPanorama,
} from '@/application/ports/providers/panorama-processor.port.ts';

/** Tiles are square and small enough that one lost request costs little. */
const TILE_SIZE = 512;

/**
 * The widest level we generate.
 *
 * Beyond 4096 the returns are invisible on a phone and the storage is real.
 * Reprocessing to a bigger pyramid later is a job, not a re-shoot — which is
 * the property ADR-0009 bought by keeping the original.
 */
const MAX_WIDTH = 4096;

export function sharpPanoramaProcessor(): PanoramaProcessor {
  return {
    async process(source: Buffer): Promise<ProcessedPanorama> {
      // sharp throws its own message for anything it cannot decode. Wrapped,
      // because the owner sees this: "Input buffer contains unsupported image
      // format" tells them nothing they can act on.
      let width = 0;
      let height = 0;
      try {
        const meta = await sharp(source, {
          limitInputPixels: 400_000_000,
        }).metadata();
        width = meta.width ?? 0;
        height = meta.height ?? 0;
      } catch {
        throw new NotAPanoramaError(
          'We could not read that file. Upload a JPEG or PNG taken with a 360° camera.',
        );
      }

      if (width === 0 || height === 0) {
        throw new NotAPanoramaError(
          'We could not read that file. Upload a JPEG or PNG taken with a 360° camera.',
        );
      }

      const ratio = width / height;
      if (Math.abs(ratio - PANORAMA_ASPECT_RATIO) > PANORAMA_ASPECT_TOLERANCE) {
        // Said in the owner's terms, not the pipeline's: they need to know what
        // to upload instead, and "aspect ratio 1.78" is not that.
        throw new NotAPanoramaError(
          'A 360° photo should be twice as wide as it is tall. ' +
            'This one looks like an ordinary photo.',
        );
      }

      if (width < MIN_PANORAMA_WIDTH) {
        throw new NotAPanoramaError(
          `This photo is too small to look sharp on a phone — ` +
            `it needs to be at least ${MIN_PANORAMA_WIDTH} pixels wide.`,
        );
      }

      // The preview is the whole point of the pipeline: something recognisable
      // on screen while the tiles are still arriving.
      const preview = await sharp(source)
        .resize(512, 256, { fit: 'fill' })
        .webp({ quality: 60 })
        .toBuffer();

      const thumbnail = await sharp(source)
        .resize(320, 160, { fit: 'fill' })
        .webp({ quality: 70 })
        .toBuffer();

      // Levels double until the source runs out, capped. Level 0 is the
      // coarsest, so a viewer can start there and refine downward.
      const topWidth = Math.min(width, MAX_WIDTH);
      const widths: number[] = [];
      for (let w = 1024; w <= topWidth; w *= 2) widths.push(w);
      if (widths.length === 0) widths.push(topWidth);

      const tiles: PanoramaTile[] = [];

      for (const [level, levelWidth] of widths.entries()) {
        const levelHeight = levelWidth / 2;
        const resized = await sharp(source)
          .resize(levelWidth, levelHeight, { fit: 'fill' })
          .toBuffer();

        const columns = Math.ceil(levelWidth / TILE_SIZE);
        const rows = Math.ceil(levelHeight / TILE_SIZE);

        for (let y = 0; y < rows; y += 1) {
          for (let x = 0; x < columns; x += 1) {
            const left = x * TILE_SIZE;
            const top = y * TILE_SIZE;

            const body = await sharp(resized)
              .extract({
                left,
                top,
                // The right and bottom edges are narrower when the level is not
                // an exact multiple of the tile size.
                width: Math.min(TILE_SIZE, levelWidth - left),
                height: Math.min(TILE_SIZE, levelHeight - top),
              })
              .webp({ quality: 78 })
              .toBuffer();

            tiles.push({ level, x, y, body });
          }
        }
      }

      const archive = await sharp(source)
        .resize({ width: Math.min(width, 8192), withoutEnlargement: true })
        .jpeg({ quality: 85, mozjpeg: true })
        .toBuffer();

      return {
        archive,
        preview,
        thumbnail,
        tiles,
        levels: widths.length,
        widthPx: width,
        heightPx: height,
      };
    },
  };
}
