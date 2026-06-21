import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useContent, useLang } from "@/i18n";
import { scrollToId } from "@/lib/scroll";
import "./SectionProgressNavigation.css";

/**
 * Page progress bar + side rail with a SINGLE reusable tooltip.
 *
 * There is never more than one visible label: one `.navrail__tooltip` element
 * shows the active section's name, and on hover/focus it retargets (text +
 * position) to the pointed dot, returning to the active section on leave. The
 * tooltip is pointer-events:none and slides to follow its target dot, clamped
 * to the viewport. Dots have a generous hit area; the rail is hidden on mobile
 * (only the slim progress bar remains).
 */
export default function SectionProgressNavigation() {
  const { NAV, ui } = useContent();
  const { dir } = useLang();
  const [active, setActive] = useState<string>(NAV[0].id);
  const [hovered, setHovered] = useState<string | null>(null);
  const railRef = useRef<HTMLElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const display = NAV.find((n) => n.id === (hovered ?? active)) ?? NAV[0];

  // top progress bar
  useEffect(() => {
    let raf = 0;
    const doc = document.documentElement;
    // `scrollHeight`/`clientHeight` are layout-flushing reads; cache the scroll
    // range and refresh it only when the page can actually change size (resize /
    // load), so the per-frame scroll tick reads `scrollTop` alone (no forced layout).
    let max = doc.scrollHeight - doc.clientHeight;
    const measure = () => { max = doc.scrollHeight - doc.clientHeight; };
    const update = () => {
      raf = 0;
      const p = max > 0 ? Math.min(1, doc.scrollTop / max) : 0;
      barRef.current?.style.setProperty("--p", `${(p * 100).toFixed(2)}%`);
    };
    // tab hidden → nothing is visible; skip the (potentially programmatic) scroll work
    const onScroll = () => { if (!raf && !document.hidden) raf = requestAnimationFrame(update); };
    const onResize = () => { measure(); onScroll(); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("load", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("load", onResize);
      cancelAnimationFrame(raf);
    };
  }, []);

  // active-section detection — a scroll-position reference line, NOT intersection
  // ratio. The City Journey (§10) is a many-viewport-tall sticky stage; its short DOM
  // header would never win an intersection-ratio contest, so the old logic never
  // marked §10 active while the user was inside the journey. Here the active section
  // is the last one whose top has passed a line ~42% down the viewport — so §10 stays
  // active for its ENTIRE sticky span (until the Finale begins) and reverse scrolling
  // restores the previous section exactly (a pure function of scroll position).
  useEffect(() => {
    const ids = NAV.map((n) => n.id);
    let bounds: { id: string; top: number }[] = [];
    const measure = () => {
      const y = window.scrollY || window.pageYOffset || 0;
      bounds = ids
        .map((id) => {
          const el = document.getElementById(id);
          return el ? { id, top: el.getBoundingClientRect().top + y } : null;
        })
        .filter((b): b is { id: string; top: number } => b !== null)
        .sort((a, b) => a.top - b.top);
    };
    let raf = 0;
    const update = () => {
      raf = 0;
      if (!bounds.length) return;
      const ref = (window.scrollY || window.pageYOffset || 0) + window.innerHeight * 0.42;
      let best = bounds[0].id;
      for (const b of bounds) if (b.top <= ref) best = b.id;
      setActive(best);
    };
    const onScroll = () => { if (!raf && !document.hidden) raf = requestAnimationFrame(update); };
    const remeasure = () => { measure(); onScroll(); };
    measure();
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", remeasure);
    window.addEventListener("load", remeasure);
    // The §10 static→cinematic upgrade GROWS the page by many viewports (the sticky
    // track appears); re-measure section offsets when the document resizes so the
    // journey's true span — and thus its active range — is always tracked.
    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") { ro = new ResizeObserver(remeasure); ro.observe(document.body); }
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", remeasure);
      window.removeEventListener("load", remeasure);
      ro?.disconnect();
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [NAV]);

  // position the single tooltip on its target dot (active or hovered)
  useLayoutEffect(() => {
    const rail = railRef.current, tip = tipRef.current;
    if (!rail || !tip) return;
    const btn = rail.querySelector(`[data-nav="${display.id}"]`) as HTMLElement | null;
    if (!btn) return;
    let y = btn.offsetTop + btn.offsetHeight / 2;
    tip.style.top = `${y}px`;
    // viewport collision-safety
    requestAnimationFrame(() => {
      const r = tip.getBoundingClientRect();
      if (r.top < 10) tip.style.top = `${y + (10 - r.top)}px`;
      else if (r.bottom > window.innerHeight - 10) tip.style.top = `${y - (r.bottom - (window.innerHeight - 10))}px`;
    });
  }, [display.id, dir]);

  return (
    <>
      <div className="progress-bar" ref={barRef} aria-hidden="true">
        <div className="progress-bar__fill" />
      </div>
      <nav className="navrail" ref={railRef} aria-label={ui.navAria}>
        {NAV.map((n) => (
          <button
            key={n.id}
            type="button"
            className="navrail__item"
            data-nav={n.id}
            aria-current={active === n.id}
            aria-label={`${n.index}: ${n.label}`}
            onClick={() => scrollToId(n.id)}
            onMouseEnter={() => setHovered(n.id)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(n.id)}
            onBlur={() => setHovered(null)}
          >
            <span className="navrail__hit" />
            <span className="navrail__dot" aria-hidden="true" />
          </button>
        ))}
        <div className="navrail__tooltip" ref={tipRef} aria-hidden="true">
          <span className="navrail__index">{display.index}</span>
          <span className="navrail__tip-label">{display.label}</span>
        </div>
      </nav>
    </>
  );
}
