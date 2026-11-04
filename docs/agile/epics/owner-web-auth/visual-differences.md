# Visual differences and reconciliation register

Latest implementation: screenshots exist, with owner acceptance still pending. The original table below preserves the planning baseline; the current reconciliation follows it.

| ID | Existing difference or ambiguity | Planned disposition | Status |
| --- | --- | --- | --- |
| V01 | Current mobile sign-in is plain background; no dusk photo or glass | Full photo plus lower glass per reference | Awaiting assets/approval |
| V02 | Current desktop promo is gradient-only and bottom-aligned | Architectural photo, upper promo and floating preview | Awaiting assets/approval |
| V03 | Current headline is Welcome back instead of reference headline | Use reference copy and hierarchy; eyebrow where desktop shows it | Planned |
| V04 | Signup/Google/recovery/legal pages absent | Implement real approved flows; no fake controls | Functional scope approval pending |
| V05 | Role pack photo is another scene and inpainted clean version | Use for role onboarding only with disclosed limits | Exact underlying role photo unavailable |
| V06 | Reference exact font and auth vector source unavailable | Identify or explicitly approve available font/brand variant | Asset review pending |
| V07 | Desktop matrix omits Google while phone/tablet show it | Propose secondary desktop Google placement; owner must approve | Open design decision |
| V08 | Forgot-password absent in close-up phone but present in desktop matrix | Keep reachable on all breakpoints without hiding it | Open design decision |
| V09 | Matrix compositions have different panel splits | Independently tune laptop and desktop, not one fraction | Measurements provisional |
| V10 | Phone close-up interior aspect differs from labeled 375×812 target | Keep exact requested CSS viewport, adapt scrolling/safe area; compare content regions | Owner review required |
| V11 | Later role steps and mobile role layout absent | Do not invent accepted screens; get approved adaptations | Missing reference |
| V12 | Floating villa location/rating microtext is not trustworthy live data | Obtain approved marketing content or real data | Content review pending |

After implementation add actual screen paths, observed discrepancies, severity, reviewer and disposition. No row is resolved merely because a screenshot exists. No numerical fidelity score is available.

## Current reconciliation

The user requested a consistent auth/onboarding photo and sans serif type, then rejected glass on the role screen and the promotional text card. Final local revision uses a solid white role surface, opaque selected and unselected options, reference shaped SVG house, direct promotional copy on the photograph with a continuous dark gradient and no enclosing card, and compact controls without arrows after Sign in. Slides and role choices work.

Actual eight auth viewports and additional role/setup screenshots are in verification/screenshots. Browser tests assert opaque role panel/no backdrop blur and no promotional text background or border. Google is shown only when the provider reports availability, including desktop, and recovery remains reachable across viewports.

Original separate auth imagery, font/brand masters and floating villa photograph remain missing. Generated background and vector approximations are disclosed in implementation-report.md. No exact numerical pixel parity or final visual acceptance is claimed. Later onboarding forms are implemented adaptations of the requested auth visual system, with real role specific contracts.
