import sharp from 'sharp';

export async function loadEquirect(buffer) {
  const { data, info } = await sharp(buffer).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

export async function renderView(pano, { yaw = 0, pitch = 0, fov = 80, width = 1280, height = 853 }) {
  const out = Buffer.alloc(width * height * 3);
  const f = (width / 2) / Math.tan((fov * Math.PI) / 360);
  const yawR = (yaw * Math.PI) / 180;
  const pitchR = (pitch * Math.PI) / 180;
  const cy = Math.cos(yawR);
  const sy = Math.sin(yawR);
  const cp = Math.cos(pitchR);
  const sp = Math.sin(pitchR);
  const { data, width: pw, height: ph } = pano;

  for (let j = 0; j < height; j += 1) {
    for (let i = 0; i < width; i += 1) {
      const x = i - width / 2 + 0.5;
      const y = height / 2 - j - 0.5;
      const z = f;
      const y1 = y * cp + z * sp;
      const z1 = -y * sp + z * cp;
      const x2 = x * cy + z1 * sy;
      const z2 = -x * sy + z1 * cy;
      const lon = Math.atan2(x2, z2);
      const lat = Math.atan2(y1, Math.hypot(x2, z2));
      const u = ((lon / (2 * Math.PI)) + 0.5) * pw;
      const v = (0.5 - lat / Math.PI) * ph;
      const x0 = Math.floor(u);
      const y0 = Math.min(ph - 1, Math.max(0, Math.floor(v)));
      const fx = u - x0;
      const fy = Math.min(1, Math.max(0, v - y0));
      const xa = ((x0 % pw) + pw) % pw;
      const xb = (xa + 1) % pw;
      const yb = Math.min(ph - 1, y0 + 1);
      const o = (j * width + i) * 3;
      for (let c = 0; c < 3; c += 1) {
        const p00 = data[(y0 * pw + xa) * 3 + c];
        const p10 = data[(y0 * pw + xb) * 3 + c];
        const p01 = data[(yb * pw + xa) * 3 + c];
        const p11 = data[(yb * pw + xb) * 3 + c];
        out[o + c] = Math.round(
          p00 * (1 - fx) * (1 - fy) + p10 * fx * (1 - fy) + p01 * (1 - fx) * fy + p11 * fx * fy,
        );
      }
    }
  }

  return sharp(out, { raw: { width, height, channels: 3 } })
    .modulate({ brightness: 1.04, saturation: 1.05 })
    .jpeg({ quality: 84, mozjpeg: true })
    .toBuffer();
}
