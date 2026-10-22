# Interface covers — 22 October 2026

Three covers add app context to the existing photography-led blog. The
ApolloOne streetcar and before-Lightroom garden covers remain photographs.

- `jpeg-grid-gallery`: composition of separate native Grid and Gallery
  captures from **Louppe 1.10.0 (12)**, taken on 13 October. The overlap is an
  editorial layout, not a new app mode. Photos, UI, and counts are unchanged
- `raw-100-percent`: native 100% view from **Louppe 1.9.0 (11)**, taken on
  26 September. No before/after rendering comparison is implied
- `paired-file-info`: crop of Gallery with a brick facade and paired filenames
  in Info, from **Louppe 1.9.0 (11)**, taken on 26 September

Each has 400px, 800px, and 1600px WebP deliveries and a 1200 × 630 JPEG sharing image.
The 400px index thumbnails are resized from the 1600px deliveries with
`cwebp -q 82 -m 6 -resize 400 0 input.webp -o output-400.webp`.
Sharing images contain the complete artwork with padding; no UI is cropped
from them. All interface covers have translated historical/version captions.
No image content or interface was generated or replaced.

`manifest.json` records the exact sources, versions, source and delivery
hashes, crop coordinates, and composition placements. Source copies, PNG
masters, and production code remain outside the public repository in
`media-library/2026-10-22-canada/interface-covers/`; reproduce with
`media-library/2026-10-22-canada/production/interface-covers.py` using Pillow.
Native masters and accessibility records remain in the September and October
media libraries. This follow-up uses preserved captures; it performs no new
app session or native capture.
