# Higgsfield cinematic background — generation record

The Section 01 cinematic background is a **real Higgsfield-generated** scroll-scrubbed
sequence (Earth → Arabian Peninsula → Saudi city-light network), not a code-only
approximation. This file records the exact models, prompts and settings so the asset
is fully reproducible.

Account: Higgsfield **Ultra** plan (verified via `balance`). All generations silent
(audio irrelevant — we deliver a frame sequence, not a `<video>` with sound).

## Pipeline overview

1. **Start image** (geographic anchor) — `nano_banana_pro`, vetted for accurate geography.
2. **Image-to-video** zoom — `veo3_1` (Google Veo 3.1, quality `high`) from the vetted image.
3. **Upscale** — `bytedance` video upscale → 2K (source veo output is 1344 px on the long edge).
4. **FFmpeg** deterministic frame extraction → WebP sequence (`scripts/extract-frames.mjs`).
5. **`ScrollVideoCanvas`** renders the sequence, mapped frame-accurately to scroll progress.

Doing the geography as an **image first** lets us reject bad geography *before* spending a
video generation, and keeps the Kingdom's real coastline / city-light distribution correct.

## 1 — Start image (model `nano_banana_pro`)

Desktop 16:9 (job `4307989f-…`, 1376×768) and mobile 9:16 (job `2d438b6e-…`, 768×1376).

**Desktop prompt**
> Photorealistic view of planet Earth from orbit at night, looking down toward the Arabian
> Peninsula. The distinctive Arabian Peninsula is clearly visible, framed by the Red Sea on
> the west and the Persian Gulf on the east, with Saudi Arabia near the centre glowing with
> warm golden clusters of city lights (Riyadh, Jeddah and the coasts). Deep black space all
> around, scattered faint stars, a thin glowing blue atmospheric rim along the curved Earth
> horizon, soft sparse high clouds. Cinematic, premium, government-grade, calm and realistic.
> Dark navy and warm gold tones with a faint restrained teal aurora glow near the edges.
> No text, no labels, no borders, no logos, no UI.

**Mobile prompt** — same, "vertical … Arabian Peninsula centred in the frame … Saudi Arabia
at the centre", `aspect_ratio: 9:16`.

## 2 — Image-to-video zoom (model `veo3_1`, quality `high`, duration 8 s)

Desktop 16:9 (job `2746f8cf-…`, 1344×768, 24 fps) from start image `4307989f`.
Mobile 9:16 (job `64a363b9-…`, 768×1344, 24 fps) from start image `2d438b6e`.

**Prompt (desktop)**
> A very slow, smooth, perfectly stable cinematic push-in from orbit toward the Arabian
> Peninsula at night. The camera gently zooms straight in toward central Saudi Arabia, the
> warm golden city-light network growing gradually larger and brighter. Realistic geography
> stays stable and undistorted; the blue atmospheric rim light along Earth's curved horizon
> remains. Premium, calm, government-grade documentary space cinematography. No rotation,
> no shake, no morphing, no fast motion, no text, no logos, no UI. One single continuous
> slow zoom-in, clean stable first and last frames.

(Mobile prompt identical, with "framed vertically with Saudi Arabia centred".)
Veo's prompt-enhancer expanded these into the SHOT/SUBJECT/SCENE/CAMERA breakdown stored on
each job. `start_image` role = the vetted nano_banana image. The recommended **"Earth zoom in"**
preset (`f7561a2d-…`) was **declined** (`declined_preset_id`) in favour of the literal prompt so
the motion + framing stayed under our control.

## 3 — Upscale (model `bytedance` video upscale, preset `aigc`, 2K, 24 fps)

Desktop job `b19939de-…`, mobile job `57af0524-…`. Brings each clip to ≥1920×1080 / ≥1080×1920.

## Visual QA before integration (rejection criteria)

Inspected start images + first/middle/last video frames. **Accepted** — geography is realistic
(true Arabian Peninsula, Red Sea + Persian Gulf, Riyadh's radial network at the end), camera
targets Saudi Arabia, no fictional borders, no generated text / logos / flags, motion is a single
stable slow zoom with no jump or morph, and the final frame (city-light network) is a clean,
content-safe handoff into the site's SVG Saudi map + title. No regeneration was required.

## Reproduce

`scripts/extract-frames.mjs` pulls the upscaled job URLs, runs the bundled `ffmpeg-static`
to emit `public/cinematic/{desk,mob}/frame-####.webp` (120 frames each) + a poster, and the
fallback `cinematic-{desk,mob}.mp4`.
