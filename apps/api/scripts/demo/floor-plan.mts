export type Room = { readonly name: string; readonly x: number; readonly y: number; readonly w: number; readonly h: number };
export type Plan = { readonly label: string; readonly widthM: number; readonly depthM: number; readonly rooms: readonly Room[] };

export function floorPlanSvg(plan: Plan): string {
  const scale = 60;
  const pad = 70;
  const width = Math.round(plan.widthM * scale + pad * 2);
  const height = Math.round(plan.depthM * scale + pad * 2 + 40);
  const rooms = plan.rooms
    .map((room) => {
      const x = pad + room.x * scale;
      const y = pad + room.y * scale;
      const w = room.w * scale;
      const h = room.h * scale;
      const area = (room.w * room.h).toFixed(1);
      const fontSize = Math.max(13, Math.min(20, Math.floor(Math.min(w, h) / 5)));
      return [
        `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#FAFAF7" stroke="#1F2937" stroke-width="5"/>`,
        `<text x="${x + w / 2}" y="${y + h / 2 - 4}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="${fontSize}" font-weight="600" fill="#111827">${room.name.replace(/&/g, '&amp;').replace(/'/g, '&apos;')}</text>`,
        `<text x="${x + w / 2}" y="${y + h / 2 + fontSize}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="${fontSize - 3}" fill="#6B7280">${room.w} × ${room.h} m · ${area} m²</text>`,
      ].join('');
    })
    .join('');
  const outline = `<rect x="${pad}" y="${pad}" width="${plan.widthM * scale}" height="${plan.depthM * scale}" fill="none" stroke="#111827" stroke-width="9"/>`;
  const caption = `<text x="${pad}" y="${height - 28}" font-family="Helvetica, Arial, sans-serif" font-size="22" font-weight="700" fill="#111827">${plan.label}</text><text x="${width - pad}" y="${height - 28}" text-anchor="end" font-family="Helvetica, Arial, sans-serif" font-size="16" fill="#6B7280">${plan.widthM} m × ${plan.depthM} m · indicative, not to scale for construction</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#FFFFFF"/>${rooms}${outline}${caption}</svg>`;
}
