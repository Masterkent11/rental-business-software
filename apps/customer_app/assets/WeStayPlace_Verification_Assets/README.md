# WeStayPlace — OCR Front + Facial Verification Assets

Open START_HERE.html for the animated gallery. Asset_Preview.png is the static contact sheet.

## Included

- 24 reconstructed SVGs and 72 transparent PNGs (1× / 2× / 3×).
- 10 looping, transparent GIF overlays, plus matching animated WebP versions.
- Three facial pose demo GIFs (right, left, up), plus a front-ID scan demo GIF.
- 20 exact native-resolution reference crops, plus four 2× facial preview images.
- Placement coordinates and a provenance manifest in docs/.

The OCR back scan is excluded. The original full reference sheet is deliberately not bundled.

## Fidelity — please read

The only source is a 1448 × 1086 PNG. Original SVG paths, isolated transparent layers, fonts and motion frames are not available.

reference/exact_crops contains unchanged source pixels at native resolution, except files explicitly ending in _preview_2x. Those crops are the pixel-exact reference, and may include the photo/background. All exact native crops were compared against the supplied source pixels.

svg/, png/, gif/transparent_overlays and webp/transparent_overlays are reconstructed geometry and newly authored animation. They closely follow the visible colors, thin contours, corner brackets, arrows and positions, but cannot be described as extracted original vectors or original animation. The scan line is a newly authored motion cue.

The facial demo GIFs use short dissolves between the still poses visible in the reference. The head images are never stretched, squashed or geometrically warped. They are not continuous head-turn video. Camera samples and the ID image are design-reference content, not production user identity data.

## Folder map

svg/icons/ — navigation, continue arrow, white check.
svg/ocr/ — front ID frame, brackets, processing glass, scan line.
svg/facial/ — traced face contour, optional oval, right/left/up arrows, success ring and badge.
svg/components/ — progress bars, input and button backgrounds.
png/1x, 2x, 3x/ — the same 24 SVG assets rendered with transparency.
gif/transparent_overlays/ — usable camera overlay animations.
webp/transparent_overlays/ — matching animations with smooth alpha edges.
gif/camera_previews/ — photo-based demonstration GIFs only.
reference/exact_crops/ — exact source snippets and clearly named 2× previews.
docs/placement.json — measured guide coordinates from this source image.
docs/manifest.json — size, origin and animation metadata.

## Recommended assets for the live camera

Front OCR: id_front_frame.svg + id_front_scan.gif. The scan GIF already contains its frame; use either the GIF alone or a frame with your own moving scan line to avoid duplicate strokes.
OCR processing: id_front_processing_glass.svg + ocr_processing.gif.
Face alignment: face_alignment_contour.svg or face_alignment_pulse.gif.
Right: face_guide_tilt_right.gif (guide and moving arrow together).
Left: face_guide_tilt_left.gif.
Up: face_guide_look_up.gif.
Success: verification_success.gif or verification_success_badge.svg.

The individual arrow GIFs are also included for independent positioning. Keep the face contour fixed; animate only the directional cue. Choose the traced contour OR the optional oval, not both at once. Mirror the camera preview according to your UX, but do not mirror text, arrows or the overlay a second time. Right/left filenames match the visible screen labels in the supplied reference.

Preserve each asset's aspect ratio (BoxFit.contain). The supplied sample screen aspect ratios differ, so do not stretch a screenshot crop to fill an iPhone screen. Size and position the guide against your actual camera viewport and safe areas. The measurements in placement.json are source-image coordinates, not production device pixels.

Transparent GIFs use a shared palette, explicit loop and disposal metadata. GIF transparency is binary; animated WebP alternatives retain smooth semitransparent edges. SVGs are static and contain no scripts, fonts, embedded photos or external resources.

Buttons, field labels and messages should be rendered as native app text. No iOS status-bar, Dynamic Island or phone-frame assets are provided; these belong to the device. The empty review field and button backgrounds are reusable graphics without baked-in text.

The animation indicates where to move only. Real OCR completion, liveness, face match and the success state must be driven by your actual server verification result, not a GIF timer.
