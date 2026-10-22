# Discovery measurement

The 21 October 2026 experiment adds a six-language ApolloOne comparison and updates current feature/search copy to Louppe 1.12. The hypothesis is that people looking for a Mac photo viewer, folder-based photo sorting, or an ApolloOne alternative will find a relevant page and try the app.

## Collection

Use GA4 **Louppe Media Culler**, property `555464552`, measurement ID `G-9P9KKLZ5BN`. Analytics loads only after consent on HTTPS `louppe.eu`. Local previews cannot collect. No app usage or confirmed installations are measured. Enhanced measurement keeps page loads only; browser-history views, automatic outbound/file clicks, search, form, scroll, and video events are disabled. Explicit site events supply the article and download measurements.

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

## 22 October article experiment

Two English articles test different needs: `/blog/sort-jpeg-photos-mac/` teaches
a JPEG-only selection and Copy workflow; `/blog/why-raw-photos-change-when-you-zoom/`
explains preview/rendering changes at 100%. Localized indexes label them English;
no untranslated page is presented as a translation. A separate contribution to
Kirill Markin's website explains the folder-based handoff. Its review/merge and
publication date must be recorded independently of the owned-site deployment.

The hypothesis is that a concrete task and a concrete troubleshooting question
can reach relevant readers beyond the existing general culling guides. Titles,
headings, descriptions, and image alt text use the terms needed to explain those
jobs. Search results suggested mixed organization/selection intent for JPEG
queries and troubleshooting intent for RAW preview queries; no keyword-volume
or rank estimates were obtained.

Use existing page views and `louppe_download` events by landing path; guest-site
referrals appear by origin when supplied. The guest article links to the JPEG
guide, creating a route into that workflow. Record original sources, raw counts,
and sessions with download intent. Don't infer installs or AI citations from
clicks. Consent and missing referrers limit attribution.

On 22 October the available Executor catalog exposed no Analytics/Search Console
reporting tool, and the agent browser required Google sign-in. A fresh 28-day
baseline and indexing status were unavailable, not zero. Retrieve the complete
28 days before deployment when reporting access returns. The existing 28 October
review can check discovery, but it is too early to judge these articles.

The 22 October browser acceptance deliberately accepted consent in two agent
tabs and generated verification page views. It generated no `louppe_download`
events. Exclude these visits from acquisition conclusions; the deployment day
is already excluded from the experiment comparison. Consent test receipts are
private in `.drafts/site-wrap-up-consent-2026-10-22.json`.

Evaluate each URL 14 and 28 days after its own publication. These are provisional
experiment rules, not industry benchmarks:

- At day 14, investigate unindexed pages' discovery and canonical/indexing status
- At day 28, continue an angle if relevant non-brand impressions occur in both
  final weeks and yield at least three organic clicks
- Below 100 relevant impressions, treat CTR comparisons as inconclusive; at
  100 or more with no clicks, review the title and intent fit
- At 30 or more article visits with no download intent, review the product
  connection before expanding the article set
- If old and new guides compete for the same queries without combined growth,
  clarify their scopes or consolidate them before writing another variant

Keep low-sample outcomes inconclusive. Similar wording, extra screenshots, and
keyword repetition don't establish original value or guarantee ranking. See
[Google's content guidance](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
and [AI search guidance](https://developers.google.com/search/docs/appearance/ai-features):
Google's AI features require no special optimization beyond search eligibility.
