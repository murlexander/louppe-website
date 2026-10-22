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
- [ ] Recheck Search Console after the 6 October submissions. Ownership is
  verified, both indexing requests were accepted, and a live test fetched the
  valid sitemap. The recorded sitemap report still said “Couldn't fetch.”

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

- [ ] Run the existing publicity plan after asset and release-copy checks.
- [ ] **Guest article publication.** [Kirill's PR #97](https://github.com/kirill-markin/kirill-markin-com/pull/97)
  is submitted; GitHub checks and Vercel preview require his authorization before
  review and merge. The two owned-site article experiments are already published.
- [ ] **1.13 release alignment.** Review feature claims, screenshots, requirements,
  download links, and capture notes against the released 1.13 app before publishing
  those changes. Retain the 26 September request: no visible
  version notices or installation instructions on the homepage.

Maintain the download, Apple-silicon/macOS requirements, privacy, MIT license,
previews, and captioned Demo. This backlog does not schedule work or authorize publication.
