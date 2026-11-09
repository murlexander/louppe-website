# Website backlog

[Project](../README.md) · [App backlog](../app/BACKLOG.md) ·
[Website guide](README.md)

Reviewed 4 November 2026 against the released 1.13 app and recorded publication evidence.
Website work ships independently. Claims must match the released app.

## Completed browser acceptance

- [x] **WEB-AUD-01 — Consent reconciliation.** Passed in two production tabs on
  22 October: no Google requests before consent; opt-in loaded the real tag in
  both tabs; withdrawal, removed storage, and expired consent disabled collection
  and cleared analytics cookies. Download-intent probes after removal and expiry
  recorded no events. Rejection persisted with tag insertion deliberately held.
  An HTTP local preview stayed disabled after opt-in. Original consent restored.
  Resource Timing supplied network observations; no proxy interception was used.
  [Acceptance evidence](Docs/Archive/2026-10-22/SITE_ACCEPTANCE.md).
  VM tests retain quota-failure and delayed-event coverage. If both storage writes
  and removal fail, refusal lasts only for the current visit.

## Deferred by Alex — 6 October 2026

- [x] Report traffic sources and landing pages leading to `louppe_download` in
  the separate Louppe property. Done 4 November: `louppe_download` is the only
  firing key event, so `summary.md` lists key events by session source/medium and
  landing page from the weekly stats run. Clicks remain intent, not installations.
- [ ] **Search indexing, rechecked 4 November.** Google indexes 12 URLs: `/`,
  `/pt/`, `/zh/`, `/blog/`, `/privacy/`, all six English guides, and the zh
  ApolloOne guide. Indexing was requested for the es/hi/ar homepages, cull-photos
  in five languages, and ApolloOne in es/pt/hi until the daily quota ran out.
  Next: ar ApolloOne, then cull-raw ×5, blog indexes ×5, a-proper-hello ×5, and
  privacy ×5; a daily scheduled task continues until none remain. The sitemap
  still shows "Couldn't fetch" on both properties although the live test passes;
  a scheduled check on 9 November rechecks and resubmits it. Bing Webmaster Tools is set up
  (imported from Search Console, sitemap read with 44 URLs, all URLs submitted).

## Deferred media refresh

- [ ] **Canada app captures.** Background capture failed on 22 October with
  ScreenCaptureKit error -3811. The own-window capture method in
  `media-library/2026-11-04-store/` now works without Screen Recording access. Canada photo covers and optimized, captioned
  historical workflow screenshots are ready. New app screenshots remain blocked;
  retain the original media and source archive. See the
  [acceptance evidence](Docs/Archive/2026-10-22/SITE_ACCEPTANCE.md#blog-illustrations).
- [x] **Gallery/Grid stills and social preview refreshed, 4 November.** Alex
  replaced the earlier decision to retain the 1.9 assets. The homepage, structured
  data, and Open Graph image use native 1.13 captures (`media/2026-11-04/`); the
  1.9 originals stay in `media/2026-09-26/` and `media-library/`, and the 1.9
  article is unchanged.
- [x] **One stage ratio, 5 November.** Gallery, Grid, and Demo share a 24:13
  stage, the native window ratio of the 1.13 stills, so switching views keeps the
  same height and the stills fill it without bands. The Demo was re-rendered at
  1920 × 1040 from its Remotion source (`media/2026-11-05/`); the 16:9 originals
  stay in `media-library/2026-09-26/demos/`.
- [ ] **Optional: re-record the Demo for 1.13.1.** The 25-second captioned Demo
  still shows the pre-1.13 (1.9) interface, captured as an inactive window. A new
  recording with an active 1.13.1 window is a separate task; keep the 24:13 frame
  (1920 × 1040). A 5 November attempt stopped when the screen locked; its six
  staged scenes are in `media-library/2026-11-05-active-demo/`, and several need
  recapturing because a macOS screen-sharing indicator covers the traffic lights.
  Foreground capture needs Alex to hand over the unlocked Mac.

## Agent tooling follow-ups (9 November 2026)

- [ ] A site test that every homepage stage image, poster and video matches the
  24:13 stage ratio, since a swapped still once shifted the layout between tabs.
- [ ] `scripts/analytics/selfcheck.mjs`, run by `ingest.mjs`, marks a source
  suspect when its window stops advancing, its figures are all multiples of 10,
  or its newest day is zero.

## Release and publicity follow-up

- [x] **Directory listings merged and live.**
  [awesome-swift-macos-apps #203](https://github.com/jaywcjlove/awesome-swift-macos-apps/pull/203)
  (3 November) and [awesome-swiftui #86](https://github.com/onmyway133/awesome-swiftui/pull/86)
  (2 November) list Louppe.
- [ ] **Directory listings awaiting maintainers.**
  [awesome-mac #4173](https://github.com/jaywcjlove/awesome-mac/pull/4173) (body
  corrected 4 November: all features free, optional tips unlock nothing) and
  [open-source-mac-os-apps #1938](https://github.com/serhii-londar/open-source-mac-os-apps/pull/1938).
  Answer maintainer review; referrals appear by origin in GA4. Community posts
  are Alex's to publish; the official Homebrew cask needs more GitHub stars.
- [x] **Guest article published.** [Kirill's PR #97](https://github.com/kirill-markin/kirill-markin-com/pull/97)
  merged on 28 October; the [live article](https://kirill-markin.com/articles/photo-culling-mac-louppe-folder-workflow/)
  links the homepage and the JPEG guide. Its 14- and 28-day reviews count from
  that date.
- [x] **1.13 release alignment, 4 November.** Homepage, llms.txt, privacy policy
  (Apple Photos access, asset-ID decisions, on-demand iCloud downloads, explicit
  album additions, Settings → General → Updates, Store rating prompt), keyboard
  shortcuts (T, [, ], ⌘↑), and the JPEG and RAW guides match 1.13; both guides now
  have all five translations. Requirements and download links are unchanged. The
  26 September rule holds: no visible version notices or installation
  instructions on the homepage.

Maintain the download, Apple-silicon/macOS requirements, privacy, MIT license,
previews, and captioned Demo. This backlog does not schedule work or authorize publication.
