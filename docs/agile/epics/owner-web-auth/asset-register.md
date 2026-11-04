# Asset register

## Preserved authentication references

| File | Source | Dimensions | SHA-256 |
| --- | --- | --- | --- |
| assets/auth-mobile-reference.png | ChatGPT Image Oct 31, 2026, 08_32_10 AM.png | 1448 × 1086 | f49b2b3e38f1a984fc8c92902860613ed5989cfa94ebb7f828a6a46d5394c7a9 |
| assets/auth-responsive-matrix.png | ChatGPT Image Oct 31, 2026, 08_32_24 AM.png | 1672 × 941 | 4ae69d1e7b3f7b9e6b66aef79d59c9a397f78d598482abef4f08a19c1cd5bb79 |

Copied byte-for-byte; no resizing, reconstruction or edits. The files are design references, not ready-to-use full-background photos. User confirmed on 2026-11-01 that composite mockups are the only available auth source and requested missing assets in this plan.

## Supplied role onboarding assets

Canonical application path: `apps/owner-web/public/assets/Westayplace_1to1_Role_Selection_Assets 2/`. Preserve the directory name, including its space and suffix. Its README and asset-manifest.json are provenance evidence.

| Group | Use | Limitation |
| --- | --- | --- |
| reference/original-screen-1585x992.png | Exact complete role reference | Flattened full UI, not an interactive page |
| svg/property-owner.svg, property-agent.svg and with-tile variants | Role card illustrations | Editable vector traces, not original source paths; antialiasing may differ |
| svg/westayplace-mark-white.svg | White mark candidate | Traced source; verify against auth brand silhouette |
| svg/radio-selected.svg, radio-unselected.svg, continue-arrow.svg | Role reference controls | Use actual accessible controls, not icons as interaction substitutes |
| background/panel-pixel-exact-593x992.png | Exact left-panel reference crop | Already contains logo, copy and carousel; do not overlay duplicates |
| background/photo-only-reconstructed-593x992.png | Role background candidate only if approved | Inpainted pixels cannot equal hidden original pixels |
| background/*-raster-in-svg.svg | Reference containers | Embedded raster photography, not editable vector photos |
| reference/*pixel-exact-crop.png and raster-extraction.png | Icon comparisons | Small raster references, not source artwork |

The role photo differs from the auth villa/pool view. It must not be reused to disguise missing auth photography.

## Existing UI assets and typography

`apps/owner-web/public/brand/westayplace-mark.png` is used by BrandMark as a rounded navy tile. Other icon PNGs and favicon variants exist. Dashboard header photography and SVG icons belong to that established UI; none is the auth villa source. Existing installed lucide icons can supply semantic form/back/arrow/eye affordances if geometry is reviewed. No standalone Google brand asset or original auth floating-card image was found in Owner Web public assets. Do not rasterize the whole screen to simulate working controls.

Global font stack is SF Pro Display / SF Pro Text, system fonts, then Geist and other fallbacks. Geist is loaded via next/font. No original auth font family, weight files or license metadata was supplied.

## Missing or approval-dependent assets

| ID | Missing item | Impact | Required resolution |
| --- | --- | --- | --- |
| A01 | Original unoverlaid dusk villa, pool and city image in sufficient resolution | Dominant visual parity blocked across 8 screenshots | Owner supplies original or explicitly accepts a documented substitute; composite crop alone cannot reveal hidden areas |
| A02 | Standalone floating villa thumbnail and approved preview copy/rating | Desktop promo card parity blocked | Original card asset/content or approved static marketing sample clearly not live data |
| A03 | Original light/dark auth logo vector/wordmark specification | Fine silhouette and spacing unverified | Approve current brand variants or provide source |
| A04 | Exact auth font and permitted web weights | Text metrics and wrap parity unverified | Identify/approve typeface and delivery method |
| A05 | Google-approved artwork/brand treatment | OAuth CTA visual acceptance pending | Approved provider brand asset; real configured flow required separately |
| A06 | Clean original role background and later onboarding/mobile reference | Exact editable role photo and missing steps unresolved | Approve pack limitations and supply/approve missing states |

Status: ASSET_BLOCKED for exact final authentication parity; planning can proceed. No image-generation substitute was created. Machine-readable hashes and role asset inventory are in asset-register.json.
