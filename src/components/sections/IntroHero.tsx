import { useRef } from "react";
import SaudiMap from "@/components/common/SaudiMap";
import CountUp from "@/components/common/CountUp";
import { RIYADH } from "@/data/saudiGeo";
import { useContent } from "@/i18n";
import { media } from "@/data/media";
import { useGsapScene } from "@/lib/scroll";
import "./IntroHero.css";

/**
 * Section 01 — Cinematic opening. The initial state is calm (atmosphere +
 * eyebrow). As the scroll begins, «السعودية تلعب» masks up inside a protected
 * clear zone; then the national border draws once, city nodes ignite, arcs reach
 * out from Riyadh, and the camera gently settles on Riyadh. No city labels here
 * (they belong to §04) so nothing collides with the title. Desktop pins + scrubs;
 * mobile/reduced-motion get the same beats without a pin.
 */
export default function IntroHero() {
  const ref = useRef<HTMLElement>(null);
  const { hero, ui } = useContent();

  useGsapScene(ref, ({ gsap, scope, reduced }) => {
    const border = scope.querySelector(".intro__map [data-map-border]") as SVGPathElement | null;
    const zoom = scope.querySelector(".intro__map [data-map-zoom]") as SVGGElement | null;
    const nodes = Array.from(scope.querySelectorAll<SVGGElement>(".intro__map .saudimap__node"));
    const links = Array.from(scope.querySelectorAll<SVGPathElement>(".intro__map .saudimap__link"));
    const titleSpans = gsap.utils.toArray<HTMLElement>(".intro__title .line > span");

    const blen = border?.getTotalLength?.() ?? 2838;
    gsap.set(border, { strokeDasharray: blen });
    links.forEach((l) => {
      const len = l.getTotalLength?.() ?? 200;
      gsap.set(l, { strokeDasharray: len, strokeDashoffset: len, opacity: 0 });
    });
    gsap.set(nodes, { transformBox: "fill-box", transformOrigin: "center" });

    if (reduced) {
      gsap.set(border, { strokeDashoffset: 0 });
      gsap.set(nodes, { opacity: 1, scale: 1 });
      gsap.set(links, { strokeDashoffset: 0, opacity: 0.5 });
      gsap.set(titleSpans, { yPercent: 0 });
      gsap.set([".intro__eyebrow", ".intro__titlewrap", ".intro__supporting"], { opacity: 1, y: 0 });
      return;
    }

    // initial calm state: eyebrow only; title + map held back
    gsap.set(border, { strokeDashoffset: blen });
    gsap.set(nodes, { opacity: 0, scale: 0 });
    gsap.set(titleSpans, { yPercent: 120 });
    gsap.set(".intro__titlewrap", { opacity: 0 });
    gsap.set(".intro__supporting", { opacity: 0, y: 16 });
    gsap.set(".intro__eyebrow", { opacity: 0, y: 12 });
    gsap.timeline({ delay: 0.2 }).to(".intro__eyebrow", { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" });

    const buildScene = (scrub: boolean, withZoom: boolean) => {
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: scrub
          ? { trigger: scope, start: "top top", end: "+=200%", scrub: 0.6, pin: ".intro__stage", anticipatePin: 1 }
          : undefined,
      });
      // 1 — title reveals as the scroll begins
      tl.to(".intro__titlewrap", { opacity: 1, duration: 0.25 });
      tl.to(titleSpans, { yPercent: 0, duration: 1, stagger: 0.14, ease: "power3.out" }, "<");
      tl.to(".intro__supporting", { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" }, "-=0.35");
      // 2 — the map ignites
      tl.to(border, { strokeDashoffset: 0, duration: 1.6 }, ">-0.15");
      tl.to(nodes, { opacity: 1, scale: 1, stagger: 0.05, duration: 0.8, ease: "back.out(1.5)" }, "-=0.8");
      tl.to(links, { strokeDashoffset: 0, opacity: 0.5, stagger: 0.04, duration: 0.8 }, "-=0.55");
      // 3 — gentle, non-retracting focus on Riyadh (whole boundary stays in frame)
      if (withZoom) {
        tl.to(zoom, { scale: 1.16, svgOrigin: `${RIYADH.x} ${RIYADH.y}`, duration: 1.6, ease: "power2.inOut" });
        tl.to(".intro__veil", { opacity: 1, duration: 1 }, "<");
      }
      return tl;
    };

    const mm = gsap.matchMedia();
    mm.add("(min-width: 901px)", () => {
      buildScene(true, true);
    });
    mm.add("(max-width: 900px)", () => {
      gsap.set(".intro__titlewrap", { opacity: 1 });
      const tl = buildScene(false, false);
      return () => tl.kill();
    });
  });

  return (
    <section id="intro" data-section="01" ref={ref} className="intro" aria-label="الافتتاحية — السعودية تلعب">
      <div className="intro__stage">
        {media.hero.src && (
          <img className="intro__media" src={media.hero.src} alt="" aria-hidden="true" loading="eager" decoding="async" />
        )}
        <div className="intro__map">
          <SaudiMap
            stage={2}
            connections="fromRiyadh"
            labels="none"
            armed
            ariaLabel="خريطة المملكة العربية السعودية والشبكة الوطنية للمدن"
          />
        </div>
        <div className="intro__veil" />
        <div className="intro__overlay">
          <p className="eyebrow intro__eyebrow">{hero.eyebrow}</p>
          <div className="intro__titlewrap">
            <h1 className="intro__title">
              <span className="line line--1"><span>{hero.titleLines[0]}</span></span>
              <span className="line line--2"><span>{hero.titleLines[1]}</span></span>
            </h1>
            <p className="intro__supporting">{hero.supporting}</p>
          </div>
        </div>
        <div className="intro__cue" aria-hidden="true">
          <span>{ui.cue}<i /></span>
        </div>
      </div>

      <div className="intro__case container" data-reveal>
        <div className="intro__case-head">
          <span className="badge-target badge-proven"><span className="dot" /> {ui.proven}</span>
          <p className="body" style={{ margin: 0 }}>{hero.caseStudyTag}</p>
        </div>
        <div className="intro__stats">
          {hero.stats.map((s) => (
            <div className="intro__stat" key={s.label}>
              <CountUp className="stat__num" value={s.value} prefix={s.prefix} suffix={s.suffix} display={s.display} />
              <span className="stat__label">{s.label}</span>
            </div>
          ))}
        </div>
        <p className="source-note intro__case-note">{hero.caseStudyNote}</p>
      </div>
    </section>
  );
}
