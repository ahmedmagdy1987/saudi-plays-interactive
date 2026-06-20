import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLang } from "@/i18n";
import { prefersReducedMotion } from "@/lib/hooks";
import "./SectionBackgroundStage.css";

/**
 * One persistent, lightweight background stage for the whole site. It is a
 * non-interactive, EDGE-MASKED overlay (pointer-events:none; the centre reading
 * zone is fully cleared by a radial mask) that sits just over the opaque section
 * bases — so it adds cinematic atmosphere in the viewport margins and NEVER
 * covers cards, headings or charts.
 *
 * The ten sections are grouped into five "atmospheres" (01‑02 national, 03‑04
 * data/expansion, 05‑06 entertainment, 07‑08 governance, 09‑10 national impact).
 * A SINGLE ScrollTrigger maps the live scroll position to a continuous "group
 * float"; each group layer's opacity / scale / vertical drift is derived from its
 * distance to that float via gsap.quickSetters. So as you cross a group boundary
 * the current atmosphere fades + zooms out (recedes) while the next fades + zooms
 * in (toward the viewer) — and scrolling back up reverses the exact same values.
 * No autoplay timeline, no per-frame DOM thrash, no rAF when the page is idle.
 */

// section id → group index (five groups of two)
const SECTION_GROUP: ReadonlyArray<readonly [string, number]> = [
  ["intro", 0], ["vision", 0],
  ["market", 1], ["riyadh", 1],
  ["zones", 2], ["malahi", 2],
  ["governance", 3], ["revenue", 3],
  ["impact", 4], ["finale", 4],
];
const GROUPS = 5;

export default function SectionBackgroundStage() {
  const { lang } = useLang();
  const rootRef = useRef<HTMLDivElement>(null);
  const recacheRef = useRef<() => void>(() => {});

  useEffect(() => {
    const root = rootRef.current!;
    const reduced = prefersReducedMotion();
    const layers = Array.from(root.querySelectorAll<HTMLElement>(".sbg__layer"));
    const setO = layers.map((l) => gsap.quickSetter(l, "opacity") as (v: number) => void);
    const setT = layers.map((l) => gsap.quickSetter(l, "transform") as (v: string) => void);

    // cached section centres (absolute document Y) + their group
    let sections: { center: number; group: number }[] = [];
    const recache = () => {
      const y = window.scrollY || 0;
      sections = SECTION_GROUP
        .map(([id, group]) => {
          const el = document.getElementById(id);
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { center: r.top + y + r.height / 2, group };
        })
        .filter((s): s is { center: number; group: number } => s !== null);
    };
    recacheRef.current = recache;

    // continuous group position from the viewport centre (monotonic, reversible)
    const groupFloat = () => {
      if (!sections.length) return 0;
      const c = (window.scrollY || 0) + window.innerHeight / 2;
      if (c <= sections[0].center) return sections[0].group;
      const last = sections[sections.length - 1];
      if (c >= last.center) return last.group;
      for (let i = 0; i < sections.length - 1; i++) {
        const a = sections[i], b = sections[i + 1];
        if (c >= a.center && c <= b.center) {
          const t = (c - a.center) / (b.center - a.center || 1);
          return a.group + (b.group - a.group) * t;
        }
      }
      return 0;
    };

    const render = () => {
      const g = groupFloat();
      for (let i = 0; i < GROUPS; i++) {
        const d = g - i;                         // <0 upcoming, >0 receded
        const ad = Math.abs(d);
        const op = ad >= 1 ? 0 : 1 - ad;         // triangular crossfade between neighbours
        setO[i](op);
        if (reduced) { setT[i]("none"); continue; }
        const sc = 1 - 0.06 * Math.min(ad, 1.6); // distant = smaller → zoom-out on recede
        const ty = d * 26;                        // receded drifts down, upcoming drifts up
        setT[i](`translate3d(0,${ty.toFixed(1)}px,0) scale(${sc.toFixed(4)})`);
      }
    };

    recache();
    render();

    const trig = ScrollTrigger.create({
      trigger: document.documentElement,
      start: "top top",
      end: "bottom bottom",
      onUpdate: render,                          // fires only while scrolling
      onRefresh: () => { recache(); render(); }, // resize / font-load / lang refresh
    });

    // pause the (already subtle) ambient CSS motion when the tab is hidden
    const onVis = () => root.classList.toggle("sbg--paused", document.hidden);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      trig.kill();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  // re-measure after the language remount changes section geometry (one rAF so
  // the freshly-mounted, re-localized sections have laid out first)
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      recacheRef.current();
      ScrollTrigger.refresh();
    });
    return () => cancelAnimationFrame(id);
  }, [lang]);

  return (
    <div className="sbg" ref={rootRef} aria-hidden="true">
      {/* 01–02 · national: dark geographic depth, teal + controlled gold */}
      <div className="sbg__layer sbg__layer--g0">
        <span className="sbg__signal sbg__signal--a" />
        <span className="sbg__signal sbg__signal--b" />
      </div>

      {/* 03–04 · data / national expansion: chart-grid depth + city-network lines */}
      <div className="sbg__layer sbg__layer--g1">
        <svg className="sbg__net" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <path className="sbg__trace" d="M20 250 L120 180 L210 210 L330 120" />
          <path className="sbg__trace sbg__trace--d2" d="M40 60 L150 110 L260 80 L380 150" />
        </svg>
      </div>

      {/* 05–06 · entertainment: controlled violet/teal light fields + light traces */}
      <div className="sbg__layer sbg__layer--g2">
        <span className="sbg__field sbg__field--v" />
        <span className="sbg__field sbg__field--t" />
        <span className="sbg__spark s1" /><span className="sbg__spark s2" />
        <span className="sbg__spark s3" /><span className="sbg__spark s4" />
      </div>

      {/* 07–08 · governance: structured network geometry + slow data-flow traces */}
      <div className="sbg__layer sbg__layer--g3">
        <svg className="sbg__grid" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <path className="sbg__flow" d="M30 80 H180 V200 H360" />
          <path className="sbg__flow sbg__flow--d2" d="M40 230 H140 V120 H330" />
          <circle className="sbg__nodept" cx="180" cy="80" r="3" />
          <circle className="sbg__nodept" cx="180" cy="200" r="3" />
          <circle className="sbg__nodept" cx="140" cy="120" r="3" />
        </svg>
      </div>

      {/* 09–10 · national impact: rising city lights + connection energy (finale) */}
      <div className="sbg__layer sbg__layer--g4">
        <span className="sbg__city c1" /><span className="sbg__city c2" />
        <span className="sbg__city c3" /><span className="sbg__city c4" />
        <span className="sbg__city c5" /><span className="sbg__city c6" />
      </div>
    </div>
  );
}
