# Westayplace — Role Selection Screen / Extracted Assets

Source: original **unmarked** 1585×992 Westayplace mockup, not the red-annotated preview.

## Recommended assets
- `svg/property-owner.svg` — true editable SVG vector-traced from the actual owner icon in screenshot.
- `svg/property-agent.svg` — true editable SVG vector-traced from the actual agent/briefcase icon.
- `svg/*-with-tile.svg` — same vectors on pale role-icon tiles.
- `background/panel-pixel-exact-593x992.png` — exact crop of the left panel **with** original flattened logo and marketing copy; pixel identical to the screenshot at 593×992.
- `background/photo-only-reconstructed-593x992.png` — background photo cleaned of much of the logo/text and indicators using inpainting; inpainted areas **cannot** be guaranteed visually identical to pixels that were hidden in the source.
- `background/panel-exact-raster-in-svg.svg` — the exact crop in SVG image container. Its contents are **embedded PNG** and not editable vector photography.
- `background/photo-only-raster-in-svg.svg` — inpainted background in SVG container, also embedded raster.
- `reference/original-screen-1585x992.png` — original **unmarked** complete reference image.
- `reference/*-raster-extraction.png` — transparent antialiased pixel-based references.
- `reference/*-pixel-exact-crop.png` — completely untouched original screenshot crops of each marked icon, including pale background. They preserve every source pixel.
- `preview/screen-and-svg-comparison.png` — source and vector artwork comparison.
- `asset-manifest.json` — exact pixel positions and file details.

Additional standalone SVG assets: `westayplace-mark-white.svg`, `radio-selected.svg`, `radio-unselected.svg`, and `continue-arrow.svg`.

## Accuracy statement
**Pixel-exact**: complete unmarked reference screenshot and `panel-pixel-exact` crop.
**Editable traced vectors**: icons match the reference geometry closely but no original SVG source exists in the provided flattened raster screenshot.
**Reconstructed / not guaranteed exact**: hidden photo background behind flattened logo/text.

Do not set the complete panel screenshot as a background and also overlay duplicate marketing copy / logo. If you need independent text and layout, use the reconstructed clean version and separate HTML. The source photo without text has not been provided.
