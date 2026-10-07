const CREAM = '#FAF7F2';

function houseDetailed(cx, cy, s, stroke) {
  const p = (x, y) => `${(cx + x * s).toFixed(1)} ${(cy + y * s).toFixed(1)}`;
  const win = (x, y) =>
    `<rect x="${(cx + x * s).toFixed(1)}" y="${(cy + y * s).toFixed(1)}" width="${(3.6 * s).toFixed(1)}" height="${(3.6 * s).toFixed(1)}" rx="${(0.8 * s).toFixed(1)}" fill="${CREAM}"/>`;
  return `
    <g fill="none" stroke="${CREAM}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">
      <path d="M ${p(-21, 0)} L ${p(0, -15)} L ${p(21, 0)}"/>
      <path d="M ${p(8.5, -9.5)} L ${p(8.5, -14.5)} L ${p(12.5, -14.5)} L ${p(12.5, -6.5)}"/>
      <path d="M ${p(-15, 0)} L ${p(-15, 19)} L ${p(15, 19)} L ${p(15, 0)}"/>
    </g>
    ${win(-8.5, 4.5)}${win(5, 4.5)}${win(-8.5, 11.5)}${win(5, 11.5)}`;
}

function houseSimple(cx, cy, s, stroke) {
  const p = (x, y) => `${(cx + x * s).toFixed(1)} ${(cy + y * s).toFixed(1)}`;
  return `
    <g fill="none" stroke="${CREAM}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">
      <path d="M ${p(-21, 1)} L ${p(0, -15)} L ${p(21, 1)}"/>
      <path d="M ${p(-15, -2)} L ${p(-15, 19)} L ${p(15, 19)} L ${p(15, -2)}"/>
    </g>
    <rect x="${(cx - 4.2 * s).toFixed(1)}" y="${(cy + 7 * s).toFixed(1)}" width="${(8.4 * s).toFixed(1)}" height="${(12 * s).toFixed(1)}" rx="${(1.4 * s).toFixed(1)}" fill="${CREAM}"/>`;
}

function orbit(cx, cy, r, trackWidth, arcWidth, dot) {
  const start = -155;
  const sweep = 120;
  const rad = (d) => (d * Math.PI) / 180;
  const x1 = cx + r * Math.cos(rad(start));
  const y1 = cy + r * Math.sin(rad(start));
  const x2 = cx + r * Math.cos(rad(start + sweep));
  const y2 = cy + r * Math.sin(rad(start + sweep));
  return `
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${CREAM}" stroke-opacity="0.24" stroke-width="${trackWidth}"/>
    <path d="M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}" fill="none" stroke="${CREAM}" stroke-opacity="0.9" stroke-width="${arcWidth}" stroke-linecap="round"/>
    <circle cx="${x2.toFixed(1)}" cy="${y2.toFixed(1)}" r="${dot * 2.1}" fill="#FFF7EB" fill-opacity="0.22"/>
    <circle cx="${x2.toFixed(1)}" cy="${y2.toFixed(1)}" r="${dot}" fill="#FFFFFF"/>`;
}

const background = (size, radius) => `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1E293B"/>
      <stop offset="0.55" stop-color="#0E1526"/>
      <stop offset="1" stop-color="#0A0F1D"/>
    </linearGradient>
    <radialGradient id="warm" cx="0.82" cy="0.9" r="0.6">
      <stop offset="0" stop-color="#33202A" stop-opacity="0.85"/>
      <stop offset="1" stop-color="#33202A" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${radius}" fill="url(#bg)"/>
  <rect width="${size}" height="${size}" rx="${radius}" fill="url(#warm)"/>`;

export function appIconSvg({ rounded = false } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  ${background(1024, rounded ? 228 : 0)}
  ${orbit(512, 512, 318, 14, 30, 30)}
  ${houseDetailed(512, 500, 7.4, 26)}
</svg>`;
}

export function smallIconSvg({ rounded = true } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 1024 1024">
  ${background(1024, rounded ? 220 : 0)}
  ${orbit(512, 512, 330, 34, 64, 62)}
  ${houseSimple(512, 492, 9.2, 76)}
</svg>`;
}

export function adaptiveForegroundSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  ${orbit(512, 512, 250, 12, 24, 24)}
  ${houseDetailed(512, 502, 5.8, 22)}
</svg>`;
}

export function monochromeSvg(color = '#111318') {
  return smallIconSvg({ rounded: false })
    .replace(/<defs>[\s\S]*?<\/defs>/, '')
    .replace(/<rect width="1024"[^>]*\/>/g, '')
    .replaceAll(CREAM, color)
    .replaceAll('#FFF7EB', color)
    .replaceAll('#FFFFFF', color);
}

export function wordmarkSvg(color = '#111318') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="48" viewBox="0 0 220 48">
  <g transform="scale(0.046875)">${monochromeSvg(color).replace(/<svg[^>]*>|<\/svg>/g, '')}</g>
  <text x="58" y="31" font-family="-apple-system, 'SF Pro Display', 'Helvetica Neue', Inter, sans-serif" font-size="21" font-weight="700" letter-spacing="-0.6" fill="${color}">Rental Platform</text>
</svg>`;
}
