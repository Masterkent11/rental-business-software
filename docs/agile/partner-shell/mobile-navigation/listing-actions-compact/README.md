# Compact mobile listing actions

Follow up scope registered before code on [issue 64](https://github.com/Masterkent11/rental-business-software/issues/64#issuecomment-6563666703). This supersedes the earlier 72px action layout in ../listing-actions.

For sale and For rent use 56px phone actions, 28px illustrations, single line supporting text and a restored 176px hero. Below 360px the caption becomes Create a listing to avoid clipping. Decorative arrows are omitted on narrow phones. Desktop and tablet retain the existing plus buttons without the new illustrations. No invented growth percentage is displayed.

Production build passed. Browser checks passed at 320×568, 375×812, 390×844, 430×932, 834×1112, 1440×900 and 1920×1080. Assertions cover 56px phone actions, 176px hero, single line caption without clipping, horizontal alignment, image visibility only on phones, no document overflow and both existing creation destinations. Synthetic session/API responses; no records created. Phone captures were visually inspected at 320 and 375 pixels. The later partner branding correction intentionally changes the authenticated header identity, not these action dimensions.
