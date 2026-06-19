import { useRef } from "react";
import SaudiMap from "@/components/common/SaudiMap";
import CountUp from "@/components/common/CountUp";
import { RIYADH } from "@/data/saudiGeo";
import { hero } from "@/data/projectContent";
import { media } from "@/data/media";
import { useGsapScene } from "@/lib/scroll";
import "./IntroHero.css";

/**
 * Section 01 — Cinematic opening. Camera zoom toward an accurate Saudi map:
 * the national border draws in, city nodes ignite, connection arcs reach out
 * from Riyadh, then the camera focuses on Riyadh as the title masks into view.
 * Desktop pins + scrubs the sequence; mobile/reduced-motion get the same beats
 * as a one-time (or static) reveal in natural flow — never scroll-hijacked.
 */
export default function IntroHero() {
  const ref = useRef<HTMLElement>(null);

  useGsapScene(ref, ({ gsap, scope, reduced }) => {
    const border = scope.querySelector(".intro__map [data-map-border]") as SVGPathElement | null;
    const zoom = scope.querySelector(".intro__map [data-map-zoom]") as SVGGElement | null;
    const nodes = Array.from(scope.querySelectorAll<SVGGElement>(".intro__map .saudimap__node"));
    const links = Array.from(scope.querySelectorAll<SVGPathElement>(".intro__map .saudimap__link"));
    const nonOrigin = Array.from(
      scope.querySelectorAll<SVGGElement>(".intro__map .saudimap__node:not(.saudimap__node--origin)"),
    );
    const nonOriginLabels = Array.from(
      scope.querySelectorAll<SVGTextElement>(".intro__map .saudimap__label:not(.saudimap__label--origin)"),
    );
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
      gsap.set(links, { strokeDashoffset: 0, opacity: 0.55 });
      gsap.set(titleSpans, { yPercent: 0 });
      return;
    }

    gsap.set(border, { strokeDashoffset: blen });
    gsap.set(nodes, { opacity: 0, scale: 0 });

    // Title reveals immediately on load (content is never gated behind scroll);
    // the map sequence is what the scroll drives.
    gsap.set(titleSpans, { yPercent: 118 });
    gsap.set([".intro__eyebrow", ".intro__supporting"], { opacity: 0, y: 18 });
    gsap
      .timeline({ delay: 0.15 })
      .to(".intro__eyebrow", { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" })
      .to(titleSpans, { yPercent: 0, duration: 0.95, stagger: 0.12, ease: "power3.out" }, "-=0.35")
      .to(".intro__supporting", { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" }, "-=0.45");

    const buildMap = (scrub: boolean) => {
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: scrub
          ? {
              trigger: scope,
              start: "top top",
              end: "+=180%",
              scrub: 0.6,
              pin: ".intro__stage",
              anticipatePin: 1,
            }
          : undefined,
      });
      tl.to(border, { strokeDashoffset: 0, duration: 1.4 });
      tl.to(nodes, { opacity: 1, scale: 1, stagger: 0.05, duration: 0.7, ease: "back.out(1.5)" }, "-=0.5");
      tl.to(links, { strokeDashoffset: 0, opacity: 0.55, stagger: 0.04, duration: 0.7 }, "-=0.4");
      tl.to(zoom, { scale: 1.4, svgOrigin: `${RIYADH.x} ${RIYADH.y}`, duration: 1.5, ease: "power2.inOut" });
      tl.to(nonOrigin, { opacity: 0.22, duration: 0.6 }, "<");
      tl.to(nonOriginLabels, { opacity: 0, duration: 0.4 }, "<");
      tl.to(".intro__veil", { opacity: 1, duration: 0.8 }, "<");
      return tl;
    };

    const mm = gsap.matchMedia();
    mm.add("(min-width: 901px)", () => {
      buildMap(true);
    });
    mm.add("(max-width: 900px)", () => {
      const tl = buildMap(false);
      return () => tl.kill();
    });
  });

  return (
    <section id="intro" data-section="01" ref={ref} className="intro" aria-label="الافتتاحية — السعودية تلعب">
      <div className="intro__stage">
        {media.hero.src && (
          <img
            className="intro__media"
            src={media.hero.src}
            alt=""
            aria-hidden="true"
            loading="eager"
            decoding="async"
          />
        )}
        <div className="intro__map">
          <SaudiMap
            stage={2}
            connections="fromRiyadh"
            labels="stage1"
            armed
            ariaLabel="خريطة المملكة وشبكة المدن مع التركيز على الرياض"
          />
        </div>
        <div className="intro__veil" />
        <div className="intro__overlay">
          <p className="eyebrow intro__eyebrow">{hero.eyebrow}</p>
          <h1 className="intro__title">
            <span className="line line--1">
              <span>{hero.titleLines[0]}</span>
            </span>
            <span className="line line--2">
              <span>{hero.titleLines[1]}</span>
            </span>
          </h1>
          <p className="intro__supporting">{hero.supporting}</p>
        </div>
        <div className="intro__cue" aria-hidden="true">
          <span>
            تابع
            <i />
          </span>
        </div>
      </div>

      <div className="intro__case container" data-reveal>
        <div className="intro__case-head">
          <span className="badge-target badge-proven">
            <span className="dot" /> تجربة مُثبتة
          </span>
          <p className="body" style={{ margin: 0 }}>
            {hero.caseStudyTag}
          </p>
        </div>
        <div className="intro__stats">
          {hero.stats.map((s) => (
            <div className="intro__stat" key={s.label}>
              <CountUp
                className="stat__num"
                value={s.value}
                prefix={s.prefix}
                suffix={s.suffix}
                display={s.display}
              />
              <span className="stat__label">{s.label}</span>
            </div>
          ))}
        </div>
        <p className="source-note intro__case-note">{hero.caseStudyNote}</p>
      </div>
    </section>
  );
}
