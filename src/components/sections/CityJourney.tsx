import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SaudiMap from "@/components/common/SaudiMap";
import { useLang } from "@/i18n";
import { getLenis } from "@/lib/scroll";
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
 * readable STATIC gallery by default and upgrades to the cinematic stage once the
 * rAF ticker is proven live. This motion-readiness decision is DELIBERATELY
 * DECOUPLED from the global blank-page fail-safe (html.sp-revealed): that fail-safe
 * only guarantees text is visible during a slow start — it does NOT mean motion is
 * permanently broken, so it must never lock §10 to the static gallery. A slow
 * WhatsApp/Safari cold start (or a delayed/frozen first frame that later recovers)
 * upgrades to cinematic as soon as frames flow, even if the watchdog already fired.
 * The static gallery is permanent ONLY for genuine reduced-motion or a confirmed
 * unrecoverable engine error. So this section can never contribute a blank page and
 * can never get wrongly stuck in the degraded layout on iPhone.
 */
const VB = { w: 1000, h: 845, cx: 500, cy: 422 };

/* ---- pacing timeline ------------------------------------------------------
   The journey is scrubbed by scroll. Instead of mapping scroll linearly onto the
   scene list (which made each scene flash past in a tiny scroll movement), every
   scene gets a HOLD span where the camera is parked (the map/city/point image is
   held, fully readable) and every pair of scenes gets a TRANSITION span where the
   camera eases from one to the next (smoothstep — C1-continuous, so no snapping).
   The point-image HOLD is the longest phase so each photo reads clearly before it
   exits. Pure function of scroll position → reverse scrolling replays the identical
   pacing. Weights are unitless; the track height = Σweights × --cj-seg. */
type Seg = { kind: "hold" | "trans"; i: number; s: number; e: number };
const HOLD: Record<Scene["kind"], number> = { overview: 1.5, city: 1.8, point: 3.2 };
const transWeight = (a: Scene, b: Scene): number => {
  if (a.kind === "overview" || b.kind === "overview") return 1.5; // deliberate zoom to / from the Kingdom map
  if (a.kind === "city" && b.kind === "point") return 1.2;        // approach + point focus + image fade-in
  if (a.kind === "point" && b.kind === "city") return 1.8;        // image exit + pull back + pan to the next city
  return 1.5;                                                     // point→point: exit + readable dip-to-city + next approach
};
function buildTimeline(scenes: Scene[]): { segs: Seg[]; W: number } {
  const segs: Seg[] = [];
  let acc = 0;
  for (let i = 0; i < scenes.length; i++) {
    const hw = HOLD[scenes[i].kind];
    segs.push({ kind: "hold", i, s: acc, e: acc + hw });
    acc += hw;
    if (i < scenes.length - 1) {
      const tw = transWeight(scenes[i], scenes[i + 1]);
      segs.push({ kind: "trans", i, s: acc, e: acc + tw });
      acc += tw;
    }
  }
  return { segs, W: acc };
}
const smoothstep = (x: number) => {
  const t = x < 0 ? 0 : x > 1 ? 1 : x;
  return t * t * (3 - 2 * t);
};
// scroll progress (0–1) → continuous scene float, with parked holds + eased transitions
const progressToF = (segs: Seg[], W: number, N: number, p: number): number => {
  const pos = (p < 0 ? 0 : p > 1 ? 1 : p) * W;
  for (let k = 0; k < segs.length; k++) {
    const sg = segs[k];
    if (pos <= sg.e || k === segs.length - 1) {
      if (sg.kind === "hold") return sg.i;
      return sg.i + smoothstep((pos - sg.s) / (sg.e - sg.s || 1));
    }
  }
  return N - 1;
};

export default function CityJourney() {
  const { lang } = useLang();
  const reduced = useReducedMotion();
  const [mode, setMode] = useState<"static" | "cinematic">("static");
  const rootRef = useRef<HTMLElement>(null);
  const failedRef = useRef(false); // engine hit a CONFIRMED unrecoverable error → stay static
  const dbgRef = useRef<HTMLDivElement | null>(null);
  // auto-showcase: a controlled, fully interruptible play-through of the journey
  const [showcasing, setShowcasing] = useState(false);
  const showcaseRef = useRef<{ raf: number; active: boolean }>({ raf: 0, active: false });

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

  // scene-pacing timeline (holds + eased transitions) — drives the scrub + track height
  const timeline = useMemo(() => buildTimeline(scenes), [scenes]);
  // opt-in diagnostic overlay: ?debugJourney=1 — DEV builds only (stripped from prod)
  const debug = useMemo(
    () => import.meta.env.DEV && typeof window !== "undefined" && new URLSearchParams(window.location.search).get("debugJourney") === "1",
    [],
  );

  // ---- motion-readiness → cinematic (DECOUPLED from the blank-page fail-safe) ----
  // Upgrade to the cinematic stage only once the rAF ticker is genuinely live (two
  // frames arriving back-to-back). A slow/frozen first frame — iOS cold start, a
  // backgrounded WhatsApp/Safari webview — does NOT lock static: the poll keeps
  // trying and upgrades the moment frames flow, even if html.sp-revealed already
  // fired (the global blank-page safety only reveals text; it must never disable
  // §10's motion). Permanent static is reserved for reduced-motion (here) or a
  // CONFIRMED unrecoverable engine error (failedRef, set by the scene engine).
  useEffect(() => {
    if (reduced) { setMode("static"); return; }
    if (failedRef.current) return;
    let cancelled = false, poll = 0;
    const confirm = () => {
      if (cancelled || failedRef.current) return;
      clearInterval(poll);                    // ticker proven live → stop probing
      setMode("cinematic");
    };
    // Two queued frames prove the rAF ticker actually advances (a stalled ticker
    // never fires them). We do NOT require a fast/smooth cadence — just liveness —
    // so the journey upgrades on slow devices too. Each probe is an independent
    // rAF→rAF chain (never cancelled), so a slow in-flight chain is never interrupted.
    const probe = () => requestAnimationFrame(() => requestAnimationFrame(confirm));
    probe();
    // Re-arm the probe periodically (setInterval survives a frozen rAF). If the first
    // frames are delayed/frozen — iOS cold start, a backgrounded WhatsApp/Safari
    // webview — a later probe lands once the ticker recovers and upgrades then, even
    // after the global blank-page watchdog has already fired. First chain to land wins.
    poll = window.setInterval(() => { if (!document.hidden && !failedRef.current) probe(); }, 700);
    // Any genuine interaction (scrolling toward §10, a tap) means the rAF ticker is
    // live RIGHT NOW — probe immediately so the upgrade lands as the user engages,
    // well before they reach the journey. Passive + cheap; first probe to confirm wins.
    const kick = () => probe();
    const onVis = () => { if (!document.hidden) probe(); };
    const evs = ["scroll", "touchstart", "pointerdown", "wheel", "keydown"] as const;
    evs.forEach((e) => window.addEventListener(e, kick, { passive: true }));
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      clearInterval(poll);
      evs.forEach((e) => window.removeEventListener(e, kick));
      document.removeEventListener("visibilitychange", onVis);
    };
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

      // map each scene → its point-panel global index (-1 for overview/city scenes)
      const scenePanelIdx = scenes.map((sc) =>
        sc.kind === "point" ? gIndex(sc.cityIndex, sc.pointIndex) : -1,
      );
      const warmPanel = (gi: number) => {
        if (gi < 0) return;
        const img = imgEls[gi];
        if (img && !img.getAttribute("src")) {
          const ds = img.getAttribute("data-src");
          if (ds) img.setAttribute("src", ds);
        }
      };
      // Eagerly load the ACTIVE scene's image AND its immediate neighbours (a small
      // ±1-scene window — never all panels at once). This guarantees the point photo
      // is ready before it fades in, so a fast fling / scrub-rounding / reverse scroll
      // can never park on a panel whose src was never set (the empty-stage failure),
      // and iOS never has to decode a freshly-attached image inside the live composited
      // sticky stage as it crossfades in.
      const warmPanels = (a: number, b: number) => {
        for (let s = a - 1; s <= b + 1; s++) {
          if (s >= 0 && s < N) warmPanel(scenePanelIdx[s]);
        }
      };

      let degraded = false;
      const render = (progress: number) => {
       try {
        // paced scene float: parked holds + smoothstep transitions (longest hold = point image)
        const f = progressToF(timeline.segs, timeline.W, N, progress);
        const i0 = Math.floor(f);
        const i1 = Math.min(i0 + 1, N - 1);
        warmPanels(i0, i1);
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

        if (debug && dbgRef.current) {
          const sc = scenes[Math.max(0, Math.min(N - 1, active))];
          const loaded = imgEls.filter((im) => im && im.getAttribute("src") && im.naturalWidth > 0).length;
          dbgRef.current.textContent =
            `§10 cinematic · p=${progress.toFixed(3)} f=${f.toFixed(2)} · scene ${active}/${N - 1} ${sc.kind}` +
            ` · imgs ${loaded}/${flat.length} · sp-revealed=${document.documentElement.classList.contains("sp-revealed")}`;
        }
       } catch {
        // a per-frame render glitch must degrade only the journey to its readable
        // static layout — never escalate to the global (site-wide) error fail-safe.
        if (!degraded) { degraded = true; failedRef.current = true; st?.kill(); setMode("static"); }
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
      failedRef.current = true;
      window.__spRevealAll?.();
      setMode("static");
    }
  }, [mode, lang, scenes, flat, data, timeline, debug]);

  // ---- auto-showcase: controlled play-through, never hijacks, always interruptible ----
  // The journey track's weighted height already encodes the per-scene holds, so a
  // CONSTANT-speed scroll through it reproduces the authored pacing (the point-image
  // holds get the most scroll distance → the most time). Any wheel/touch/key/pointer
  // input cancels it instantly and returns control. Manual scrolling is never blocked.
  const stopShowcase = useCallback(() => {
    const s = showcaseRef.current;
    if (s.raf) { cancelAnimationFrame(s.raf); s.raf = 0; }
    s.active = false;
    setShowcasing(false);
  }, []);

  const startShowcase = useCallback(() => {
    if (mode !== "cinematic") return;
    const track = rootRef.current?.querySelector<HTMLElement>(".cj__track");
    if (!track) return;
    // ABSOLUTE document position — offsetTop is relative to the positioned .cj section,
    // not the page, so it must be combined with the element's viewport rect + scrollY.
    const trackTop = track.getBoundingClientRect().top + window.scrollY;
    const end = trackTop + track.offsetHeight - window.innerHeight;
    if (window.scrollY >= end - 4) return; // already at the journey's end
    const lenis = getLenis();
    showcaseRef.current.active = true;
    setShowcasing(true);
    // Steady ~constant-speed advance. We drive the scroll position ourselves each
    // frame (through Lenis when present, so the two never fight) at a gentle pace —
    // the track's weighted height means point-image holds get the most distance and
    // therefore the most dwell time. ~340 px/s → a ~45s readable play-through.
    const PX_PER_SEC = 340;
    let last = performance.now();
    const tick = (now: number) => {
      if (!showcaseRef.current.active) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const y = Math.min(end, window.scrollY + PX_PER_SEC * dt);
      if (lenis) lenis.scrollTo(y, { immediate: true }); else window.scrollTo(0, y);
      if (y >= end - 1) { stopShowcase(); return; }
      showcaseRef.current.raf = requestAnimationFrame(tick);
    };
    showcaseRef.current.raf = requestAnimationFrame(tick);
  }, [mode, stopShowcase]);

  // any genuine user input during the showcase hands control straight back
  useEffect(() => {
    if (!showcasing) return;
    const onInput = () => stopShowcase();
    const evs = ["wheel", "touchstart", "pointerdown", "keydown"] as const;
    evs.forEach((e) => window.addEventListener(e, onInput, { passive: true }));
    return () => evs.forEach((e) => window.removeEventListener(e, onInput));
  }, [showcasing, stopShowcase]);

  // leaving cinematic mode (reduced-motion, fail-safe) or unmounting stops it cleanly
  useEffect(() => { if (mode !== "cinematic") stopShowcase(); return () => stopShowcase(); }, [mode, stopShowcase]);

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
        <div className="cj__track" style={{ "--cj-units": timeline.W } as CSSProperties}>
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
                  {/* `temp` is internal asset-management metadata only — the public UI
                      never shows a placeholder badge. */}
                  {f.point.desc && <p>{t(f.point.desc)}</p>}
                </figcaption>
              </figure>
            ))}

            {showcasing ? (
              <p className="cj__showhint" aria-live="polite">{t(data.ui.showcaseHint)}</p>
            ) : (
              <button type="button" className="cj__start" onClick={startShowcase} dir={lang === "en" ? "ltr" : "rtl"}>
                <span className="cj__start-ico" aria-hidden="true" />
                {/* <bdi> isolates the locale label's directionality so the Arabic always
                    renders normally (browser-driven), never reversed by the flex/icon context */}
                <bdi className="cj__start-label">{t(data.ui.startExperience)}</bdi>
              </button>
            )}
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

      {debug && (
        <div
          ref={dbgRef}
          style={{
            position: "fixed", left: "8px", bottom: "8px", zIndex: 9999,
            font: "11px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace", color: "#9ff",
            background: "rgba(2,6,15,0.82)", border: "1px solid rgba(95,243,226,0.4)",
            borderRadius: "6px", padding: "4px 8px", pointerEvents: "none", maxWidth: "92vw",
          } as CSSProperties}
        >
          {`§10 ${mode} · reduced=${String(reduced)} · sp-revealed=${typeof document !== "undefined" && document.documentElement.classList.contains("sp-revealed")}`}
        </div>
      )}
    </section>
  );
}
