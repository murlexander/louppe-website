# Website performance — 22 October 2026

Baseline: `21a598b`. Publishing uses the regenerated static pages.

- Demo poster, captions, and video source attach only when Demo opens
- Enlargement loads on demand and drops its image source on close
- Image `sizes` matches the layout; Gallery/Grid candidates work in every language
- Six 400px blog thumbnails supplement the existing larger deliveries
- Grain moves with a transform instead of changing its painted background
- Homepage playback pauses offscreen, on page exit, or when hidden. Grain pauses
  when hidden or behind a dialog. Reduced motion remains supported

## Measurements

Headless Chromium 153.0.8010.12, fresh contexts, DPR 2, local HTTP servers.
Baseline is the committed static site; comparison is the rebuilt working copy.
Media bytes are resource `decodedBodySize`, including the shared grain SVG.
Blog checks scroll through the complete list to load all thumbnails.

- Homepage, 1280 × 800: 225,837 → 127,188 media bytes (44% less)
- Homepage, 390 × 844: 282,007 → 56,820 media bytes (80% less)
- Blog index, 1280 × 800: 366,426 → 98,306 media bytes (73% less)
- Blog index, 390 × 844: unchanged at 366,426 bytes; full-width thumbnails
  still choose 800px deliveries for sharpness at DPR 2

A 3.5-second idle trace with motion enabled recorded 32 → 0 Paint events and
389 → 0 RasterTask events after page load. This is one local sample, not a
cross-device CPU or battery benchmark. The grain keeps its original texture,
blend, opacity, and discrete 840ms rhythm.

The phone homepage now selects the 960 × 602 screenshot instead of loading
both screenshot sizes and the hidden poster. Desktop blog entries select
400px images instead of 800–960px images. These changes reduce image resource
and decode demand; total browser RAM and real-network load times were not
measured.

## Validation

- `npm run build`, `npm test` (36 tests), and `git diff --check` pass
- Chromium checks at 1280px and 390px pass for all six homepage languages:
  Gallery/Grid loading, enlargement and Escape dismissal, Demo playback and
  English captions, view-switch pausing, keyboard modifiers, disclosures,
  language menu, and absence of horizontal overflow or failed requests
- Direct `#review-demo` links and offscreen playback pausing pass
- Resizing between compact and full keyboard layouts, dialog grain pausing,
  and reduced-motion behavior pass
- Full-page comparisons with reduced motion have identical dimensions before
  and after. Mean RGB pixel differences are below 0.18 on a 0–255 scale;
  homepage and blog screenshots were inspected
- New regression tests cover media lifecycle and responsive thumbnail output,
  including missing or invalid thumbnail assets

Safari and Firefox were not exercised. Production/CDN behavior was not tested.
T3 preview inspection timed out twice and ignored viewport resizing; browser
checks used a separate headless Chromium process without desktop interaction.
