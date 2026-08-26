import sharp from 'sharp';
import { beforeAll, describe, expect, it } from 'vitest';
import { sharpPanoramaProcessor } from '../sharp-panorama-processor.ts';
import { NotAPanoramaError } from '../../../application/ports/panorama-processor.ts';

/**
 * A synthetic equirectangular panorama.
 *
 * Generated rather than checked in: it needs to be a real image with real
 * pixels for sharp to tile, and a procedural one keeps the repository free of
 * binary fixtures. Sky above, floor below, and four coloured walls, so a viewer
 * rendering it wrongly is obvious rather than subtle.
 */
async function panorama(width = 4096): Promise<Buffer> {
  const height = width / 2;
  const bands = 4;
  const bandWidth = Math.floor(width / bands);
  const colours = ['#c94f3d', '#3d7cc9', '#3dc98a', '#c9a13d'];

  const walls = Array.from({ length: bands }, (_, i) =>
    `<rect x="${i * bandWidth}" y="${height * 0.25}" width="${bandWidth}" ` +
    `height="${height * 0.5}" fill="${colours[i]}"/>`,
  ).join('');

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <rect width="${width}" height="${height * 0.25}" fill="#9fc7e8"/>
      ${walls}
      <rect y="${height * 0.75}" width="${width}" height="${height * 0.25}" fill="#6b5b4a"/>
    </svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

const processor = sharpPanoramaProcessor();

describe('processing a panorama', () => {
  let result: Awaited<ReturnType<typeof processor.process>>;

  beforeAll(async () => {
    result = await processor.process(await panorama());
  }, 60_000);

  it('produces a preview small enough to arrive first', () => {
    // The whole pipeline exists so something recognisable is on screen while
    // the tiles are still coming. A preview measured in hundreds of kilobytes
    // would defeat that on Philippine mobile data.
    expect(result.preview.byteLength).toBeLessThan(60 * 1024);
    expect(result.preview.byteLength).toBeGreaterThan(0);
  });

  it('produces a thumbnail for the scene selector', () => {
    expect(result.thumbnail.byteLength).toBeLessThan(40 * 1024);
  });

  it('builds a pyramid, coarsest first', () => {
    // Level 0 must be usable on its own: it is what a slow connection gets.
    expect(result.levels).toBeGreaterThanOrEqual(3);
    expect(result.tiles.some((t) => t.level === 0)).toBe(true);
    expect(result.tiles.some((t) => t.level === result.levels - 1)).toBe(true);
  });

  it('tiles every level completely', () => {
    // A missing tile is a hole in the room. Level 0 is 1024×512 at 512px
    // tiles: two across, one down.
    const levelZero = result.tiles.filter((t) => t.level === 0);
    expect(levelZero).toHaveLength(2);

    const levelOne = result.tiles.filter((t) => t.level === 1);
    expect(levelOne).toHaveLength(8);
  });

  it('keeps the source dimensions for reprocessing later', () => {
    // Tiles are derived, so a better encoding later is a job rather than a
    // re-shoot — the property ADR-0009 bought by keeping the original.
    expect(result.widthPx).toBe(4096);
    expect(result.heightPx).toBe(2048);
  });

  it('encodes tiles as webp', async () => {
    const meta = await sharp(result.tiles[0]!.body).metadata();
    expect(meta.format).toBe('webp');
  });
});

describe('refusing what is not a panorama', () => {
  it('refuses an ordinary phone photo', async () => {
    // The failure this prevents: a holiday snap tiled into a tour and wrapped
    // around a sphere, shown to a customer as a room.
    const photo = await sharp({
      create: {
        width: 1920,
        height: 1080,
        channels: 3,
        background: '#888888',
      },
    })
      .png()
      .toBuffer();

    await expect(processor.process(photo)).rejects.toBeInstanceOf(
      NotAPanoramaError,
    );
  });

  it('says what to upload instead, not what the ratio was', async () => {
    const photo = await sharp({
      create: { width: 1920, height: 1080, channels: 3, background: '#888' },
    })
      .png()
      .toBuffer();

    await expect(processor.process(photo)).rejects.toThrow(
      /twice as wide as it is tall/,
    );
  });

  it('refuses a panorama too small to look sharp', async () => {
    await expect(processor.process(await panorama(1024))).rejects.toThrow(
      /too small/,
    );
  });

  it('refuses a file that is not an image', async () => {
    await expect(
      processor.process(Buffer.from('this is not an image')),
    ).rejects.toBeInstanceOf(NotAPanoramaError);
  });
});
