# Blog publishing

Static Markdown posts live at **https://louppe.eu/blog/**, with permanent `/blog/<slug>/` URLs. [Marked](https://marked.js.org/) runs locally to generate HTML; it never runs in visitors' browsers. GitHub Pages serves [static files](https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages) without a backend, database, or admin login.

Keep the current workflow for one author. Reconsider a CMS if browser editing, scheduling, or editorial roles are needed. RSS, comments, subscriptions, and newsletters are out of scope.

## Files

- `content/posts.json`: published metadata, sorted newest first
- `content/posts/<file>.md`: published articles
- `templates/blog.html`: shared shell and privacy controls
- `blog.css`: article styles, alongside shared `styles.css`
- `scripts/build-blog.mjs`: article, index, and sitemap generator
- `blog/`: generated public pages; commit them, but edit their sources
- `.drafts/`: gitignored drafts and their `posts.json`
- `_preview/`: gitignored site preview with drafts

Render trusted author content only, never visitor submissions. Public source is readable: keep unapproved drafts in `.drafts/` and back them up separately. Noindex does not replace keeping drafts out of Git.

## Write and preview

```sh
npm ci
npm run preview:blog
python3 -m http.server 8766 --bind 127.0.0.1 --directory _preview
```

Open `http://127.0.0.1:8766/blog/`. Previews are noindex, have no visible draft notices, and cannot load production analytics. Drafts stay out of the sitemap. The published 1.9 introduction is at `/blog/a-proper-hello/`.

Metadata example:

```json
{
  "slug": "a-permanent-slug",
  "title": "An article title",
  "description": "A short subtitle for the index and sharing previews",
  "file": "article.md",
  "status": "draft",
  "cta": {
    "label": "Try Louppe",
    "href": "https://github.com/murlexander/louppe-media-culler/releases/latest/download/Louppe.zip"
  }
}
```

Use a descriptive subtitle and one Alex Markin byline beneath it, linked to https://alex-markin.com/. Author links turn purple on hover and focus.

Every article needs at least two centered **Try Louppe** buttons without small print. Put `<!-- try-louppe -->` on its own line between body sections; the generator adds the final button. Missing markers or empty sections fail the build. More markers are supported.

Use natural sentence case, contractions, and Oxford commas. Omit trailing periods in headings and paragraphs; use periods between sentences.

## Publish an approved article

1. Check wording against the released app. Alex approved the 1.9 introduction on 26 September 2026.
2. Copy Markdown to `content/posts/` and metadata to `content/posts.json`. Set `status` to `published` and add the actual `YYYY-MM-DD` publication date. Remove its draft record to avoid duplicate slugs.
3. Run `npm run build:blog` and `npm run test:blog`, then inspect the pages. Invalid dates or incomplete metadata fail. Status controls publication; dates do not schedule it.
4. Commit source, generated `blog/` files, and `sitemap.xml` on `main`, then push. Pages serves them through `.nojekyll`; GitHub does not rebuild the blog.
5. Confirm deployment, the live article, and its links.

The generated-file manifest removes stale HTML when a post is withdrawn. The generator owns the sitemap; add future pages there.

## Shared changes

Regenerate after template edits. Update consent markup in `index.html`, `templates/blog.html`, and `privacy/index.html` together; `analytics-consent.js` owns behavior. Bump dated CSS/JavaScript cache keys wherever changed assets are loaded. Blog pages do not need `site.js`.
