/**
 * A distinguishable equirectangular room, for demo tours.
 *   node scripts/make-room.mjs <hue 0-360> <label>
 */
import sharp from 'sharp';

const hue = Number(process.argv[2] ?? 200);
const label = process.argv[3] ?? 'Room';
const width = 4096;
const height = width / 2;
const bands = 8;
const bw = Math.floor(width / bands);

const wall = (i) => `hsl(${(hue + i * 9) % 360} 42% ${38 + (i % 2) * 8}%)`;
const panels = Array.from({ length: bands }, (_, i) =>
  `<rect x="${i * bw}" y="${height * 0.3}" width="${bw - 6}" height="${height * 0.4}" fill="${wall(i)}"/>` +
  `<text x="${i * bw + bw / 2}" y="${height * 0.53}" font-size="${height * 0.07}" fill="#ffffffcc" text-anchor="middle" font-family="sans-serif">${label} ${i + 1}</text>`,
).join('');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <rect width="${width}" height="${height * 0.3}" fill="hsl(${hue} 25% 82%)"/>
  ${panels}
  <rect y="${height * 0.7}" width="${width}" height="${height * 0.3}" fill="hsl(${hue} 18% 26%)"/>
</svg>`;

const noise = await sharp({
  create: { width, height, channels: 3, noise: { type: 'gaussian', mean: 128, sigma: 18 } },
}).png().toBuffer();

const jpeg = await sharp(Buffer.from(svg))
  .composite([{ input: noise, blend: 'overlay' }])
  .jpeg({ quality: 86 })
  .toBuffer();

process.stdout.write(jpeg.toString('base64'));
