# Website backlog

[Project](../README.md) · [App backlog](../app/BACKLOG.md) ·
[Website guide](README.md)

Reviewed 22 October 2026 against local source and recorded publication evidence.
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

- [ ] Report traffic sources and landing pages leading to `louppe_download` in
  the separate Louppe property. Treat clicks as intent, not installations.
- [ ] **Search indexing, rechecked 4 November.** Google indexes 12 URLs: `/`,
  `/pt/`, `/zh/`, `/blog/`, `/privacy/`, all six English guides, and the zh
  ApolloOne guide. Indexing was requested for the es/hi/ar homepages, cull-photos
  in five languages, and ApolloOne in es/pt/hi until the daily quota ran out.
  Next: ar ApolloOne, then cull-raw ×5, blog indexes ×5, a-proper-hello ×5, and
  privacy ×5. The sitemap still shows "Couldn't fetch" on both properties although
  the live test passes; recheck around 9 November. Bing Webmaster Tools is set up
  (imported from Search Console, sitemap read with 44 URLs, all URLs submitted).

## Deferred media refresh

- [ ] **Canada app captures.** New background capture failed on 22 October with
  ScreenCaptureKit error -3811. Canada photo covers and optimized, captioned
  historical workflow screenshots are ready. New app screenshots remain blocked;
  retain the original media and source archive. See the
  [acceptance evidence](Docs/Archive/2026-10-22/SITE_ACCEPTANCE.md#blog-illustrations).
- [ ] Refresh the 1.9 Gallery/Grid, demo, and social preview after Alex changes
  the existing decision to retain those assets. Capture the floating zoom control
  and toolbar save status; preserve original media and the historical 1.9 article.

## Release and publicity follow-up

- [ ] **Directory listings, opened 2 November.** Pull requests add Louppe to
  [awesome-mac](https://github.com/jaywcjlove/awesome-mac/pull/4173),
  [open-source-mac-os-apps](https://github.com/serhii-londar/open-source-mac-os-apps/pull/1938),
  [awesome-swift-macos-apps](https://github.com/jaywcjlove/awesome-swift-macos-apps/pull/203),
  and [awesome-swiftui](https://github.com/onmyway133/awesome-swiftui/pull/86).
  Answer maintainer review; referrals appear by origin in GA4. Community posts
  are Alex's to publish; the official Homebrew cask needs more GitHub stars.
- [x] **Guest article published.** [Kirill's PR #97](https://github.com/kirill-markin/kirill-markin-com/pull/97)
  merged on 28 October; the [live article](https://kirill-markin.com/articles/photo-culling-mac-louppe-folder-workflow/)
  links the homepage and the JPEG guide. Its 14- and 28-day reviews count from
  that date.
- [ ] **1.13 release alignment.** Review feature claims, screenshots, requirements,
  download links, and capture notes against the released 1.13 app before publishing
  those changes. Retain the 26 September request: no visible
  version notices or installation instructions on the homepage.

Maintain the download, Apple-silicon/macOS requirements, privacy, MIT license,
previews, and captioned Demo. This backlog does not schedule work or authorize publication.
