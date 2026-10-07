# Website languages and SEO — 7 October 2026

Implemented and verified locally. Publication uses the existing GitHub Pages deployment from `main`.

English, Spanish, Simplified Chinese, Hindi, Portuguese, and Arabic cover the homepage, privacy policy, blog index, and published 1.9 article: 24 static pages. Language links retain the page; Arabic flows right-to-left while keyboard keys retain their physical order. Screenshot UI and video captions remain English.

Search changes include localized titles, descriptions, social metadata, meaningful photo-sorting/culling/media-management copy, self-canonicals, reciprocal hreflang with English x-default, sitemap discovery, and localized WebPage/BlogPosting data. SoftwareApplication data states the app is free and includes no invented ratings. No app-language support is claimed by the schema.

## Verification

- `npm run build` passed; 24 pages generated
- `npm test`: 13 tests passed, including existing consent regressions
- Regression checks resolve local links, assets, fragments, all canonical and language URLs, and sitemap entries. Rebuilding is deterministic. Missing copy stops generation; withdrawn articles lose localized output. Drafts remain in private previews
- Browser checks at 390 × 844: all six homepages loaded images and translated keyboard descriptions with no horizontal overflow and no Google tag
- Arabic desktop at 1280 × 720: loaded images, no overflow, and translated Gallery/Grid control worked
- Arabic and Chinese privacy pages, Hindi article, and Spanish blog index had no mobile overflow; footer and language links retained locale and page
- Arabic language picker navigated to Spanish; Spanish analytics choices showed translated consent buttons and refusal worked. The existing automated consent tests cover collection and withdrawal behavior
- Final Spanish preview reported no browser console errors
- `git diff --check` passed

Implementation follows [Google multilingual guidance](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites) and [hreflang guidance](https://developers.google.com/search/docs/specialty/international/localized-versions). Indexing and traffic are not measured until publication. Inspect representative language URLs in Search Console after deployment and compare impressions, clicks, and download intent by landing page.
