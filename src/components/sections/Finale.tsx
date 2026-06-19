import { useRef } from "react";
import SaudiMap from "@/components/common/SaudiMap";
import { useContent } from "@/i18n";
import { media } from "@/data/media";
import { useGsapScene } from "@/lib/scroll";
import "./Finale.css";

/**
 * Section 10 — Why Malahi + national finale. Five strategic strengths, then a
 * full-bleed cinematic climax: the Saudi map fills the frame and the Kingdom
 * illuminates progressively (border → arcs → nodes); only once the network is
 * established do the closing title and statement rise into a protected clear
 * zone below it. No city labels here, so nothing competes with the message.
 */
export default function Finale() {
  const ref = useRef<HTMLElement>(null);
  const { finale } = useContent();

  useGsapScene(ref, ({ gsap, scope, reduced, ScrollTrigger }) => {
    const border = scope.querySelector(".finale__map [data-map-border]") as SVGPathElement | null;
    const nodes = Array.from(scope.querySelectorAll<SVGGElement>(".finale__map .saudimap__node"));
    const links = Array.from(scope.querySelectorAll<SVGPathElement>(".finale__map .saudimap__link"));
    const labels = Array.from(scope.querySelectorAll<SVGTextElement>(".finale__map .saudimap__label"));
    const blen = border?.getTotalLength?.() ?? 2838;
    gsap.set(border, { strokeDasharray: blen });
    links.forEach((l) => {
      const len = l.getTotalLength?.() ?? 200;
      gsap.set(l, { strokeDasharray: len, strokeDashoffset: reduced ? 0 : len, opacity: reduced ? 0.45 : 0 });
    });
    gsap.set(nodes, { transformBox: "fill-box", transformOrigin: "center" });

    if (reduced) {
      gsap.set(border, { strokeDashoffset: 0 });
      gsap.set(nodes, { opacity: 1, scale: 1 });
      gsap.set(".finale__content", { opacity: 1, y: 0 });
      return;
    }
    gsap.set(border, { strokeDashoffset: blen });
    gsap.set(nodes, { opacity: 0, scale: 0 });
    gsap.set(labels, { opacity: 0 });
    gsap.set(".finale__content > *", { opacity: 0, y: 26 });

    const tl = gsap.timeline({ scrollTrigger: { trigger: ".finale__scene", start: "top 62%", toggleActions: "play none none none" } });
    tl.to(border, { strokeDashoffset: 0, duration: 1.5, ease: "power2.out" })
      .to(links, { strokeDashoffset: 0, opacity: 0.5, duration: 0.9, stagger: 0.02 }, "-=0.9")
      .to(nodes, { opacity: 1, scale: 1, duration: 0.6, stagger: 0.03, ease: "back.out(1.6)" }, "-=1")
      .to(labels, { opacity: 1, duration: 0.5, stagger: 0.05 }, "-=0.3")
      // title + statement only after the network is established
      .to(".finale__content > *", { opacity: 1, y: 0, duration: 0.8, stagger: 0.16, ease: "power3.out" }, "+=0.1");
    ScrollTrigger.refresh();
  });

  return (
    <section id="finale" data-section="10" ref={ref} className="section section--finale" aria-label="لماذا ملاهي والخاتمة الوطنية">
      <div className="container sec-header" data-reveal>
        <p className="eyebrow"><span className="sec-index">10</span>{finale.eyebrow}</p>
        <h2 className="heading-xl sec-title">{finale.title}</h2>
        <p className="lede sec-lede">{finale.sub}</p>
      </div>

      <div className="container">
        <div className="why__grid">
          {finale.strengths.map((s, i) => (
            <article className="why-card" key={s.id} data-reveal>
              <span className="why-card__num">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="why-card__ar">{s.ar}</h3>
              <p className="why-card__desc">{s.desc}</p>
            </article>
          ))}
        </div>
      </div>

      {/* full-bleed climax */}
      <div className="finale__scene">
        {media.finale.src && (
          <img className="finale__media" src={media.finale.src} alt="" aria-hidden="true" loading="lazy" decoding="async" />
        )}
        <div className="finale__map" aria-hidden="true">
          <SaudiMap stage={3} connections="fromRiyadh" labels="stage1" armed pulse ariaLabel="المملكة العربية السعودية مكتملة الإضاءة كشبكة ترفيه وطنية واحدة" />
        </div>
        <div className="finale__scrim" />
        <div className="finale__content">
          <p className="eyebrow eyebrow--gold finale__eyebrow">{finale.finaleEyebrow}</p>
          <h2 className="finale__title">{finale.finaleTitle}</h2>
          <p className="finale__statement">{finale.finaleStatement}</p>
        </div>
      </div>
    </section>
  );
}
