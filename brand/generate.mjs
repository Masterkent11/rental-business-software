import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { adaptiveForegroundSvg, appIconSvg, monochromeSvg, smallIconSvg, wordmarkSvg } from './mark.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const require = createRequire(path.join(root, 'apps/api/package.json'));
const sharp = require('sharp');

const write = (file, data) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, data);
};

const png = (svg, size) => sharp(Buffer.from(svg), { density: 384 }).resize(size, size).png().toBuffer();

function ico(pngBuffers) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngBuffers.length, 4);
  const entries = [];
  let offset = 6 + 16 * pngBuffers.length;
  for (const { size, data } of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    entries.push(entry);
  }
  return Buffer.concat([header, ...entries, ...pngBuffers.map((p) => p.data)]);
}

const square = appIconSvg({ rounded: false });
const small = smallIconSvg({ rounded: true });
const smallSquare = smallIconSvg({ rounded: false });

write(path.join(here, 'app-icon.svg'), appIconSvg({ rounded: true }));
write(path.join(here, 'app-icon-square.svg'), square);
write(path.join(here, 'mark-small.svg'), small);
write(path.join(here, 'mark-monochrome.svg'), monochromeSvg('#111318'));
write(path.join(here, 'mark-monochrome-light.svg'), monochromeSvg('#FAF7F2'));
write(path.join(here, 'adaptive-foreground.svg'), adaptiveForegroundSvg());
write(path.join(here, 'wordmark.svg'), wordmarkSvg('#111318'));
write(path.join(here, 'wordmark-light.svg'), wordmarkSvg('#FAF7F2'));

const iosDir = path.join(root, 'apps/customer_app/ios/Runner/Assets.xcassets/AppIcon.appiconset');
const iosSizes = {
  'Icon-App-20x20@1x.png': 20, 'Icon-App-20x20@2x.png': 40, 'Icon-App-20x20@3x.png': 60,
  'Icon-App-29x29@1x.png': 29, 'Icon-App-29x29@2x.png': 58, 'Icon-App-29x29@3x.png': 87,
  'Icon-App-40x40@1x.png': 40, 'Icon-App-40x40@2x.png': 80, 'Icon-App-40x40@3x.png': 120,
  'Icon-App-60x60@2x.png': 120, 'Icon-App-60x60@3x.png': 180,
  'Icon-App-76x76@1x.png': 76, 'Icon-App-76x76@2x.png': 152, 'Icon-App-83.5x83.5@2x.png': 167,
  'Icon-App-1024x1024@1x.png': 1024,
};
for (const [file, size] of Object.entries(iosSizes)) {
  const source = size <= 40 ? smallSquare : square;
  const buffer = await sharp(Buffer.from(source), { density: 384 }).resize(size, size).flatten({ background: '#0A0F1D' }).png().toBuffer();
  write(path.join(iosDir, file), buffer);
}

const androidRes = path.join(root, 'apps/customer_app/android/app/src/main/res');
const densities = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
for (const [density, scale] of Object.entries(densities)) {
  const legacy = Math.round(48 * scale);
  write(path.join(androidRes, `mipmap-${density}/ic_launcher.png`), await png(small, legacy));
  write(path.join(androidRes, `mipmap-${density}/ic_launcher_round.png`), await png(small.replace('rx="220"', 'rx="512"'), legacy));
  const adaptive = Math.round(108 * scale);
  write(path.join(androidRes, `mipmap-${density}/ic_launcher_foreground.png`), await png(adaptiveForegroundSvg(), adaptive));
  write(path.join(androidRes, `mipmap-${density}/ic_launcher_monochrome.png`), await png(adaptiveForegroundSvg().replaceAll('#FFF7EB', '#FFFFFF').replaceAll('#FAF7F2', '#FFFFFF'), adaptive));
}
write(path.join(androidRes, 'mipmap-anydpi-v26/ic_launcher.xml'), `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
    <monochrome android:drawable="@mipmap/ic_launcher_monochrome"/>
</adaptive-icon>
`);
write(path.join(androidRes, 'mipmap-anydpi-v26/ic_launcher_round.xml'), `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
    <monochrome android:drawable="@mipmap/ic_launcher_monochrome"/>
</adaptive-icon>
`);
write(path.join(androidRes, 'values/ic_launcher_background.xml'), `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#111A2C</color>
</resources>
`);

const webApp = path.join(root, 'apps/owner-web/app');
write(path.join(webApp, 'icon.svg'), small);
write(path.join(webApp, 'apple-icon.png'), await sharp(Buffer.from(square), { density: 384 }).resize(180, 180).png().toBuffer());
write(
  path.join(webApp, 'favicon.ico'),
  ico([
    { size: 16, data: await png(small, 16) },
    { size: 32, data: await png(small, 32) },
    { size: 48, data: await png(small, 48) },
  ]),
);
write(path.join(root, 'apps/owner-web/public/brand/mark.svg'), small);
write(path.join(root, 'apps/owner-web/public/brand/mark-monochrome.svg'), monochromeSvg('#111318'));
write(path.join(root, 'apps/owner-web/public/brand/mark-monochrome-light.svg'), monochromeSvg('#FAF7F2'));
write(path.join(root, 'apps/owner-web/public/brand/icon-512.png'), await png(square, 512));
write(path.join(root, 'apps/owner-web/public/brand/icon-192.png'), await png(square, 192));

write(path.join(root, 'apps/customer_app/assets/brand/mark.png'), await png(small, 256));
write(path.join(here, 'preview.png'), await sharp({ create: { width: 980, height: 260, channels: 4, background: '#F4F3F1' } })
  .composite([
    { input: await png(appIconSvg({ rounded: true }), 220), left: 20, top: 20 },
    { input: await png(small, 128), left: 270, top: 66 },
    { input: await png(small, 64), left: 430, top: 98 },
    { input: await png(small, 32), left: 520, top: 114 },
    { input: await png(small, 16), left: 580, top: 122 },
    { input: await sharp(Buffer.from(monochromeSvg('#111318')), { density: 384 }).resize(96, 96).png().toBuffer(), left: 630, top: 82 },
    { input: await sharp(Buffer.from(adaptiveForegroundSvg()), { density: 384 }).resize(220, 220).flatten({ background: '#111A2C' }).png().toBuffer(), left: 750, top: 20 },
  ])
  .png()
  .toBuffer());
console.log('Brand assets generated.');
