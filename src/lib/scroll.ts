import { useLayoutEffect, type RefObject } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { prefersReducedMotion } from "./hooks";

gsap.registerPlugin(ScrollTrigger);

// expose for debugging + the language-switch regression test (verifies that
// remounting the motion layer does not leave duplicate/stacked ScrollTriggers)
if (typeof window !== "undefined") {
  (window as unknown as { ScrollTrigger?: typeof ScrollTrigger }).ScrollTrigger = ScrollTrigger;
}

let lenis: Lenis | null = null;

/**
 * Smooth scroll under the user's control (no scroll-hijacking) wired into the
 * GSAP ticker so ScrollTrigger stays in sync. Disabled entirely for
 * reduced-motion users, who get native scrolling.
 */
export function initSmoothScroll(): Lenis | null {
  if (typeof window === "undefined") return null;
  if (prefersReducedMotion()) {
    ScrollTrigger.refresh();
    return null;
  }
  if (lenis) return lenis;

  lenis = new Lenis({
    duration: 1.05,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    wheelMultiplier: 1,
    touchMultiplier: 1.4,
  });

  lenis.on("scroll", ScrollTrigger.update);
  const raf = (time: number) => lenis && lenis.raf(time * 1000);
  gsap.ticker.add(raf);
  gsap.ticker.lagSmoothing(0);

  // Pause ambient smooth-scroll work when the tab is hidden.
  const onVis = () => {
    if (!lenis) return;
    if (document.hidden) {
      lenis.stop();
      gsap.globalTimeline.pause();
    } else {
      lenis.start();
      gsap.globalTimeline.resume();
    }
  };
  document.addEventListener("visibilitychange", onVis);

  return lenis;
}

export function getLenis(): Lenis | null {
  return lenis;
}

/** Programmatic scroll to a section id (used by the progress nav). */
export function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { offset: 0, duration: 1.2 });
  else el.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
}

export interface SceneApi {
  gsap: typeof gsap;
  ScrollTrigger: typeof ScrollTrigger;
  scope: HTMLElement;
  reduced: boolean;
}

/**
 * Scoped GSAP scene helper. Runs `build` inside a gsap.context bound to the
 * scope element so every tween/ScrollTrigger is reverted on unmount. The build
 * function receives a `reduced` flag — sections should set final/static states
 * and skip motion when it is true.
 */
export function useGsapScene(
  scopeRef: RefObject<HTMLElement | null>,
  build: (api: SceneApi) => void,
) {
  useLayoutEffect(() => {
    const scope = scopeRef.current;
    if (!scope) return;
    const reduced = prefersReducedMotion();
    const ctx = gsap.context(() => {
      build({ gsap, ScrollTrigger, scope, reduced });
    }, scope);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
