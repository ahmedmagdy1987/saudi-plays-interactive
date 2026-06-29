import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SaudiMap from "@/components/common/SaudiMap";
import EarthGlobe, { type EarthGlobeHandle } from "@/components/common/EarthGlobe";
import { EXPLORER } from "@/data/explorerData";
import { getLenis } from "@/lib/scroll";
import { useReducedMotion } from "@/lib/hooks";
import { useLang } from "@/i18n";
import "./VisualExplorer.css";

/**
 * §02 — Earth-to-Saudi intro + Full-screen Visual Explorer (one continuous scene).
 *
 * The journey opens in space with a dimensional Earth (EarthGlobe / WebGL). Scrolling
 * approaches the Kingdom, hands off to the Saudi map context, then crossfades into the
 * first explorer category — all reversible on scroll-up. After the intro the explorer
 * behaves exactly as before: a full-bleed image owns the screen, compact thumbnails
 * swap the active image IN PLACE (no popup/nav), and scroll moves between categories
 * with the same map transition. Category tabs give click/keyboard control so it works
 * without the scrub. WebGL failure / reduced-motion fall back to the layered Saudi-map
 * visual — never a blank frame. transform/opacity/camera only; iPhone/WebKit-safe.
 */
const EARTH_UNITS = 2; // extra viewport-heights of scroll devoted to the Earth intro
const clamp = (v: number, a = 0, b = 1) => (v < a ? a : v > b ? b : v);

export default function VisualExplorer() {
  const { lang } = useLang();
  const reduced = useReducedMotion();
  const t = <T,>(b: { ar: T; en: T }) => (lang === "en" ? b.en : b.ar);
  const dir = lang === "en" ? "ltr" : "rtl";

  const trackRef = useRef<HTMLDivElement>(null);
  const globeWrapRef = useRef<HTMLDivElement>(null);
  const geoRef = useRef<HTMLDivElement>(null);
  const capRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const globeApi = useRef<EarthGlobeHandle>(null);

  const [cat, setCat] = useState(0);
  const [item, setItem] = useState(0);
  const [webglFailed, setWebglFailed] = useState(false);
  const N = EXPLORER.length;

  const layers = useMemo(
    () => EXPLORER.flatMap((c, ci) => c.items.map((it, ii) => ({ it, ci, ii }))),
    [],
  );
  const active = EXPLORER[cat];
  const onFail = useCallback(() => setWebglFailed(true), []);
  const selectItem = useCallback((ii: number) => setItem(ii), []);

  // tab/dot → go to a category (scrolls past the Earth intro into the category band)
  const goCat = useCallback((i: number) => {
    if (reduced) { setCat(i); setItem(0); return; }
    const track = trackRef.current;
    if (!track) { setCat(i); setItem(0); return; }
    const top = track.getBoundingClientRect().top + window.scrollY;
    const scrollable = Math.max(1, track.offsetHeight - window.innerHeight);
    const earthEnd = EARTH_UNITS / (EARTH_UNITS + N);
    const prog = earthEnd + (N > 1 ? i / (N - 1) : 0) * (1 - earthEnd);
    const y = top + prog * scrollable;
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(y, { duration: 1.0 }); else window.scrollTo({ top: y, behavior: "smooth" });
  }, [reduced, N]);

  // scroll-scrub → Earth intro phase + category phase (imperative opacity, no per-frame state)
  useEffect(() => {
    if (reduced) return;
    const track = trackRef.current;
    if (!track) return;
    const set = (el: HTMLElement | null, o: number) => { if (el) el.style.opacity = o.toFixed(3); };
    const earthEnd = EARTH_UNITS / (EARTH_UNITS + N);
    let lastCat = -1;
    let st: ReturnType<typeof ScrollTrigger.create> | undefined;
    try {
      st = ScrollTrigger.create({
        trigger: track, start: "top top", end: "bottom bottom", scrub: true,
        onUpdate: (self) => {
          const p = self.progress;
          if (p <= earthEnd) {
            const ep = p / (earthEnd || 1);
            globeApi.current?.setProgress(ep);
            set(globeWrapRef.current, ep < 0.82 ? 1 : clamp(1 - (ep - 0.82) / 0.18));
            set(geoRef.current, ep < 0.72 ? 0 : clamp((ep - 0.72) / 0.2));
            set(capRef.current, ep < 0.5 ? 1 : clamp(1 - (ep - 0.5) / 0.4));
            set(overlayRef.current, 0);
            if (lastCat !== 0) { lastCat = 0; setCat(0); setItem(0); }
          } else {
            const cp = (p - earthEnd) / (1 - earthEnd);
            const cf = cp * (N - 1);
            const ci = Math.round(cf);
            const frac = cf - Math.floor(cf);
            const intro = cp < 0.12 ? 1 - cp / 0.12 : 0;       // map → first category
            set(globeWrapRef.current, 0);
            set(geoRef.current, Math.max(Math.sin(clamp(frac) * Math.PI), intro));
            set(capRef.current, 0);
            set(overlayRef.current, 1);
            if (ci !== lastCat) { lastCat = ci; setCat(ci); setItem(0); }
          }
        },
      });
      ScrollTrigger.refresh();
    } catch { /* scrub failure → tabs remain usable, layers stay at CSS defaults */ }
    return () => st?.kill();
  }, [reduced, N]);

  const stageStyle = { ["--acc" as string]: active.accent } as CSSProperties;
  // reduced-motion: globe is a stable backdrop for the first category only
  const reducedGlobeOpacity = reduced ? (cat === 0 ? 1 : 0) : undefined;

  return (
    <section id="journey" data-section="02" className="vx-section" aria-label={t({ ar: "من الفضاء إلى مواقع السعودية", en: "From space to Saudi locations" })}>
      <div className="vx__track" ref={trackRef} style={reduced ? undefined : { height: `${(EARTH_UNITS + Math.max(2, N)) * 100}svh` }}>
        <div className={`vx__stage ${reduced ? "vx__stage--reduced" : "vx__stage--scrub"}`} style={stageStyle} dir={dir}>
          {/* full-bleed media — every item pre-mounted; only the active one shows */}
          <div className="vx__media" aria-hidden="true">
            {layers.map(({ it, ci, ii }) => (
              <img
                key={`${ci}-${ii}`}
                className="vx__img"
                data-on={ci === cat && ii === item}
                src={it.image}
                alt=""
                decoding="async"
                loading={ci === 0 ? "eager" : "lazy"}
                style={it.focus ? { objectPosition: it.focus } : undefined}
              />
            ))}
          </div>

          {/* Saudi-map geographic transition layer */}
          <div className="vx__geo" aria-hidden="true" ref={geoRef}>
            <SaudiMap stage={3} connections="fromRiyadh" labels="none" pulse={false} ariaLabel="" />
          </div>

          {/* Earth intro layer (WebGL globe, or layered fallback) */}
          <div
            className="vx__globe"
            aria-hidden="true"
            ref={globeWrapRef}
            style={reducedGlobeOpacity !== undefined ? { opacity: reducedGlobeOpacity } : undefined}
          >
            {webglFailed ? <div className="vx__globe-fallback" /> : <EarthGlobe ref={globeApi} onFail={onFail} />}
          </div>

          <div className="vx__scrim" aria-hidden="true" />

          {/* Earth-phase caption (small, fades out as we approach) */}
          <div className="vx__earthcap" ref={capRef}>
            <p className="eyebrow eyebrow--violet"><span className="sec-index">02</span>{t({ ar: "من الفضاء إلى المملكة", en: "From space to the Kingdom" })}</p>
            <p className="vx__earthcap-cue">{t({ ar: "مرّر للاقتراب", en: "Scroll to approach" })}</p>
          </div>

          {/* explorer overlay: category + active item + thumbnails */}
          <div className="vx__overlay container" ref={overlayRef}>
            <p className="eyebrow eyebrow--violet vx__eyebrow">
              <span className="sec-index">02</span>{t({ ar: "استكشف المواقع", en: "Explore the places" })}
            </p>
            <h2 className="vx__cat-title">{t(active.name)}</h2>
            <p className="vx__cat-kicker">{t(active.kicker)}</p>

            <div className="vx__active-meta">
              <b>{t(active.items[item].name)}</b>
              <span>{t(active.items[item].tag)}</span>
            </div>

            <div className="vx__thumbs" role="group" aria-label={t({ ar: "اختر موقعاً", en: "Choose a place" })}>
              {active.items.map((it, ii) => (
                <button
                  key={it.id}
                  type="button"
                  className="vx__thumb"
                  data-on={ii === item}
                  aria-pressed={ii === item}
                  aria-label={t(it.name)}
                  onClick={() => selectItem(ii)}
                >
                  <img src={it.image} alt="" loading="lazy" decoding="async" />
                </button>
              ))}
            </div>
          </div>

          {/* category navigation (click/keyboard — works without scroll) */}
          <div className="vx__cats" role="group" aria-label={t({ ar: "الفئات", en: "Categories" })}>
            {EXPLORER.map((c, ci) => (
              <button
                key={c.id}
                type="button"
                className="vx__cat"
                data-on={ci === cat}
                aria-pressed={ci === cat}
                style={{ ["--acc" as string]: c.accent } as CSSProperties}
                onClick={() => goCat(ci)}
              >
                <i aria-hidden="true" />
                {t(c.name)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
