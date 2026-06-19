import { useRef } from "react";
import SaudiMap from "@/components/common/SaudiMap";
import { finale } from "@/data/projectContent";
import { media } from "@/data/media";
import { useGsapScene } from "@/lib/scroll";
import "./Finale.css";

/**
 * Section 10 — Why Malahi + national finale. Five strategic strengths, then a
 * return to the Saudi map with every node illuminated and connected — a
 * conclusion that mirrors the opening — closing on the project statement.
 */
export default function Finale() {
  const ref = useRef<HTMLElement>(null);

  useGsapScene(ref, ({ gsap, scope, reduced, ScrollTrigger }) => {
    const border = scope.querySelector(".finale__map [data-map-border]") as SVGPathElement | null;
    const nodes = gsap.utils.toArray<SVGGElement>(".finale__map .saudimap__node");
    const links = gsap.utils.toArray<SVGPathElement>(".finale__map .saudimap__link");
    const blen = border?.getTotalLength?.() ?? 2838;
    gsap.set(border, { strokeDasharray: blen });
    links.forEach((l) => {
      const len = l.getTotalLength?.() ?? 200;
      gsap.set(l, { strokeDasharray: len, strokeDashoffset: reduced ? 0 : len, opacity: reduced ? 0.5 : 0 });
    });
    gsap.set(nodes, { transformBox: "fill-box", transformOrigin: "center" });

    if (reduced) {
      gsap.set(border, { strokeDashoffset: 0 });
      gsap.set(nodes, { opacity: 1, scale: 1 });
      return;
    }
    gsap.set(border, { strokeDashoffset: blen });
    gsap.set(nodes, { opacity: 0, scale: 0 });

    const tl = gsap.timeline({ scrollTrigger: { trigger: ".finale__scene", start: "top 64%", toggleActions: "play none none none" } });
    tl.to(border, { strokeDashoffset: 0, duration: 1.4, ease: "power2.out" })
      .to(links, { strokeDashoffset: 0, opacity: 0.5, duration: 0.8, stagger: 0.02 }, "-=0.8")
      .to(nodes, { opacity: 1, scale: 1, duration: 0.6, stagger: 0.03, ease: "back.out(1.6)" }, "-=0.9")
      .from(".finale__title", { opacity: 0, y: 30, duration: 0.9, ease: "power3.out" }, "-=0.3")
      .from(".finale__statement", { opacity: 0, y: 20, duration: 0.7 }, "-=0.5")
      .from(".finale__eyebrow", { opacity: 0, duration: 0.5 }, "<");
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

        <div className="finale__scene">
          {media.finale.src && (
            <img className="finale__media" src={media.finale.src} alt="" aria-hidden="true" loading="lazy" decoding="async" />
          )}
          <div className="finale__map" aria-hidden="false">
            <SaudiMap stage={3} connections="fromRiyadh" labels="stage1" armed pulse ariaLabel="المملكة مكتملة الإضاءة كشبكة ترفيه وطنية واحدة" />
          </div>
          <div className="finale__veil" />
          <div className="finale__overlay">
            <p className="eyebrow eyebrow--gold finale__eyebrow">SAUDI PLAYS · ONE NATIONAL PLATFORM</p>
            <h2 className="finale__title">{finale.finaleTitle}</h2>
            <p className="finale__statement">{finale.finaleStatement}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
