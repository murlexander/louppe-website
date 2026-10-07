# Louppe website

[Louppe](https://louppe.eu/) is a free, open-source photo, video, and audio culler for macOS. This site uses static HTML, CSS, and JavaScript. Generate the blog locally from Markdown before publishing. GitHub Pages serves `main`; `CNAME` sets the domain.

## Files

- `index.html`: homepage and metadata
- `privacy/index.html`: app and website privacy policy
- `styles.css`: shared design and grain animation
- `site.js`: Gallery/Grid/Demo viewer and screenshot enlargement
- `keyboard.js`: review, Command, and Shift shortcuts
- `analytics-consent.js`: consent and download events
- `favicon.ico`, `favicon.png`: app artwork icons
- `media/grain.svg`: background texture
- `media/2026-09-26/`: screenshots, captioned walkthrough, and sharing image
- `CNAME`: domain
- `robots.txt`, `sitemap.xml`, and `llms.txt`: crawler discovery
- `DESIGN-SYSTEM.md`: design rules
- `BACKLOG.md`: current work

## Analytics

GA4 `G-9P9KKLZ5BN` loads only on HTTPS `louppe.eu` after consent. Previews and copied deployments cannot load it. The `louppe_download` key event in the `Louppe Media Culler` property measures link intent, not installation.

Withdrawal, missing consent, and expiry disable collection across tabs. The script rechecks on focus, visibility, and download clicks. Run `npm run test:consent` or `npm test`.

Older visits are in `alex-markin-personal`, under the saved `louppe.eu historical traffic` comparison. Visitors may overlap; do not sum user counts across properties.

## Preview

```sh
python3 -m http.server 8787
```

See [BLOG.md](BLOG.md) for drafting and publishing. Drafts stay local. The generator includes `/privacy/` in previews and the sitemap.

## Readiness evidence

[7 October 2026 review](Docs/READINESS_2026-10-07.md): release alignment, privacy sources, tests, and browser coverage limits.

## Languages and search

Run `npm run build` after content changes; it generates the homepage, privacy policy, blog, and sitemap in English, Spanish (`/es/`), Simplified Chinese (`/zh/`), Hindi (`/hi/`), Portuguese (`/pt/`), and Arabic (`/ar/`). Arabic uses a right-to-left page with the physical Mac keyboard kept left-to-right. No language redirects or browser-language detection are used.

Edit `templates/home.html` and `templates/privacy.html`, not their generated pages. Keep `content/translations.json` aligned with visible text and accessible labels; missing homepage or policy translations stop the build. `content/translation-ui-keys.json` selects translated interactive labels embedded in each homepage. App screenshots and video captions remain English; translating the website does not change the app's language.

Published blog posts with complete translations get localized article URLs. New untranslated posts remain English, are labeled English on localized indexes, and receive no translated alternate links. Add their copy to the catalog and rebuild to localize them. Drafts stay in private previews. The output manifest removes withdrawn translations; blog rebuilds preserve the language sitemap.

Every translated page has its own canonical URL, reciprocal `hreflang` links, an English `x-default`, localized metadata, and WebPage language data. Homepage SoftwareApplication data describes the free app without invented reviews. Search copy targets photo sorting, photo culling, and media/file management using the supported workflow and hardware requirements.

`npm test` covers language discovery, links/assets, metadata, missing translations, article withdrawal, private previews, and existing consent behavior. `npm run preview:blog` includes all languages. GitHub Pages publishes only after changes are committed and pushed to `main`.

After publication, use Search Console to inspect localized URLs and monitor impressions, clicks, and download intent by landing page. SEO changes do not guarantee traffic or indexing. Implementation follows [Google's multilingual guidance](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites) and [alternate-language guidance](https://developers.google.com/search/docs/specialty/international/localized-versions).
