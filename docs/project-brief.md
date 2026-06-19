# السعودية تلعب — Project Brief

A cinematic, Arabic-first (RTL) interactive landing experience that translates a
20-page national entertainment proposal into one continuous, scroll-driven
visual story of **exactly 10 sections**.

- **Canonical project name:** «السعودية تلعب» (Saudi Plays). Never «المملكة تلعب».
- **Presented by:** ملاهي (Malahi), in collaboration with الهيئة العامة للترفيه
  and national stakeholders.
- **Tone:** premium, modern, confident, technologically advanced, culturally
  accurate — government-grade clarity with entertainment-grade energy.

## Architecture

| Concern | Choice | Why |
|---|---|---|
| Framework | **Vite + React 18 + TypeScript** (static SPA) | Single cinematic page; avoids SSR hydration pitfalls the brief warns against; lean, fast, trivially previewable. |
| Narrative motion | **GSAP + ScrollTrigger** | The recommended scroll-narrative engine. Single motion library — no Framer Motion. |
| Smooth scroll | **Lenis** | Lightweight, user-controlled smoothing wired into the GSAP ticker. Disabled for reduced-motion. |
| Map / charts / diagrams | **Native SVG** (projected GeoJSON) | Accurate, crisp, performant, accessible, reduced-motion friendly. No WebGL/Three.js needed; no heavy charting lib. |
| Fonts | **IBM Plex Sans Arabic** + IBM Plex Sans (self-hosted via Fontsource, OFL) | Licensed, premium Arabic with a Latin companion for eyebrows. |
| Design system | **CSS custom properties** (`src/styles/tokens.css`) | One source of truth for palette, type scale, spacing, motion. |
| Content | **`src/data/projectContent.ts`** | Single source of truth — every number and string lives here. |
| Geometry | **`scripts/genGeo.mjs` → `src/data/saudiGeo.ts`** | Build-time projection of a Natural Earth 50m Saudi outline + the city network into a fixed SVG viewBox. No runtime fetch. |

### Why SVG instead of Three.js for the opening map
The brief allows lightweight Three.js for the opening "if justified" and requires
an SVG/2D fallback regardless. A projected-SVG map satisfies *accuracy* (real
Natural Earth boundary), *cinematic zoom* (GSAP transforms the map group with a
true camera focus on Riyadh), *performance* (no WebGL, no large bundle), and
*accessibility* (DOM text labels, reduced-motion static state) in one
implementation — so the fallback **is** the experience. Documented as a
deliberate decision.

## The 10 sections
01 Cinematic opening / Saudi map · 02 National vision / why now · 03 Market
opportunity · 04 From Riyadh Plays to Saudi Plays · 05 Concept & experience
zones · 06 Malahi operating ecosystem & technology · 07 Governance, model &
partners · 08 Revenue model · 09 KPIs & national impact · 10 Why Malahi /
national finale.

## Non-negotiable content decisions (encoded in data + UI)
- The Riyadh case study (+100K / +200 / +50, 2024–2025) is visually labeled a
  **proven pilot**, never a national achievement.
- The rollout **5 → 10 → 20+** is **cumulative** coverage (an explicit note says
  the numbers are not additive).
- Market figures carry the source note **"مؤشرات تقديرية — تجميع داخلي ملاهي 2026"**.
- Operations-dashboard numbers are labeled **"نموذج توضيحي للوحة العمليات"** with a
  demonstrative disclaimer.
- Revenue percentages are exact and total **100** — never altered by rounding or
  animation.
- KPI/impact values are labeled **target / projected** ("المستهدف", "الأثر المتوقع",
  "خلال 3 سنوات"), never achieved.
- Official logos are **never fabricated** — entities appear as clearly-marked text
  labels; supplied logo files would drop into the footer container.
- Pilot dates and rollout values are centralized in `projectContent.ts` for
  instant client edits.

## Run
```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # type-check + production build to /dist
npm run preview   # serve /dist at http://localhost:4173
npm run shots     # Playwright desktop+mobile QA screenshots + console/overflow report
```
