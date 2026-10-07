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
