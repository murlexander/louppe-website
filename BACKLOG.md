# Website backlog

[Project](../README.md) · [App backlog](../app/BACKLOG.md) ·
[Website guide](README.md)

Reviewed 4 November 2026 against the released 1.13 app and recorded publication evidence.
Website work ships independently. Claims must match the released app.

## Completed browser acceptance

- [x] **WEB-AUD-01: consent reconciliation.** Passed in two production tabs on
  22 October: no Google requests before consent; opt-in loaded the real tag in
  both tabs; withdrawal, removed storage, and expired consent disabled collection
  and cleared analytics cookies. Download-intent probes after removal and expiry
  recorded no events. Rejection persisted with tag insertion deliberately held.
  An HTTP local preview stayed disabled after opt-in. Original consent restored.
  Resource Timing supplied network observations; no proxy interception was used.
  [Acceptance evidence](Docs/Archive/2026-10-22/SITE_ACCEPTANCE.md).
  VM tests retain quota-failure and delayed-event coverage. If both storage writes
  and removal fail, refusal lasts only for the current visit.

## Deferred by Alex on 6 October 2026

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
  still shows "Couldn't fetch" on both properties although the live test passes.
  On 11 November it still said "Couldn't fetch" (last read 4 November, 0
  discovered) while the live file returned 200 XML with 54 URLs, so it was
  removed and resubmitted; Search Console's page report showed 39 indexed and 10
  not indexed (as of 6 November). Bing Webmaster Tools is set up
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

- [ ] **Louppe 1.15 copy, from Alex on 18 November 2026.** Publish with the 1.15 release,
  not before: claims must match the released app.
  - Change "undecided" to **Unmarked** in `apolloone-alternative-mac`,
    `cull-raw-jpeg-pairs-mac` and `cull-photos-mac-before-lightroom`, all six
    languages each, and anywhere else the site names the review states.
  - Draft in `.drafts/` the fastest-culling article: picks only (Yes, leave the rest
    Unmarked, Clean Up), with decisions for culling and stars/labels for the
    archive. Write for search and AI parsing: question headings, the answer in the
    first sentence, numbered steps, a shortcut table, real limits. Translations
    follow Alex's approval of the English text.

- [x] **Directory listings merged and live.**
  [awesome-swift-macos-apps #203](https://github.com/jaywcjlove/awesome-swift-macos-apps/pull/203)
  (3 November) and [awesome-swiftui #86](https://github.com/onmyway133/awesome-swiftui/pull/86)
  (2 November) list Louppe.
- [x] **Awesome Mac listing merged.** [awesome-mac #4173](https://github.com/jaywcjlove/awesome-mac/pull/4173)
  merged on 15 November in English, Chinese, Japanese, Korean and Portuguese.
- [ ] **Directory listings awaiting maintainers.**
  [open-source-mac-os-apps #1938](https://github.com/serhii-londar/open-source-mac-os-apps/pull/1938)
  (2 November),
  [AndrewSB/awesome-macOS #80](https://github.com/AndrewSB/awesome-macOS/pull/80), and
  [awesome-native-macosx-apps #285](https://github.com/open-saas-directory/awesome-native-macosx-apps/pull/285)
  (both 14 November). The last list excludes self-promoted apps.
  - **Round two, 18 November.** Opened
    [Does It ARM #1151](https://github.com/ThatGuySam/doesitarm/pull/1151),
    [xyNNN/awesome-mac #95](https://github.com/xyNNN/awesome-mac/pull/95),
    [sraodev/awesome-macOS #25](https://github.com/sraodev/awesome-macOS/pull/25),
    [Awesome Photography #8](https://github.com/rogersilvasouza/awesome-photography/pull/8),
    [mikeqle/awesome-macos-apps #9](https://github.com/mikeqle/awesome-macos-apps/pull/9),
    [native-macos-apps/awesome-native-macos-apps #7](https://github.com/native-macos-apps/awesome-native-macos-apps/pull/7),
    and [xlvisuals/awesome-macos #6](https://github.com/xlvisuals/awesome-macos/pull/6).
    [LibHunt](https://www.libhunt.com/r/louppe-media-culler) accepted the free form
    and published the listing. The Does It ARM preview needs Vercel authorization.
  - **Skipped GitHub lists.** abordage/awesome-mac already includes Louppe in its
    source list. matteocrippa/awesome-swift and onmyway133/awesome-open-source-mac-apps
    require 15 and 100 app stars respectively (Louppe had 12). phmullins/awesome-macos
    returns 404. tonnoz/super-awesome-mac has no published submission rules.
    onnetvikash/best-macos-open-source-apps had no merged PRs and its latest change
    was the license. Awesome Drone Photography & Cinematography focuses on drone workflows.
  - **Skipped web directories.** OpenAlternative and MacUpdate gate submission
    behind sign-in. European Alternatives requires an account and has no culling
    category. OpenSourceAlternative.to requires self-hosting. Softpedia excludes
    apps with AI-written code. MacMenuBar covers menu bar apps.
  - **18 November 2026.** MacUpdate (`markinmvv12@gmail.com`) is pending review, with an email reply promised within 10 days and no listing URL issued. OpenAlternative (`markinmvv12@gmail.com`) was blocked before submission and has no listing URL. Louppe has 12 stars against the 250 required for repositories under six months old.

  Answer maintainer review; referrals appear by origin in GA4. Community posts
  are Alex's to publish; the official Homebrew cask needs about 75 stars.
  iCHAIT/awesome-macOS accepts PRs from collaborators only (since 21 October);
  awesome-OpenSourcePhotography, Best-App and guyzyl/awesome-macos-apps are inactive.
- [x] **Guest article published.** [Kirill's PR #97](https://github.com/kirill-markin/kirill-markin-com/pull/97)
  merged on 28 October; the [live article](https://kirill-markin.com/articles/photo-culling-mac-louppe-folder-workflow/)
  links the homepage and the JPEG guide. Reviews on 11 and 26 November found
  the article live with both links but no referrals from it in 28 days: no GA4
  sessions or download intent, and no Cloudflare, GitHub or App Store web referrals.
- [x] **1.13 release alignment, 4 November.** Homepage, llms.txt, privacy policy
  (Apple Photos access, asset-ID decisions, on-demand iCloud downloads, explicit
  album additions, Settings → General → Updates, Store rating prompt), keyboard
  shortcuts (T, [, ], ⌘↑), and the JPEG and RAW guides match 1.13; both guides now
  have all five translations. Requirements and download links are unchanged. The
  26 September rule holds: no visible version notices or installation
  instructions on the homepage.

Maintain the download, Apple-silicon/macOS requirements, privacy, MIT license,
previews, and captioned Demo. This backlog does not schedule work or authorize publication.
