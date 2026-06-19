<div dir="rtl">

# السعودية تلعب — Saudi Plays

تجربة رقمية سينمائية تفاعلية ثنائية اللغة (عربية RTL / إنجليزية LTR) تحوّل عرض
المبادرة الوطنية للترفيه إلى قصة بصرية واحدة مدفوعة بالتمرير من عشرة فصول.

تقدّمها **ملاهي** بالتعاون مع **الهيئة العامة للترفيه** وعدد من الجهات الوطنية.

</div>

---

A scroll-driven, **bilingual** (Arabic-first RTL / English LTR) cinematic landing
page (10 sections) for the **السعودية تلعب / Saudi Plays** national entertainment
initiative.

## Architecture
- **Vite + React 18 + TypeScript** — static SPA (no SSR → no hydration pitfalls).
- **GSAP + ScrollTrigger** — scroll-driven narrative motion; one motion library.
- **Lenis** — user-controlled smooth scroll wired into the GSAP ticker.
- **Native SVG** — the projected Natural Earth 50m Saudi map, all charts, the
  governance network, the segmented revenue ring and the ops dashboard.
- **IBM Plex Sans Arabic** + IBM Plex Sans (self-hosted via Fontsource, OFL).
- **CSS custom properties** design system (`src/styles/tokens.css`).

## Bilingual (Arabic / English)
- One typed content source: `src/i18n/content.ts` (`ar` defines the shape, `en`
  is typed `Content` so key parity is enforced; shared numbers/percentages live
  in consts so they can never drift between languages).
- `src/i18n/index.tsx` — `I18nProvider` + `useContent()` / `useLang()` hooks.
- A compact segmented language switcher (top inline-end, opposite the rail).
- Switching: no reload, persists to `localStorage`, updates `<html lang/dir>`,
  keeps the user on the same section, and refreshes ScrollTrigger after fonts
  settle. The whole UI (headings, copy, charts, timeline, city names, nav,
  tooltips, footer, a11y labels) is translated.

## Develop
```bash
npm install
npm run dev        # http://localhost:5173
```

## Build & preview
```bash
npm run build      # generates map geometry, type-checks, builds to /dist
npm run preview    # http://localhost:4173
```

## QA
```bash
npm run shots      # Playwright screenshots at 1920/1440/1366/390 + reduced &
                   # full-motion passes; console / overflow / clipped-heading /
                   # stuck-opacity report. Output: __screenshots__/ (gitignored)
```

## Where things live
- **Bilingual content (source of truth):** `src/i18n/content.ts`
- **Map geometry (generated):** `scripts/genGeo.mjs` → `src/data/saudiGeo.ts` (`npm run gengeo`)
- **Design tokens:** `src/styles/tokens.css`
- **Sections (01→10):** `src/components/sections/`
- **Shared map / charts / primitives:** `src/components/common/`
- **Nav + language switcher:** `src/components/nav/`
- **Media manifest:** `src/data/media.ts` (+ `/public/media`)
- **Docs:** `docs/` — project brief, content map (20→10), motion system, media prompts, QA.

## Media
Background imagery in `/public/media` is AI-generated (Higgsfield), **textless**,
and used as optimized, lazy, decorative WebP backgrounds with full CSS fallbacks
(an empty `src` in the manifest renders nothing). Swap for approved photography
by replacing the files. Generation prompts: `docs/higgsfield-prompts.md`.

## Deployment
The build output in `/dist` is a static bundle — deploy to any static host
(Netlify, Vercel, Cloudflare Pages, GitHub Pages, S3/CloudFront):
```bash
npm run build      # → dist/
# then publish the dist/ directory
```
No server runtime is required.
