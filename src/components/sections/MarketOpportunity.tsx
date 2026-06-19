import { useRef } from "react";
import SectionShell from "@/components/common/SectionShell";
import CountUp from "@/components/common/CountUp";
import { market } from "@/data/projectContent";
import { useGsapScene } from "@/lib/scroll";
import "./MarketOpportunity.css";

// ---- demand curve geometry -------------------------------------------------
const CW = 560, CH = 300, PL = 28, PR = 16, PT = 18, PB = 34;
const pts = market.demandTrend.points;
const cx = (i: number) => PL + (i / (pts.length - 1)) * (CW - PL - PR);
const cy = (v: number) => CH - PB - (v / 100) * (CH - PB - PT);
const linePath = pts.map((v, i) => `${i ? "L" : "M"}${cx(i).toFixed(1)} ${cy(v).toFixed(1)}`).join(" ");
const areaPath = `${linePath} L${cx(pts.length - 1).toFixed(1)} ${CH - PB} L${cx(0).toFixed(1)} ${CH - PB} Z`;

// ---- donut geometry --------------------------------------------------------
const R = 70;
const C = 2 * Math.PI * R;
const under = market.youthSplit[0].value / 100;

export default function MarketOpportunity() {
  const ref = useRef<HTMLElement>(null);

  useGsapScene(ref, ({ gsap, scope, reduced, ScrollTrigger }) => {
    const line = scope.querySelector(".curve__line") as SVGPathElement | null;
    const arc = scope.querySelector(".donut__arc--teal") as SVGCircleElement | null;
    const arc2 = scope.querySelector(".donut__arc--violet") as SVGCircleElement | null;
    const llen = line?.getTotalLength?.() ?? 800;
    const tealLen = under * C;

    gsap.set(line, { strokeDasharray: llen, strokeDashoffset: reduced ? 0 : llen });
    gsap.set(arc, { strokeDasharray: `${tealLen} ${C}`, strokeDashoffset: reduced ? 0 : tealLen });
    gsap.set(arc2, { strokeDasharray: `${(1 - under) * C} ${C}`, strokeDashoffset: -tealLen, opacity: reduced ? 1 : 0 });
    if (reduced) {
      gsap.set(".curve__area", { opacity: 1 });
      gsap.set(".curve__dot", { opacity: 1 });
      return;
    }
    gsap.set([".curve__dot"], { opacity: 0 });

    const tl = gsap.timeline({
      scrollTrigger: { trigger: ".market__charts", start: "top 75%", toggleActions: "play none none none" },
    });
    tl.to(line, { strokeDashoffset: 0, duration: 1.4, ease: "power2.out" })
      .to(".curve__area", { opacity: 1, duration: 0.8 }, "-=0.8")
      .to(".curve__dot", { opacity: 1, duration: 0.3 }, "-=0.2")
      .to(arc, { strokeDashoffset: 0, duration: 1.2, ease: "power2.inOut" }, "-=1.2")
      .to(arc2, { opacity: 1, duration: 0.5 }, "-=0.3");

    ScrollTrigger.refresh();
  });

  return (
    <SectionShell
      id="market"
      index="03"
      eyebrow={market.eyebrow}
      title={market.headline}
      lede={market.sub}
      label="حجم الفرصة"
    >
      <div className="market__figures container">
        {market.figures.map((f) => (
          <div className="mfig" key={f.label} data-reveal>
            <CountUp className="stat__num" value={f.value} prefix={f.prefix} suffix={f.suffix} display={f.display} />
            <span className="mfig__label">{f.label}</span>
            {f.sub && <span className="mfig__sub">{f.sub}</span>}
          </div>
        ))}
      </div>

      <div className="market__charts container">
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
            <circle className="curve__dot" cx={cx(pts.length - 1)} cy={cy(pts[pts.length - 1])} r={5.5} />
            <text className="curve__growth" x={cx(pts.length - 1)} y={cy(pts[pts.length - 1]) - 14} textAnchor="end" fontSize={15} direction="rtl">
              ↑ نمو متسارع
            </text>
          </svg>
        </div>

        {/* youth split donut */}
        <div className="chart-card" data-reveal>
          <div className="chart-card__head">
            <h3 className="chart-card__title">القاعدة السكانية</h3>
          </div>
          <svg className="donut" viewBox="0 0 200 200" role="img" aria-label="63% من السكان تحت 35 سنة">
            <circle className="donut__track" cx="100" cy="100" r={R} />
            <circle className="donut__arc donut__arc--violet" cx="100" cy="100" r={R} stroke="var(--violet)" />
            <circle className="donut__arc donut__arc--teal" cx="100" cy="100" r={R} stroke="var(--teal)" />
            <text className="donut__center" x="100" y="96" textAnchor="middle" fontSize="34">63%</text>
            <text className="donut__center" x="100" y="120" textAnchor="middle" fontSize="13" fill="var(--ink-soft)" style={{ fontFamily: "var(--font-ar)" }} direction="rtl">
              تحت 35 سنة
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

      <p className="source-note market__note container">{market.sourceNote}</p>
    </SectionShell>
  );
}
