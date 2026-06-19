<div dir="rtl">

# السعودية تلعب — Saudi Plays

تجربة رقمية سينمائية تفاعلية (عربية، اتجاه RTL) تحوّل عرض المبادرة الوطنية للترفيه
إلى قصة بصرية واحدة مدفوعة بالتمرير من عشرة فصول.

تقدّمها **ملاهي** بالتعاون مع **الهيئة العامة للترفيه** وعدد من الجهات الوطنية.

</div>

---

A scroll-driven, Arabic-first cinematic landing page (10 sections) for the
**السعودية تلعب** national entertainment initiative.

## Stack
Vite · React 18 · TypeScript · GSAP/ScrollTrigger · Lenis · native SVG
(projected Natural Earth Saudi map + charts) · IBM Plex Sans Arabic.

## Develop
```bash
npm install
npm run dev        # http://localhost:5173
```

## Build & preview
```bash
npm run build      # type-check + production build → /dist
npm run preview    # http://localhost:4173
```

## QA
```bash
npm run shots      # Playwright desktop + mobile screenshots → __screenshots__/
                   # + console-error and horizontal-overflow report
```

## Where things live
- **Content / numbers (source of truth):** `src/data/projectContent.ts`
- **Map geometry (generated):** `scripts/genGeo.mjs` → `src/data/saudiGeo.ts` (`npm run gengeo`)
- **Design tokens:** `src/styles/tokens.css`
- **Sections:** `src/components/sections/` (01 → 10)
- **Shared map / charts / primitives:** `src/components/common/`
- **Media manifest:** `src/data/media.ts` (+ `/public/media`)
- **Docs:** `docs/` — project brief, content map, motion system, media prompts, QA checklist.

See [`docs/project-brief.md`](docs/project-brief.md) for architecture and the
non-negotiable content decisions.
