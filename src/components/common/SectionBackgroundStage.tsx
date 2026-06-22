import { useEffect, useMemo, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLang } from "@/i18n";
import { prefersReducedMotion } from "@/lib/hooks";
import "./SectionBackgroundStage.css";

/**
 * Cinematic media backdrop for Sections 02–09 + the finale (§11). Each section owns a
 * real Higgsfield still (and three of them a short looping clip).
 *
 * TWO render paths share the same MEDIA list and the same approved stills/loops:
 *
 * 1. Desktop & Android — ONE persistent `position: fixed` stage (`.ms`). A single
 *    ScrollTrigger maps scroll to a continuous "section float"; each layer's opacity /
 *    scale / drift is derived from its distance to that float (gsap.quickSetters), so
 *    scrolling crossfades + parallaxes the viewport-pinned backdrop. UNCHANGED.
 *
 * 2. iPhone / iOS WebKit — a `position: absolute`, in-flow per-section media layer
 *    (`.ms-flow`), each section's still as a REAL <img> (+ <video> overlay for the
 *    loops), positioned over its section. This mirrors the §10 City Journey layer that
 *    is confirmed to render on physical iPhone, and DELIBERATELY avoids the global
 *    `position: fixed` backdrop: on physical iOS Safari a fixed full-viewport layer
 *    behind a long scrolling page fails to repaint its image/video children (the
 *    section then shows only the `.ms` solid dark base — the reported "plain dark-blue
 *    background"). Playwright WebKit on desktop does NOT reproduce that fixed-layer
 *    paint bug, which is why it always looked fine in automated tests. The fixed `.ms`
 *    dark base + per-section scrim still render on iOS as a guaranteed fallback, so a
 *    section can never be blank.
 *
 * Video (both paths): muted + playsInline (set imperatively so muted-autoplay is always
 * permitted), the play() promise is handled, load() runs at most once per clip, the
 * poster (the still) stays visible UNTIL a real first frame renders (loadeddata /
 * requestVideoFrameCallback) — only then does the poster→video crossfade run, so a
 * blocked autoplay / Low-Power Mode always leaves the correct still visible, never a
 * blank. Off-screen clips pause; everything pauses when the tab is hidden. Reduced
 * motion never autoplays.
 */
interface MediaItem { id: string; img: string; loop?: string; portrait?: string }
const MEDIA: MediaItem[] = [
  { id: "vision", img: "s02-vision" },
  { id: "market", img: "s03-market" },
  { id: "riyadh", img: "s04-expansion" },
  { id: "zones", img: "s05-entertainment", loop: "loop-entertainment", portrait: "loop-entertainment-portrait.mp4" },
  { id: "malahi", img: "s06-energy" },
  { id: "governance", img: "s07-governance" },
  { id: "revenue", img: "s08-revenue" },
  { id: "impact", img: "s09-impact", loop: "loop-impact", portrait: "loop-impact-portrait.mp4" },
  { id: "finale", img: "s10-finale", loop: "loop-finale", portrait: "loop-finale-portrait.mp4" },
];
const N = MEDIA.length;
const base = (f: string) => `/media/sections/${f}`;

// opacity-driven video want hysteresis (desktop/Android fixed stage)
const WANT_ENTER = 0.34;
const WANT_LEAVE = 0.12;
const DWELL_MS = 280;

// iOS Safari / WhatsApp WebView (and the Playwright iPhone profile, so the path is
// testable). NOT Android Chrome / desktop, which keep the persistent fixed stage.
const isIOSWebKit = () => {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/iP(hone|od|ad)/.test(ua)) return true;
  // iPadOS 13+ reports as Mac; treat a touch-capable "Mac" as iOS.
  return navigator.platform === "MacIntel" && (navigator.maxTouchPoints || 0) > 1;
};

export default function SectionBackgroundStage() {
  const { lang } = useLang();
  const rootRef = useRef<HTMLDivElement>(null);
  const flowRef = useRef<HTMLDivElement>(null);
  const recacheRef = useRef<() => void>(() => {});
  const ios = useMemo(isIOSWebKit, []);

  // ---- Desktop / Android: persistent fixed stage (UNCHANGED) ----
  useEffect(() => {
    if (ios) return; // iPhone uses the in-flow per-section layer below
    try {
    const root = rootRef.current!;
    const reduced = prefersReducedMotion();
    const lite = window.matchMedia("(max-width: 820px)").matches;
    const layers = Array.from(root.querySelectorAll<HTMLElement>(".ms__layer"));
    const imgs = layers.map((l) => l.querySelector<HTMLElement>(".ms__img")!);
    const videos = layers.map((l) => l.querySelector<HTMLVideoElement>(".ms__video"));
    const setO = layers.map((l) => gsap.quickSetter(l, "opacity") as (v: number) => void);
    const setTImg = imgs.map((el) => gsap.quickSetter(el, "transform") as (v: string) => void);
    const setTVid = videos.map((v) => (v ? (gsap.quickSetter(v, "transform") as (val: string) => void) : null));
    const setT = (i: number, val: string) => { setTImg[i](val); setTVid[i]?.(val); };
    const loaded = new Array(N).fill(false);
    const vloaded = new Array(N).fill(false);
    const vready = new Array(N).fill(false);
    const vwant = new Array(N).fill(false);
    const vpausePend = new Array(N).fill(false);
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

    const loadImg = (i: number) => {
      if (loaded[i]) return;
      loaded[i] = true;
      imgs[i].style.backgroundImage = `url(${base(MEDIA[i].img + ".webp")})`;
    };
    const showVideo = (i: number) => {
      if (vready[i] && vwant[i] && !document.hidden) layers[i].classList.add("is-playing");
    };
    const reallyPause = (i: number) => {
      vpausePend[i] = false;
      const v = videos[i];
      if (v && !v.paused) v.pause();
    };
    const onReady = (i: number) => {
      vready[i] = true;
      if (vwant[i]) showVideo(i);
      else if (vpausePend[i]) reallyPause(i);
    };
    const startVideo = (i: number) => {
      const v = videos[i];
      if (!v) return;
      vpausePend[i] = false;
      if (!vloaded[i]) {
        vloaded[i] = true;
        v.querySelectorAll("source").forEach((s) => {
          const d = s.getAttribute("data-src");
          if (d && !s.getAttribute("src")) s.setAttribute("src", d);
        });
        v.load();
        v.addEventListener("loadeddata", () => onReady(i), { once: true });
        v.addEventListener("canplay", () => onReady(i), { once: true });
        const rvfc = (v as unknown as { requestVideoFrameCallback?: (cb: () => void) => number }).requestVideoFrameCallback;
        if (rvfc) rvfc.call(v, () => onReady(i));
      } else if (vready[i]) {
        showVideo(i);
      }
      const p = v.play?.();
      if (p && typeof p.catch === "function") p.catch(() => { /* benign autoplay rejection */ });
    };
    const stopVideo = (i: number) => {
      const v = videos[i];
      if (!v) return;
      if (vtimer[i]) { clearTimeout(vtimer[i]); vtimer[i] = 0; }
      layers[i].classList.remove("is-playing");
      if (v.paused) { vpausePend[i] = false; return; }
      if (v.readyState >= 3) reallyPause(i);
      else vpausePend[i] = true;
    };
    const wantVideo = (i: number, op: number) => {
      if (!videos[i] || reduced) return;
      const want = vwant[i] ? op > WANT_LEAVE : op > WANT_ENTER;
      if (want === vwant[i]) {
        if (want && vloaded[i] && vready[i] && !document.hidden && !layers[i].classList.contains("is-playing")) showVideo(i);
        return;
      }
      vwant[i] = want;
      if (want) {
        if (vloaded[i]) startVideo(i);
        else if (!vtimer[i]) vtimer[i] = window.setTimeout(() => { vtimer[i] = 0; if (vwant[i]) startVideo(i); }, DWELL_MS);
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
        if (!reduced && !lite) {
          const sc = 1 - 0.05 * Math.min(ad, 1.6);
          setT(i, `translate3d(0,${(d * 20).toFixed(1)}px,0) scale(${sc.toFixed(4)})`);
        } else {
          setT(i, "none");
        }
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
      const hidden = document.hidden;
      root.classList.toggle("ms--paused", hidden);
      if (hidden) {
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

    return () => {
      trig.kill();
      document.removeEventListener("visibilitychange", onVis);
      vtimer.forEach((t) => t && clearTimeout(t));
      videos.forEach((v) => v && v.pause());
    };
    } catch {
      window.__spRevealAll?.();
    }
  }, [ios]);

  // ---- iPhone / iOS: in-flow, viewport-PINNED media that crossfades by scroll ----
  // Each .ms-flow layer spans the whole document and holds a `position: sticky` 100svh
  // media box, so ALL layers stay pinned to the viewport (the §10-proven iOS-safe
  // alternative to position:fixed). One ScrollTrigger maps scroll to a continuous
  // "section float"; opacity + a restrained scale (1.00→1.02) are derived from each
  // layer's distance to that float — the SAME crossfade language as the desktop fixed
  // stage, so the iPhone backgrounds ENTER → HOLD → EXIT and crossfade with scroll
  // (and reverse deterministically) instead of toggling on/off. Only ~2 layers paint at
  // once (faded layers go visibility:hidden); no permanent will-change on the layers.
  useEffect(() => {
    if (!ios) return;
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

    // video ONLY for sections that ship a dedicated PORTRAIT 9:16 variant — a landscape
    // loop is never up-scaled into the portrait crop. Poster/still stays until a real frame.
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
      vwant[i] = false;
      layers[i].classList.remove("is-playing");
      if (!v.paused && v.readyState >= 3) { v.pause(); v.dataset.play = "paused"; }
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
        // restrained scroll-linked zoom only (no heavy parallax): active ≈1.02, receding 1.00
        const sc = reduced ? 1 : 1 + 0.02 * Math.max(0, 1 - ad);
        const tf = `scale(${sc.toFixed(4)})`;
        if (imgs[i].style.transform !== tf) imgs[i].style.transform = tf;
        const vEl = videos[i];
        if (vEl && vEl.style.transform !== tf) vEl.style.transform = tf;
        if (ad < 1.8) loadImg(i);
        if (videos[i]) {
          // opacity hysteresis (enter 0.34 / leave 0.12): a video-backed section keeps
          // playing through its scroll-crossfade and never flickers start/stop when the
          // user is parked near a boundary. load() runs once; pause preserves currentTime.
          const want = vwant[i] ? op > WANT_LEAVE : op > WANT_ENTER;
          if (want !== vwant[i]) { if (want) startVideo(i); else stopVideo(i); }
        }
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
        // mark un-wanted + drop is-playing so returning re-evaluates want from scroll and
        // replays the active clip (resumes from its currentTime — load() is not called again)
        for (let i = 0; i < N; i++) {
          vwant[i] = false;
          layers[i].classList.remove("is-playing");
          const v = videos[i];
          if (v && !v.paused) v.pause();
        }
      } else {
        render();                            // re-derive want from current scroll → replay active
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
      videos.forEach((v) => v && v.pause());
    };
    } catch {
      // a failure here must never blank the page; the fixed .ms dark base remains
      window.__spRevealAll?.();
    }
  }, [ios]);

  // re-measure / refresh on language change (RTL/LTR reflow shifts section offsets)
  useEffect(() => {
    const id = requestAnimationFrame(() => { recacheRef.current(); try { ScrollTrigger.refresh(); } catch { /* noop */ } });
    return () => cancelAnimationFrame(id);
  }, [lang]);

  return (
    <>
      {/* solid dark base + (desktop/Android only) the fixed crossfading layers */}
      <div className={`ms${ios ? " ms--ios" : ""}`} ref={rootRef} aria-hidden="true">
        {!ios && (
          <>
            <div className="ms__layers">
              {MEDIA.map((m, i) => (
                <div className={`ms__layer ms__layer--g${Math.min(4, Math.floor(i / 2))}`} key={m.id} data-i={i}>
                  <div className="ms__img" style={{ backgroundImage: i === 0 ? `url(${base(m.img + ".webp")})` : undefined }} />
                  {m.loop && (
                    <video className="ms__video" muted loop playsInline preload="none" disablePictureInPicture>
                      <source data-src={base(m.loop + ".mp4")} type="video/mp4" />
                    </video>
                  )}
                </div>
              ))}
            </div>
            <div className="ms__scrim" />
          </>
        )}
      </div>

      {/* iPhone: in-flow, viewport-PINNED media that crossfades by scroll float — real
          <img> stills always; a <video> only where a dedicated PORTRAIT 9:16 variant
          exists (landscape loops are never up-scaled into the portrait crop, so video
          sections fall back to the high-quality still). The §10-proven iOS-safe pattern. */}
      {ios && (
        <div className="ms-flow" ref={flowRef} aria-hidden="true">
          {MEDIA.map((m, i) => (
            <div className="ms-flow__sec" data-i={i} data-sec={m.id} key={m.id}>
              <div className="ms-flow__pin">
                <img className="ms-flow__img" alt="" decoding="async" data-src={base(m.img + ".webp")} />
                {m.portrait && (
                  <video className="ms-flow__video" muted loop playsInline preload="none" disablePictureInPicture>
                    <source data-src={base(m.portrait)} type="video/mp4" />
                  </video>
                )}
                <span className="ms-flow__scrim" />
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
