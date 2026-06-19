import { useRef } from "react";
import SectionShell from "@/components/common/SectionShell";
import CountUp from "@/components/common/CountUp";
import { useContent, useLang } from "@/i18n";
import { useGsapScene } from "@/lib/scroll";
import "./MarketOpportunity.css";

const CW = 560, CH = 300, PL = 28, PR = 16, PT = 18, PB = 34;
const R = 70;
const C = 2 * Math.PI * R;

export default function MarketOpportunity() {
  const ref = useRef<HTMLElement>(null);
  const { market, ui } = useContent();
  const { lang } = useLang();

  const pts = market.demandTrend.points;
  const cx = (i: number) => PL + (i / (pts.length - 1)) * (CW - PL - PR);
  const cy = (v: number) => CH - PB - (v / 100) * (CH - PB - PT);
  const linePath = pts.map((v, i) => `${i ? "L" : "M"}${cx(i).toFixed(1)} ${cy(v).toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${cx(pts.length - 1).toFixed(1)} ${CH - PB} L${cx(0).toFixed(1)} ${CH - PB} Z`;
  const endX = cx(pts.length - 1);
  const endY = cy(pts[pts.length - 1]);
  const under = market.youthSplit[0].value / 100;

  // ---- "نمو متسارع" annotation — derived from the EXACT final point and
  // clamped so the label + leader always live inside the chart viewBox (and thus
  // inside the card) at every viewport. The endpoint sits in the top-right, so
  // the label is pulled inward (leftward — RTL-natural) and just above the dot,
  // with a short arrow pointing back to it. The endpoint dot is never covered.
  const A_FS = 14;
  const A_PAD = 14;                                            // safe inset from top/right
  const aX = Math.min(endX - 28, CW - PR - A_PAD);            // label right edge (grows inward/left)
  const aY = Math.min(Math.max(endY - 12, A_PAD + A_FS), CH - PB - 8);  // baseline; keeps glyph tops ~15px off the top
  const tipX = endX - 7.5, tipY = endY - 7.5;                 // arrow tip, clear of the r=5.5 dot
  const tailX = aX + 6, tailY = aY + 1;                       // arrow tail, just right of the label
  const aAng = Math.atan2(tipY - tailY, tipX - tailX);
  const aHead = 4.5;
  const annotArrow =
    `M${tailX.toFixed(1)} ${tailY.toFixed(1)} L${tipX.toFixed(1)} ${tipY.toFixed(1)} ` +
    `M${tipX.toFixed(1)} ${tipY.toFixed(1)} L${(tipX - aHead * Math.cos(aAng - 0.5)).toFixed(1)} ${(tipY - aHead * Math.sin(aAng - 0.5)).toFixed(1)} ` +
    `M${tipX.toFixed(1)} ${tipY.toFixed(1)} L${(tipX - aHead * Math.cos(aAng + 0.5)).toFixed(1)} ${(tipY - aHead * Math.sin(aAng + 0.5)).toFixed(1)}`;

  useGsapScene(ref, ({ gsap, scope, reduced, ScrollTrigger }) => {
    const line = scope.querySelector(".curve__line") as SVGPathElement | null;
    const arc = scope.querySelector(".donut__arc--teal") as SVGCircleElement | null;
    const arc2 = scope.querySelector(".donut__arc--violet") as SVGCircleElement | null;
    const numEl = scope.querySelector(".donut__num") as SVGTextElement | null;
    const llen = line?.getTotalLength?.() ?? 800;
    const pct = market.youthSplit[0].value;                 // 63
    const tealLen = under * C;

    gsap.set(line, { strokeDasharray: llen, strokeDashoffset: reduced ? 0 : llen });
    gsap.set(arc, { strokeDasharray: `${tealLen} ${C}`, strokeDashoffset: reduced ? 0 : tealLen });
    gsap.set(arc2, { strokeDasharray: `${(1 - under) * C} ${C}`, strokeDashoffset: -tealLen, opacity: reduced ? 1 : 0 });
    if (reduced) {
      gsap.set([".curve__area", ".curve__dot", ".curve__annot"], { opacity: 1 });
      if (numEl) numEl.textContent = `${pct}%`;             // final value shown at once
      return;
    }
    gsap.set([".curve__dot", ".curve__annot"], { opacity: 0 });
    if (numEl) numEl.textContent = "0%";                    // set before paint (no 63→0 flash)

    // demand-trend line (left card)
    const tl = gsap.timeline({ scrollTrigger: { trigger: ".market__charts", start: "top 75%", toggleActions: "play none none none" } });
    tl.to(line, { strokeDashoffset: 0, duration: 1.4, ease: "power2.out" })
      .to(".curve__area", { opacity: 1, duration: 0.8 }, "-=0.8")
      .to(".curve__dot", { opacity: 1, duration: 0.3 }, "-=0.15")
      // annotation slides in only after the line finishes drawing, anchored to the endpoint
      .fromTo(".curve__annot", { opacity: 0, x: -6, y: 6 }, { opacity: 1, x: 0, y: 0, duration: 0.5, ease: "power2.out" });

    // demographic donut (right card) — the 0→63% NUMBER and the teal ring draw
    // are driven by ONE tween so they are perfectly synchronised. Plays once when
    // the card reaches its reading position (toggleActions: play none none none,
    // so small scroll jitter never restarts it). The count is written straight to
    // the DOM (not React state) so assistive tech never hears the intermediate
    // ticks — the accessible value lives on the donut's aria-label.
    const ring = { p: 0 };
    gsap.timeline({ scrollTrigger: { trigger: ".market__donut", start: "top 80%", toggleActions: "play none none none" } })
      .to(ring, {
        p: 1, duration: 1.5, ease: "power2.out",
        onUpdate: () => {
          if (arc) gsap.set(arc, { strokeDashoffset: tealLen * (1 - ring.p) });
          if (numEl) numEl.textContent = `${Math.round(pct * ring.p)}%`;
        },
      })
      .to(arc2, { opacity: 1, duration: 0.5 }, "-=0.25");

    ScrollTrigger.refresh();
  });

  return (
    <SectionShell id="market" index="03" eyebrow={market.eyebrow} title={market.headline} lede={market.sub} label={market.headline}>
      <div className="market__figures container">
        {market.figures.map((f) => (
          <div className="mfig" key={f.label} data-reveal>
            <CountUp className="stat__num" value={f.value} prefix={f.prefix} suffix={f.suffix} display={f.display} />
            <span className="mfig__label">{f.label}</span>
            {f.sub && <span className="mfig__sub">{f.sub}</span>}
          </div>
        ))}
      </div>

      <div className="market__composition container">
        <div className="market__charts">
          {/* demand trend */}
          <div className="chart-card" data-reveal>
            <div className="chart-card__head">
              <h3 className="chart-card__title">{market.demandTrend.label}</h3>
              <span className="chart-card__cap">{market.demandTrend.caption}</span>
            </div>
            <svg className="curve" viewBox={`0 0 ${CW} ${CH}`} role="img" aria-label={`${market.demandTrend.label} — ${market.demandTrend.caption}`}>
              <defs>
                <linearGradient id="mk-line" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="var(--teal)" />
                  <stop offset="1" stopColor="var(--violet-bright)" />
                </linearGradient>
                <linearGradient id="mk-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="rgba(56,224,205,0.34)" />
                  <stop offset="1" stopColor="rgba(56,224,205,0)" />
                </linearGradient>
              </defs>
              {[0.25, 0.5, 0.75].map((g) => (
                <line key={g} className="curve__grid" x1={PL} x2={CW - PR} y1={cy(g * 100)} y2={cy(g * 100)} />
              ))}
              <line className="curve__grid" x1={PL} x2={CW - PR} y1={CH - PB} y2={CH - PB} />
              <path className="curve__area" d={areaPath} />
              <path className="curve__line" d={linePath} />
              <circle className="curve__dot" cx={endX} cy={endY} r={5.5} />
              {/* annotation: absolute, viewBox-clamped coords (never the old
                  arbitrary percentages) so it stays inside the chart card at all
                  sizes; arrow points to the dot without covering it */}
              <g className="curve__annot">
                <path className="curve__annot-arrow" d={annotArrow} />
                {/* endpoint sits top-right in BOTH languages, so the label must
                    grow inward (leftward) to stay inside the panel. That means the
                    text anchor is "start" for RTL and "end" for LTR — both pin the
                    label's right edge at aX and let it extend left toward the chart. */}
                <text className="curve__growth" x={aX} y={aY} textAnchor={lang === "en" ? "end" : "start"} fontSize={A_FS} direction={lang === "en" ? "ltr" : "rtl"}>
                  {market.demandTrend.annotation}
                </text>
              </g>
            </svg>
          </div>

          {/* youth split donut */}
          <div className="chart-card market__donut" data-reveal>
            <div className="chart-card__head">
              <h3 className="chart-card__title">{market.demographicsTitle}</h3>
            </div>
            {/* role=img + aria-label means AT reads ONLY the spoken value
                ("63 بالمئة / 63 percent"), never the animated tick digits */}
            <svg className="donut" viewBox="0 0 200 200" role="img" aria-label={`${market.youthSplit[0].value} ${lang === "en" ? "percent" : "بالمئة"} — ${market.youthSplit[0].label}`}>
              <circle className="donut__track" cx="100" cy="100" r={R} />
              <circle className="donut__arc donut__arc--violet" cx="100" cy="100" r={R} stroke="var(--violet)" />
              <circle className="donut__arc donut__arc--teal" cx="100" cy="100" r={R} stroke="var(--teal)" />
              <text className="donut__center donut__num" x="100" y="96" textAnchor="middle" fontSize="34" aria-hidden="true">{market.youthSplit[0].value}%</text>
              <text className="donut__center" x="100" y="120" textAnchor="middle" fontSize="13" fill="var(--ink-soft)" style={{ fontFamily: "var(--font-ar)" }} direction={lang === "en" ? "ltr" : "rtl"} aria-hidden="true">
                {market.youthSplit[0].label}
              </text>
            </svg>
            <ul className="donut-legend">
              {market.youthSplit.map((y) => (
                <li key={y.id}>
                  <span className="sw" style={{ background: y.accent === "teal" ? "var(--teal)" : "var(--violet)" }} />
                  {y.label} — {y.value}%
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="source-note market__note">{ui.sourceNote}</p>
      </div>
    </SectionShell>
  );
}
