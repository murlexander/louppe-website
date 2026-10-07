# Louppe website — Quiet darkroom

Static HTML, CSS, and JavaScript; Markdown-generated blog. Approved 26 September 2026.

## Voice

- Address people working with photos, video, and audio
- Lowercase except proper nouns and technical names
- Use Oxford commas, including headings and metadata
- Use periods between sentences; omit trailing periods in headings, lines, and paragraphs
- Keep copy practical and concise; omit repeated hints and captions
- Credit “made by an artist” and “an independent project by Alex Markin”

## Appearance

- Background #080808; primary text #f3f3f3; secondary #b0b0b0
- Download purple #9853a6; readable purple and focus #c691d2
- System sans-serif; no external fonts
- Large real app view; open, unboxed feature sections
- Media width 1040px; reading width 920px; compact centered introduction
- Single column on phones; visible keyboard focus
- Section gaps 88px, or 72px on phones; block gaps 24px; related copy gaps 12px. Split the section gap around the closing divider

## Grain

- Monochrome 512px SVG at `media/grain.svg`
- Screen blend, opacity 0.12, frequency 0.78, three octaves, gamma 2.1
- Discrete position changes every 840ms, behind content
- Keep media and text crisp; disable animation for reduced motion
- No mesh blobs or extra background colors

## Content and controls

- Header: wordmark, blog, and source links
- Hero: product purpose, download, and Apple-silicon/macOS requirements
- One viewer with lowercase Gallery/Grid/Demo controls; no autoplay
- Gallery and Grid enlarge; Demo uses native controls and English captions
- Keep Demo at 16:9 without cropping or padding; pause it when switching views
- Preserve `#review-demo` and the written walkthrough; no video/caption download buttons
- Three short workflow descriptions, interactive Mac keyboard, and expandable features
- Keyboard: clickable review, Command, and Shift keys; one concise explanation, allowing longer media-dependent actions
- Above 600px: proportional 15-unit keyboard; below: compact pad. No horizontal scrolling or key captions
- Keys sit on the page with uniform 1px borders, no backing panel, and no raised edges
- Closing download, artist credit, contact, and support links
- No “how it works” navigation, installation instructions, or visible release-preview notices
- Preserve canonical/search/social metadata and latest-release URLs
- Analytics require consent; the footer control reopens it

## Assets and publishing

Use public derivatives in `media/2026-09-26/`. Preserve capture notes. Keep original shoot files outside the public repo.

GitHub Pages publishes `main` at louppe.eu. Change dated `?v=YYYYMMDD-N` keys for changed CSS/JavaScript. Preserve CNAME, crawler metadata, and download URLs.

## Blog

- Simple `/blog/` list; no card grid or categories
- Articles: 680px left-aligned column, system type, and shared grain
- Natural sentence case, contractions, first-person voice, and no trailing periods
- One byline below the subtitle, linked to Alex's site; none on the index
- One divider above the footer; no others
- At least two centered “Try Louppe” buttons per article: within the body and at the end. No CTA small print
- Descriptive subtitles with natural search terms
- No RSS or subscriptions
- Unapproved drafts stay in local previews
