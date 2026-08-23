/** A real 2:1 equirectangular JPEG on stdout as base64, for end-to-end runs. */
import sharp from 'sharp';

const width = 4096;
const height = width / 2;
const bands = 6;
const bandWidth = Math.floor(width / bands);
const colours = ['#b4553f', '#3f6fb4', '#3fb47e', '#b4a13f', '#8a3fb4', '#3fb4ad'];
const walls = Array.from({ length: bands }, (_, i) =>
  `<rect x="${i * bandWidth}" y="${height * 0.28}" width="${bandWidth}" height="${height * 0.44}" fill="${colours[i]}"/>` +
  `<text x="${i * bandWidth + bandWidth / 2}" y="${height * 0.5}" font-size="${height * 0.09}" fill="#fff" text-anchor="middle">${i + 1}</text>`,
).join('');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <rect width="${width}" height="${height * 0.28}" fill="#9fc7e8"/>
  ${walls}
  <rect y="${height * 0.72}" width="${width}" height="${height * 0.28}" fill="#6b5b4a"/>
</svg>`;

const noise = await sharp({
  create: { width, height, channels: 3, noise: { type: 'gaussian', mean: 128, sigma: 26 } },
}).png().toBuffer();

const jpeg = await sharp(Buffer.from(svg))
  .composite([{ input: noise, blend: 'overlay' }])
  .jpeg({ quality: 88 })
  .toBuffer();

process.stdout.write(jpeg.toString('base64'));
