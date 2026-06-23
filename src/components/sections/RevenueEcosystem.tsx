import { useEffect, useRef, useState } from "react";
import SectionShell from "@/components/common/SectionShell";
import CountUp from "@/components/common/CountUp";
import { useContent, useLang } from "@/i18n";
import { useGsapScene } from "@/lib/scroll";
import "./RevenueEcosystem.css";

const R = 80;
const C = 2 * Math.PI * R;
// tiny visual gap between adjacent segments (viewBox units ≈ 0.4% of C — does
// not materially distort the percentages, just makes the six arcs legible)
const GAP = 2;
const accentVar = (a: string) => (a === "violet" ? "var(--violet)" : a === "gold" ? "var(--gold)" : "var(--teal)");

/**
 * Section 08 — Revenue model. A genuinely segmented six-part revenue ring whose
 * exact-percentage arcs (30/25/15/12/10/8 = 100) draw in sequence while each
 * stream's value counts up. Hovering/focusing a stream highlights its segment
 * and dims the rest; the central 100% appears only after the ring assembles.
 * Percentages come straight from the data and are never altered by rounding.
 */
export default function RevenueEcosystem() {
  const ref = useRef<HTMLElement>(null);
  const layoutRef = useRef<HTMLDivElement>(null);
  const { revenue } = useContent();
  const { lang } = useLang();
  // ONE shared id drives the cards, the segments, the dim state and (on touch)
  // the persistent selection — so card↔segment highlighting is always in sync.
  const [active, setActive] = useState<string | null>(null);
  const toggle = (id: string) => setActive((cur) => (cur === id ? null : id));
  const pctWord = lang === "en" ? "percent" : "بالمئة";

  // tap/click outside the visualization clears a touch-selected segment
  useEffect(() => {
    if (!active) return;
    const onDown = (e: PointerEvent) => {
      if (layoutRef.current && !layoutRef.current.contains(e.target as Node)) setActive(null);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [active]);

  // cumulative starts (exact, never rounded). `dash` is the painted arc length
  // (minus a hair for the inter-segment gap); the dash/gap pair is baked into
  // the JSX below so the six coloured segments exist natively in the DOM and do
  // NOT depend on JS — gsap only animates the reveal (strokeDashoffset).
  let acc = 0;
  const segs = revenue.streams.map((s) => {
    const start = acc;
    acc += s.pct;
    const len = (s.pct / 100) * C;
    return { ...s, start, len, dash: Math.max(len - GAP, 0.5), rotate: -90 + (start / 100) * 360 };
  });

  // ONE deterministic, pure-scroll-progress render. The six arcs assemble as a
  // function of normalized progress p∈[0,1] from a single scrubbed ScrollTrigger,
  // with OVERLAPPING per-arc sub-bands so the colour fills continuously (no segmented
  // jump/cut) and reverses along the exact same path. Only stroke-dashoffset and the
  // non-interactive centre's opacity are touched here — the stream rows reveal via the
  // global [data-reveal] system, so the is-active/is-dim highlighting stays intact.
  useGsapScene(ref, ({ gsap, scope, reduced }) => {
    const arcs = gsap.utils.toArray<SVGCircleElement>(".rev__seg");
    const center = scope.querySelector(".rev__center") as SVGGElement | null;
    const n = arcs.length;
    const dashes = arcs.map((a) => Number(a.dataset.dash));

    const sm = (x: number) => { const t = x < 0 ? 0 : x > 1 ? 1 : x; return t * t * (3 - 2 * t); };
    const SPAN = 0.42;                                       // each arc fills over 42% of the band
    const step = n > 1 ? (1 - SPAN) / (n - 1) : 0;          // staggered, overlapping starts
    const arcSeg = (p: number, i: number) => sm((p - i * step) / SPAN);

    const render = (p: number) => {
      for (let i = 0; i < n; i++) {
        arcs[i].style.strokeDashoffset = `${(dashes[i] * (1 - arcSeg(p, i))).toFixed(2)}`;
      }
      if (center) center.style.opacity = `${sm((p - 0.82) / 0.18).toFixed(3)}`;
    };

    if (reduced) { render(1); return; }
    render(0);
    // smooth ONE-SHOT eased fill when the ring enters view. Still scroll-AWARE (it
    // triggers on scroll-in) but the fill is a TWEEN, not locked to scrollbar position —
    // so it reads as a fluid, premium assemble rather than a mechanical scrub that jumps
    // back and forth with the scroll wheel.
    const state = { p: 0 };
    gsap.to(state, {
      p: 1,
      duration: 1.6,
      ease: "power2.out",
      onUpdate: () => render(state.p),
      scrollTrigger: {
        trigger: scope.querySelector(".rev__layout") || scope,
        start: "top 76%",
        toggleActions: "play none none none",
      },
    });
  });

  const dim = (id: string) => active !== null && active !== id;

  return (
    <SectionShell ref={ref} id="revenue" index="08" eyebrow={revenue.eyebrow} title={revenue.title} lede={revenue.sub} label={revenue.title}>
      <div className="rev__layout container" ref={layoutRef}>
        <div className="rev__ring-wrap">
          <svg className="rev__ring" viewBox="0 0 200 200" role="img" aria-label={`${revenue.centerCap} 100%`}>
            {/* subtle dark track under the segments — never covers them */}
            <circle cx="100" cy="100" r={R} fill="none" stroke="rgba(120,162,224,0.1)" strokeWidth="26" />
            {segs.map((s) => (
              <circle
                key={s.id}
                className={`rev__seg${active === s.id ? " is-active" : ""}${dim(s.id) ? " is-dim" : ""}`}
                cx="100"
                cy="100"
                r={R}
                stroke={accentVar(s.accent)}
                /* dash = this segment's arc; gap = the rest of the ring, so each
                   <circle> paints ONLY its own slice in its own colour */
                strokeDasharray={`${s.dash.toFixed(2)} ${(C - s.dash).toFixed(2)}`}
                data-id={s.id}
                data-dash={s.dash.toFixed(2)}
                style={{ transform: `rotate(${s.rotate}deg)`, transformBox: "view-box", transformOrigin: "center", color: accentVar(s.accent) }}
                /* REVERSE interaction: each segment is itself focusable/tappable
                   and drives the SAME `active` id as the cards */
                tabIndex={0}
                role="button"
                aria-label={`${s.ar}: ${s.pct} ${pctWord}`}
                onMouseEnter={() => setActive(s.id)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(s.id)}
                onBlur={() => setActive(null)}
                onClick={() => toggle(s.id)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(s.id); } }}
              />
            ))}
            <g className="rev__center">
              <text className="rev__center-total" x="100" y="98" textAnchor="middle" fontSize="30">100%</text>
              <text className="rev__center-cap" x="100" y="120" textAnchor="middle" fontSize="11">{revenue.centerCap}</text>
            </g>
          </svg>
        </div>

        <ul className="rev__streams">
          {segs.map((s, i) => (
            <li
              className={`rev-stream${active === s.id ? " is-active" : ""}${dim(s.id) ? " is-dim" : ""}`}
              data-accent={s.accent}
              data-i={i}
              key={s.id}
              tabIndex={0}
              role="button"
              aria-label={`${s.ar}: ${s.pct} ${pctWord}`}
              onMouseEnter={() => setActive(s.id)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(s.id)}
              onBlur={() => setActive(null)}
              onClick={() => toggle(s.id)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(s.id); } }}
            >
              <span className="rev-stream__sw" aria-hidden="true" />
              <div className="rev-stream__body">
                <span className="rev-stream__name">{s.ar}</span>
                <span className="rev-stream__desc">{s.desc}</span>
              </div>
              <CountUp className="rev-stream__pct" value={s.pct} suffix="%" />
            </li>
          ))}
        </ul>
      </div>

      <p className="source-note rev__note container">{revenue.note}</p>
    </SectionShell>
  );
}
