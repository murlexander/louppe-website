# Louppe Media Culler website backlog

This is the live backlog for the Louppe website. Keep it separate from the app
backlog: website work can ship independently, while public product claims must
always describe the latest released app rather than the app worktree.

## Before the public launch

- [x] Publish a restrained visual set: Gallery, Grid, a captioned 25-second
  walkthrough, and a 1200×630 sharing image. Future App Store candidates stay local.
- [x] Add Open Graph and large-image Twitter metadata using the sharing image.
- [x] Publish the approved Quiet darkroom design with Gallery, Grid, and Demo
  sharing one viewer. Keep download links pointed at the latest release.
- [x] Explain local operation, no account, no Homebrew dependency, metadata
  filtering, and XMP handoff within the existing feature details, without adding
  unsupported competitor claims or another landing-page section.

## Launch and support

- [ ] Run the existing publicity plan after the visual assets and release-copy
  checks are complete.
- [x] Add the optional Revolut donation link.

## Implemented and published, awaiting browser acceptance

- [ ] **WEB-AUD-01 — Accept the deployed consent-reconciliation fix.**
  The 29 September audit's W1 implementation and 11 script regressions are complete
  and published on 29 September; all 12 website tests pass. GitHub Pages deployment
  succeeded and the live consent script matches the committed source. Check two
  real tabs: opt-in loads the tag, withdrawal/removal/expiry disables the other tab
  before another download event, and rejection while loading stays rejected. Verify
  no analytics request before opt-in and preserve the HTTPS production-host gate.
  A 7 October real-browser pass confirmed opt-in adds the tag in both open tabs
  and withdrawal reloads both with the tag absent. Network capture, forced expiry,
  storage removal, and a controlled tag-loading race remain unaccepted in a real
  browser; the available browser API exposes DOM state but no network interception
  or mutable storage. Quota-failure and delayed-event refusals have VM coverage; if storage refuses
  both writes and removal, a refusal can persist only for the current visit.

## Future search and Analytics improvements

Deferred by Alex on 2026-10-06; keep these for later website work.

- [ ] Publish a search-focused Louppe guide, such as how to cull photos on a Mac,
  with instructions that match the released app.
- [ ] Add an Analytics report showing which traffic sources and landing pages
  lead to `louppe_download` events. Treat the event as download-link intent,
  rather than a confirmed installation, and use the separate Louppe property.
- [ ] Recheck Search Console after Google processes the 6 October submissions.
  Domain ownership is verified, both blog pages have accepted indexing requests,
  and Google's live test fetches the valid sitemap successfully. The sitemap
  report still shows "Couldn't fetch"; processing has not yet cleared that status.

## Submission readiness

- [x] Add a public app privacy policy at `/privacy/`, with separate website
  hosting and opt-in analytics disclosures and a dedicated footer link.
- [x] Review the site against released 1.9.0 on 7 October 2026. Requirements and
  latest-release ZIP links are current; feature details now include its text previews.
  Upcoming 1.10 review and connected-drive features are not advertised as shipped.

## Routine maintenance

- [ ] With every public app release, review requirements and feature claims.
- [ ] Keep screenshots, requirements, and download links aligned with the published build.
- [ ] Review capture provenance in the media notes after each release.
  The owner requested removal of visible version notices and installation
  instructions from the landing page on 2026-09-26.

## Completed baseline

The site already has a direct release download, macOS and
Apple-silicon requirements, privacy and MIT-license claims, real app previews,
and a captioned Demo view. Keep those claims maintained rather than reopening
them as tasks.
