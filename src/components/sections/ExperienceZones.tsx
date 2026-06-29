import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { useContent, useLang } from "@/i18n";
import "./ExperienceZones.css";

/**
 * §03 — Five Experience Zones. A premium image-card grid; tapping/clicking a zone
 * opens a smooth in-place detail POPUP (title, English, explanation, key visual) —
 * never a page navigation. Escape closes and returns focus; modal on desktop, a
 * safe-area bottom sheet on mobile. This is the ONLY section with popup behaviour.
 */
const ZONE_IMG: Record<string, string> = {
  digital: "/media/sections/zone-digital.webp",
  sports: "/media/sections/zone-sports.webp",
  challenge: "/media/sections/zone-challenge.webp",
  kids: "/media/sections/zone-kids.webp",
  family: "/media/sections/zone-family.webp",
};

export default function ExperienceZones() {
  const ref = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const { experience } = useContent();
  const { lang } = useLang();
  const dir = lang === "en" ? "ltr" : "rtl";

  const [openId, setOpenId] = useState<string | null>(null);
  const lastTrigger = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const zone = openId ? experience.zones.find((z) => z.id === openId) ?? null : null;
  const closeLabel = lang === "en" ? "Close" : "إغلاق";

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    if (typeof IntersectionObserver === "undefined") { grid.classList.add("is-revealed"); return; }
    const io = new IntersectionObserver(
      (entries) => { for (const e of entries) if (e.isIntersecting) { grid.classList.add("is-revealed"); io.disconnect(); } },
      { threshold: 0.16, rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(grid);
    return () => io.disconnect();
  }, [lang]);

  const open = useCallback((id: string, el: HTMLElement) => { lastTrigger.current = el; setOpenId(id); }, []);
  const close = useCallback(() => {
    setOpenId(null);
    requestAnimationFrame(() => lastTrigger.current?.focus());
  }, []);

  useEffect(() => {
    if (!zone) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); close(); } };
    document.addEventListener("keydown", onKey);
    const raf = requestAnimationFrame(() => closeRef.current?.focus());
    return () => { document.removeEventListener("keydown", onKey); cancelAnimationFrame(raf); };
  }, [zone, close]);

  return (
    <section id="zones" data-section="03" ref={ref} className="section section--zones" aria-label={experience.title}>
      <div className="container sec-header" data-reveal>
        <p className="eyebrow"><span className="sec-index">03</span>{experience.eyebrow}</p>
        <h2 className="heading-xl sec-title">{experience.zonesTitle}</h2>
        <p className="lede sec-lede">{experience.zonesSub}</p>
      </div>

      <div className="container zaudiences" data-reveal aria-label={experience.coreSub}>
        {experience.audiences.map((a) => (
          <span className="zaud-chip" key={a.id}>{a.ar}</span>
        ))}
      </div>

      <div className="container">
        <div className="zones-grid" ref={gridRef} role="list" aria-label={experience.zonesTitle}>
          {experience.zones.map((z, i) => (
            <button
              type="button"
              className="zcard"
              data-accent={z.accent}
              key={z.id}
              role="listitem"
              aria-haspopup="dialog"
              aria-label={`${z.ar}${z.en && z.en !== z.ar ? " — " + z.en : ""}: ${z.desc}`}
              style={{ ["--i" as string]: i } as CSSProperties}
              onClick={(e) => open(z.id, e.currentTarget)}
            >
              <span className="zcard__media" aria-hidden="true">
                <img className="zcard__img" src={ZONE_IMG[z.id]} alt="" loading="lazy" decoding="async" />
                <span className="zcard__scrim" />
              </span>
              <span className="zcard__body" dir={dir}>
                <span className="zcard__title">{z.ar}</span>
                {z.en && z.en !== z.ar && <span className="zcard__en">{z.en}</span>}
                <span className="zcard__desc">{z.desc}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* zone detail popup — modal (desktop) / bottom sheet (mobile) */}
      {zone && (
        <div className="zmodal" onClick={close}>
          <div
            className="zmodal__dialog"
            role="dialog"
            aria-modal="true"
            aria-label={zone.ar}
            dir={dir}
            data-accent={zone.accent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="zmodal__media">
              <img src={ZONE_IMG[zone.id]} alt="" decoding="async" />
            </div>
            <div className="zmodal__body">
              <h3 className="zmodal__title">{zone.ar}</h3>
              {zone.en && zone.en !== zone.ar && <span className="zmodal__en">{zone.en}</span>}
              <p className="zmodal__desc">{zone.desc}</p>
            </div>
            <button type="button" className="zmodal__close" ref={closeRef} onClick={close} aria-label={closeLabel}>
              <span aria-hidden="true">✕</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
