import { useEffect, useRef } from "react";
import SectionShell from "@/components/common/SectionShell";
import SaudiMap from "@/components/common/SaudiMap";
import BrandMark from "@/components/common/BrandMark";
import { Icon, type IconName } from "@/components/common/icons";
import { useContent, useLang } from "@/i18n";
import { useGsapScene } from "@/lib/scroll";
import "./NationalVision.css";

const FORCE_ICONS: Record<string, IconName> = {
  v2030: "spark",
  growth: "analytics",
  tourism: "tourism",
  demand: "society",
};

/**
 * Section 02 — National vision. A clean central Kingdom hub (the «السعودية تلعب»
 * platform over the national map) states the convergence; the four forces are then
 * presented as a structured grid of premium cards — not a crude floating-node graph.
 */
export default function NationalVision() {
  const ref = useRef<HTMLElement>(null);
  const { vision, brand } = useContent();
  const { lang } = useLang();
  const coreLines = (lang === "en" ? brand.nameLatin : brand.name).split(" ");
  const tdir = lang === "en" ? "ltr" : "rtl";
  const partners = [
    { id: "gea", src: "/brand/gea.png", contrast: "dark" as const, label: lang === "en" ? "General Entertainment Authority" : "الهيئة العامة للترفيه" },
    { id: "vision2030", src: "/brand/vision2030.png", contrast: "light" as const, label: lang === "en" ? "Saudi Vision 2030" : "رؤية السعودية 2030" },
    { id: "qlp", src: "/brand/qlp.png", contrast: "dark" as const, label: lang === "en" ? "Quality of Life Program" : "برنامج جودة الحياة" },
  ];

  // ambient pulse only while in view + tab visible
  useEffect(() => {
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

  useGsapScene(ref, ({ gsap, reduced }) => {
    if (reduced) return;
    gsap.set(".vision__core-badge", { opacity: 0, scale: 0.7, transformOrigin: "center" });
    gsap.timeline({ scrollTrigger: { trigger: ".vision__hub", start: "top 74%", toggleActions: "play none none none" } })
      .to(".vision__core-badge", { opacity: 1, scale: 1, duration: 0.7, ease: "back.out(1.5)" });
    // the four force cards reveal as a structured, restrained stagger
    gsap.set(".vforce", { opacity: 0, y: 26 });
    gsap.to(".vforce", {
      opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: "power3.out",
      scrollTrigger: { trigger: ".vision__forces", start: "top 84%", toggleActions: "play none none none" },
    });
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
      {/* central Kingdom hub — the national map + the platform core */}
      <div className="vision__hub container">
        <div className="vision__map" aria-hidden="true">
          <SaudiMap stage={3} connections="none" labels="none" pulse ariaLabel="" />
        </div>
        <div className="vision__core" aria-hidden="true">
          <span className="vision__core-badge" dir={tdir}>
            <b>{coreLines[0]}</b>
            <b>{coreLines[1]}</b>
          </span>
        </div>
      </div>

      <p className="vision__converge-note container text-grad-teal">{vision.convergeStatement}</p>

      {/* official strategic-partner marks */}
      <div className="vision__partners container" data-reveal>
        <span className="vision__partners-label">
          {lang === "en" ? "Strategic national partners" : "شركاء وطنيون استراتيجيون"}
        </span>
        <div className="vision__partners-row">
          {partners.map((p) => (
            <BrandMark key={p.id} label={p.label} src={p.src} contrast={p.contrast} available />
          ))}
        </div>
      </div>

      {/* the four converging forces — a structured premium card grid */}
      <div className="vision__forces container">
        {vision.forces.map((f) => (
          <article className="vforce" key={f.id}>
            <span className="vforce__icon">
              <Icon name={FORCE_ICONS[f.id] ?? "spark"} size={24} />
            </span>
            <h3 className="vforce__ar">{f.ar}</h3>
            {f.en && f.en !== f.ar && <span className="vforce__en">{f.en}</span>}
            <p className="vforce__desc">{f.desc}</p>
          </article>
        ))}
      </div>
    </SectionShell>
  );
}
