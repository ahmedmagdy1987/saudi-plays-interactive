import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLang } from "@/i18n";
import { prefersReducedMotion } from "@/lib/hooks";
import "./SectionBackgroundStage.css";

/**
 * Unified cinematic media backdrop for Sections 02–09 + the finale (§11).
 *
 * ONE media engine for EVERY device — iPhone Safari, iPhone WhatsApp WebView,
 * Android Chrome, desktop, tablet, Arabic + English. There is NO user-agent
 * branch and NO iPhone-specific code path. The architecture is the §10-proven
 * in-document `position: sticky` stage: each section owns a full-document layer
 * whose sticky 100svh media box stays pinned to the viewport, and a single
 * ScrollTrigger maps scroll to a continuous "section float". Opacity (crossfade)
 * and ONE restrained scale (1.00 → 1.02) are pure functions of each layer's
 * distance to that float, so the backdrops ENTER → HOLD → EXIT and crossfade —
 * and reverse deterministically — identically on every platform. Only ~2 layers
 * paint at once (faded layers go visibility:hidden).
 *
 * Media: a real <img> still ALWAYS; the SAME approved landscape loop <video> on
 * EVERY device for the three motion sections (§05/§09/§11). `object-fit: cover`
 * in one full-bleed box gives the identical centre crop everywhere, so iPhone and
 * Android frame the same scene from the same source at the same geometry. The
 * still is the guaranteed base; a clip only crossfades in once a real first frame
 * is confirmed (loadeddata / canplay / requestVideoFrameCallback), so a blocked
 * autoplay / Low-Power Mode always leaves the correct still — never a blank.
 *
 * Capability-only adaptation (no device names): reduced-motion never autoplays and
 * freezes the scale; off-screen clips pause (currentTime preserved); everything
 * pauses when the tab is hidden; any thrown error reveals content via the global
 * fail-safe. muted / playsInline / webkit-playsinline are set imperatively for
 * autoplay compatibility — vendor attributes that aid compatibility without
 * creating a different experience.
 */
interface MediaItem { id: string; img: string; loop?: string }
// Every §02+ section + the finale now carries its own lightweight cinematic loop
// (poster = the approved still, shown until the first decoded frame). The SAME
// landscape source is used on every device; the unified engine warms only the
// active section + its neighbours, pauses off-screen/hidden, and crossfades with
// a restrained scroll-linked scale — no per-device path.
// Order MUST mirror the section DOM order (App.tsx) — the crossfade controller maps
// the scroll "section float" onto this array assuming ascending section centres.
const MEDIA: MediaItem[] = [
  { id: "zones", img: "s05-entertainment", loop: "loop-entertainment" },
  { id: "riyadh", img: "s04-expansion", loop: "loop-expansion" },
  { id: "malahi", img: "s06-energy", loop: "loop-malahi" },
  { id: "vision", img: "s02-vision", loop: "loop-vision" },
  { id: "market", img: "s03-market", loop: "loop-market" },
  { id: "revenue", img: "s08-revenue", loop: "loop-revenue" },
  { id: "governance", img: "s07-governance", loop: "loop-governance" },
  { id: "impact", img: "s09-impact", loop: "loop-impact" },
  { id: "finale", img: "s10-finale", loop: "loop-finale" },
];
const N = MEDIA.length;
const base = (f: string) => `/media/sections/${f}`;

// opacity-driven video want hysteresis: a video-backed section keeps playing through
// its scroll-crossfade and never flickers start/stop when parked near a boundary.
const WANT_ENTER = 0.34;
const WANT_LEAVE = 0.12;
// debounce a video START so a fast fling THROUGH a clip never triggers its load.
const DWELL_MS = 280;

export default function SectionBackgroundStage() {
  const { lang } = useLang();
  const flowRef = useRef<HTMLDivElement>(null);
  const recacheRef = useRef<() => void>(() => {});

  // ---- single in-document sticky stage — runs once, identical on every device ----
  useEffect(() => {
    try {
      const flow = flowRef.current!;
      const reduced = prefersReducedMotion();
      const layers = Array.from(flow.querySelectorAll<HTMLElement>(".ms-flow__sec"));
      const imgs = layers.map((l) => l.querySelector<HTMLImageElement>(".ms-flow__img")!);
      const videos = layers.map((l) => l.querySelector<HTMLVideoElement>(".ms-flow__video"));
      const setO = layers.map((l) => gsap.quickSetter(l, "opacity") as (v: number) => void);
      const loaded = new Array(N).fill(false);
      const vloaded = new Array(N).fill(false);
      const vready = new Array(N).fill(false);
      const vwant = new Array(N).fill(false);
      const vtimer = new Array<number>(N).fill(0);

      videos.forEach((v) => {
        if (!v) return;
        v.muted = true;
        v.defaultMuted = true;
        v.playsInline = true;
        v.setAttribute("webkit-playsinline", "true");
        try { (v as unknown as { disableRemotePlayback?: boolean }).disableRemotePlayback = true; } catch { /* noop */ }
      });

      let sections: { center: number }[] = [];
      const recache = () => {
        const y = window.scrollY || 0;
        sections = MEDIA.map((m) => {
          const el = document.getElementById(m.id);
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { center: r.top + y + r.height / 2 };
        }).filter((s): s is { center: number } => s !== null);
      };
      recacheRef.current = recache;

      // continuous "section float": where the viewport centre sits among section centres
      const floatPos = () => {
        if (sections.length < N) return -1;
        const c = (window.scrollY || 0) + window.innerHeight / 2;
        if (c <= sections[0].center) return -Math.min(1.2, (sections[0].center - c) / window.innerHeight);
        const last = sections[N - 1];
        if (c >= last.center) return N - 1;
        for (let i = 0; i < N - 1; i++) {
          const a = sections[i], b = sections[i + 1];
          if (c >= a.center && c <= b.center) return i + (c - a.center) / (b.center - a.center || 1);
        }
        return 0;
      };

      // STILL = guaranteed base; src assigned for the active layer + neighbours only.
      const loadImg = (i: number) => {
        if (loaded[i]) return;
        loaded[i] = true;
        const img = imgs[i];
        const ds = img.getAttribute("data-src");
        if (ds && !img.getAttribute("src")) img.setAttribute("src", ds);
      };

      // poster/still stays visible until a real first frame; then the clip crossfades in.
      const showVideo = (i: number) => { if (vready[i] && vwant[i] && !document.hidden) layers[i].classList.add("is-playing"); };
      const onReady = (i: number) => { vready[i] = true; if (vwant[i]) showVideo(i); };
      const startVideo = (i: number) => {
        const v = videos[i];
        if (!v || reduced) return;
        vwant[i] = true;
        if (!vloaded[i]) {
          vloaded[i] = true;
          v.querySelectorAll("source").forEach((s) => { const ds = s.getAttribute("data-src"); if (ds && !s.getAttribute("src")) s.setAttribute("src", ds); });
          v.load();
          v.addEventListener("loadeddata", () => onReady(i), { once: true });
          v.addEventListener("canplay", () => onReady(i), { once: true });
          const rvfc = (v as unknown as { requestVideoFrameCallback?: (cb: () => void) => number }).requestVideoFrameCallback;
          if (rvfc) rvfc.call(v, () => onReady(i));
        } else if (vready[i]) showVideo(i);
        const p = v.play?.();
        if (p && typeof p.then === "function") p.then(() => { v.dataset.play = "playing"; }).catch(() => { v.dataset.play = "blocked"; /* still stays */ });
      };
      const stopVideo = (i: number) => {
        const v = videos[i];
        if (!v) return;
        if (vtimer[i]) { clearTimeout(vtimer[i]); vtimer[i] = 0; }
        vwant[i] = false;
        layers[i].classList.remove("is-playing");
        if (!v.paused && v.readyState >= 3) { v.pause(); v.dataset.play = "paused"; }
      };
      // hysteresis + dwell: want when opacity crosses ENTER, release at LEAVE; a START is
      // debounced by DWELL so flinging past a clip never loads it.
      const wantVideo = (i: number, op: number) => {
        if (!videos[i] || reduced) return;
        const want = vwant[i] ? op > WANT_LEAVE : op > WANT_ENTER;
        if (want === vwant[i]) {
          if (want && vloaded[i] && vready[i] && !document.hidden && !layers[i].classList.contains("is-playing")) showVideo(i);
          return;
        }
        if (want) {
          if (vloaded[i]) startVideo(i);
          else if (!vtimer[i]) vtimer[i] = window.setTimeout(() => { vtimer[i] = 0; startVideo(i); }, DWELL_MS);
        } else {
          stopVideo(i);
        }
      };

      const render = () => {
        const f = floatPos();
        for (let i = 0; i < N; i++) {
          const d = f - i;
          const ad = Math.abs(d);
          const op = ad >= 1.1 ? 0 : Math.max(0, 1 - ad / 1.1);
          setO[i](op);
          const vis = op > 0.001 ? "visible" : "hidden";
          if (layers[i].style.visibility !== vis) layers[i].style.visibility = vis;
          // ONE restrained scroll-linked zoom, applied once (active ≈1.02, receding 1.00).
          // No parallax drift, no nested scale, no negative inset — identical on every device.
          const sc = reduced ? 1 : 1 + 0.02 * Math.max(0, 1 - ad);
          const tf = `scale(${sc.toFixed(4)})`;
          if (imgs[i].style.transform !== tf) imgs[i].style.transform = tf;
          const vEl = videos[i];
          if (vEl && vEl.style.transform !== tf) vEl.style.transform = tf;
          if (ad < 1.8) loadImg(i);
          if (MEDIA[i].loop) wantVideo(i, op);
        }
      };

      recache();
      render();

      const trig = ScrollTrigger.create({
        trigger: document.documentElement,
        start: "top top",
        end: "bottom bottom",
        onUpdate: render,
        onRefresh: () => { recache(); render(); },
      });

      const onVis = () => {
        if (document.hidden) {
          // mark un-wanted + drop is-playing so returning re-evaluates want from scroll
          // and replays the active clip (resumes from its currentTime — no re-load).
          for (let i = 0; i < N; i++) {
            if (vtimer[i]) { clearTimeout(vtimer[i]); vtimer[i] = 0; }
            vwant[i] = false;
            layers[i].classList.remove("is-playing");
            const v = videos[i];
            if (v && !v.paused) v.pause();
          }
        } else {
          render();
        }
      };
      document.addEventListener("visibilitychange", onVis);
      // §10 static→cinematic upgrade + font settling grow the page → re-measure offsets
      let ro: ResizeObserver | undefined;
      if (typeof ResizeObserver !== "undefined") { ro = new ResizeObserver(() => { recache(); render(); }); ro.observe(document.body); }

      return () => {
        trig.kill();
        document.removeEventListener("visibilitychange", onVis);
        ro?.disconnect();
        vtimer.forEach((t) => t && clearTimeout(t));
        videos.forEach((v) => v && v.pause());
      };
    } catch {
      // a failure here must never blank the page; the solid .ms dark base remains
      window.__spRevealAll?.();
    }
  }, []);

  // re-measure / refresh on language change (RTL/LTR reflow shifts section offsets)
  useEffect(() => {
    const id = requestAnimationFrame(() => { recacheRef.current(); try { ScrollTrigger.refresh(); } catch { /* noop */ } });
    return () => cancelAnimationFrame(id);
  }, [lang]);

  return (
    <>
      {/* solid dark base (a fixed SOLID-colour div is iOS-safe — only fixed media
          children fail to repaint on iOS, and there are none here) */}
      <div className="ms" aria-hidden="true" />

      {/* the ONE media system, every device: in-document, viewport-PINNED layers that
          crossfade by scroll float — real <img> stills always, the SAME approved
          landscape loop <video> on every platform. object-fit:cover → identical crop. */}
      <div className="ms-flow" ref={flowRef} aria-hidden="true">
        {MEDIA.map((m, i) => (
          <div className="ms-flow__sec" data-i={i} data-sec={m.id} key={m.id}>
            <div className="ms-flow__pin">
              <img className="ms-flow__img" alt="" decoding="async" data-src={base(m.img + ".webp")} />
              {m.loop && (
                <video className="ms-flow__video" muted loop playsInline preload="none" disablePictureInPicture>
                  <source data-src={base(m.loop + ".mp4")} type="video/mp4" />
                </video>
              )}
              <span className="ms-flow__scrim" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
