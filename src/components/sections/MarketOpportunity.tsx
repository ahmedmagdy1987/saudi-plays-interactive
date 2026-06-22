import { useRef, useState } from "react";
import SectionShell from "@/components/common/SectionShell";
import CountUp from "@/components/common/CountUp";
import { useContent, useLang } from "@/i18n";
import { useGsapScene } from "@/lib/scroll";
import "./MarketOpportunity.css";

const CW = 560, CH = 300, PL = 28, PR = 16, PT = 18, PB = 34;
const R = 70;
const C = 2 * Math.PI * R;
const GAP2 = 3; // gap between the two demographic segments (viewBox units)

export default function MarketOpportunity() {
  const ref = useRef<HTMLElement>(null);
  const { market, ui } = useContent();
  const { lang } = useLang();

  // ---- demographic ring: TWO real segments (63 teal + 37 violet), cumulative
  // so they never overlap; dash lengths are baked into the JSX so the segments
  // exist in the DOM with no dependency on JS. Shared `activeYouth` drives the
  // two-way legend↔segment interaction.
  const ys = market.youthSplit;
  let yacc = 0;
  const ringSegs = ys.map((y) => {
    const start = yacc;
    yacc += y.value;
    return {
      ...y,
      color: y.accent === "teal" ? "var(--teal)" : "var(--violet)",
      dash: (y.value / 100) * C - GAP2,
      rotate: -90 + (start / 100) * 360,
      key: y.id === ys[0].id ? "under" : "over",
    };
  });
  const pctWord = lang === "en" ? "percent" : "بالمئة";
  const donutAria = `${market.demographicsTitle}: ${ys.map((y) => `${y.value} ${pctWord} ${y.label}`).join(lang === "en" ? ", " : "، ")}`;
  const [activeYouth, setActiveYouth] = useState<string | null>(null);
  const yState = (id: string) => (activeYouth ? (id === activeYouth ? " is-hot" : " is-dim") : "");
  const toggleYouth = (id: string) => setActiveYouth((cur) => (cur === id ? null : id));

  const pts = market.demandTrend.points;
  const cx = (i: number) => PL + (i / (pts.length - 1)) * (CW - PL - PR);
  const cy = (v: number) => CH - PB - (v / 100) * (CH - PB - PT);
  const linePath = pts.map((v, i) => `${i ? "L" : "M"}${cx(i).toFixed(1)} ${cy(v).toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${cx(pts.length - 1).toFixed(1)} ${CH - PB} L${cx(0).toFixed(1)} ${CH - PB} Z`;
  const endX = cx(pts.length - 1);
  const endY = cy(pts[pts.length - 1]);

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

  // ONE deterministic, pure-scroll-progress render. Every visual (curve draw, area/
  // dot/annotation fade, donut arcs, the 0→63% count) is a function of normalized
  // progress p∈[0,1] from a single scrubbed ScrollTrigger — so forward scroll fills
  // smoothly and reverse scroll un-fills along the EXACT same path, with no play-once
  // timeline, no restart at boundaries, and no stepping/cut. Only stroke-dashoffset
  // (presentation) + opacity are touched — never the interactive segments' opacity —
  // so the legend↔segment highlighting is untouched.
  useGsapScene(ref, ({ gsap, scope, reduced, ScrollTrigger }) => {
    const line = scope.querySelector(".curve__line") as SVGPathElement | null;
    const area = scope.querySelector(".curve__area") as SVGPathElement | null;
    const dot = scope.querySelector(".curve__dot") as SVGCircleElement | null;
    const annot = scope.querySelector(".curve__annot") as SVGGElement | null;
    const segUnder = scope.querySelector(".donut__seg--under") as SVGCircleElement | null;
    const segOver = scope.querySelector(".donut__seg--over") as SVGCircleElement | null;
    const numEl = scope.querySelector(".donut__num") as SVGTextElement | null;
    const llen = line?.getTotalLength?.() ?? 800;
    const pct = ys[0].value;                                // 63
    const dashUnder = (ys[0].value / 100) * C - GAP2;
    const dashOver = (ys[1].value / 100) * C - GAP2;

    // dasharray baked in JSX; we only own the reveal offset (a context revert can
    // never collapse a segment into a full ring).
    gsap.set(line, { strokeDasharray: llen });

    const sm = (x: number) => { const t = x < 0 ? 0 : x > 1 ? 1 : x; return t * t * (3 - 2 * t); };
    const seg = (p: number, a: number, b: number) => sm((p - a) / (b - a || 1));

    const render = (p: number) => {
      const lp = seg(p, 0.0, 0.55);                         // curve draws first
      if (line) line.style.strokeDashoffset = `${(llen * (1 - lp)).toFixed(2)}`;
      if (area) area.style.opacity = `${seg(p, 0.12, 0.58).toFixed(3)}`;
      if (dot) dot.style.opacity = `${seg(p, 0.5, 0.64).toFixed(3)}`;
      if (annot) {
        const ap = seg(p, 0.62, 0.9);
        annot.style.opacity = `${ap.toFixed(3)}`;
        annot.style.transform = `translate(${(-6 * (1 - ap)).toFixed(2)}px, ${(6 * (1 - ap)).toFixed(2)}px)`;
      }
      const dp = seg(p, 0.28, 0.82);                        // 63% teal arc + count, in sync
      if (segUnder) segUnder.style.strokeDashoffset = `${(dashUnder * (1 - dp)).toFixed(2)}`;
      if (numEl) numEl.textContent = `${Math.round(pct * dp)}%`;
      const op = seg(p, 0.76, 1.0);                         // 37% violet arc, its own segment
      if (segOver) segOver.style.strokeDashoffset = `${(dashOver * (1 - op)).toFixed(2)}`;
    };

    if (reduced) { render(1); return; }                    // final, static state
    render(0);                                              // hidden before the band
    ScrollTrigger.create({
      trigger: scope.querySelector(".market__charts") || scope,
      start: "top 85%",
      end: "top 38%",
      scrub: 0.4,
      onUpdate: (self) => render(self.progress),
      onRefresh: (self) => render(self.progress),
    });
  });

  return (
    <SectionShell ref={ref} id="market" index="03" eyebrow={market.eyebrow} title={market.headline} lede={market.sub} label={market.headline}>
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
            <svg className="curve" viewBox={`0 0 ${CW} ${CH}`} role="img" aria-label={`${market.demandTrend.label}: ${market.demandTrend.caption}`}>
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
            {/* role=img on the whole donut for AT; each segment is also a focusable
                button so keyboard/touch users can select it. Hovering/focusing a
                segment highlights its legend item and vice-versa (shared state). */}
            <svg className="donut" viewBox="0 0 200 200" role="img" aria-label={donutAria}>
              <circle className="donut__track" cx="100" cy="100" r={R} />
              {ringSegs.map((seg) => (
                <circle
                  key={seg.id}
                  className={`donut__seg donut__seg--${seg.key}${yState(seg.id)}`}
                  cx="100"
                  cy="100"
                  r={R}
                  stroke={seg.color}
                  strokeDasharray={`${seg.dash.toFixed(2)} ${(C - seg.dash).toFixed(2)}`}
                  style={{ transform: `rotate(${seg.rotate}deg)`, transformBox: "view-box", transformOrigin: "center", color: seg.color }}
                  data-id={seg.id}
                  tabIndex={0}
                  role="button"
                  aria-label={`${seg.value} ${pctWord} ${seg.label}`}
                  onMouseEnter={() => setActiveYouth(seg.id)}
                  onMouseLeave={() => setActiveYouth(null)}
                  onFocus={() => setActiveYouth(seg.id)}
                  onBlur={() => setActiveYouth(null)}
                  onClick={() => toggleYouth(seg.id)}
                />
              ))}
              <text className="donut__center donut__num" x="100" y="96" textAnchor="middle" fontSize="34" aria-hidden="true">{ys[0].value}%</text>
              <text className="donut__center" x="100" y="120" textAnchor="middle" fontSize="13" fill="var(--ink-soft)" style={{ fontFamily: "var(--font-ar)" }} direction={lang === "en" ? "ltr" : "rtl"} aria-hidden="true">
                {ys[0].label}
              </text>
            </svg>
            <ul className="donut-legend">
              {ringSegs.map((y) => (
                <li
                  key={y.id}
                  className={`donut-legend__item${yState(y.id)}`}
                  tabIndex={0}
                  onMouseEnter={() => setActiveYouth(y.id)}
                  onMouseLeave={() => setActiveYouth(null)}
                  onFocus={() => setActiveYouth(y.id)}
                  onBlur={() => setActiveYouth(null)}
                  onClick={() => toggleYouth(y.id)}
                >
                  <span className="sw" style={{ background: y.color }} />
                  <span className="donut-legend__txt">{y.label}: {y.value}%</span>
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
