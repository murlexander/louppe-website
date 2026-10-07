# Website readiness — 7 October 2026

## Released app alignment

GitHub’s latest release was **v1.9.0**, published 26 September 2026, with the
signed, notarized `Louppe.zip`. Both landing-page download buttons use its
latest-release asset URL. Apple silicon and macOS 14 requirements match the
release. Gallery and Grid captures and the captioned walkthrough match the
released 1.9 interface.

The feature-details disclosure now includes released read-only text previews.
Local operation, no account, direct installation without Homebrew, metadata
filtering, and XMP handoff are described in existing sections. No competitor
superiority claims or unreleased 1.10 workflow features were added.

## Privacy policy

The durable public route is **https://louppe.eu/privacy/**, with `#app` and
`#website` anchors. Footer links open the policy; a separate **analytics choices**
button reopens consent. Blog and policy pages use the same controls.

App wording was checked against `PrivacyInfo.xcprivacy`, session persistence,
thumbnail caches, security-scoped bookmarks, file-operation journals, the
feedback `mailto:` link, the RAW resource-download path, and Sparkle settings.
It explains local retention and cloud-synced folders, rather than suggesting
that uninstalling removes all saved data. The direct-download updater is
disclosed separately from app analytics and the App Store product. Conditional
Apple-resource wording does not advertise an unreleased RAW feature as shipped.

Sources checked on 7 October:

- [Apple app privacy details](https://developer.apple.com/app-store/app-privacy-details/): on-device processing is not data collected by the developer
- The selected Xcode SDK’s `CIRAWFilter.h`: downloads on-demand decoder resources
- [Sparkle system profiling](https://sparkle-project.org/documentation/system-profiling/): optional profiling requires explicit enablement; Louppe does not enable it
- [GitHub Pages data collection](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages#data-collection): visitor IP addresses are logged for security
- [GitHub privacy statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement), [Google privacy policy](https://policies.google.com/privacy), and [Apple privacy policy](https://www.apple.com/legal/privacy/)

## Validation

- `npm run build:blog` passed
- `npm test` passed all 12 tests, including all 11 consent regressions
- The blog-generation regression also checks the privacy sitemap entry and preview copy, and verifies that the preview includes the keyboard script
- All 61 local page, asset, and fragment references resolved across the four public HTML pages
- Local browser rendering checked at the normal desktop viewport and 390×844; the landing page and policy have no horizontal overflow
- The privacy footer link opened the policy, the new text disclosure expanded, and local previews contained no Google tag
- `git diff --check` passed

## WEB-AUD-01 browser acceptance

Two real production tabs at `/` and `/blog/` initially showed no Google tag
under the existing rejected choice. Choosing **allow analytics** in the first
tab added the production `G-9P9KKLZ5BN` tag to both tabs. Choosing **no analytics**
then reloaded both tabs, and each document contained only its first-party
scripts. The final saved production choice is rejected.

This verifies real-tab reconciliation for explicit opt-in and withdrawal. It
does **not** complete every WEB-AUD-01 acceptance condition. The browser tool
exposes DOM state but no network capture or interception; resource timing is
unavailable in its read-only page scope. It also cannot mutate storage or
hold the tag request to force expiry, removal, or the rejection-during-loading
race. Those cases remain covered by the existing VM regressions and are still
listed for full real-browser acceptance in the backlog. No unobserved network
result is claimed.

## Publication

Changes prepared and verified locally. Deployment and public `/privacy/`
availability must be confirmed after the authorized `main` push.
