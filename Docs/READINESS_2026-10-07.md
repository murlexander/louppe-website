# Website readiness — 7 October 2026

## Released app

Latest direct release: **[v1.10.0 (12)](https://github.com/murlexander/louppe-media-culler/releases/tag/v1.10.0)**, published 7 October 2026. Signed with Developer ID and notarized by Apple. Both homepage download buttons use the latest-release ZIP. Requires Apple silicon and macOS 14 or later.

Homepage features remain accurate: read-only text previews, local operation, no account, metadata filtering, and XMP handoff. Gallery/Grid captures and the captioned walkthrough are from 26 September; no homepage version notice or installation instructions were added.

## Privacy

**https://louppe.eu/privacy/** has `#app` and `#website` anchors. Home, blog, and policy footers separate the policy link from **analytics choices**.

Wording was checked against `PrivacyInfo.xcprivacy`, session storage, thumbnails, bookmarks, operation journals, feedback `mailto:`, RAW resources, and Sparkle settings. It covers retention after uninstall, cloud folders, the direct-download updater, and conditional Apple downloads.

Sources checked on 7 October:

- [Apple app privacy details](https://developer.apple.com/app-store/app-privacy-details/): on-device processing is not developer data collection
- Selected Xcode SDK `CIRAWFilter.h`: on-demand decoder downloads
- [Sparkle system profiling](https://sparkle-project.org/documentation/system-profiling/): requires enablement; Louppe leaves it off
- [GitHub Pages data collection](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages#data-collection): security IP logging
- [GitHub privacy](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement), [Google privacy](https://policies.google.com/privacy), and [Apple privacy](https://www.apple.com/legal/privacy/)

## Validation

- `npm run build:blog` passed
- `npm test`: all 12 tests passed, including 11 consent regressions
- Generator tests cover the privacy sitemap entry, preview policy, and keyboard script
- All 61 local page, asset, and fragment references resolved across four HTML pages
- Desktop and 390×844 rendering: no homepage or policy overflow
- Footer policy link and text disclosure worked; previews had no Google tag
- `git diff --check` passed

## WEB-AUD-01 coverage

Two production tabs, `/` and `/blog/`, started without a Google tag under the saved rejected choice. **Allow analytics** added `G-9P9KKLZ5BN` to both. **No analytics** reloaded both with only first-party scripts. The final saved choice is rejected.

This covers explicit opt-in and withdrawal. The browser API lacks network capture, interception, resource timing, and mutable storage. Forced expiry, removal, and rejection during tag loading remain VM-tested and await real-browser acceptance. No network result is claimed.

## Publication

Published on `main`: `a438f18c1a1ef100305f298576e5350d62b8ba2a`. [Pages deployment 37619584257](https://github.com/murlexander/louppe-website/actions/runs/37619584257) succeeded.

Homepage, policy, blog index, article, sitemap, consent script, keyboard script, and both stylesheets returned HTTP 200 and matched source bytes. The live footer opened the policy with the correct canonical URL, no overflow, and no Google tag under the rejected choice.

Copy verification — 7 October 2026: `4398dd7` published in [Pages deployment 37626102744](https://github.com/murlexander/louppe-website/actions/runs/37626102744). All 12 tests passed; 44 distinct HTML/asset/fragment references and 2 Markdown references resolved. All 23 checked live files matched committed bytes. No fresh browser render was possible because the browser surface was unavailable. The rendering and consent checks above belong to the earlier policy update.

## 1.10 release verification

All six live homepages returned HTTP 200 and matched committed source bytes. Both download buttons on each page use the latest-release route, which served the exact 6,706,813-byte 1.10 ZIP.

ZIP SHA-256: `3998b56e9ecea75ae076f52445d50e77b30360dc19f2be91310f1329df939953`. Public archive and update-feed signatures passed. The existing browser checks above were not repeated for this documentation update. Mac App Store approval and availability are separate.
