import { useRef } from "react";
import { Icon, type IconName } from "@/components/common/icons";
import { experience } from "@/data/projectContent";
import { useGsapScene } from "@/lib/scroll";
import { useReducedMotion, usePageVisible } from "@/lib/hooks";
import "./ExperienceZones.css";

const CORE = { x: 500, y: 240 };
const RX = 400, RY = 185;
const aud = experience.audiences.map((a, i) => {
  const ang = ((-90 + i * (360 / experience.audiences.length)) * Math.PI) / 180;
  return {
    ...a,
    x: CORE.x + RX * Math.cos(ang),
    y: CORE.y + RY * Math.sin(ang),
    lx: CORE.x + (RX + 46) * Math.cos(ang),
    ly: CORE.y + (RY + 30) * Math.sin(ang),
  };
});

/**
 * Section 05 — Project concept & experience zones. A living «السعودية تلعب» core
 * radiates to its audiences, then the five experience zones unfold as a
 * touch-friendly horizontal snap sequence — one connected destination, each
 * zone with its own icon, accent, copy and ambient micro-interaction.
 */
export default function ExperienceZones() {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const visible = usePageVisible();
  const spin = !reduced && visible;

  useGsapScene(ref, ({ gsap, reduced: red, ScrollTrigger }) => {
    const links = gsap.utils.toArray<SVGPathElement>(".zorbit-link");
    const auds = gsap.utils.toArray<SVGGElement>(".zaud");
    links.forEach((l) => {
      const len = l.getTotalLength?.() ?? 400;
      gsap.set(l, { strokeDasharray: len, strokeDashoffset: red ? 0 : len });
    });
    if (red) return;
    gsap.set(auds, { opacity: 0, scale: 0.4, transformBox: "fill-box", transformOrigin: "center" });
    gsap.set(".zorbit-core", { transformBox: "fill-box", transformOrigin: "center", scale: 0.6, opacity: 0 });

    const tl = gsap.timeline({ scrollTrigger: { trigger: ".zones__orbit", start: "top 72%", toggleActions: "play none none none" } });
    tl.to(".zorbit-core, .zorbit-core-label", { opacity: 1, scale: 1, duration: 0.6, ease: "back.out(1.5)" })
      .to(links, { strokeDashoffset: 0, duration: 0.8, stagger: 0.07 }, "-=0.2")
      .to(auds, { opacity: 1, scale: 1, duration: 0.5, stagger: 0.08, ease: "back.out(1.5)" }, "-=0.6");

    // each experience zone gets its own staggered entrance
    gsap.set(".zone-card", { opacity: 0, y: 28 });
    gsap.to(".zone-card", {
      opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: "power3.out",
      scrollTrigger: { trigger: ".zones__row", start: "top 84%", toggleActions: "play none none none" },
    });
    ScrollTrigger.refresh();
  });

  return (
    <section id="zones" data-section="05" ref={ref} className="section section--zones" data-spin={spin} aria-label="مناطق التجربة">
      <div className="container sec-header" data-reveal>
        <p className="eyebrow"><span className="sec-index">05</span>{experience.eyebrow}</p>
        <h2 className="heading-xl sec-title">{experience.coreTitle} — نواة التجربة</h2>
        <p className="lede sec-lede">{experience.coreSub}</p>
      </div>

      <div className="zones__orbit-wrap container">
        <svg className="zones__orbit" viewBox="0 0 1000 480" role="img" aria-label="نواة السعودية تلعب متصلة بالجماهير وفئات التجربة">
          <defs>
            <linearGradient id="z-link" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="rgba(56,224,205,0.7)" />
              <stop offset="1" stopColor="rgba(138,120,240,0.5)" />
            </linearGradient>
            <radialGradient id="z-core" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="rgba(95,243,226,0.85)" />
              <stop offset="0.5" stopColor="rgba(56,224,205,0.25)" />
              <stop offset="1" stopColor="rgba(56,224,205,0)" />
            </radialGradient>
          </defs>
          <ellipse className="zorbit-ring" cx={CORE.x} cy={CORE.y} rx={RX} ry={RY} />
          {aud.map((a) => (
            <path key={`l-${a.id}`} className="zorbit-link" d={`M${CORE.x} ${CORE.y} L${a.x.toFixed(1)} ${a.y.toFixed(1)}`} />
          ))}
          <g className="zorbit-core">
            <circle cx={CORE.x} cy={CORE.y} r={92} fill="url(#z-core)" />
            <circle className="zorbit-core" cx={CORE.x} cy={CORE.y} r={52} />
          </g>
          <text className="zorbit-core-label" x={CORE.x} y={CORE.y - 4} textAnchor="middle" fontSize={22} direction="rtl">السعودية</text>
          <text className="zorbit-core-label" x={CORE.x} y={CORE.y + 22} textAnchor="middle" fontSize={22} direction="rtl">تلعب</text>
          {aud.map((a) => (
            <g className="zaud" key={a.id}>
              <circle cx={a.x} cy={a.y} r={26} fill="rgba(56,224,205,0.1)" stroke="var(--line-strong)" strokeWidth={1} />
              <circle className="zaud-dot" cx={a.x} cy={a.y} r={4.5} />
              <text className="zaud-label" x={a.lx} y={a.ly + 5} textAnchor="middle" fontSize={17} direction="rtl">{a.ar}</text>
            </g>
          ))}
        </svg>
      </div>

      <div className="container zones__seq-head" data-reveal>
        <p className="eyebrow eyebrow--violet">{experience.zonesTitle}</p>
        <h3 className="heading-lg">{experience.zonesSub}</h3>
      </div>

      <div className="zones__row" role="list" aria-label="مناطق التجربة الخمس">
        {experience.zones.map((z, i) => (
          <article className="zone-card" data-accent={z.accent} key={z.id} role="listitem" tabIndex={0}>
            <div className="zone-card__viz" aria-hidden="true">
              <span className="ring" />
              <span className="ring r2" />
              <Icon className="glyph" name={z.icon as IconName} size={46} />
            </div>
            <span className="zone-card__index">{String(i + 1).padStart(2, "0")} / 05</span>
            <h4 className="zone-card__ar">{z.ar}</h4>
            <span className="zone-card__en">{z.en}</span>
            <p className="zone-card__desc">{z.desc}</p>
          </article>
        ))}
      </div>
      <p className="zones__hint" aria-hidden="true">اسحب أفقيًا لاستكشاف المناطق ←</p>
    </section>
  );
}
