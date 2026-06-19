import { useRef, useState } from "react";
import SectionShell from "@/components/common/SectionShell";
import SaudiMap from "@/components/common/SaudiMap";
import { Icon, type IconName } from "@/components/common/icons";
import { NODE_BY_ID, RIYADH } from "@/data/saudiGeo";
import { useContent } from "@/i18n";
import { useGsapScene } from "@/lib/scroll";
import "./RiyadhToSaudi.css";

const PROOF_ICONS: Record<string, IconName> = { safe: "shield", multi: "family", digital: "pay" };
const ZOOM = [1.5, 1.16, 1.03, 1.0];

/**
 * Section 04 — From «الرياض تلعب» to «السعودية تلعب». A sticky map expands the
 * national network out of Riyadh as the timeline steps scroll past: pilot →
 * 5 → 10 → 20+ cumulative cities, each igniting its nodes & arcs. Uses sticky
 * positioning + scroll-triggered state (no pin, no scroll-hijack); on
 * reduced-motion everything is shown at once.
 */
export default function RiyadhToSaudi() {
  const ref = useRef<HTMLElement>(null);
  const { riyadhToSaudi, ui } = useContent();
  const [stepIdx, setStepIdx] = useState(0);
  const stepYear = riyadhToSaudi.timeline[stepIdx];

  useGsapScene(ref, ({ gsap, scope, reduced, ScrollTrigger }) => {
    const nodes = gsap.utils.toArray<SVGGElement>(".r2s__mapwrap .saudimap__node");
    const links = gsap.utils.toArray<SVGPathElement>(".r2s__mapwrap .saudimap__link");
    const zoom = scope.querySelector(".r2s__mapwrap [data-map-zoom]") as SVGGElement | null;
    const steps = gsap.utils.toArray<HTMLElement>(".r2s__step");
    gsap.set(nodes, { transformBox: "fill-box", transformOrigin: "center" });

    const visibleAt = (stepIdx: number, stage: number, origin?: boolean) =>
      stepIdx === 0 ? !!origin : stage <= stepIdx;

    const render = (i: number, animate: boolean) => {
      const dur = animate ? 0.6 : 0;
      nodes.forEach((n) => {
        const st = Number(n.dataset.stage);
        const on = visibleAt(i, st, n.classList.contains("saudimap__node--origin"));
        gsap.to(n, { opacity: on ? 1 : 0.12, scale: on ? 1 : 0.55, duration: dur, ease: "back.out(1.4)" });
      });
      links.forEach((l) => {
        const id = l.dataset.link ?? "";
        const st = NODE_BY_ID[id]?.stage ?? 3;
        const on = i >= 1 && st <= i;
        gsap.to(l, { opacity: on ? 0.55 : 0, strokeDashoffset: 0, duration: dur });
      });
      gsap.to(zoom, { scale: ZOOM[i], svgOrigin: `${RIYADH.x} ${RIYADH.y}`, duration: animate ? 1 : 0, ease: "power2.inOut" });
      steps.forEach((s, si) => s.classList.toggle("is-active", si === i));
      setStepIdx(i);
    };

    if (reduced) {
      nodes.forEach((n) => gsap.set(n, { opacity: 1, scale: 1 }));
      links.forEach((l) => gsap.set(l, { opacity: 0.5, strokeDashoffset: 0 }));
      steps.forEach((s) => s.classList.add("is-active"));
      return;
    }

    render(0, false);
    steps.forEach((s, i) => {
      ScrollTrigger.create({
        trigger: s,
        start: "top 60%",
        end: "bottom 40%",
        onEnter: () => render(i, true),
        onEnterBack: () => render(i, true),
      });
    });
    ScrollTrigger.refresh();
  });

  return (
    <SectionShell
      id="riyadh"
      index="04"
      eyebrow={riyadhToSaudi.eyebrow}
      title={riyadhToSaudi.title}
      lede={riyadhToSaudi.sub}
      label="من الرياض إلى المملكة"
    >
      <div className="r2s__proof container">
        {riyadhToSaudi.proofPoints.map((p) => (
          <article className="r2s__proof-card" key={p.id} data-reveal>
            <span className="r2s__proof-icon"><Icon name={PROOF_ICONS[p.id] ?? "shield"} size={22} /></span>
            <h3>{p.ar}</h3>
            <p>{p.desc}</p>
          </article>
        ))}
      </div>

      <div className="r2s__scrolly container">
        <div className="r2s__mapcol">
          <div className="r2s__mapwrap">
            <div className="r2s__stagebadge" aria-hidden="true">
              <span className="yr">{stepYear.year}</span>
              <span className="cap">{stepYear.title}</span>
            </div>
            <SaudiMap stage={3} connections="fromRiyadh" labels="origin" armed pulse ariaLabel="شبكة المدن تتوسّع من الرياض إلى المملكة" />
          </div>
        </div>

        <div className="r2s__steps">
          {riyadhToSaudi.timeline.map((t) => (
            <div className="r2s__step" key={t.id}>
              <article className="r2s__card">
                <div className="r2s__card-head">
                  <span className="period">{t.period}</span>
                  <span className={`badge-target${t.kind === "proven" ? " badge-proven" : ""}`}>
                    <span className="dot" /> {t.kind === "proven" ? ui.provenShort : ui.target}
                  </span>
                </div>
                <span className={`num${t.kind === "proven" ? " num--proven" : ""}`}>{t.cities}</span>
                <h3>{t.title}</h3>
                {t.id === "y1" && (
                  <div className="cities">
                    {riyadhToSaudi.firstCities.map((c) => (
                      <span className="chip" key={c}>{c}</span>
                    ))}
                  </div>
                )}
                {t.note && <p className="body" style={{ marginTop: "0.6rem" }}>{t.note}</p>}
              </article>
            </div>
          ))}
        </div>
      </div>

      <p className="source-note r2s__note container">{riyadhToSaudi.cumulativeNote}</p>
    </SectionShell>
  );
}
