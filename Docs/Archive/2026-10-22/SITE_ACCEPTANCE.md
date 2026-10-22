# Site acceptance — 22 October 2026

The privacy page now has five native expandable sections, with short app and
website summaries. All detailed policy paragraphs remain: a comparison with
the previous source found only the revised introduction and date replaced.
The page and translations retain the app/website anchor links and contact.
Blog and privacy pages share the updated `blog.css?v=20261022-3` cache key.
The footer labels are privacy, legal, and analytics.

## Validation

- `npm run build` and `npm test`: 30 tests passed, none skipped
- `npm run preview:blog`: six published articles, no active drafts
- `npm audit --audit-level=moderate`: no reported vulnerabilities
- Final local audit: 44 sitemap pages, no broken local links or anchors,
  consistent shared CSS versions, 76 valid article image references, and all
  30 new media hashes matched
- No merge conflicts, stashes, or open website-repository issues or PRs
- The older JPEG draft was archived locally as superseded by the published
  JPEG-selection guide; original text was preserved

In the live agent browser, Enter opened the first privacy section and Space
closed it. The other four sections opened, and the footer analytics button
reopened consent settings. Local review made no Google analytics requests.
Headless renders checked the collapsed and fully expanded English page at
1100 pixels and the Arabic RTL page at 390 pixels, without horizontal overflow.
The existing language tests checked all six localized pages and their links.

## Blog illustrations

The integrated refresh adds Canada photographs, six workflow illustrations,
and three interface covers. The final blog mixes two photo covers with four
interface covers, including the preserved 1.9 introduction. All 30 new delivery
files have recorded hashes and provenance in `media/2026-10-22-canada/` and
`media/2026-10-22-interface/`. Original RAFs, camera previews, capture inputs,
and export scripts remain in `media-library/`; public derivatives contain no
EXIF/GPS. Earlier photo exports are preserved for reuse.

The media task verified all 76 image references across 26 public article pages:
local paths exist, descriptions are nonempty, and dimensions reserve space.
Desktop DOM checks found loaded images, a 1040px cover, two calls to action,
and no overflow. Headless renders checked the desktop index and JPEG guide,
the 390px JPEG guide, and the 390px Arabic RAW+JPEG guide. Cover-link keyboard
focus had a visible outline. Mobile evidence is headless: the live browser's
resize command did not change its actual viewport.

The interface follow-up checked desktop and 390px indexes, the 390px JPEG guide,
and the 390px Arabic pairing guide in headless renders. All 14 historical or
composition captions match their page language. The JPEG cover combines two
separate authentic 1.10 captures; RAW detail and paired-file Info use authentic
1.9 captures. Captions identify these sources. No photos or interface details
were replaced inside the captures. The duplicate inline RAW detail was removed.

New background app capture failed with ScreenCaptureKit error -3811. Workflow
illustrations therefore reuse authentic Louppe 1.9 captures, captioned as such;
the Copy image shows a preview, not a completed export. They are not new Canada
app screenshots. No foreground control was used. T3 browser snapshots also
timed out twice; DOM checks and headless renders supplied the evidence above.

## Production consent acceptance

Two agent-owned tabs on HTTPS `louppe.eu` exercised the production consent
script from commit `49f0dd8`, unchanged by this privacy-layout update.

- Fresh documents without consent had no Google requests or loaded tag
- Opt-in loaded the real Google tag library in both tabs; Resource Timing
  recorded `www.googletagmanager.com` and `region1.google-analytics.com`
- Withdrawal disabled collection in both tabs and removed analytics cookies
- Removing the stored choice disabled both tabs; a download-intent probe in
  the originating tab recorded no event, despite receiving no storage event
- An accepted choice older than 180 days likewise disabled both tabs and
  refused the probe
- Holding tag-script insertion created a controlled pending-load state.
  Rejection persisted after reload, with both tabs disabled and no cookies
- Accepting on an HTTP local preview left analytics disabled, with no tag
  element or Google requests

All download probes recorded zero events. The original production consent
choice was restored. Deliberate verification page views are documented in
MEASUREMENT.md; they are not evidence of acquisition.

These checks used browser DOM controls, real storage events, tag globals,
cookies, and Resource Timing. No network proxy was used. Existing VM tests
cover blocked storage, delayed callbacks, and the broader host/protocol matrix.
No Safari or Firefox run is claimed. Private receipts contain the observed
states, without cookie values or visitor data.

## Remaining boundaries

Google reporting/Search Console access, previously deferred media work, future
release alignment, and further publicity remain in BACKLOG.md. The guest
article PR on Kirill's separate site still needs his GitHub/Vercel authorization
and review. These are separate from unfinished website source changes.
