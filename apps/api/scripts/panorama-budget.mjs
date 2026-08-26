/**
 * What a tour actually costs to open.
 *
 * Story 6.4 is a gate, not a metric: a tour that does not load on a mid-range
 * phone over mobile data makes the differentiator decorative. This prints the
 * byte budget so the claim is measured rather than asserted.
 *
 *   node scripts/panorama-budget.mjs
 */
import sharp from 'sharp';
import { sharpPanoramaProcessor } from '../src/infrastructure/media/sharp-panorama-processor.ts';

const width = 4096;
const height = width / 2;
const bands = 4;
const bandWidth = Math.floor(width / bands);
const colours = ['#c94f3d', '#3d7cc9', '#3dc98a', '#c9a13d'];
const walls = Array.from({ length: bands }, (_, i) =>
  `<rect x="${i * bandWidth}" y="${height * 0.25}" width="${bandWidth}" height="${height * 0.5}" fill="${colours[i]}"/>`,
).join('');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="${width}" height="${height * 0.25}" fill="#9fc7e8"/>${walls}<rect y="${height * 0.75}" width="${width}" height="${height * 0.25}" fill="#6b5b4a"/></svg>`;

/**
 * Flat colour compresses unrealistically well, so the bare SVG would flatter
 * the pipeline: a real photographic panorama is mostly fine detail. Noise is
 * composited over it to get a byte budget in the right order of magnitude.
 */
const noise = await sharp({
  create: {
    width,
    height,
    channels: 3,
    noise: { type: 'gaussian', mean: 128, sigma: 42 },
  },
})
  .png()
  .toBuffer();

const source = await sharp(Buffer.from(svg))
  .composite([{ input: noise, blend: 'overlay' }])
  .jpeg({ quality: 90 })
  .toBuffer();

const started = Date.now();
const out = await sharpPanoramaProcessor().process(source);
const elapsed = ((Date.now() - started) / 1000).toFixed(1);

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
const perLevel = {};
for (const tile of out.tiles) {
  perLevel[tile.level] = (perLevel[tile.level] ?? 0) + tile.body.byteLength;
}

console.log(`  source            ${kb(source.byteLength)}`);
console.log(`  preview           ${kb(out.preview.byteLength)}   <- first paint`);
console.log(`  thumbnail         ${kb(out.thumbnail.byteLength)}`);
for (const [level, bytes] of Object.entries(perLevel)) {
  const count = out.tiles.filter((t) => t.level === Number(level)).length;
  console.log(`  level ${level} tiles      ${kb(bytes)}   (${count} tiles)`);
}
console.log(`  processed in      ${elapsed}s`);

// A 3G-ish floor: what the customer waits for before seeing anything.
const kbps = 400;
const firstPaint = (out.preview.byteLength / 1024 / (kbps / 8)).toFixed(2);
console.log(`\n  first paint over ${kbps} kbps: ${firstPaint}s`);
