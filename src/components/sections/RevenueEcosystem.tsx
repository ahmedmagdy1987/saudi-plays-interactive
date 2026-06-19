import { useRef } from "react";
import SectionShell from "@/components/common/SectionShell";
import { revenue } from "@/data/projectContent";
import { useGsapScene } from "@/lib/scroll";
import "./RevenueEcosystem.css";

const R = 80;
const C = 2 * Math.PI * R;
const accentVar = (a: string) => (a === "violet" ? "var(--violet)" : a === "gold" ? "var(--gold)" : "var(--teal)");
const maxPct = Math.max(...revenue.streams.map((s) => s.pct));

// precompute cumulative start for each segment (exact, never rounded)
let acc = 0;
const segs = revenue.streams.map((s) => {
  const start = acc;
  acc += s.pct;
  return { ...s, start, len: (s.pct / 100) * C, rotate: -90 + (start / 100) * 360 };
});

/**
 * Section 08 — Revenue model. A central revenue ring whose six exact-percentage
 * streams (30/25/15/12/10/8 = 100) draw in sequence as the stream rows activate
 * beside it. Percentages come straight from the data and are never altered by
 * rounding or animation.
 */
export default function RevenueEcosystem() {
  const ref = useRef<HTMLElement>(null);

  useGsapScene(ref, ({ gsap, scope, reduced, ScrollTrigger }) => {
    const arcs = gsap.utils.toArray<SVGCircleElement>(".rev__seg");
    const bars = gsap.utils.toArray<HTMLElement>(".rev-stream__bar i");
    arcs.forEach((a) => {
      const len = Number(a.dataset.len);
      gsap.set(a, { strokeDasharray: `${len} ${C}`, strokeDashoffset: reduced ? 0 : len });
    });
    if (reduced) {
      bars.forEach((b) => (b.style.width = b.dataset.w ?? "0%"));
      return;
    }

    const tl = gsap.timeline({ scrollTrigger: { trigger: ".rev__layout", start: "top 74%", toggleActions: "play none none none" } });
    arcs.forEach((a, i) => {
      tl.to(a, { strokeDashoffset: 0, duration: 0.6, ease: "power2.out" }, i === 0 ? 0 : "-=0.35");
      const row = scope.querySelector(`.rev-stream[data-i="${i}"]`);
      const bar = row?.querySelector(".rev-stream__bar i") as HTMLElement | null;
      if (row) tl.fromTo(row, { opacity: 0.4, x: 14 }, { opacity: 1, x: 0, duration: 0.4 }, "<");
      if (bar) tl.to(bar, { width: bar.dataset.w ?? "0%", duration: 0.5 }, "<");
    });
    ScrollTrigger.refresh();
  });

  return (
    <SectionShell id="revenue" index="08" eyebrow={revenue.eyebrow} title={revenue.title} lede={revenue.sub} label="نموذج الإيرادات">
      <div className="rev__layout container">
        <div className="rev__ring-wrap">
          <svg className="rev__ring" viewBox="0 0 200 200" role="img" aria-label="توزيع مصادر الإيرادات بمجموع 100%">
            <circle cx="100" cy="100" r={R} fill="none" stroke="rgba(120,162,224,0.1)" strokeWidth="26" />
            {segs.map((s) => (
              <circle
                key={s.id}
                className="rev__seg"
                cx="100"
                cy="100"
                r={R}
                stroke={accentVar(s.accent)}
                data-len={s.len.toFixed(2)}
                style={{ transform: `rotate(${s.rotate}deg)` }}
              />
            ))}
            <text className="rev__center-total" x="100" y="98" textAnchor="middle" fontSize="30">100%</text>
            <text className="rev__center-cap" x="100" y="120" textAnchor="middle" fontSize="11" direction="rtl">إجمالي الإيرادات</text>
          </svg>
        </div>

        <div className="rev__streams">
          {segs.map((s, i) => (
            <div className="rev-stream" data-accent={s.accent} data-i={i} key={s.id}>
              <span className="rev-stream__sw" aria-hidden="true" />
              <div className="rev-stream__body">
                <span className="rev-stream__name">{s.ar}</span>
                <span className="rev-stream__desc">{s.desc}</span>
                <span className="rev-stream__bar"><i data-w={`${(s.pct / maxPct) * 100}%`} /></span>
              </div>
              <span className="rev-stream__pct">{s.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      <p className="source-note rev__note container">المجموع 100% — نسب نموذج الإيرادات كما وردت دون أي تقريب.</p>
    </SectionShell>
  );
}
