# WeStayPlace Flutter asset pack

Recreated assets based on the approved mockup. These are not original Figma layers or exact vector extractions. The generated 3D category illustrations are new matching variants; the simple SVG category icons are separate editable alternatives.

## Installation
1. Copy `assets/westayplace/` to your Flutter project.
2. Merge the entries in `pubspec-assets.yaml` into the EXISTING `flutter: assets:` section of your pubspec; do not create duplicate YAML keys.
3. Copy desired files from `flutter/` into your presentation/widgets layer. No third-party dependencies are needed for these examples because they use PNG icons. SVG files can be used with your existing SVG renderer.
4. Run `flutter pub get`, then rebuild and check on your target devices.

## What to use
- `categories/png/{apartment,condo,house,room,boarding}.png`: transparent 256px 3D icon variants. No tile background is baked in. Show at approximately 3644 logical pixels.
- `categories/svg/`: editable simplified outline alternatives. Matching `*-outline.png` files are raster fallbacks.
- `header/`: Search, Bell, Ask Bino (navy and white), arrow and 360° tour icons in SVG + transparent PNG.
- `navigation/`: Home, Saved, Bookings, Messages and Profile in both active/inactive SVG + 96px PNG. PNGs render at 2224 logical pixels.
- `backgrounds/`: clean high-resolution winter landscape, compact 960px version and still fallback.
- `animations/winter-snow.gif`: clean background-only falling snow loop (8 seconds, 768×256). No UI or phone frame is baked into this file.
- `effects/frost-wind.png`: transparent frost texture for a separate low-opacity translation effect if desired.
- `viewing/`: previously recreated matching/loading/success/pending GIF assets.
- `preview/`: full-screen snow, Santa and reindeer GIFs, plus local preview gallery. These are REFERENCE DEMOS, not production header backgrounds. Santa/reindeer are earlier alternatives and are not part of the latest snow-only design.
- `reference/`: approved screenshot for comparison.

## Glass and animation
`GlassBottomNav` implements frosted glass, a 100ms press scale, 200ms selected-background transition and slight icon lift. The parent must connect onSelected to real pages and keep selectedIndex in sync. This sample fades each tab highlight; it does not implement a traveling highlight between tabs.

Use `Scaffold(extendBody: true, bottomNavigationBar: GlassBottomNav(...))` to let content appear softly through the dock. Add bottom body padding equal to the dock and safe area so the last card is never obscured. Test large text settings and narrow devices in your app.

Build category surfaces in Flutter, not as flattened image boxes: a low-opacity pearl fill, 16px radius, no heavy border or shadow. Background blur should be clipped to each surface. Keep label and architectural icon opaque navy. Header controls stay compact with sufficient touch areas; bell has no border.

The winter GIF is a background layer only: Stack order is winter background, optional frost layer, category surfaces, icons/labels and search controls. It must never be placed as an overlay above interactive controls. Only Search + Ask Bino + bell remain pinned while the seasonal scene/categories scroll away. The code here supplies components, not the complete sliver screen.

The background widget uses a still image for reduced motion. Parent must set visible:false when the header leaves view or app is inactive to remove the animated image from the tree. Do not rely on a GIF alone to detect scroll visibility.

## Scope and checks
SVG XML, PNG alpha channels, GIF frame counts, manifest and ZIP integrity are checked. Flutter code is integration source and has NOT been compiled or tested with your project. No dependency versions have been changed. No original Lottie/Rive source, real property photos, backend wiring, or complete app screens are included.

See design-tokens.json for approximate palette and motion values. All app text should use primary #142642 and secondary #7A8493; white is used on primary buttons. Restore live listing images from your own backend.
