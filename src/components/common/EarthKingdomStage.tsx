import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SaudiMap from "@/components/common/SaudiMap";
import { prefersReducedMotion } from "@/lib/hooks";
import "./EarthKingdomStage.css";

/**
 * Earth → Kingdom cinematic scroll camera.
 *
 * ONE shared, cross-device layer (no UA branch, no iPhone path) that turns the upper
 * narrative (§02 → §10) into a single geographic journey: an Earth/globe view whose
 * camera descends toward Saudi Arabia as you scroll, with the accurate Kingdom outline
 * growing into focus, then hands off to the detailed §10 Kingdom/city journey.
 *
 * It composites OVER the existing optimized section videos (SectionBackgroundStage),
 * which remain as the cinematic "surface/context" of the world — this layer adds the
 * globe limb, a faint graticule and the zooming Kingdom geography on top, so the
 * sections read as ONE descending camera move rather than independent crossfades.
 *
 * Driven by a single normalized scroll progress P (pure function → perfectly reversible
 * on scroll-up). transform + opacity only; no video here, no per-frame filters, no idle
 * rAF — the global ScrollTrigger ticks render(). Reduced-motion renders a calm static
 * frame. The whole layer fades out as P→1 so it never double-images the §10 map.
 */
export default function EarthKingdomStage() {
  const stageRef = useRef<HTMLDivElement>(null);
  const camRef = useRef<HTMLDivElement>(null);
  const limbRef = useRef<HTMLDivElement>(null);
  const kingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const cam = camRef.current;
    const limb = limbRef.current;
    const king = kingRef.current;
    if (!stage || !cam || !limb || !king) return;
    const reduced = prefersReducedMotion();

    const clamp = (v: number, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
    // smoothstep for soft, hard-cut-free envelopes
    const smooth = (e0: number, e1: number, x: number) => {
      const t = clamp((x - e0) / (e1 - e0 || 1));
      return t * t * (3 - 2 * t);
    };

    let startY = 0;
    let endY = 1;
    const measure = () => {
      const vis = document.getElementById("vision");
      const jrn = document.getElementById("journey");
      const y = window.scrollY || 0;
      // P=0 when the viewport centre reaches §02's top; P=1 when it reaches §10's top
      startY = vis ? vis.getBoundingClientRect().top + y - window.innerHeight * 0.5 : 0;
      endY = jrn ? jrn.getBoundingClientRect().top + y - window.innerHeight * 0.5 : startY + 1;
      if (endY <= startY) endY = startY + 1;
    };

    const setCam = gsap.quickSetter(cam, "transform") as (v: string) => void;
    const setStageO = gsap.quickSetter(stage, "opacity") as (v: number) => void;
    const setLimbO = gsap.quickSetter(limb, "opacity") as (v: number) => void;
    const setKingO = gsap.quickSetter(king, "opacity") as (v: number) => void;
    const lightTheme = () => document.documentElement.getAttribute("data-theme") === "light";

    const render = () => {
      const ref = (window.scrollY || 0) + window.innerHeight * 0.5;
      const P = clamp((ref - startY) / (endY - startY));

      // visibility envelope: ramp in quickly so §02 OPENS in the Earth/Kingdom view,
      // hold, then ease out before §10 (clean handoff, never double-imaging its map)
      const vis = smooth(0.0, 0.06, P) * (1 - smooth(0.84, 1.0, P));
      setStageO(vis);
      const onStage = vis > 0.001;
      if (stage.style.visibility !== (onStage ? "visible" : "hidden"))
        stage.style.visibility = onStage ? "visible" : "hidden";
      if (!onStage) return;

      // the Kingdom outline RAMPS in: faint at §02 (the §02 hub map leads there, so no
      // double-map clash), bold through the map-less middle sections, eased so there is
      // never a hard appearance. Lighter ceiling in light theme so it stays a faint motif.
      const kCeil = lightTheme() ? 0.42 : 0.74;
      setKingO((0.16 + (kCeil - 0.16) * smooth(0.1, 0.5, P)) * (1 - smooth(0.86, 1.0, P)));

      if (reduced) {
        // calm static frame — a gentle mid-descent, no scroll-driven transform
        setCam("translate(-50%, -48%) scale(1.6)");
        setLimbO(0.45);
        return;
      }

      // CAMERA: a continuous descent — scale grows ~1→3.4 with a restrained per-stage
      // breathing (gentle pull-back at each section centre, push-in across transitions),
      // plus a slight vertical drift so it reads as moving OVER the Kingdom, not just zoom.
      const breathe = 0.055 * Math.sin(P * Math.PI * 7); // restrained reposition between beats
      const scale = (1 + P * 2.4) * (1 + breathe);
      const ty = -48 - P * 6; // %
      setCam(`translate(-50%, ${ty}%) scale(${scale.toFixed(3)})`);

      // the globe limb (the "from space" curvature) is prominent at the start and
      // recedes as the camera descends to the surface
      setLimbO(0.72 * (1 - smooth(0.0, 0.42, P)));
    };

    measure();
    render();

    const trig = ScrollTrigger.create({
      trigger: document.documentElement,
      start: "top top",
      end: "bottom bottom",
      onUpdate: render,
      onRefresh: () => { measure(); render(); },
    });
    const onResize = () => { measure(); render(); };
    window.addEventListener("resize", onResize);

    return () => {
      trig.kill();
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div className="ek" ref={stageRef} aria-hidden="true">
      <div className="ek__stars" />
      <div className="ek__limb" ref={limbRef} />
      <div className="ek__cam" ref={camRef}>
        <div className="ek__globe" />
        <div className="ek__kingdom" ref={kingRef}>
          <SaudiMap stage={3} connections="fromRiyadh" labels="none" pulse={false} ariaLabel="" />
        </div>
      </div>
    </div>
  );
}
