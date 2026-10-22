# Blog publishing

Static Markdown posts live at **https://louppe.eu/blog/**, with permanent `/blog/<slug>/` URLs. [Marked](https://marked.js.org/) runs locally to generate HTML; it never runs in visitors' browsers. GitHub Pages serves [static files](https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages) without a backend, database, or admin login.

Keep the current workflow for one author. Reconsider a CMS if browser editing, scheduling, or editorial roles are needed. RSS, comments, subscriptions, and newsletters are out of scope.

## Files

- `content/posts.json`: published metadata, sorted newest first
- `content/posts/<file>.md`: published articles and their translations
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

For complete article translations, add a `translations` object to the record, with `es`, `zh-Hans`, `hi`, `pt`, and `ar` entries. Each needs its own `title`, `description`, and `file`, such as `article-es.md`. Keep translated Markdown beside the English source, including CTA markers and image alt text. All five translations must be complete; missing metadata, files, or markers stop the build. Localized pages use the same slug under each language prefix, and internal article links follow that language

Older articles can still use the shared translation catalog. Articles without complete translations stay English and are labeled on localized indexes

Use a descriptive subtitle and one Alex Markin byline beneath it, linked to https://alex-markin.com/. Author links turn purple on hover and focus.

For a distinct sharing preview, add `"image": {"src": "/media/YYYY-MM-DD/example.webp", "alt": "What the capture shows"}` to the post record. The local image must exist; Open Graph, Twitter, and article structured data share it. Older posts keep the default preview. Record native capture provenance beside new media, and identify historical interfaces in captions when relevant.

For a visible article cover and index thumbnail, add `cover` with local `src`
and `small` image paths, descriptive `alt`, and the full image's `width` and
`height`. Put translated cover descriptions in `content/translations.json`.
An optional `caption` identifies historical app versions or an editorial
composition; translate it in the same catalog.
Add an optional `thumbnail` path to a 400px WebP for compact index entries.
Its dimensions must be in the media catalog. Larger candidates remain available
for full-width phone thumbnails and article covers.
Record actual asset dimensions in `content/media-dimensions.json`; inline
Markdown images use these to reserve space and load lazily. Images link to the
full delivery. Keep source photos and editable exports in `media-library/`;
only optimized public derivatives belong in this repository.

Every article needs at least two centered **Try Louppe** buttons without small print. Put `<!-- try-louppe -->` on its own line between body sections; the generator adds the final button. Missing markers or empty sections fail the build. More markers are supported.

Use natural sentence case, contractions, and Oxford commas. Omit trailing periods in headings and paragraphs; use periods between sentences.

## Publish an approved article

1. Check wording against the released app. Alex approved the 1.9 introduction on 26 September 2026, and both photo-culling guides with their translations on 12 October 2026.
2. Copy English and translated Markdown to `content/posts/` and metadata to `content/posts.json`. Set `status` to `published` and add the actual `YYYY-MM-DD` publication date. Remove its draft record to avoid duplicate slugs.
3. Run `npm run build:blog` and `npm test`, then inspect the pages. Invalid dates or incomplete metadata fail. Status controls publication; dates do not schedule it.
4. Commit source, generated `blog/` files, and `sitemap.xml` on `main`, then push. Pages serves them through `.nojekyll`; GitHub does not rebuild the blog.
5. Confirm deployment, the live article, and its links.

The generated-file manifest removes stale HTML when a post is withdrawn. The generator owns the sitemap; add future pages there.

## Shared changes

Regenerate after template edits. Update consent markup in `index.html`, `templates/blog.html`, and `privacy/index.html` together; `analytics-consent.js` owns behavior. Bump dated CSS/JavaScript cache keys wherever changed assets are loaded. Blog pages do not need `site.js`.
