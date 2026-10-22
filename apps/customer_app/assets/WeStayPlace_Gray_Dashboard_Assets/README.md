# WeStayPlace Gray Dashboard Assets

The uploaded gray dashboard is the visual reference. The SVGs are newly recreated editable vectors; they are not recovered original source artwork or guaranteed pixel-exact tracings. They contain real shapes and paths, not embedded screenshot crops.

## Included

- Six illustrated dashboard metrics, SVG + transparent 512 × 512 PNG.
- 23 navigation and utility symbols, SVG + transparent 96 × 96 PNG.
- Two recreated brand variants, SVG + transparent 256 × 256 PNG. Treat these as reference reconstructions; replace with your official brand master when available.
- UI symbol sprite, palette tokens and asset manifest.
- Browser gallery and SVG/PNG overview.
- The supplied dashboard reference, unchanged.
- Image-generation illustration sheet when available, separately identified as raster artwork. This may differ from the recreated SVGs.

## Use

Keep the `assets` subfolders together when copying them into your application. Illustrated SVGs use a 96 × 96 viewBox and are intended for display around 40–64 px. UI symbols use a 24 × 24 viewBox and are intended for display around 18–24 px. PNGs have transparent backgrounds.

For web UI icons, inline the SVG to inherit CSS color. Standalone SVG files have a navy default `color` value; change it for another theme. External `<img>` SVGs do not inherit surrounding text color.

The symbol sprite can be used with `<svg viewBox="0 0 24 24"><use href="assets/icons/sprite.svg#messages"/></svg>`. Serve the files over HTTP when using external sprite references.

Flutter can render the individual SVG files with your existing SVG renderer. Add the asset folders to the application asset declarations. No runtime font, linked raster image, or external asset is required by the SVG files.

`previews/index.html` displays the entire vector collection. Photographs, avatars, chart data and the header photograph are not icon assets and are not supplied as separate source artwork.
