# Motion System

One coherent motion language across the whole page: motion communicates
hierarchy and narrative, never decoration for its own sake. Scrolling stays
responsive and under the user's control — **no scroll-hijacking**.

## Engine
- **GSAP + ScrollTrigger** drive all narrative motion.
- **Lenis** adds user-controlled smooth scrolling, wired into the GSAP ticker
  (`src/lib/scroll.ts`). Disabled entirely for reduced-motion users.
- Every section animates inside a **scoped `gsap.context`** via `useGsapScene`
  (`src/lib/scroll.ts`), so all tweens/triggers are reverted on unmount and
  selectors are scoped to the section.
- `gsap.matchMedia` gates pinned/scrubbed behavior to desktop (`min-width:901px`).

## Vocabulary (and where it appears)
| Technique | Section | Notes |
|---|---|---|
| Scroll-driven camera (map group scale + `svgOrigin` focus on Riyadh) | 01, 04 | True camera, not a CSS zoom. |
| Controlled pin + scrub | 01 (desktop only) | Hero map draws as you scroll; title reveals on load (content never gated). |
| SVG path drawing (`stroke-dashoffset`) | 01,02,03,04,06,07,10 | Border, connectors, charts, network links. |
| City-node activation (staggered scale/opacity) | 01,02,04,05,10 | `back.out` ease for a confident pop. |
| Sticky scrollytelling (no pin) | 04 | Map sticky; timeline steps drive cumulative reveal. |
| Number count-up | 01,03,06,09 | `CountUp`, eased, AT reads final value via `aria-label`. |
| Text mask reveal (overflow + `yPercent`) | 01,10 | Title lines rise into view. |
| Sequential chart draw | 03,06,08 | Charts animate **once on enter** (`toggleActions: play none none none`) — never restart uncontrollably. |
| Layered build-up by tier | 07 | Governance network assembles regulator → operator → partners → beneficiary. |
| Ambient pulse / live signals | 01,05,06 | CSS keyframes; paused on reduced-motion and when tab hidden. |
| Hover / focus micro-interactions | 05,10, cards | Lift + accent border; keyboard `:focus-within` parity. |

## Responsiveness
- **Desktop** (≥901px): cinematic pinned hero + scrub; sticky scrollytelling.
- **Tablet/mobile** (≤900px): pins/scrubs replaced by one-time reveals and
  natural vertical flow; the experience zones become a touch-friendly horizontal
  **scroll-snap** sequence (never a trap). No interaction depends on hover.

## Reduced motion (`prefers-reduced-motion: reduce`)
Complete and usable, not stripped:
- `html.reduced` set on mount; Lenis disabled (native scroll).
- Each `useGsapScene` sets **final/static states** and returns early.
- `[data-reveal]` elements are shown immediately.
- Ambient pulses, the scroll cue, the orbit spin, and dashboard live blinks are
  disabled via CSS.
- Count-ups render their final value instantly.
- Background `background-attachment` switches to `scroll`.

## Performance & lifecycle
- No permanent JS animation loops; ambient motion is CSS and **pauses when the
  page is hidden** (`visibilitychange` → Lenis stop + `gsap.globalTimeline.pause`,
  plus `data-spin="false"`).
- SVG strokes use `vector-effect: non-scaling-stroke` so camera zooms stay crisp.
- `will-change` only on the reveal primitive.
- Charts/maps are SVG (GPU-cheap); no WebGL.
