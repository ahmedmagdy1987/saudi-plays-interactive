import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SaudiMap from "@/components/common/SaudiMap";
import { useLang } from "@/i18n";
import { useReducedMotion } from "@/lib/hooks";
import { cityJourney, buildScenes, type Scene } from "@/data/cityJourney";
import "./CityJourney.css";

/**
 * Section 10 — Cinematic City Deep-Dive Journey.
 *
 * A true hierarchical visual narrative driven entirely by src/data/cityJourney.ts:
 *   Saudi map (Level 1) → zoom into a city (Level 2) → reveal the city's local
 *   points → focus one point and arrive at its image (Level 3) → return to the
 *   city → next point → after the city, pull back to the Saudi map → next city.
 *
 * Motion model: a CSS `position: sticky` stage scrubbed by a single ScrollTrigger
 * (no GSAP pin). Every visual is a pure function of scroll progress, so scrolling
 * up reverses the exact same zoom/fade — no hysteresis. Only opacity + transform
 * are animated; point images lazy-load as their scene approaches.
 *
 * Progressive enhancement (iPhone blank-page safety): the section renders a fully
 * readable STATIC gallery by default and only upgrades to the cinematic stage once
 * a live animation frame is confirmed. Reduced-motion stays static; if the global
 * fail-safe (html.sp-revealed) ever fires, it reverts to static. So this section
 * can never contribute a blank page.
 */
const VB = { w: 1000, h: 845, cx: 500, cy: 422 };

export default function CityJourney() {
  const { lang } = useLang();
  const reduced = useReducedMotion();
  const [mode, setMode] = useState<"static" | "cinematic">("static");
  const rootRef = useRef<HTMLElement>(null);

  const data = cityJourney;
  const t = <T,>(b: { ar: T; en: T }) => (lang === "en" ? b.en : b.ar);

  const scenes = useMemo(() => buildScenes(data), [data]);
  // flat list of every point across all cities (global panel index)
  const flat = useMemo(
    () =>
      data.cities.flatMap((c, ci) =>
        c.points.map((p, pi) => ({ ci, pi, key: `${c.id}-${p.id}`, point: p })),
      ),
    [data],
  );
  const gIndex = (ci: number, pi: number) =>
    flat.findIndex((f) => f.ci === ci && f.pi === pi);

  // ---- decide render mode: cinematic only when motion is genuinely live ----
  useEffect(() => {
    if (reduced) { setMode("static"); return; }
    let r1 = 0, r2 = 0, cancelled = false;
    // two real frames prove the ticker advances (stalled rAF -> stays static)
    r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => { if (!cancelled) setMode("cinematic"); });
    });
    // if the global blank-page fail-safe fires, fall back to the readable layout
    const mo = new MutationObserver(() => {
      if (document.documentElement.classList.contains("sp-revealed")) setMode("static");
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => { cancelled = true; cancelAnimationFrame(r1); cancelAnimationFrame(r2); mo.disconnect(); };
  }, [reduced]);

  // ---- cinematic scene engine (sticky stage + scrubbed scroll progress) ----
  useEffect(() => {
    if (mode !== "cinematic") return;
    const root = rootRef.current;
    if (!root) return;
    try {
      const lite = window.matchMedia("(max-width: 820px)").matches;
      const N = scenes.length;
      const zoomG = root.querySelector<SVGGElement>(".cj__saudi [data-map-zoom]");
      const saudiEl = root.querySelector<HTMLElement>(".cj__saudi");
      const cityEls = data.cities.map((c) => root.querySelector<HTMLElement>(`.cj__city[data-city="${c.id}"]`));
      const planeEls = data.cities.map((c) => root.querySelector<HTMLElement>(`.cj__city[data-city="${c.id}"] .cj__plane`));
      const panelEls = flat.map((f) => root.querySelector<HTMLElement>(`.cj__panel[data-panel="${f.key}"]`));
      const imgEls = flat.map((f) => root.querySelector<HTMLImageElement>(`.cj__panel[data-panel="${f.key}"] .cj__panel-img`));
      const ptEls = flat.map((f) => root.querySelector<HTMLElement>(`.cj__pt[data-pt="${f.key}"]`));

      interface Desc {
        cs: number; cx: number; cy: number; co: number;           // saudi cam: scale, focus x/y, opacity
        cityOp: number[]; cityScale: number[]; fx: number[]; fy: number[];
        panel: number[];
      }
      const descAt = (s: number): Desc => {
        const scene: Scene = scenes[Math.max(0, Math.min(N - 1, s))];
        const cityOp = data.cities.map(() => 0);
        const cityScale = data.cities.map(() => 1);
        const fx = data.cities.map(() => 50);
        const fy = data.cities.map(() => 50);
        const panel = flat.map(() => 0);
        if (scene.kind === "overview") {
          return { cs: 1, cx: VB.cx, cy: VB.cy, co: 1, cityOp, cityScale, fx, fy, panel };
        }
        const c = data.cities[scene.cityIndex];
        if (scene.kind === "city") {
          cityOp[scene.cityIndex] = 1;
          return { cs: c.zoom, cx: c.map.x, cy: c.map.y, co: 0.32, cityOp, cityScale, fx, fy, panel };
        }
        const p = c.points[scene.pointIndex];
        cityOp[scene.cityIndex] = 1;
        cityScale[scene.cityIndex] = lite ? 1.5 : 1.85;
        fx[scene.cityIndex] = p.local.x;
        fy[scene.cityIndex] = p.local.y;
        panel[gIndex(scene.cityIndex, scene.pointIndex)] = 1;
        return { cs: c.zoom * 1.06, cx: c.map.x, cy: c.map.y, co: 0.2, cityOp, cityScale, fx, fy, panel };
      };
      const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
      const blend = (a: Desc, b: Desc, k: number): Desc => ({
        cs: lerp(a.cs, b.cs, k), cx: lerp(a.cx, b.cx, k), cy: lerp(a.cy, b.cy, k), co: lerp(a.co, b.co, k),
        cityOp: a.cityOp.map((v, i) => lerp(v, b.cityOp[i], k)),
        cityScale: a.cityScale.map((v, i) => lerp(v, b.cityScale[i], k)),
        fx: a.fx.map((v, i) => lerp(v, b.fx[i], k)),
        fy: a.fy.map((v, i) => lerp(v, b.fy[i], k)),
        panel: a.panel.map((v, i) => lerp(v, b.panel[i], k)),
      });

      let degraded = false;
      const render = (progress: number) => {
       try {
        const f = progress * (N - 1);
        const i0 = Math.floor(f);
        const i1 = Math.min(i0 + 1, N - 1);
        const d = blend(descAt(i0), descAt(i1), f - i0);
        const active = Math.round(f); // dominant scene for marker highlight

        if (zoomG) {
          const s = d.cs;
          zoomG.setAttribute(
            "transform",
            `translate(${(VB.w / 2 - s * d.cx).toFixed(2)} ${(VB.h / 2 - s * d.cy).toFixed(2)}) scale(${s.toFixed(4)})`,
          );
        }
        if (saudiEl) saudiEl.style.opacity = d.co.toFixed(3);

        data.cities.forEach((_, ci) => {
          const el = cityEls[ci];
          if (el) {
            const op = d.cityOp[ci];
            el.style.opacity = op.toFixed(3);
            el.style.visibility = op > 0.001 ? "visible" : "hidden";
          }
          const plane = planeEls[ci];
          if (plane) {
            plane.style.transformOrigin = `${d.fx[ci].toFixed(1)}% ${d.fy[ci].toFixed(1)}%`;
            plane.style.transform = `scale(${d.cityScale[ci].toFixed(4)})`;
          }
        });

        flat.forEach((f2, gi) => {
          const el = panelEls[gi];
          if (el) {
            const op = d.panel[gi];
            el.style.opacity = op.toFixed(3);
            el.style.visibility = op > 0.001 ? "visible" : "hidden";
            el.style.transform = `scale(${(1.045 - 0.045 * op).toFixed(4)})`;
            if (op > 0.004) {
              const img = imgEls[gi];
              if (img && !img.getAttribute("src")) {
                const ds = img.getAttribute("data-src");
                if (ds) img.setAttribute("src", ds);
              }
            }
          }
          // highlight the marker for the dominant point scene
          const pt = ptEls[gi];
          if (pt) {
            const sc = scenes[Math.max(0, Math.min(N - 1, active))];
            const on = sc.kind === "point" && sc.cityIndex === f2.ci && sc.pointIndex === f2.pi;
            pt.classList.toggle("is-active", on);
          }
        });
       } catch {
        // a per-frame render glitch must degrade only the journey to its readable
        // static layout — never escalate to the global (site-wide) error fail-safe.
        if (!degraded) { degraded = true; st?.kill(); setMode("static"); }
       }
      };

      let st: ReturnType<typeof ScrollTrigger.create> | undefined;
      render(0); // overview is visible before any scroll (never blank)

      const track = root.querySelector<HTMLElement>(".cj__track");
      st = ScrollTrigger.create({
        trigger: track ?? root,
        start: "top top",
        end: "bottom bottom",
        scrub: true,
        onUpdate: (self) => render(self.progress),
        onRefresh: (self) => render(self.progress),
      });
      // the static→cinematic swap grew the page by several viewports — remeasure
      // every trigger (incl. the page-spanning backdrop + progress bar) right away.
      ScrollTrigger.refresh();
      return () => st?.kill();
    } catch {
      // any failure in the cinematic engine must never blank the page
      window.__spRevealAll?.();
      setMode("static");
    }
  }, [mode, lang, scenes, flat, data]);

  const catLabel = (c: keyof typeof data.ui.categories) => t(data.ui.categories[c]);

  return (
    <section
      id="journey"
      ref={rootRef}
      data-section="10"
      className={`section cj cj--${mode}`}
      aria-label={t(data.header.title)}
    >
      <div className="container sec-header" data-align="center" data-reveal>
        <p className="eyebrow eyebrow--violet"><span className="sec-index">10</span>{t(data.header.eyebrow)}</p>
        <h2 className="heading-xl sec-title">{t(data.header.title)}</h2>
        <p className="lede sec-lede">{t(data.header.lede)}</p>
      </div>

      {mode === "cinematic" ? (
        <div className="cj__track" style={{ "--cj-n": scenes.length } as CSSProperties}>
          <div className="cj__stage">
            {/* Level 1 — Saudi map */}
            <div className="cj__saudi">
              <SaudiMap stage={1} connections="fromRiyadh" labels="origin" pulse ariaLabel={t(data.ui.overview)} />
            </div>

            {/* Level 2 — city scenes with their local points */}
            {data.cities.map((c) => (
              <div className="cj__city" data-city={c.id} key={c.id}>
                <div className="cj__plane">
                  <span className="cj__plane-grid" aria-hidden="true" />
                  <svg className="cj__routes" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                    <polyline points={c.points.map((p) => `${p.local.x},${p.local.y}`).join(" ")} />
                  </svg>
                  {c.points.map((p) => (
                    <span className="cj__pt" data-pt={`${c.id}-${p.id}`} key={p.id}
                      style={{ left: `${p.local.x}%`, top: `${p.local.y}%` }} aria-hidden="true">
                      <span className="cj__pt-dot" />
                      <span className="cj__pt-label">{t(p.name)}</span>
                    </span>
                  ))}
                </div>
                <div className="cj__city-name">
                  <b>{t(c.name)}</b>
                  {c.tagline && <span>{t(c.tagline)}</span>}
                </div>
              </div>
            ))}

            {/* Level 3 — full cinematic image panel per point */}
            {flat.map((f) => (
              <figure className="cj__panel" data-panel={f.key} key={f.key}>
                <img className="cj__panel-img" data-src={f.point.image} alt="" decoding="async" />
                <figcaption className="cj__panel-cap">
                  <span className="cj__cat">{catLabel(f.point.category)}</span>
                  <b>{t(f.point.name)}</b>
                  {f.point.temp && <span className="cj__temp">{t(data.ui.temp)}</span>}
                  {f.point.desc && <p>{t(f.point.desc)}</p>}
                </figcaption>
              </figure>
            ))}

            <div className="cj__hint" aria-hidden="true">{t(data.ui.hintScroll)}</div>
          </div>
        </div>
      ) : (
        /* Static, fully-readable fallback (reduced-motion / pre-upgrade / fail-safe) */
        <div className="cj__static container">
          <div className="cj__static-map" data-reveal>
            <SaudiMap stage={1} connections="fromRiyadh" labels="stage1" ariaLabel={t(data.ui.overview)} />
          </div>
          {data.cities.map((c) => (
            <div className="cj__static-city" key={c.id} data-reveal>
              <h3 className="cj__static-head">
                {t(c.name)}{c.tagline && <span>{t(c.tagline)}</span>}
              </h3>
              <div className="cj__static-grid">
                {c.points.map((p) => (
                  <figure className="cj__static-card" key={p.id}>
                    <div className="cj__static-thumb">
                      <img src={p.image} loading="lazy" decoding="async" alt="" />
                      {p.temp && <span className="cj__temp">{t(data.ui.temp)}</span>}
                    </div>
                    <figcaption>
                      <span className="cj__cat">{catLabel(p.category)}</span>
                      <b>{t(p.name)}</b>
                      {p.desc && <p>{t(p.desc)}</p>}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
