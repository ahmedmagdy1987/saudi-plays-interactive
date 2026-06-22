# Owner Revision — Cinematic Background Media Plan

Single cross-device source per section (no iPhone-specific assets). Each loop is
composed with the key subject in a **central safe area** so one landscape source
crops cleanly on wide (16:9) and portrait (9:16/9:19.5) viewports via
`object-fit: cover`. Spec for every loop: **~6–8 s, 24 fps, H.264 High, yuv420p,
+faststart, no audio, clean seamless loop, ~1–2.5 MB, no baked-in text/logos, no
fake maps/signage, restrained premium motion.** The existing still is the
guaranteed poster/base layer (shown until the first decoded video frame).

Generation: Higgsfield MCP **image-to-video** seeded from each section's existing
approved still (preserves the Saudi Plays identity + gives a clean first-frame
poster), then transcoded to spec with `ffmpeg` (added as a dev-only `ffmpeg-static`
tool, not shipped). Sections that already have an approved landscape loop are kept.

| § | id | Narrative purpose | Existing still | Required video concept (subtle, central subject, loopable) | Target file | Poster |
|---|----|-------------------|----------------|-------------------------------------------------------------|-------------|--------|
| 02 | vision | National vision — entertainment for all, expanding to 20+ cities | `s02-vision.webp` | Wide dusk modern-Saudi cityscape, warm plaza lights gently breathing, very slow push-in | `loop-vision.mp4` | s02-vision.webp |
| 03 | market | Young market, accelerating demand | `s03-market.webp` | Vibrant public entertainment crowd at golden hour, soft slow motion energy (no readable faces/text) | `loop-market.mp4` | s03-market.webp |
| 04 | riyadh | Rollout from Riyadh to the Kingdom | `s04-expansion.webp` | Night cityscape with soft light trails radiating outward (abstract expansion), gentle drift | `loop-expansion.mp4` | s04-expansion.webp |
| 05 | zones | Experience zones — **redesigned to image cards** | `s05-entertainment.webp` | KEEP existing `loop-entertainment.mp4` but render **extremely subtle** behind the cards (cards are primary) | `loop-entertainment.mp4` (existing) | s05-entertainment.webp |
| 06 | malahi | Malahi OS — operations & technology platform | `s06-energy.webp` | Premium abstract tech ambience — soft flowing particles / faint network nodes, restrained | `loop-malahi.mp4` | s06-energy.webp |
| 07 | governance | Governance & partnerships — clear roles | `s07-governance.webp` | Calm modern civic/architectural space, soft volumetric light, slow parallax | `loop-governance.mp4` | s07-governance.webp |
| 08 | revenue | Balanced revenue model | `s08-revenue.webp` | Warm premium abstract — slow gold/teal light ribbons, subtle (does not fight the ring chart) | `loop-revenue.mp4` | s08-revenue.webp |
| 09 | impact | **(owner: change imagery)** National targets & impact | `s09-impact.webp` | NEW, clearly distinct from neighbours: a national celebration feel — a connected Kingdom at night with a soft luminous network / restrained fireworks glow; not another generic skyline | `loop-impact-v2.mp4` | s09-impact.webp (or new still) |
| 11 | finale | Why Malahi / finale | `s10-finale.webp` | KEEP existing `loop-finale.mp4` | `loop-finale.mp4` (existing) | s10-finale.webp |

Note: §10 (City Journey) renders its own cinematic SVG map stage and is handled in
Phase 6, not by the background-media engine.

**New loops to generate (7):** vision, market, expansion, malahi, governance,
revenue, impact-v2. **Kept (existing, cross-device):** entertainment, finale.

**Cross-device contract:** all sections use the SAME source on iPhone/Android/
tablet/desktop; the unified sticky in-document engine (`SectionBackgroundStage`)
handles warm-on-approach, poster→video handoff, crossfade + restrained scale
(1.00→1.02), off-screen/tab-hidden pause, and deterministic reverse — with no
device-name branch.
