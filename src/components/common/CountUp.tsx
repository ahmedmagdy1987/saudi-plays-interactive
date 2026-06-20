import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/lib/hooks";

interface CountUpProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  /** verbatim fallback shown for reduced-motion / before animation */
  display?: string;
  duration?: number;
  className?: string;
  /** start the count when this becomes true (driven by the section scene) */
  play?: boolean;
}

function fmt(n: number, decimals = 0) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Accessible number count-up. Animates once when `play` flips true (or when
 * scrolled into view if `play` is left undefined). Honors reduced motion by
 * rendering the final value immediately. The real value is exposed to AT via
 * aria-label so screen readers never hear the intermediate ticks.
 */
export default function CountUp({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  display,
  duration = 1.7,
  className,
  play,
}: CountUpProps) {
  // `display` (when given) is the authoritative final string; otherwise build
  // it from prefix + value + suffix. Never combine prefix WITH display, or a
  // display like "+50" would double the prefix.
  const numeric = `${prefix}${fmt(value, decimals)}${suffix}`;
  const final = display ?? numeric;
  const reduced = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const valRef = useRef<HTMLSpanElement>(null);
  const [text, setText] = useState(reduced ? final : `${prefix}${fmt(0, decimals)}${suffix}`);
  const started = useRef(false);

  useEffect(() => {
    if (reduced) {
      setText(final);
      return;
    }
    const node = ref.current;
    if (!node) return;

    let raf = 0;
    const run = () => {
      if (started.current) return;
      started.current = true;
      const t0 = performance.now();
      const tick = (now: number) => {
        // tab hidden → don't spend CPU formatting/committing intermediate ticks
        // (this is a JS rAF loop, so the CSS-only .sec-rest motion gate can't pause
        // it). Reschedule; elapsed wall-time still advances so it lands on the
        // correct eased value when the tab returns.
        if (document.hidden) { raf = requestAnimationFrame(tick); return; }
        const p = Math.min(1, (now - t0) / (duration * 1000));
        const eased = 1 - Math.pow(1 - p, 3);
        // Write intermediate frames straight to the DOM text node — one React
        // commit at the end instead of ~100/count (×14 count-ups). Output is
        // byte-identical; only the write path changes.
        if (p < 1) {
          if (valRef.current) valRef.current.textContent = `${prefix}${fmt(value * eased, decimals)}${suffix}`;
          raf = requestAnimationFrame(tick);
        } else {
          setText(final);
        }
      };
      raf = requestAnimationFrame(tick);
    };

    // play prop drives it when provided; otherwise self-trigger on view.
    if (play === true) {
      run();
    } else if (play === undefined) {
      const obs = new IntersectionObserver(
        ([e]) => {
          if (e.isIntersecting) {
            run();
            obs.disconnect();
          }
        },
        { threshold: 0.4 },
      );
      obs.observe(node);
      return () => {
        obs.disconnect();
        cancelAnimationFrame(raf);
      };
    }
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play, reduced]);

  return (
    <span ref={ref} className={className}>
      <span ref={valRef} aria-hidden="true">{text}</span>
      {/* real text node for assistive tech: the final value, not the ticks */}
      <span className="sr-only">{final}</span>
    </span>
  );
}
