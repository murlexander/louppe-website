# Website backlog

Website work ships independently. Product claims must match the latest released app.

## Launch baseline

- [x] Publish Gallery, Grid, a captioned 25-second walkthrough, and a 1200×630 sharing image. Keep future App Store candidates local.
- [x] Add Open Graph and large-image Twitter metadata.
- [x] Publish Quiet darkroom with one Gallery/Grid/Demo viewer and latest-release links.
- [x] Explain local operation, no account, direct installation, metadata filtering, and XMP handoff in feature details. Avoid unsupported competitor claims.
- [x] Add the optional Revolut donation link.
- [ ] Run the existing publicity plan after asset and release-copy checks.

## Browser acceptance

- [ ] **WEB-AUD-01 — Accept deployed consent reconciliation.** W1 and 11 consent regressions shipped on 29 September; all 12 website tests pass. Pages deployment succeeded, and the live script matches source. Verify in two real tabs: opt-in loads the tag; withdrawal, removal, and expiry disable the other tab before a download event; rejection during tag loading persists; no request precedes consent; the HTTPS production-host gate holds.
  The 7 October browser pass confirmed tag loading in both tabs and withdrawal reloading both without the tag. Network capture, forced expiry, storage removal, and a controlled loading race remain unaccepted: the browser API exposes DOM state without network interception or mutable storage. VM tests cover quota failures and delayed-event refusal. If both storage writes and removal fail, refusal lasts only for the current visit.

## Deferred search and Analytics work

Deferred by Alex on 6 October 2026.

- [ ] Publish a search-focused guide, such as photo culling on Mac, matching the released app.
- [ ] Report traffic sources and landing pages leading to `louppe_download` in the separate Louppe property. Treat clicks as intent, not installation.
- [ ] Recheck Search Console after the 6 October submissions. Domain ownership is verified, both blog indexing requests were accepted, and the live test fetches the valid sitemap. The sitemap report still says “Couldn't fetch.”

## Submission readiness

- [x] Publish `/privacy/` with app, hosting, and opt-in analytics disclosures, plus a dedicated footer link.
- [x] Align requirements, ZIP links, and text-preview copy with released 1.9.0 on 7 October 2026. Do not present 1.10 review or connected-drive work as shipped.

## Maintenance

- [ ] Review feature claims, screenshots, requirements, download links, and capture notes with each release.
- [ ] Preserve the 26 September request: no visible version notices or installation instructions on the homepage.

Maintain the existing download, macOS/Apple-silicon requirements, privacy, MIT license, previews, and captioned Demo.
