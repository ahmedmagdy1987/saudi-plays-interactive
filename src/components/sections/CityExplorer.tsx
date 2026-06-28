import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import SectionShell from "@/components/common/SectionShell";
import SaudiMap from "@/components/common/SaudiMap";
import { VIEWBOX } from "@/data/saudiGeo";
import { cityJourney } from "@/data/cityJourney";
import { CATEGORY_META, CATEGORY_ORDER } from "@/data/categories";
import { useLang } from "@/i18n";
import "./CityExplorer.css";

/**
 * §04 — Interactive City Explorer (replaces the former long scroll-driven City
 * Journey). A TAP/CLICK-first, progressive drill-down: Kingdom overview → city →
 * locations → location detail, with no long internal scrolling and a clear back/
 * close path at every level. Pure click/keyboard interaction (no scroll-jacking,
 * no auto-showcase). Fully data-driven from src/data/cityJourney.ts, so swapping a
 * location's image needs no layout changes. Accessible: real buttons, Enter/Space,
 * Escape closes the detail and returns focus, descriptive labels, semantic category
 * colours backed by text + a legend (never colour alone).
 */
export default function CityExplorer() {
  const { lang } = useLang();
  const data = cityJourney;
  const ui = data.ui;
  const t = <T,>(b: { ar: T; en: T }) => (lang === "en" ? b.en : b.ar);
  const dir = lang === "en" ? "ltr" : "rtl";

  const [cityIdx, setCityIdx] = useState<number | null>(null); // null = Kingdom overview
  const [pointId, setPointId] = useState<string | null>(null); // open location detail
  const lastTrigger = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const city = cityIdx != null ? data.cities[cityIdx] : null;
  const point = city && pointId ? city.points.find((p) => p.id === pointId) ?? null : null;

  const selectCity = useCallback((i: number | null) => { setCityIdx(i); setPointId(null); }, []);
  const openPoint = useCallback((id: string, el: HTMLElement) => { lastTrigger.current = el; setPointId(id); }, []);
  const closePoint = useCallback(() => {
    setPointId(null);
    requestAnimationFrame(() => lastTrigger.current?.focus()); // return focus to the trigger
  }, []);

  // Escape closes the open detail; move focus into the dialog when it opens.
  useEffect(() => {
    if (!point) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); closePoint(); } };
    document.addEventListener("keydown", onKey);
    const raf = requestAnimationFrame(() => closeRef.current?.focus());
    return () => { document.removeEventListener("keydown", onKey); cancelAnimationFrame(raf); };
  }, [point, closePoint]);

  const catLabel = (c: keyof typeof CATEGORY_META) => t({ ar: CATEGORY_META[c].ar, en: CATEGORY_META[c].en });

  return (
    <SectionShell
      id="journey"
      index="04"
      className="cx-section"
      eyebrowVariant="violet"
      headerAlign="center"
      eyebrow={t(data.header.eyebrow)}
      title={t(data.header.title)}
      lede={t(data.header.lede)}
      label={t(data.header.title)}
    >
      <div className="cx container" dir={dir}>
        {/* City selector — always available for quick switching (no long scroll) */}
        <div className="cx__tabs" role="group" aria-label={t(ui.chooseCity)}>
          <span className="cx__tabs-label">{t(ui.chooseCity)}</span>
          <button
            type="button"
            className="cx__tab"
            data-active={cityIdx === null}
            aria-pressed={cityIdx === null}
            onClick={() => selectCity(null)}
          >
            {t(ui.overview)}
          </button>
          {data.cities.map((c, i) => (
            <button
              key={c.id}
              type="button"
              className="cx__tab"
              data-active={cityIdx === i}
              aria-pressed={cityIdx === i}
              onClick={() => selectCity(i)}
            >
              {t(c.name)}
            </button>
          ))}
        </div>

        <div className="cx__stage">
          {/* Geographic overview — clickable city pins */}
          <div className="cx__map" style={{ aspectRatio: `${VIEWBOX.w} / ${VIEWBOX.h}` }}>
            <SaudiMap stage={1} connections="fromRiyadh" labels="none" pulse={false} ariaLabel={t(ui.overview)} />
            {data.cities.map((c, i) => (
              <button
                key={c.id}
                type="button"
                className="cx__pin"
                data-active={cityIdx === i}
                aria-pressed={cityIdx === i}
                aria-label={t(c.name)}
                onClick={() => selectCity(i)}
                style={{ left: `${(c.map.x / VIEWBOX.w) * 100}%`, top: `${(c.map.y / VIEWBOX.h) * 100}%` }}
              >
                <span className="cx__pin-dot" aria-hidden="true" />
                <span className="cx__pin-label">{t(c.name)}</span>
              </button>
            ))}
          </div>

          {/* Locations panel (or the overview prompt) */}
          <div className="cx__panel">
            {city ? (
              <>
                <div className="cx__panel-head">
                  <button type="button" className="cx__back" onClick={() => selectCity(null)}>
                    <span aria-hidden="true">{dir === "rtl" ? "→" : "←"}</span> {t(ui.backToCities)}
                  </button>
                  <h3 className="cx__city-name">{t(city.name)}</h3>
                  {city.tagline && <p className="cx__city-tag">{t(city.tagline)}</p>}
                  <p className="cx__hint">{t(ui.exploreLocations)}</p>
                </div>
                <ul className="cx__grid" role="list">
                  {city.points.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        className="cx__card"
                        style={{ ["--cat" as string]: CATEGORY_META[p.category].color } as CSSProperties}
                        aria-haspopup="dialog"
                        aria-label={`${t(p.name)} — ${catLabel(p.category)}: ${t(ui.viewDetails)}`}
                        onClick={(e) => openPoint(p.id, e.currentTarget)}
                      >
                        <span className="cx__card-media">
                          <img src={p.image} alt="" loading="lazy" decoding="async" />
                        </span>
                        <span className="cx__card-body">
                          <span className="cx__cat">
                            <i className="cx__cat-dot" aria-hidden="true" />
                            {catLabel(p.category)}
                          </span>
                          <b>{t(p.name)}</b>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <div className="cx__overview">
                <p className="cx__hint cx__hint--lead">{t(ui.chooseCity)}</p>
                <div className="cx__cities">
                  {data.cities.map((c, i) => (
                    <button key={c.id} type="button" className="cx__city-card" onClick={() => selectCity(i)}>
                      <b>{t(c.name)}</b>
                      {c.tagline && <span>{t(c.tagline)}</span>}
                      <span className="cx__city-count">{c.points.length}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Legend — colour is never the only signal */}
        <ul className="cx__legend" aria-label="categories">
          {CATEGORY_ORDER.map((id) => (
            <li key={id} className="cx__leg">
              <i className="cx__cat-dot" style={{ background: CATEGORY_META[id].color }} aria-hidden="true" />
              {catLabel(id)}
            </li>
          ))}
        </ul>
      </div>

      {/* Location detail — modal overlay (bottom sheet on mobile via CSS) */}
      {point && city && (
        <div className="cx__overlay" onClick={closePoint}>
          <div
            className="cx__dialog"
            role="dialog"
            aria-modal="true"
            aria-label={t(point.name)}
            dir={dir}
            onClick={(e) => e.stopPropagation()}
            style={{ ["--cat" as string]: CATEGORY_META[point.category].color } as CSSProperties}
          >
            <div className="cx__dialog-media">
              <img src={point.image} alt="" decoding="async" />
            </div>
            <div className="cx__dialog-body">
              <span className="cx__cat">
                <i className="cx__cat-dot" aria-hidden="true" />
                {catLabel(point.category)}
              </span>
              <h4 className="cx__dialog-title">{t(point.name)}</h4>
              <p className="cx__dialog-city">{t(city.name)}</p>
              {point.desc && <p className="cx__dialog-desc">{t(point.desc)}</p>}
            </div>
            <button type="button" className="cx__close" ref={closeRef} onClick={closePoint} aria-label={t(ui.close)}>
              <span aria-hidden="true">✕</span>
            </button>
          </div>
        </div>
      )}
    </SectionShell>
  );
}
