import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SaudiMap from "@/components/common/SaudiMap";
import { EXPLORER } from "@/data/explorerData";
import { getLenis } from "@/lib/scroll";
import { useReducedMotion } from "@/lib/hooks";
import { useLang } from "@/i18n";
import "./VisualExplorer.css";

/**
 * §02 — Full-screen Visual Explorer.
 *
 * The active image OWNS the screen. A few compact thumbnails swap the active
 * image IN PLACE (no popup, no navigation). SCROLL moves BETWEEN CATEGORIES with
 * a cinematic geographic transition (zoom out → Saudi map context → zoom into the
 * next category), driven by one scrubbed ScrollTrigger over a tall sticky track —
 * fully reversible on scroll-up. Category tabs/dots offer the same navigation by
 * click/keyboard, so the section is COMPLETELY usable without the scroll-scrub
 * (reduced-motion + any engine that stalls the ticker fall back to tab control,
 * never a blank or stuck screen). transform + opacity only; iPhone/WebKit-safe.
 */
const clamp = (v: number, a = 0, b = 1) => (v < a ? a : v > b ? b : v);

export default function VisualExplorer() {
  const { lang } = useLang();
  const reduced = useReducedMotion();
  const t = <T,>(b: { ar: T; en: T }) => (lang === "en" ? b.en : b.ar);
  const dir = lang === "en" ? "ltr" : "rtl";

  const trackRef = useRef<HTMLDivElement>(null);
  const [cat, setCat] = useState(0);
  const [item, setItem] = useState(0);
  const [trans, setTrans] = useState(0); // 0 at a settled category, →1 mid-transition (geo layer up)
  const N = EXPLORER.length;

  // flat list of every item (rendered once as stacked layers → no mount churn, no blank frame)
  const layers = useMemo(
    () => EXPLORER.flatMap((c, ci) => c.items.map((it, ii) => ({ it, ci, ii }))),
    [],
  );
  const active = EXPLORER[cat];

  const selectItem = useCallback((ii: number) => setItem(ii), []);

  // tab/dot → go to a category (drives scroll in enhanced mode; direct in reduced)
  const goCat = useCallback((i: number) => {
    if (reduced) { setCat(i); setItem(0); return; }
    const track = trackRef.current;
    if (!track) { setCat(i); setItem(0); return; }
    const top = track.getBoundingClientRect().top + window.scrollY;
    const scrollable = Math.max(1, track.offsetHeight - window.innerHeight);
    const y = top + (N > 1 ? i / (N - 1) : 0) * scrollable;
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(y, { duration: 1.0 });
    else window.scrollTo({ top: y, behavior: "smooth" });
  }, [reduced, N]);

  // scroll-scrub → active category + transition amount (enhanced mode only)
  useEffect(() => {
    if (reduced) return;
    const track = trackRef.current;
    if (!track) return;
    let lastCat = -1;
    let st: ReturnType<typeof ScrollTrigger.create> | undefined;
    try {
      st = ScrollTrigger.create({
        trigger: track,
        start: "top top",
        end: "bottom bottom",
        scrub: true,
        onUpdate: (self) => {
          const cf = self.progress * (N - 1);
          const ci = Math.round(cf);
          const frac = cf - Math.floor(cf);
          setTrans(Math.sin(clamp(frac) * Math.PI)); // 0 at integers, 1 at the midpoint
          if (ci !== lastCat) { lastCat = ci; setCat(ci); setItem(0); }
        },
      });
      ScrollTrigger.refresh();
    } catch {
      /* a scrub failure must never blank the section — tabs remain fully usable */
    }
    return () => st?.kill();
  }, [reduced, N]);

  const stageStyle = { ["--acc" as string]: active.accent } as CSSProperties;

  return (
    <section id="journey" data-section="02" className="vx-section" aria-label={t({ ar: "مستكشف بصري للمواقع", en: "Visual location explorer" })}>
      <div
        className="vx__track"
        ref={trackRef}
        style={reduced ? undefined : { height: `${Math.max(2, N) * 100}svh` }}
      >
        <div className="vx__stage" style={stageStyle} dir={dir}>
          {/* full-bleed media — every item is a pre-mounted layer; only the active one shows */}
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

          {/* geographic transition layer (zoom out → Kingdom context → zoom in) */}
          <div
            className="vx__geo"
            aria-hidden="true"
            style={{ opacity: trans, transform: `scale(${(1 + trans * 0.35).toFixed(3)})` }}
          >
            <SaudiMap stage={3} connections="fromRiyadh" labels="none" pulse={false} ariaLabel="" />
          </div>

          <div className="vx__scrim" aria-hidden="true" />

          {/* overlay: category + active item + thumbnails */}
          <div className="vx__overlay container">
            <p className="eyebrow eyebrow--violet vx__eyebrow">
              <span className="sec-index">02</span>{t({ ar: "استكشف المواقع", en: "Explore the places" })}
            </p>
            <h2 className="vx__cat-title">{t(active.name)}</h2>
            <p className="vx__cat-kicker">{t(active.kicker)}</p>

            <div className="vx__active-meta">
              <b>{t(active.items[item].name)}</b>
              <span>{t(active.items[item].tag)}</span>
            </div>

            {/* compact in-place image selectors */}
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

          {!reduced && (
            <p className="vx__cue" aria-hidden="true">
              {t({ ar: "مرّر للفئة التالية", en: "Scroll for next category" })}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
