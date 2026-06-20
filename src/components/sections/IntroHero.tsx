import { useRef } from "react";
import SaudiMap from "@/components/common/SaudiMap";
import CountUp from "@/components/common/CountUp";
import ScrollVideoCanvas, { type ScrollVideoHandle } from "@/components/common/ScrollVideoCanvas";
import { RIYADH } from "@/data/saudiGeo";
import { useContent, useLang } from "@/i18n";
import { useGsapScene } from "@/lib/scroll";
import "./IntroHero.css";

// Real Higgsfield cinematic frame sequence (see docs/higgsfield-prompts.md).
const CINEMATIC_FRAMES = 120;
const CINEMATIC_DESKTOP = { dir: "desk", poster: "poster-desk.webp", mp4: "cinematic-desk.mp4", webm: "cinematic-desk.webm" };
const CINEMATIC_MOBILE = { dir: "mob", poster: "poster-mob.webp", mp4: "cinematic-mob.mp4", webm: "cinematic-mob.webm" };

/**
 * Section 01 — a scroll-scrubbed cinematic Saudi journey driven by a REAL
 * Higgsfield-generated frame sequence (Earth → Arabian Peninsula → Saudi
 * city-light network), composited with the site's geographically-precise SVG map.
 *
 * One pinned ScrollTrigger scrubs a timeline; its onUpdate maps scroll progress
 * straight to the canvas frame. Narrative beats (owner's mapping):
 *   0.00–0.18 distant context · 0.18–0.42 approach · 0.42–0.68 Saudi isolated ·
 *   0.68–0.86 national city-light network · 0.86–1.00 settle + hand off to the
 *   SVG precision map + «السعودية تلعب» title.
 * The SVG map, veil and title fade in only at the handoff so the cinematic frame,
 * the Saudi focus and the SVG/title never read at full strength simultaneously.
 * Desktop pins + scrubs; mobile auto-plays the condensed journey (no pin);
 * reduced-motion shows the destination poster + map + title, no scrubbing.
 */
export default function IntroHero() {
  const ref = useRef<HTMLElement>(null);
  const canvasRef = useRef<ScrollVideoHandle>(null);
  const { hero, ui, brand } = useContent();
  const { lang } = useLang();

  useGsapScene(ref, ({ gsap, scope, reduced }) => {
    const canvas = canvasRef.current;
    const border = scope.querySelector(".intro__map [data-map-border]") as SVGPathElement | null;
    const zoom = scope.querySelector(".intro__map [data-map-zoom]") as SVGGElement | null;
    const nodes = Array.from(scope.querySelectorAll<SVGGElement>(".intro__map .saudimap__node"));
    const links = Array.from(scope.querySelectorAll<SVGPathElement>(".intro__map .saudimap__link"));

    const blen = border?.getTotalLength?.() ?? 2838;
    gsap.set(border, { strokeDasharray: blen });
    links.forEach((l) => {
      const len = l.getTotalLength?.() ?? 200;
      gsap.set(l, { strokeDasharray: len, strokeDashoffset: len, opacity: 0 });
    });
    gsap.set(nodes, { transformBox: "fill-box", transformOrigin: "center" });

    if (reduced) {
      // static destination: the canvas shows its poster (a mid/Saudi-clear frame);
      // the precision SVG map + title are simply present, no scrubbing.
      gsap.set(".intro__map", { opacity: 1, scale: 1 });
      gsap.set(".intro__veil", { opacity: 0.7 });
      gsap.set(border, { strokeDashoffset: 0 });
      gsap.set(nodes, { opacity: 1, scale: 1 });
      gsap.set(links, { strokeDashoffset: 0, opacity: 0.5 });
      gsap.set([".intro__eyebrow", ".intro__titlewrap", ".intro__supporting"], { opacity: 1, y: 0 });
      return;
    }

    // initial: only the cinematic frame + eyebrow; map / veil / title held back
    gsap.set(".intro__map", { opacity: 0, scale: 1.12, transformOrigin: "50% 48%" });
    gsap.set(".intro__veil", { opacity: 0 });
    gsap.set(".intro__titlewrap", { opacity: 0, y: 30 });
    gsap.set(".intro__supporting", { opacity: 0, y: 16 });
    gsap.set(".intro__eyebrow", { opacity: 0, y: 12 });
    gsap.set(nodes, { opacity: 0, scale: 0 });
    gsap.timeline({ delay: 0.2 }).to(".intro__eyebrow", { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" });

    // draw the first cinematic frame immediately
    canvas?.renderProgress(0);

    const build = (scrub: boolean) => {
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        // the canvas frame is the TRUE scroll progress; the timeline (duration 1)
        // is normalized so onUpdate progress == scroll progress == frame position
        onUpdate() { canvas?.renderProgress(this.progress()); },
        scrollTrigger: scrub
          ? { trigger: scope, start: "top top", end: "+=320%", scrub: 0.6, pin: ".intro__stage", anticipatePin: 1 }
          : undefined,
      });

      // 0.50–0.66 — veil darkens the bright city-light frames for text legibility
      tl.to(".intro__veil", { opacity: 0.92, duration: 0.16 }, 0.5);
      // 0.64–0.80 — SVG precision map resolves OUT of the city-light network
      tl.to(".intro__map", { opacity: 1, scale: 1, duration: 0.16 }, 0.64);
      tl.to(border, { strokeDashoffset: 0, duration: 0.16 }, 0.7);
      // 0.74–0.90 — national nodes + connections ignite
      tl.to(nodes, { opacity: 1, scale: 1, stagger: 0.01, duration: 0.12, ease: "back.out(1.6)" }, 0.74);
      tl.to(links, { strokeDashoffset: 0, opacity: 0.5, stagger: 0.008, duration: 0.12 }, 0.78);
      tl.to(zoom, { scale: 1.06, svgOrigin: `${RIYADH.x} ${RIYADH.y}`, duration: 0.18 }, 0.7);
      // 0.80–0.97 — the «السعودية تلعب» title + statement settle in
      tl.to(".intro__titlewrap", { opacity: 1, y: 0, duration: 0.12, ease: "power2.out" }, 0.8);
      tl.to(".intro__supporting", { opacity: 1, y: 0, duration: 0.09, ease: "power2.out" }, 0.88);
      // normalize the timeline to end exactly at 1.0 (settle)
      tl.to(".intro__map", { scale: 1, duration: 0.03 }, 0.97);
      return tl;
    };

    const mm = gsap.matchMedia();
    mm.add("(min-width: 901px)", () => { build(true); });
    mm.add("(max-width: 900px)", () => {
      // condensed auto-played journey on mobile (no scroll pin): the timeline plays
      // once, scrubbing the canvas + revealing the title over ~6s, then settles.
      const tl = build(false);
      tl.timeScale(0.16);
      return () => tl.kill();
    });
  });

  return (
    <section id="intro" data-section="01" ref={ref} className="intro" aria-label={`${ui.introAria}: ${lang === "en" ? brand.nameLatin : brand.name}`}>
      <div className="intro__stage">
        {/* REAL Higgsfield cinematic frame sequence, scrubbed by scroll progress */}
        <ScrollVideoCanvas
          ref={canvasRef}
          className="intro__cinematic"
          frameCount={CINEMATIC_FRAMES}
          desktop={CINEMATIC_DESKTOP}
          mobile={CINEMATIC_MOBILE}
          reduced={false}
        />
        {/* geographically-accurate SVG Saudi map — the precision handoff overlay */}
        <div className="intro__map">
          <SaudiMap stage={2} connections="fromRiyadh" labels="none" armed flow ariaLabel={ui.mapAria} />
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
