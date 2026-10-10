# WeStayPlace viewing-request asset pack

Recreated from the supplied four-screen mockup; these are NOT the original design source files. No animation can be recovered from a still image. Motion here is newly authored to match the depicted states.

## Contents
- icons/svg: 24 editable, transparent, 24px SVG icons. Change stroke/fill to recolor. Sun is neutral; use blue for morning and amber for afternoon if matching the screenshot.
- animations/svg: 4 standalone browser animations (SMIL).
- animations/gif: 4 white-background motion previews; success plays once, others loop.
- illustrations/png: 256px still fallbacks on white.
- flutter/viewing_animations.dart: dependency-free native Flutter animations. Prefer these in Flutter; flutter_svg does not animate SMIL.
- images/screenshot-crops: available property thumbnail, agent avatar, and hero reference. These are low-resolution crops, NOT clean original photos. The hero retains UI overlays. Avatar is a mockup placeholder, not verified agent data. Use real listing and agent images in production.
- reference/viewing-flow.png: full supplied screenshot.
- design-tokens.json: approximate visual tokens.
- preview.html: local browser asset gallery.

## Flutter
Copy viewing_animations.dart into your presentation/widgets folder and use ViewingAnimation(kind: ViewingMotion.matching), .success, .spinner or .pending. It requires only Flutter SDK. Set animate:false for a still frame. Reduced-motion accessibility is respected. Use flutter_svg (a separately installed project dependency) for static SVG icons, or your existing vector renderer. No SDK or third-party dependency version changes are included.

## Flow integration
Matching animation runs only while an actual request is processing. Completion checkmarks and request status must follow API state, never animation elapsed time. Show the success state after request acceptance/assignment; this does not mean the viewing date is confirmed. Keep the confirmation timeline pending until the agent confirms. Stop animations when the screen leaves the tree. Dates, agent profiles and contact actions come from real data.

## Motion
Matching: 3s orbit loop. Success: 650ms check reveal, once. Spinner: 1s loop. Pending: 1.8s gentle pulse. The four screens show inferred motion states; the screenshot provides no original timing specification.

## Validation
SVG XML parsed and ZIP integrity checked. GIF frames generated and a contact sheet visually inspected. Flutter source is supplied for integration; no Flutter SDK was available to compile it here. Assets do not include original Figma, Lottie or Rive files, fonts, or clean full-resolution source photography.
