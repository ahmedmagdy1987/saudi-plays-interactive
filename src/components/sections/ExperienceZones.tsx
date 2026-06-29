import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { useContent, useLang } from "@/i18n";
import { getLenis } from "@/lib/scroll";
import "./ExperienceZones.css";

/**
 * §03 — Five Experience Zones. The default state is concise (title + short English
 * subtitle per zone); tapping a zone opens a premium detail POPUP with the full
 * approved explanation + visual. Modal on desktop, safe-area bottom sheet on mobile.
 * Background scroll is locked while open and restored on close; focus is trapped in
 * the dialog and returned to the trigger on close; Escape closes; users can step
 * between the five zones inside the popup without returning to the top of the page.
 * This is the ONLY section with popup behaviour.
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
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const lastTrigger = useRef<HTMLElement | null>(null);
  const { experience } = useContent();
  const { lang } = useLang();
  const dir = lang === "en" ? "ltr" : "rtl";

  const zones = experience.zones;
  const [openId, setOpenId] = useState<string | null>(null);
  const idx = openId ? zones.findIndex((z) => z.id === openId) : -1;
  const zone = idx >= 0 ? zones[idx] : null;
  const L = (en: string, ar: string) => (lang === "en" ? en : ar);

  // one-time staggered reveal
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

  const openZone = useCallback((id: string, el: HTMLElement) => { lastTrigger.current = el; setOpenId(id); }, []);
  const close = useCallback(() => {
    setOpenId(null);
    requestAnimationFrame(() => lastTrigger.current?.focus());
  }, []);
  const step = useCallback((d: number) => {
    setOpenId((cur) => {
      const i = zones.findIndex((z) => z.id === cur);
      if (i < 0) return cur;
      return zones[(i + d + zones.length) % zones.length].id;
    });
  }, [zones]);

  // lock background scroll (incl. Lenis) while open; restore on close
  useEffect(() => {
    if (!zone) return;
    const lenis = getLenis();
    lenis?.stop();
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => { document.documentElement.style.overflow = prev; lenis?.start(); };
  }, [zone]);

  // Escape + initial focus into the dialog
  useEffect(() => {
    if (!zone) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); close(); } };
    document.addEventListener("keydown", onKey);
    const raf = requestAnimationFrame(() => closeRef.current?.focus());
    return () => { document.removeEventListener("keydown", onKey); cancelAnimationFrame(raf); };
  }, [zone, close]);

  // focus trap within the dialog
  const onDialogKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab") return;
    const f = dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled])');
    if (!f || f.length === 0) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

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
          {zones.map((z, i) => (
            <button
              type="button"
              className="zcard"
              data-accent={z.accent}
              key={z.id}
              role="listitem"
              aria-haspopup="dialog"
              aria-label={`${z.ar}${z.en && z.en !== z.ar ? " — " + z.en : ""}: ${z.desc}`}
              style={{ ["--i" as string]: i } as CSSProperties}
              onClick={(e) => openZone(z.id, e.currentTarget)}
            >
              <span className="zcard__media" aria-hidden="true">
                <img className="zcard__img" src={ZONE_IMG[z.id]} alt="" loading="lazy" decoding="async" />
                <span className="zcard__scrim" />
              </span>
              <span className="zcard__body" dir={dir}>
                <span className="zcard__title">{z.ar}</span>
                {z.en && z.en !== z.ar && <span className="zcard__en">{z.en}</span>}
                <span className="zcard__more" aria-hidden="true">{L("View details", "عرض التفاصيل")}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {zone && (
        <div className="zmodal" onClick={close}>
          <div
            className="zmodal__dialog"
            role="dialog"
            aria-modal="true"
            aria-label={zone.ar}
            dir={dir}
            data-accent={zone.accent}
            ref={dialogRef}
            onKeyDown={onDialogKeyDown}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="zmodal__media">
              <img src={ZONE_IMG[zone.id]} alt="" decoding="async" />
            </div>
            <button type="button" className="zmodal__close" ref={closeRef} onClick={close} aria-label={L("Close", "إغلاق")}>
              <span aria-hidden="true">✕</span>
            </button>
            <div className="zmodal__body">
              <h3 className="zmodal__title">{zone.ar}</h3>
              {zone.en && zone.en !== zone.ar && <span className="zmodal__en">{zone.en}</span>}
              <p className="zmodal__desc">{zone.desc}</p>
            </div>
            <div className="zmodal__nav">
              <button type="button" className="zmodal__navbtn" onClick={() => step(-1)} aria-label={L("Previous zone", "المنطقة السابقة")}>
                <span aria-hidden="true">{dir === "rtl" ? "›" : "‹"}</span>
              </button>
              <span className="zmodal__count" aria-hidden="true">{idx + 1} / {zones.length}</span>
              <button type="button" className="zmodal__navbtn" onClick={() => step(1)} aria-label={L("Next zone", "المنطقة التالية")}>
                <span aria-hidden="true">{dir === "rtl" ? "‹" : "›"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
