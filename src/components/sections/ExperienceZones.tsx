import { useEffect, useRef, type CSSProperties } from "react";
import { useContent, useLang } from "@/i18n";
import "./ExperienceZones.css";

/**
 * Section 05 — Experience zones, presented as a professional image-card experience.
 * A quick audience-category overview, then five premium image cards (one per zone)
 * built entirely from the existing bilingual data — strong relevant image, localized
 * title + English subtitle, short supporting copy, accent system, polished hover/tap/
 * focus states, keyboard-visible focus, responsive grid (one column on mobile).
 * Cards reveal with a restrained one-time stagger (latched → stable on reverse scroll).
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

  // one-time staggered reveal (latched → stable on reverse). A capability-checked
  // IntersectionObserver toggles a single class; all hover/focus visuals live in CSS
  // so nothing inline ever fights the interaction states. Falls back to fully visible.
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

  return (
    <section id="zones" data-section="05" ref={ref} className="section section--zones" aria-label={experience.title}>
      <div className="container sec-header" data-reveal>
        <p className="eyebrow"><span className="sec-index">05</span>{experience.eyebrow}</p>
        <h2 className="heading-xl sec-title">{experience.zonesTitle}</h2>
        <p className="lede sec-lede">{experience.zonesSub}</p>
      </div>

      {/* quick audience-category overview (existing data, no invented claims) */}
      <div className="container zaudiences" data-reveal aria-label={experience.coreSub}>
        {experience.audiences.map((a) => (
          <span className="zaud-chip" key={a.id}>{a.ar}</span>
        ))}
      </div>

      <div className="container">
        <div className="zones-grid" ref={gridRef} role="list" aria-label={experience.zonesTitle}>
          {experience.zones.map((z, i) => (
            <article
              className="zcard"
              data-accent={z.accent}
              key={z.id}
              role="listitem"
              tabIndex={0}
              aria-label={`${z.ar}${z.en && z.en !== z.ar ? " — " + z.en : ""}: ${z.desc}`}
              style={{ ["--i" as string]: i } as CSSProperties}
            >
              <div className="zcard__media" aria-hidden="true">
                <img className="zcard__img" src={ZONE_IMG[z.id]} alt="" loading="lazy" decoding="async" />
                <span className="zcard__scrim" />
              </div>
              <div className="zcard__body" dir={dir}>
                <h3 className="zcard__title">{z.ar}</h3>
                {z.en && z.en !== z.ar && <span className="zcard__en">{z.en}</span>}
                <p className="zcard__desc">{z.desc}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
