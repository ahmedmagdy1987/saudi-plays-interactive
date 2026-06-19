import { useEffect, useRef, useState } from "react";
import { NAV } from "@/data/projectContent";
import { scrollToId } from "@/lib/scroll";
import "./SectionProgressNavigation.css";

/**
 * Page progress bar + side rail. The rail reflects the active section (observed,
 * not hijacked) and lets users jump between the ten chapters. It never traps
 * scrolling. Hidden on small screens, where only the slim top bar remains.
 */
export default function SectionProgressNavigation() {
  const [active, setActive] = useState<string>(NAV[0].id);
  const barRef = useRef<HTMLDivElement>(null);

  // top progress bar (rAF-throttled scroll read)
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const p = max > 0 ? Math.min(1, doc.scrollTop / max) : 0;
      if (barRef.current)
        barRef.current.style.setProperty("--p", `${(p * 100).toFixed(2)}%`);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  // active-section detection
  useEffect(() => {
    const sections = NAV.map((n) => document.getElementById(n.id)).filter(
      (el): el is HTMLElement => !!el,
    );
    const ratios = new Map<string, number>();
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) ratios.set(e.target.id, e.intersectionRatio);
        let best = active;
        let max = -1;
        for (const [id, r] of ratios)
          if (r > max) {
            max = r;
            best = id;
          }
        if (max > 0) setActive(best);
      },
      { threshold: [0.15, 0.35, 0.55, 0.75] },
    );
    sections.forEach((s) => obs.observe(s));
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="progress-bar" ref={barRef} aria-hidden="true">
        <div className="progress-bar__fill" />
      </div>
      <nav className="navrail" aria-label="فصول العرض">
        {NAV.map((n) => (
          <button
            key={n.id}
            type="button"
            className="navrail__item"
            aria-current={active === n.id}
            aria-label={`${n.index} — ${n.label}`}
            onClick={() => scrollToId(n.id)}
          >
            <span className="navrail__dot" aria-hidden="true" />
            <span className="navrail__label">
              <span className="navrail__index">{n.index}</span> {n.label}
            </span>
          </button>
        ))}
      </nav>
    </>
  );
}
