import { useRef } from "react";
import CountUp from "@/components/common/CountUp";
import { Icon, type IconName } from "@/components/common/icons";
import { useContent } from "@/i18n";
import { useGsapScene } from "@/lib/scroll";
import { useReducedMotion, usePageVisible } from "@/lib/hooks";
import "./MalahiOperating.css";

const PLAT_ICONS: Record<string, IconName> = {
  rpay: "pay",
  remote: "remote",
  analytics: "analytics",
  dashboard: "dashboard",
  monitoring: "monitor",
};

// sparkline geometry (series length is language-independent)
const SW = 480, SH = 150, SP = 6;
const sx = (i: number, n: number) => SP + (i / (n - 1)) * (SW - SP * 2);
const sy = (v: number) => SH - SP - (v / 100) * (SH - SP * 2);
const GR = 32;
const GC = 2 * Math.PI * GR;

export default function MalahiOperating() {
  const ref = useRef<HTMLElement>(null);
  const { malahi, ui } = useContent();
  const reduced = useReducedMotion();
  const visible = usePageVisible();
  const spin = !reduced && visible;
  const d = malahi.dashboard;
  const series = d.series;
  const sparkLine = series.map((v, i) => `${i ? "L" : "M"}${sx(i, series.length).toFixed(1)} ${sy(v).toFixed(1)}`).join(" ");
  const sparkArea = `${sparkLine} L${sx(series.length - 1, series.length).toFixed(1)} ${SH - SP} L${sx(0, series.length).toFixed(1)} ${SH - SP} Z`;

  useGsapScene(ref, ({ gsap, scope, reduced: red, ScrollTrigger }) => {
    const arc = scope.querySelector(".mo-gauge__arc") as SVGCircleElement | null;
    const line = scope.querySelector(".mo-spark__line") as SVGPathElement | null;
    const bar = scope.querySelector(".mo-bar__fill") as HTMLElement | null;
    const llen = line?.getTotalLength?.() ?? 600;
    const upPct = d.metrics.uptime.value / 100;
    const locPct = d.metrics.locations.value / d.metrics.locations.total;

    gsap.set(arc, { strokeDasharray: `${upPct * GC} ${GC}`, strokeDashoffset: red ? 0 : upPct * GC });
    gsap.set(line, { strokeDasharray: llen, strokeDashoffset: red ? 0 : llen });
    if (red) {
      gsap.set(".mo-spark__area", { opacity: 1 });
      if (bar) bar.style.width = `${locPct * 100}%`;
      return;
    }

    const tl = gsap.timeline({ scrollTrigger: { trigger: ".mo__dash", start: "top 78%", toggleActions: "play none none none" } });
    tl.to(arc, { strokeDashoffset: 0, duration: 1.3, ease: "power2.inOut" })
      .to(line, { strokeDashoffset: 0, duration: 1.4, ease: "power2.out" }, "-=1.1")
      .to(".mo-spark__area", { opacity: 1, duration: 0.7 }, "-=0.8")
      .to(bar, { width: `${locPct * 100}%`, duration: 1, ease: "power2.out" }, "-=1");

    // operating pillars assemble one by one
    gsap.set(".mo-pillar", { opacity: 0, y: 24 });
    gsap.to(".mo-pillar", {
      opacity: 1, y: 0, duration: 0.55, stagger: 0.1, ease: "power3.out",
      scrollTrigger: { trigger: ".mo__pillars", start: "top 84%", toggleActions: "play none none none" },
    });
    ScrollTrigger.refresh();
  });

  return (
    <section id="malahi" data-section="06" ref={ref} className="section section--malahi" data-spin={spin} aria-label={malahi.title}>
      <div className="container sec-header" data-reveal>
        <p className="eyebrow"><span className="sec-index">06</span>{malahi.eyebrow}</p>
        <h2 className="heading-xl sec-title">{malahi.title}</h2>
        <p className="lede sec-lede">{malahi.sub}</p>
      </div>

      <div className="container">
        <div className="mo__pillars">
          {malahi.pillars.map((p) => (
            <article className="mo-pillar" key={p.id}>
              <span className="mo-pillar__icon"><Icon name={p.icon as IconName} size={20} /></span>
              <h3 className="mo-pillar__ar">{p.ar}</h3>
              <p className="mo-pillar__proof">{p.proof}</p>
            </article>
          ))}
        </div>

        <h3 className="heading-lg" style={{ marginTop: "clamp(2rem,4vh,3rem)" }}>{malahi.platformTitle}</h3>
        <div className="mo__platform" data-reveal>
          {malahi.platform.map((pl) => (
            <span className="mo-plat" key={pl.id}>
              <span className="mo-plat__dot" />
              <Icon name={PLAT_ICONS[pl.id] ?? "tech"} size={16} />
              <strong>{pl.ar}</strong>
              <span>{pl.desc}</span>
            </span>
          ))}
        </div>

        {/* ---- demonstrative operations dashboard ---- */}
        <div className="mo__dash" data-reveal>
          <div className="mo__dash-bar">
            <span className="mo__dash-title">
              <Icon name="dashboard" size={20} /> {malahi.dashboardTitle}
              <span className="badge-target"><span className="dot" /> {d.label}</span>
            </span>
            <span className="mo__live" aria-hidden="true"><i /> {ui.live}</span>
          </div>

          <div className="mo__dash-grid">
            <div className="mo__tiles">
              <div className="mo-tile mo-gauge" style={{ gridColumn: "1 / -1" }}>
                <svg viewBox="0 0 80 80" role="img" aria-label={`${d.metrics.uptime.label} ${d.metrics.uptime.value}%`}>
                  <circle className="mo-gauge__track" cx="40" cy="40" r={GR} />
                  <circle className="mo-gauge__arc" cx="40" cy="40" r={GR} />
                </svg>
                <div>
                  <div className="mo-tile__label">{d.metrics.uptime.label}</div>
                  <div className="mo-tile__val">
                    <CountUp value={d.metrics.uptime.value} decimals={1} suffix="%" />
                  </div>
                </div>
              </div>
              <div className="mo-tile">
                <div className="mo-tile__label">{d.metrics.sessions.label}</div>
                <div className="mo-tile__val"><CountUp value={d.metrics.sessions.value} /></div>
              </div>
              <div className="mo-tile">
                <div className="mo-tile__label">{d.metrics.visitors.label}</div>
                <div className="mo-tile__val"><CountUp value={d.metrics.visitors.value} /></div>
              </div>
              <div className="mo-tile" style={{ gridColumn: "1 / -1" }}>
                <div className="mo-tile__label">{d.metrics.locations.label}</div>
                <div className="mo-tile__val">
                  <CountUp value={d.metrics.locations.value} />/{d.metrics.locations.total}
                </div>
                <div className="mo-bar"><div className="mo-bar__fill" /></div>
              </div>
            </div>

            <div className="mo__panel-right">
              <div className="mo-spark">
                <div className="mo-spark__head">
                  <span>{ui.sessionsFlow}</span>
                  <span className="mo-tile__en">{ui.last12h}</span>
                </div>
                <svg viewBox={`0 0 ${SW} ${SH}`} role="img" aria-label={ui.sparkAria}>
                  <defs>
                    <linearGradient id="mo-spark-grad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0" stopColor="var(--teal)" />
                      <stop offset="1" stopColor="var(--violet-bright)" />
                    </linearGradient>
                    <linearGradient id="mo-spark-area" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="rgba(56,224,205,0.28)" />
                      <stop offset="1" stopColor="rgba(56,224,205,0)" />
                    </linearGradient>
                  </defs>
                  <path className="mo-spark__area" d={sparkArea} />
                  <path className="mo-spark__line" d={sparkLine} />
                  <circle className="mo-spark__dot" cx={sx(series.length - 1, series.length)} cy={sy(series[series.length - 1])} r={4.5} />
                </svg>
              </div>
              <div className="mo-locs">
                <div className="mo-locs__title">{ui.locationsStatus}</div>
                {d.locationsList.map((loc) => (
                  <div className="mo-loc" key={loc.id}>
                    <span className={`mo-loc__status mo-loc__status--${loc.status}`} aria-hidden="true" />
                    <span className="mo-loc__name">{loc.ar}</span>
                    <span className="mo-loc__tag">{loc.status === "live" ? ui.online : ui.check}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mo__dash-foot">
            <p className="source-note">{d.disclaimer}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
