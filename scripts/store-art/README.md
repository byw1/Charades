# Store art

Makes the App Store screenshots, the App Store preview video and the 3D promo
video. All of it is drawn in Chromium from the real app, so it never goes out
of date: change the app, run these again.

The output is brand artwork, so it lives in `/store/` (git-ignored, see
`TRADEMARK.md`). Only the code that makes it is here.

| Output | Size | Script |
| --- | --- | --- |
| `store/out/screenshots/01–07.png` | 1320 × 2868 (6.9" iPhone) | `render-shots.js` → `shots.html` |
| `store/out/preview/app-preview-886x1920.mp4` | 886 × 1920, 29 s, 30 fps | `record-preview.js` + `make-video.js` |
| `store/out/promo/charades-promo-1080x1920.mp4` | 1080 × 1920, 20 s | `record-promo.js` → `promo.html`, + `make-video.js` |

## Running it

Needs `playwright-core`, a Chromium (`CHROME=`), and `ffmpeg` (`FFMPEG=`).
None of them are app dependencies; install them somewhere outside the app.

1. Build the web version and serve it on port 8089 (any static server; the app
   uses SQLite in a worker, so it needs the `Cross-Origin-Opener-Policy:
   same-origin` and `Cross-Origin-Embedder-Policy: require-corp` headers).
2. `VH=860 node scripts/store-art/capture.js store/screens` and
   `node scripts/store-art/capture-sideways.js store/screens`: real screens,
   upright and sideways.
3. `node scripts/store-art/render-shots.js`: the screenshots.
4. `node scripts/store-art/record-preview.js /tmp/preview-frames`, then
   `node scripts/store-art/make-video.js /tmp/preview-frames store/out/preview/app-preview-886x1920.mp4`.
5. `node scripts/store-art/record-promo.js /tmp/promo-frames`, then
   `node scripts/store-art/make-video.js /tmp/promo-frames store/out/promo/charades-promo-1080x1920.mp4`.

## Apple's rules this follows

- **Preview video**: 15–30 s, 886 × 1920, H.264, 30 fps, stereo AAC. Apple
  wants previews to be footage of the app itself, so `record-preview.js`
  records the real app (clock frozen, one frame at a time) and only adds
  captions and a closing title. The 3D promo is for social media and the
  website, not the App Store.
- **Screenshots**: 6.9" only; App Store Connect scales them for smaller
  iPhones. iPad screenshots are not needed (`supportsTablet` is false).
- No third-party names in the marketing art itself; card words on real app
  screens are the app's own content.

The music in the videos is synthesised by `music.js`, so there is nothing to
license; the sound effects are the game's own, from `assets/sounds`.
