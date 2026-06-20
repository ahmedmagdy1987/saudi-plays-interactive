import { useEffect, useRef } from "react";
import SectionShell from "@/components/common/SectionShell";
import SaudiMap from "@/components/common/SaudiMap";
import BrandMark from "@/components/common/BrandMark";
import { Icon, type IconName } from "@/components/common/icons";
import { useContent, useLang } from "@/i18n";
import { useGsapScene } from "@/lib/scroll";
import { prefersReducedMotion } from "@/lib/hooks";
import "./NationalVision.css";

const SAT = [
  { x: 205, y: 140 },
  { x: 795, y: 140 },
  { x: 205, y: 470 },
  { x: 795, y: 470 },
];
const CORE = { x: 500, y: 305 };
const FORCE_ICONS: Record<string, IconName> = {
  v2030: "spark",
  growth: "analytics",
  tourism: "tourism",
  demand: "society",
};

function link(sx: number, sy: number) {
  const mx = (sx + CORE.x) / 2;
  const my = (sy + CORE.y) / 2 - 24;
  return `M${sx} ${sy} Q${mx} ${my} ${CORE.x} ${CORE.y}`;
}

/**
 * Section 02 — National vision. Four converging forces join the central
 * «السعودية تلعب» network: connectors draw in and satellite nodes ignite as the
 * section enters view, over a faint national map. Supporting cards carry the
 * detail — the forces are never just four flat cards.
 */
export default function NationalVision() {
  const ref = useRef<HTMLElement>(null);
  const { vision, brand } = useContent();
  const { lang } = useLang();
  // central project node, localized: "السعودية / تلعب" or "Saudi / Plays"
  const coreLines = (lang === "en" ? brand.nameLatin : brand.name).split(" ");
  const tdir = lang === "en" ? "ltr" : "rtl";

  // radar pulse only runs while the section is in view and the tab is visible
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const sec = document.getElementById("vision");
    if (!sec) return;
    let inView = false;
    const apply = () => sec.setAttribute("data-radar", inView && !document.hidden ? "on" : "off");
    const io = new IntersectionObserver(([e]) => { inView = e.isIntersecting; apply(); }, { threshold: 0.04 });
    io.observe(sec);
    const onVis = () => apply();
    document.addEventListener("visibilitychange", onVis);
    apply();
    return () => { io.disconnect(); document.removeEventListener("visibilitychange", onVis); };
  }, []);

  useGsapScene(ref, ({ gsap, scope, reduced, ScrollTrigger }) => {
    const lines = gsap.utils.toArray<SVGPathElement>(".vline");
    const sats = gsap.utils.toArray<SVGGElement>(".vsat");
    lines.forEach((l) => {
      const len = l.getTotalLength?.() ?? 400;
      gsap.set(l, { strokeDasharray: len, strokeDashoffset: reduced ? 0 : len });
    });
    if (reduced) return;

    gsap.set(sats, { opacity: 0, transformBox: "fill-box", transformOrigin: "center", scale: 0.4 });
    gsap.set(".vsat-core", { transformBox: "fill-box", transformOrigin: "center", scale: 0.6, opacity: 0 });

    const tl = gsap.timeline({
      scrollTrigger: { trigger: scope, start: "top 70%", toggleActions: "play none none none" },
    });
    tl.to(".vsat-core", { opacity: 1, scale: 1, duration: 0.7, ease: "back.out(1.6)" })
      .to(lines, { strokeDashoffset: 0, duration: 0.9, stagger: 0.12, ease: "power2.out" }, "-=0.2")
      .to(sats, { opacity: 1, scale: 1, duration: 0.6, stagger: 0.12, ease: "back.out(1.5)" }, "-=0.7");

    // explanatory cards reveal AFTER the network, with a restrained stagger
    gsap.set(".vforce", { opacity: 0, y: 26 });
    gsap.to(".vforce", {
      opacity: 1, y: 0, duration: 0.6, stagger: 0.12, ease: "power3.out",
      scrollTrigger: { trigger: ".vision__forces", start: "top 84%", toggleActions: "play none none none" },
    });

    ScrollTrigger.refresh();
  });

  return (
    <SectionShell
      ref={ref}
      id="vision"
      index="02"
      eyebrow={vision.eyebrow}
      title={vision.headline}
      lede={vision.sub}
      label={vision.headline}
    >
      <div className="vision__stage container">
        <div className="vision__map" aria-hidden="true">
          <SaudiMap stage={3} connections="none" labels="none" pulse={false} ariaLabel="" />
        </div>
        <svg className="vision__converge" viewBox="0 0 1000 610" role="img" aria-label={vision.convergeStatement}>
          <defs>
            <linearGradient id="v-link" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="rgba(56,224,205,0.7)" />
              <stop offset="1" stopColor="rgba(138,120,240,0.55)" />
            </linearGradient>
            <radialGradient id="v-core" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="rgba(95,243,226,0.9)" />
              <stop offset="0.5" stopColor="rgba(56,224,205,0.3)" />
              <stop offset="1" stopColor="rgba(56,224,205,0)" />
            </radialGradient>
          </defs>

          {SAT.map((s, i) => (
            <path key={i} className="vline" d={link(s.x, s.y)} />
          ))}

          {/* core — national radar signal */}
          <g className="vsat-core">
            <circle className="vcore-breathe" cx={CORE.x} cy={CORE.y} r={86} fill="url(#v-core)" />
            <circle className="vradar vradar--1" cx={CORE.x} cy={CORE.y} r={44} />
            <circle className="vradar vradar--2" cx={CORE.x} cy={CORE.y} r={44} />
            <circle className="vradar vradar--3" cx={CORE.x} cy={CORE.y} r={44} />
            <circle cx={CORE.x} cy={CORE.y} r={46} fill="rgba(6,16,34,0.85)" stroke="var(--teal)" strokeWidth={1.4} />
            <text className="vcore-label" x={CORE.x} y={CORE.y - 2} textAnchor="middle" fontSize={21} direction={tdir}>
              {coreLines[0]}
            </text>
            <text className="vcore-label" x={CORE.x} y={CORE.y + 22} textAnchor="middle" fontSize={21} direction={tdir}>
              {coreLines[1]}
            </text>
          </g>

          {/* satellites */}
          {vision.forces.map((f, i) => {
            const s = SAT[i];
            return (
              <g className="vsat" key={f.id}>
                <circle cx={s.x} cy={s.y} r={30} fill="rgba(56,224,205,0.1)" stroke="var(--line-strong)" strokeWidth={1} />
                <circle cx={s.x} cy={s.y} r={5} fill="var(--teal-bright)" />
                <text
                  className="vsat-label"
                  x={s.x}
                  y={s.y > CORE.y ? s.y + 52 : s.y - 44}
                  textAnchor="middle"
                  fontSize={18}
                  direction={tdir}
                >
                  {f.ar}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <p className="vision__converge-note container text-grad-teal">{vision.convergeStatement}</p>

      {/* national alignment — the official Saudi Vision 2030 mark, shown exactly
          as supplied in a clean neutral container */}
      <div className="vision__align container" data-reveal>
        <BrandMark
          label={lang === "en" ? "Saudi Vision 2030" : "رؤية السعودية 2030"}
          src="/brand/vision2030.png"
          available
        />
        <span className="vision__align-cap">
          {lang === "en" ? "In alignment with Saudi Vision 2030" : "انسجامًا مع رؤية السعودية 2030"}
        </span>
      </div>

      <div className="vision__forces container">
        {vision.forces.map((f) => (
          <article className="vforce" key={f.id}>
            <span className="vforce__icon">
              <Icon name={FORCE_ICONS[f.id] ?? "spark"} size={22} />
            </span>
            <h3 className="vforce__ar">{f.ar}</h3>
            <p className="vforce__desc">{f.desc}</p>
          </article>
        ))}
      </div>
    </SectionShell>
  );
}
