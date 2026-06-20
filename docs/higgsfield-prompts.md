# Media Generation — Higgsfield

A local Higgsfield **CLI** was not installed, but the Higgsfield service was
available via its MCP tools (plan: `ultra`). Three **textless** cinematic images
were generated and used as optimized, lazy, decorative backgrounds with full CSS
fallbacks. No video backgrounds were generated (kept under the 3-heavy-video
limit; lossless local video transcoding tooling was unavailable, so still images
— which we can verify and optimize — were preferred).

All prompts explicitly forbid text, letters, signage, logos, watermarks, foreign
landmarks, and distorted architecture, and request modest, respectful, distant
crowds — per the cultural-accuracy rules.

## Assets

### 1. Hero atmosphere — `/public/media/hero.webp`
- **Model:** `soul_location` · 16:9 · 2048×1152 · seed 247614 · → 144 KB WebP.
- **Used in:** §01 opening (background behind the map/title, opacity ~0.34, radial mask).
- **Prompt:**
  > Cinematic wide aerial of a modern Saudi public entertainment plaza at blue
  > hour, contemporary Gulf architecture, warm festival string-lights and glowing
  > pavilions, palm trees, distant ambient families and youth as soft
  > silhouettes, deep midnight-navy sky, luminous teal and warm gold accent
  > lighting, premium national initiative mood, volumetric haze, shallow depth,
  > ultra detailed, photoreal. Absolutely no text, no letters, no signage, no
  > logos, no watermark, no readable writing. Undistorted realistic architecture,
  > no foreign landmarks.
- **QA:** verified — Saudi-style plaza, festival lights in brand palette, modest
  distant crowds, no text/logos.

### 2. National finale — `/public/media/finale.webp`
- **Model:** `soul_location` · 16:9 · 2048×1152 · seed 808377 · → 193 KB WebP.
- **Used in:** §10 finale (background behind the fully-illuminated national map).
- **Prompt:**
  > Cinematic night-time aerial of the Kingdom of Saudi Arabia as a connected
  > nation: glowing city clusters linked by faint luminous network lines across
  > dark desert and coastline, deep navy atmosphere from a high orbital-like
  > perspective, teal and gold city glows, subtle aurora-like light, premium,
  > epic, photoreal, volumetric. No text, no letters, no labels, no logos, no
  > watermark. Realistic geography, no foreign landmarks.
- **QA:** verified — orbital connected-nation night scene, light arcs, no text.

### 3. Experience energy field — `/public/media/zones.webp`
- **Model:** `recraft-v4-1` (standard, 2k) · 16:9 · 2688×1536 · → 109 KB WebP.
- **Brand palette passed in:** `#071330 #38e0cd #8a78f0 #ecc578 #eef3fb`, bg `#040a1a`.
- **Available for:** experience/atmosphere texture (decorative).
- **Prompt:**
  > Abstract premium motion-energy field representing mixed entertainment:
  > flowing light trails, particle sparks, digital and sporting energy, soft
  > bokeh, layered depth, midnight navy background with luminous teal, violet and
  > gold streaks, elegant and restrained, cinematic, high-end. No text, no
  > letters, no logos, no watermark.
- **QA:** verified — abstract teal/violet/gold energy, on-palette, no text.

## Optimization & delivery
- Used Higgsfield's pre-optimized `*_min.webp` variants (109–193 KB each).
- Wired through `src/data/media.ts` — an empty `src` renders **nothing** (no
  broken requests); the manifest can be cleared to fall back to pure CSS/SVG.
- Hero is `loading="eager"`; non-hero media is `loading="lazy"`.
- All decorative (`aria-hidden`, empty `alt`), masked, and low-opacity so HTML
  text remains the source of all on-screen wording.

## Regeneration
Re-run the same prompts via `generate_image` (models above), download the
`min.webp` result, drop into `/public/media`, keep the manifest paths.
