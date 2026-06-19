# QA Checklist

Automated harness: `npm run shots` (`scripts/screenshots.mjs`) drives Playwright
Chromium at **1920×1080**, **1440×900**, **1366×768**, and **390×844**, in both
reduced-motion (per-section + full-page) and full-motion passes. The motion pass
captures **many scroll positions inside pinned/sticky sections** (hero stages,
§04 scrollytelling) so empty ranges and stuck states are visible. It reports
console errors, page errors, horizontal overflow, **clipped headings**, and
**stuck `opacity:0` reveals in view**. Screenshots are also reviewed visually,
not only by the automated geometry checks.

**Latest run:** ✅ 0 console/page errors · ✅ 0 horizontal-overflow issues ·
✅ production build succeeds (`tsc -b && vite build`).

## Acceptance criteria
- [x] Exactly **10** major narrative sections, in order.
- [x] Opening = polished camera zoom toward an **accurate** Saudi map (Natural Earth 50m, projected).
- [x] Riyadh activates as the starting point (origin node, gold, focus).
- [x] National city nodes expand during the story (§04 cumulative reveal, 21 nodes).
- [x] Arabic **RTL**, visually correct (`<html dir="rtl" lang="ar">`).
- [x] Not a PowerPoint port and not a generic template (scroll-driven SVG narrative, custom design system).
- [x] All supplied data represented accurately; nothing invented.
- [x] Achievements vs targets clearly distinguished (pilot badge vs "المستهدف").
- [x] 5 → 10 → 20+ roadmap clear and labeled cumulative.
- [x] Experience zones visually distinct **and** connected (orbit + snap sequence).
- [x] Technology section reads like a convincing ops platform (live dashboard, labeled demonstrative).
- [x] Governance relationships understandable (layered build-up network).
- [x] Revenue percentages mathematically correct (30+25+15+12+10+8 = 100), exact, no rounding drift.
- [x] KPI targets labeled as targets ("المستهدف", "الأثر المتوقع", "خلال 3 سنوات").
- [x] Official logos never fabricated (entities are marked text labels).
- [x] Desktop cinematic (pinned hero + scrub + sticky scrollytelling).
- [x] Mobile intentionally designed (vertical flow + touch snap; no pin dependency).
- [x] Reduced-motion complete & usable.
- [x] No console errors · no broken assets · production build succeeds.
- [x] Documentation complete.

## Responsive
- [x] 1920 / 1440 / 1366 desktop widths — layouts hold (max-width container).
- [x] Tablet — pins reduced via `matchMedia`; grids reflow.
- [x] iPhone / Android (390×844) — vertical narrative, snap zones, stacked dashboard.
- [x] No horizontal scrollbar at any tested width (`overflow-x: clip`, verified by harness).
- [x] No clipped Arabic headings; numbers isolated LTR (`unicode-bidi: isolate`) so "+5,000" never reorders.
- [x] Tap targets are full cards/buttons; nav rail hidden < 900px (slim top progress bar remains).

## Accessibility
- [x] Single `<h1>` (hero); every section is a `<section>` with `<h2>` + aria-label.
- [x] Visible keyboard focus (`:focus-visible` outline); skip-to-content link.
- [x] Decorative media `aria-hidden` + empty `alt`; maps have `role="img"` + aria-label.
- [x] Count-ups expose final value to AT (`aria-label`), ticks hidden (`aria-hidden`).
- [x] `prefers-reduced-motion` fully honored (motion, smooth scroll, ambient pulses, cue).
- [x] Ambient animation pauses when the tab is hidden.
- [x] Contrast: off-white (#eef3fb) on midnight navy; accents used for emphasis, not body text.

## Performance
- [x] CSS 21 KB gzip; GSAP chunked (28 KB gzip) & Lenis (5 KB gzip) split from app.
- [x] Fonts self-hosted, subset by unicode-range (browser fetches only used glyphs).
- [x] Background images are pre-optimized WebP (109–193 KB), lazy except hero.
- [x] No WebGL; SVG charts/maps; no permanent rAF loops.
- [x] CLS guarded: media has fixed object-fit boxes; fonts via Fontsource (no FOUT layout shift on headings).

## Known limitations
- Source deck is image-only in this environment; per-page topic mapping in
  `content-map.md` is inferred from the proposal logic (data is authoritative).
- Official entity **logos** are shown as text placeholders pending supplied
  assets (by design — logos are never fabricated).
- Background imagery is AI-generated and textless; swap for approved photography
  when available by replacing the files in `/public/media`.
