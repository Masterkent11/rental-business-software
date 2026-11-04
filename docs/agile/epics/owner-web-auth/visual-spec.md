# Visual specification

Status: draft for owner review. The attached images are the approved visual direction; this document is not a claim of measured final pixel parity.

## Source priority

1. auth-mobile-reference.png governs close-up phone Sign In and Sign Up.
2. auth-responsive-matrix.png governs responsive composition at the four labeled viewports.
3. The role asset pack original-screen-1585x992.png governs role onboarding only. It does not replace the authentication photography.

Do not reproduce phone frames, Dynamic Island, iOS time/battery/status icons, browser chrome, laptop casing, matrix headings or the presentation board background inside the application. Respect actual safe-area insets instead.

## Required matrix

| Route experience | 375 × 812 | 834 × 1112 | 1440 × 900 | 1920 × 1080 |
| --- | --- | --- | --- | --- |
| Sign In | Full photo, top brand/headline, lower glass card | Portrait photo and glass form | White left panel, right photo/promo | White left panel, right photo/promo |
| Sign Up | Full photo, back affordance, headline, glass form | Portrait photo and glass form | White left panel, right photo/promo | White left panel, right photo/promo |

Phone and portrait iPad must not inherit the current gradient-only sign-in or prematurely become desktop columns. Proposed portrait layout remains through 1023px; review 1024px landscape separately. Width alone must not hide necessary controls. Natural vertical scrolling is required for short screens, scaled text and keyboards; no hard fixed bottom overlay covering fields.

## Composition, visible copy and hierarchy

Phone Sign In: white mark + Westayplace; headline “Sign in to your workspace”; description “Manage properties, bookings and client conversations — all in one place.” Lower surface: Continue with Google; “or sign in with email” divider; Email; Password with leading lock and trailing visibility control; navy Sign in + arrow; “Don’t have an account? Create account”. Screenshot email/password values are examples, never default real credentials.

Phone Sign Up: upper back control, white brand; “Create your account”; “List your property, manage bookings, and connect with guests.” Lower surface: Sign up with Google; email divider; Full name; Email; Password and visibility; Create account + arrow; consent text with Terms of Service and Privacy Policy links. The screenshot does not show a repeat-password field; do not add one without approval.

Desktop: small brand in the upper-left of white panel; form around vertical middle with quiet WELCOME BACK eyebrow for sign-in; right-side white mark, “Publish a place in minutes.” headline, short supporting copy and floating translucent modern-villa preview. Use the legible close-up/canonical text rather than transcribing AI-generated microtext in the tiny promo preview. Final location/rating/card content requires approved content or real data; never fabricate a live rating.

## Measurement ledger

The auth sources are flattened presentation composites: 1448 × 1086 close-up and 1672 × 941 matrix. They are not raw browser screenshots at the labeled viewport sizes. Device interiors were visually inspected; edges below are approximate source-pixel bounds, not CSS coordinates or a final pixel-diff baseline.

| Region | Approximate bounds in source | Interpretation |
| --- | --- | --- |
| Phone Sign In interior, close-up | x 176–683, y 28–1057 | Source content includes simulated system safe area |
| Phone Sign Up interior, close-up | x 765–1273, y 28–1057 | Same photo family; form starts higher for extra field |
| Sign In glass, close-up | x 185–674, y 542–1054 | Nearly full content width, inset and large rounded corners |
| Sign Up glass, close-up | x 774–1266, y 518–1054 | Same glass language and inner alignment |
| Laptop split, matrix | white x about 682–903; photo x about 903–1112 | Approximately 51% left / 49% right within image interior |
| Desktop split, matrix | white x about 1160–1378; photo x about 1378–1645 | Approximately 45% left / 55% right within image interior |

Proposed starting tokens for verification, not approved exact measurements: mobile hero inset about 24 CSS px, headline about 36px, body about 16px, outer form inset about 8px, inner padding about 22–24px, field height at least 44px, primary action about 48px, glass radius about 28–32px. Portrait iPad retains a centered lower glass panel with deliberate maximum width; final width/type scale must be reviewed against its matrix crop. Laptop and desktop need independent panel proportions rather than one inherited fraction.

## Styling contract

- Auth ink and CTA are deep navy, not the dashboard's default bright accent. Text hierarchy uses dark navy and subdued blue-gray; mobile hero copy is white with softer secondary text.
- Form surface is warm translucent frosted glass with visible photo color beneath, fine pale border and broad soft shadow. Keep blur/opacity as measured tuning candidates; do not invent a new tinted decoration.
- Inputs are pale cool translucent surfaces with thin borders, rounded corners and consistent leading mail/user/lock icons. Eye icon has a real button hit target and stateful accessible name.
- CTA is a deep navy gradient with white centered text and a right arrow. Focus/disabled/loading states remain recognizable without changing geometry.
- Font must match weight, line breaks and metrics; SF Pro/system/Geist are inventory candidates only. Exact source family/license is missing. Do not claim a browser-independent exact match without resolving it.
- Use approved source imagery and crop anchors consistently. Do not substitute the role photo or an AI-generated replacement and call it 1:1.

## Role screen contract

Use the specified role pack and its original 1585 × 992 reference: left photographic panel roughly 593px wide, white right content, top existing-account link, step indicator, CREATE YOUR WORKSPACE eyebrow, serif role headline, supporting copy, owner/agent cards with supplied line icons, native exclusive selection and navy Continue button. Source default selects Property Owner. The mobile role layout and later 02/03 steps were not supplied; document and approve those adaptations before implementing them.

Role labels are journey intent, not server capability claims. Do not replace the existing authenticated workspace switcher with these onboarding cards. Reuse SVG traces as supplied and retain their provenance limits.

## Visual acceptance

Capture both experiences at all four exact CSS viewports after approved implementation, with deterministic browser, DPR, font readiness and form state. Compare matching app content regions, not device chrome. Record alignment, crop, density, text wraps, color, shadow, radius, icons and form differences individually. No invented percentage or pixel-diff score. Exact original assets and owner review are mandatory before declaring 1:1 accepted. See qa-plan.md and visual-differences.md.
