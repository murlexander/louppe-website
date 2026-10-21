# Discovery measurement

The 21 October 2026 experiment adds a six-language ApolloOne comparison and updates current feature/search copy to Louppe 1.12. The hypothesis is that people looking for a Mac photo viewer, folder-based photo sorting, or an ApolloOne alternative will find a relevant page and try the app.

## Collection

Use GA4 **Louppe Media Culler**, property `555464552`, measurement ID `G-9P9KKLZ5BN`. Analytics loads only after consent on HTTPS `louppe.eu`. Local previews cannot collect. No app usage or confirmed installations are measured.

| Measurement | Fields |
| --- | --- |
| Page view | Canonical page location, `page_language`, built-in `content_group` |
| Download-link intent | `louppe_download`, `download_method`, `download_placement` |
| Internal article-link intent | `louppe_article_open`, `article_path`, `link_placement` |

`download_method` is `app_store`, `github`, or `homebrew`. Placements distinguish homepage hero/footer, article body/end, blog index, navigation, and other links. Query strings and fragments are excluded from configured page locations; referrers retain only their origin. Custom labels use bounded public paths or fixed values, never arbitrary link text.

Event-scoped custom dimensions are configured for `page_language`, `download_method`, `download_placement`, `article_path`, and `link_placement`. Page path, landing page, source/medium, and content group use GA4's built-in dimensions. New custom dimensions are not retrospective and can take 24–48 hours to appear in reports. See [GA4 custom dimensions](https://support.google.com/analytics/answer/14240153) and [page views](https://developers.google.com/analytics/devguides/collection/ga4/views).

## First review

Review on 28 October at 10:00 Europe/Copenhagen. Compare all complete days after deployment with an equal prior period; exclude the deployment day and unfinished day. Save exact dates, property timezone, deployment commit/time, and any verification visits with the results.

Check users, sessions, landing-page views, source/medium, article navigation, and download intent by page, site language, route, and placement. Report counts alongside rates; calculate a session conversion rate using sessions with a download event divided by sessions, rather than dividing repeated click counts by users. Inspect Search Console queries, impressions, clicks, and indexing when available. Check AI referral hosts, while recognizing that missing referrers can appear as direct traffic.

Consent, blockers, small samples, indexing delays, and missing attribution limit conclusions. Never treat missing report access as zero traffic or a one-week change as proof of causality. Do not combine overlapping user counts from the historical personal-site property. Preserve the existing event name for comparisons.

Record actual traffic and experiment receipts privately in `.drafts/discovery-baseline-2026-10-21.json` and subsequent dated notes; keep visitor data out of the public repository. Choose one or two small follow-up changes, record the hypothesis and publication time, and keep all six languages aligned. Keep original acquisition referrers: do not add campaign tags to internal links.
