import { useRef } from "react";
import SaudiMap from "@/components/common/SaudiMap";
import CountUp from "@/components/common/CountUp";
import BrandMark from "@/components/common/BrandMark";
import { RIYADH } from "@/data/saudiGeo";
import { useContent, useLang } from "@/i18n";
import { media } from "@/data/media";
import { useGsapScene } from "@/lib/scroll";
import "./IntroHero.css";

/**
 * Section 01 — a cinematic, scroll-driven Saudi journey. It opens in deep space:
 * a starfield with the Kingdom small and distant. Scrolling slowly zooms toward
 * the Arabian Peninsula (Beat 1), isolates Saudi as the surroundings darken
 * (Beat 2), enters as the national border draws and city lights / connections
 * ignite (Beat 3), the «السعودية تلعب» title rises into the established network
 * with the strategic-partner marks (Beat 4), then a gentle zoom-out releases
 * into §02 (Beat 5). The whole sequence uses only zoom-in / zoom-out / fade.
 * Desktop pins + scrubs the journey; mobile and reduced-motion get the same
 * beats statically/condensed without a pin.
 */
export default function IntroHero() {
  const ref = useRef<HTMLElement>(null);
  const { hero, ui, brand } = useContent();
  const { lang } = useLang();
  const partners = [
    { id: "gea", src: "/brand/gea.png", contrast: "dark" as const, label: lang === "en" ? "General Entertainment Authority" : "الهيئة العامة للترفيه" },
    { id: "vision2030", src: "/brand/vision2030.png", contrast: "light" as const, label: lang === "en" ? "Saudi Vision 2030" : "رؤية السعودية 2030" },
    { id: "qlp", src: "/brand/qlp.png", contrast: "dark" as const, label: lang === "en" ? "Quality of Life Program" : "برنامج جودة الحياة" },
  ];

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

    // resting glyphs stay at yPercent 0 (the title reveals as a whole, robustly)
    gsap.set(titleSpans, { yPercent: 0 });

    if (reduced) {
      // static destination: the established national network + title + partners
      gsap.set(".intro__space", { opacity: 0.5 });
      gsap.set(".intro__region", { opacity: 0.16 });
      gsap.set(".intro__map", { scale: 1, opacity: 1 });
      gsap.set(border, { strokeDashoffset: 0 });
      gsap.set(nodes, { opacity: 1, scale: 1 });
      gsap.set(links, { strokeDashoffset: 0, opacity: 0.5 });
      gsap.set([".intro__eyebrow", ".intro__titlewrap", ".intro__supporting", ".intro__partners", ".intro__veil"], { opacity: 1, y: 0 });
      return;
    }

    // initial deep-space state: distant, dark, title held back; eyebrow eases in
    gsap.set(".intro__space", { opacity: 1 });
    gsap.set(".intro__region", { opacity: 0, scale: 1.28 });
    gsap.set(".intro__map", { scale: 0.42, opacity: 0.28, transformOrigin: "50% 46%" });
    gsap.set(border, { strokeDashoffset: blen });
    gsap.set(nodes, { opacity: 0, scale: 0 });
    gsap.set(".intro__titlewrap", { opacity: 0, y: 30 });
    gsap.set(".intro__partners", { opacity: 0, y: 18 });
    gsap.set(".intro__supporting", { opacity: 0, y: 16 });
    gsap.set(".intro__eyebrow", { opacity: 0, y: 12 });
    gsap.set(".intro__veil", { opacity: 0 });
    gsap.timeline({ delay: 0.2 }).to(".intro__eyebrow", { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" });

    const buildJourney = (scrub: boolean) => {
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: scrub
          ? { trigger: scope, start: "top top", end: "+=260%", scrub: 0.7, pin: ".intro__stage", anticipatePin: 1 }
          : undefined,
      });

      // BEAT 1 — approach: zoom toward the peninsula; the regional context emerges
      tl.to(".intro__map", { scale: 0.74, opacity: 0.92, duration: 1.2 }, 0);
      tl.fromTo(".intro__region", { opacity: 0, scale: 1.28 }, { opacity: 0.5, scale: 1.08, duration: 1.2 }, 0);
      tl.to(".intro__space", { opacity: 0.78, duration: 1.2 }, 0);
      tl.to(border, { strokeDashoffset: 0, duration: 1.2 }, 0.4);

      // BEAT 2 — isolate: surroundings darken, Saudi becomes the sole focus
      tl.to(".intro__region", { opacity: 0.12, scale: 1.0, duration: 0.9 }, 1.1);
      tl.to(".intro__map", { scale: 0.95, duration: 0.9 }, 1.1);
      tl.to(".intro__space", { opacity: 0.5, duration: 0.9 }, 1.1);

      // BEAT 3 — enter: national light + connections ignite, push into the network
      tl.to(nodes, { opacity: 1, scale: 1, stagger: 0.04, duration: 0.8, ease: "back.out(1.5)" }, 1.9);
      tl.to(links, { strokeDashoffset: 0, opacity: 0.5, stagger: 0.03, duration: 0.7 }, 2.1);
      tl.to(".intro__map", { scale: 1.06, duration: 0.9 }, 2.0);
      tl.to(zoom, { scale: 1.12, svgOrigin: `${RIYADH.x} ${RIYADH.y}`, duration: 0.9, ease: "power1.inOut" }, 2.1);

      // BEAT 4 — the «السعودية تلعب» title rises into the established network
      tl.to(".intro__veil", { opacity: 1, duration: 0.8 }, 2.7);
      tl.to(".intro__titlewrap", { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" }, 2.75);
      tl.to(".intro__supporting", { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }, 3.1);
      // partners reveal LAST, subtly, clearly secondary to the title
      tl.to(".intro__partners", { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }, 3.4);

      // BEAT 5 — release: a gentle zoom-out settle before §02
      tl.to(".intro__map", { scale: 1.0, duration: 0.5 }, 3.9);
      return tl;
    };

    const mm = gsap.matchMedia();
    mm.add("(min-width: 901px)", () => { buildJourney(true); });
    mm.add("(max-width: 900px)", () => {
      // condensed, un-pinned journey on mobile: same beats, auto-played quickly
      // (no scroll-hijack) so the title + network arrive within a couple seconds
      const tl = buildJourney(false);
      tl.timeScale(2.3);
      return () => tl.kill();
    });
  });

  return (
    <section id="intro" data-section="01" ref={ref} className="intro" aria-label={`${ui.introAria}: ${lang === "en" ? brand.nameLatin : brand.name}`}>
      <div className="intro__stage">
        {/* deep space base — starfield + distant atmospheric glow */}
        <div className="intro__space" aria-hidden="true">
          <span className="intro__stars" />
          <span className="intro__stars intro__stars--far" />
        </div>
        {/* regional context (distant night imagery) — emerges then darkens */}
        {media.hero.src && (
          <img className="intro__region" src={media.hero.src} alt="" aria-hidden="true" loading="eager" decoding="async" />
        )}
        {/* the geographically-accurate Saudi map — distant → zooms in */}
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
            {/* strategic-partner marks — revealed only after the title + statement,
                in a controlled band, kept clearly secondary to the title */}
            <div className="intro__partners">
              <span className="intro__partners-label">{lang === "en" ? "Strategic partners" : "شركاء استراتيجيون"}</span>
              <span className="intro__partners-row">
                {partners.map((p) => (
                  <BrandMark key={p.id} label={p.label} src={p.src} contrast={p.contrast} available />
                ))}
              </span>
            </div>
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
