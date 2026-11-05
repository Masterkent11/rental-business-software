# Marketing Hub workflow redesign

## Existing workflow audit

| Surface | Finding | Target behavior |
| --- | --- | --- |
| Overview and Content | A shared draft list and a store flag can render the editor under either tab. New draft links share the same tab URL with the list, so reload and history cannot restore the requested editor. | Overview shows real draft activity and connection status. Content owns search, filters, sorting and draft actions. A draft URL opens one composer. |
| Calendar and Analytics | Calendar shows a draft list despite having no schedule. Performance has no provider metrics. | Separate empty states explain the capabilities available in the current environment. Scheduled and published metrics stay unavailable until their sources exist. |
| Media | Upload is only available in the library. The composer offers asset references and a preview command but sends the agent away to upload. Status is shared with unrelated operations. | Both surfaces use the same upload control and pipeline. Composer uploads attach the returned asset ID, and existing assets can be selected without uploading again. |
| Composer | A required internal title, unrestricted resets and tab dependent editor visibility increase friction. Preview shows filenames without rendering uploaded assets. Cancel, browser navigation and failures have inconsistent outcomes. | One composer with optional title, explicit format, property search, private media preview and a save action. Preserve the editing buffer across browser navigation within the workspace and confirm explicit discard. |
| Channels | Facebook OAuth and Page selection exist in the feature work. Publishing, scheduling, token health checks and provider metrics have no live implementation. Instagram and TikTok are unavailable. | Show known connection identity and capability limits. Use backend feedback for missing permissions. Keep publication controls unavailable. |
| API and persistence | Existing routes implement drafts with version checks, scoped media with dependency checks, and eligible represented properties. The schema stores asset references and internal review state. It has no destination or content format field. | Reuse existing APIs and database contracts. Derive draft format from saved assets and supply a title when omitted. Retain older drafts with multiple assets. Add optional listing location to the authorized response. |
| Authorization | The controller requires an Agent principal. Use cases validate profile and representation, while repositories and policies scope records. Signed previews and Facebook tokens are handled server side. | Retain these boundaries and exercise denial and workspace changes in regression checks. |

## Implementation sequence

1. Keep existing tab links compatible. Add explicit composer URLs and a protected editing buffer. Reuse existing drafts, optimistic version checks and workspace scope.
2. Add the shared upload control, asset selection and private preview. Keep format selection for current edits and derive the saved format from attachments.
3. Add Content and Media filters, accurate states for unsupported capabilities, and responsive and keyboard support.
4. Verify before and after at 375, 834, 1440 and 1920 CSS pixels. Exercise the browser workflow with fixtures and run the API against isolated PostgreSQL.

## Existing work

Navigation and composer routing are covered by [#117](https://github.com/Masterkent11/rental-business-software/issues/117). Shared upload and asset reuse are covered by [#119](https://github.com/Masterkent11/rental-business-software/issues/119). Drafts, property selection and previews are covered by [#121](https://github.com/Masterkent11/rental-business-software/issues/121). Record verification under [#137](https://github.com/Masterkent11/rental-business-software/issues/137). Provider access and delivery depend on [#123](https://github.com/Masterkent11/rental-business-software/issues/123), [#125](https://github.com/Masterkent11/rental-business-software/issues/125) and [#131](https://github.com/Masterkent11/rental-business-software/issues/131).

## Delivered workflow

- Overview shows draft and review counts, recent content and Facebook connection status. Content owns search, status and format filters, sort order, list or grid views, and draft actions.
- The composer uses a desktop dialog with a live preview and a full screen mobile layout that switches between editing and preview. Its URL carries the draft identity. Back and Forward preserve the current editing buffer within the signed-in workspace. Closing a dirty composer asks before discarding, and page unload uses the browser's warning.
- Media Library and the composer share one upload control, validation path and media API. The composer attaches the asset ID returned by the API. Removing an attachment leaves the library asset available for reuse. Deleting a referenced asset still returns the server's dependency error.
- The API adds an optional display location only to authorized represented properties. The draft request still sends a title, derived from the caption or set to “Untitled draft” when left blank. Existing drafts retain their attachments. New photo and video drafts support one attachment. A format without media is derived as a photo on reopen because the existing schema has no format field.
- Channels shows the Facebook Page identity, connection date and setup errors when available. Publishing and calendar actions stay unavailable, and Analytics reports no metrics until a provider can supply them.

## Data and release

The workflow uses the existing draft and media contracts and requires no migration. It uses the existing Agent and representation checks and private media authorization. Live media verification requires the storage credentials used by the API. Live Facebook consent and Page discovery require the separate Facebook release work. Publishing, scheduled jobs, token health and provider analytics require their own backend work and acceptance evidence.

## Manual verification

1. Sign in with an Agent account, open Marketing Hub and open Create post. Pick Photo post, upload from the composer and open Preview. Save without filling in Draft title, then reload Content and reopen the draft.
2. Create a Video / Reel with an MP4. Confirm that the video preview plays. Remove the attachment, reselect the same file from the library picker and save. Verify that the library still contains one copy.
3. Search by an authorized property's name or location. Change the caption, use browser Back and return through Resume editing or Forward. Check that Cancel and page reload warn before discarding unsaved work.
4. Use Content filters and switch between grid and list. Duplicate a draft, cancel a delete confirmation, then delete the duplicate. Try to remove a referenced asset in Media and verify that the server prevents it.
5. Open Calendar, Channels and Analytics. Confirm that drafts are absent from Calendar, provider availability is accurate and no metrics are shown without a verified source.
6. Repeat with keyboard navigation at phone, tablet and desktop sizes. Verify that an Owner account cannot access the Agent Marketing Hub.

## Verification

- Owner Web TypeScript, lint, 98 tests and the production build passed.
- API TypeScript, lint and build passed. The isolated PostgreSQL run passed 710 tests across 76 files, including draft authorization, asset isolation and representation revocation.
- Chromium browser tests passed against the Owner Web production build using intercepted API responses. The scenario uploaded and reopened real PNG and MP4 browser fixtures, exercised private preview retry, preserved edits after a failed save and browser Back or Forward, and checked Agent and Owner navigation.
- The browser run captured Overview and the composer at 375 × 812, 834 × 1112, 1440 × 900 and 1920 × 1080. It also captured the mobile preview. Device coverage used viewport emulation. Live provider publishing and hosted storage were outside this verification.
