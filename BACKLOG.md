# Website backlog

[Project](../README.md) · [App backlog](../app/BACKLOG.md) ·
[Website guide](README.md)

Reviewed 21 October 2026 against local source and recorded publication evidence.
Website work ships independently. Claims must match the released app.

## Browser acceptance

- [ ] **WEB-AUD-01 — Consent reconciliation.** Verify in two real production tabs:
  opt-in loads the tag; withdrawal, storage removal, and expiry disable the other
  tab before a download event; rejection during tag loading persists; no request
  precedes consent; the HTTPS production-host gate holds.
  The 7 October pass confirmed opt-in and withdrawal in both tabs. Network capture,
  forced expiry, storage removal, and a controlled loading race remain unaccepted
  because the browser API lacked network interception and mutable storage.
  VM tests cover quota failures and delayed-event refusal. If both storage writes
  and removal fail, refusal lasts only for the current visit.
  [Dated evidence](Docs/Archive/2026-10-07/READINESS_2026-10-07.md#web-aud-01-coverage).

## Deferred by Alex — 6 October 2026

- [ ] Report traffic sources and landing pages leading to `louppe_download` in
  the separate Louppe property. Treat clicks as intent, not installations.
- [ ] Recheck Search Console after the 6 October submissions. Ownership is
  verified, both indexing requests were accepted, and a live test fetched the
  valid sitemap. The recorded sitemap report still said “Couldn't fetch.”

## Deferred media refresh

- [ ] Refresh the 1.9 Gallery/Grid, demo, and social preview after Alex changes
  the existing decision to retain those assets. Capture the floating zoom control
  and toolbar save status; preserve original media and the historical 1.9 article.

## Release and publicity follow-up

- [ ] Run the existing publicity plan after asset and release-copy checks.
- [ ] **1.13 release alignment.** Review feature claims, screenshots, requirements,
  download links, and capture notes against the released 1.13 app before publishing
  those changes. Retain the 26 September request: no visible
  version notices or installation instructions on the homepage.

Maintain the download, Apple-silicon/macOS requirements, privacy, MIT license,
previews, and captioned Demo. This backlog does not schedule work or authorize publication.
