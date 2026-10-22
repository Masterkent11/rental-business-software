# Owner insights graph assets

Four graph styles are included: occupancy rate (blue), total bookings (green), total earnings (violet), and property views (blue).

- `svg/`: transparent standalone curves with the area fill, plus line-only variants.
- `png/`: transparent 576 × 320 exports of each curve variant.
- `cards/svg/`: editable full sample insight cards, including labels, values, arrows and graphs.
- `cards/png/`: 960 × 336 sample card previews.
- `paths.json`: editable Bézier path definitions and colors.

The curves were recreated to resemble the screenshot. No numeric time-series data was present in the supplied image, so these are visual design assets. Full card values are samples from the mockup. For live analytics, draw the same visual style using actual API data.

SVGs contain native vector paths and gradient fills, not embedded raster images. Use `preserveAspectRatio` to retain the intended shape. Default curve viewBox is `0 0 144 80`. Change the path stroke and gradient stop colors together when theming. Each standalone SVG can be used directly in a web image element or your existing Flutter SVG renderer.
