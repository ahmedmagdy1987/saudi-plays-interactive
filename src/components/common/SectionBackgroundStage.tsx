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
interface MediaItem { id: string; img: string; loop?: string }
const MEDIA: MediaItem[] = [
  { id: "vision", img: "s02-vision" },
  { id: "market", img: "s03-market" },
  { id: "riyadh", img: "s04-expansion" },
  { id: "zones", img: "s05-entertainment", loop: "loop-entertainment" },
  { id: "malahi", img: "s06-energy" },
  { id: "governance", img: "s07-governance" },
  { id: "revenue", img: "s08-revenue" },
  { id: "impact", img: "s09-impact", loop: "loop-impact" },
  { id: "finale", img: "s10-finale", loop: "loop-finale" },
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

  // ---- iPhone / iOS: in-flow per-section absolute media (mirrors §10) ----
  useEffect(() => {
    if (!ios) return;
    try {
    const flow = flowRef.current!;
    const reduced = prefersReducedMotion();
    const secEls = MEDIA.map((m) => document.getElementById(m.id));
    const boxes = Array.from(flow.querySelectorAll<HTMLElement>(".ms-flow__sec"));
    const imgs = boxes.map((b) => b.querySelector<HTMLImageElement>(".ms-flow__img")!);
    const videos = boxes.map((b) => b.querySelector<HTMLVideoElement>(".ms-flow__video"));
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

    // Position each section's media box over its section (document coords; .ms-flow is
    // absolute inset:0 inside the position:relative .app-root, which starts at doc 0).
    const measure = () => {
      const y = window.scrollY || 0;
      for (let i = 0; i < N; i++) {
        const el = secEls[i];
        const box = boxes[i];
        if (!el || !box) continue;
        const r = el.getBoundingClientRect();
        box.style.top = `${Math.round(r.top + y)}px`;
        box.style.height = `${Math.round(r.height)}px`;
      }
    };

    // The STILL is the guaranteed visible base: assign src for the active section AND
    // its immediate neighbours (a small window, never all 9 at once), and reveal it
    // once it has truly decoded (naturalWidth > 0) so essential imagery never depends
    // on lazy timing or a fragile effect.
    const warmImg = (i: number) => {
      if (i < 0 || i >= N) return;
      const img = imgs[i];
      if (!img) return;
      if (!img.getAttribute("src")) {
        const ds = img.getAttribute("data-src");
        if (ds) img.setAttribute("src", ds);
      }
      const reveal = () => { if (img.naturalWidth > 0) img.classList.add("is-on"); };
      if (img.complete) reveal();
      else { img.addEventListener("load", reveal, { once: true }); img.addEventListener("loadeddata", reveal, { once: true }); }
    };

    // poster→video crossfade only after a REAL first frame (never a blank)
    const showVideo = (i: number) => {
      if (vready[i] && vwant[i] && !document.hidden) boxes[i].classList.add("is-playing");
    };
    const onReady = (i: number) => { vready[i] = true; if (vwant[i]) showVideo(i); };
    const startVideo = (i: number) => {
      const v = videos[i];
      if (!v || reduced) return;
      vwant[i] = true;
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
      if (p && typeof p.catch === "function") p.catch(() => { /* blocked autoplay → poster/still stays */ });
    };
    const stopVideo = (i: number) => {
      const v = videos[i];
      if (!v) return;
      vwant[i] = false;
      boxes[i].classList.remove("is-playing");   // crossfade back to the still
      if (!v.paused && v.readyState >= 3) v.pause();
    };

    // Drive everything off real section visibility (no fixed-layer scroll math). Keep
    // the active section + immediate neighbours warmed; pause off-screen video.
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const i = secEls.indexOf(e.target as HTMLElement);
          if (i < 0) continue;
          if (e.isIntersecting) {
            warmImg(i - 1); warmImg(i); warmImg(i + 1);
            if (MEDIA[i].loop) startVideo(i);
          } else if (MEDIA[i].loop) {
            stopVideo(i);
          }
        }
      },
      { rootMargin: "25% 0px 25% 0px", threshold: 0 },
    );
    secEls.forEach((el) => el && io.observe(el));

    measure();
    // warm whatever is already on/near screen immediately (don't wait for a scroll)
    {
      const vh = window.innerHeight, y = window.scrollY || 0;
      for (let i = 0; i < N; i++) {
        const el = secEls[i]; if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.top + y < y + vh * 1.25 && r.bottom + y > y - vh * 0.25) { warmImg(i - 1); warmImg(i); warmImg(i + 1); }
      }
    }

    let raf = 0;
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; measure(); }); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    window.addEventListener("load", measure);
    // the §10 static→cinematic upgrade (and font/layout settling) grows the page and
    // shifts later sections — re-measure on any document size change.
    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") { ro = new ResizeObserver(() => measure()); ro.observe(document.body); }
    const onVis = () => {
      if (document.hidden) {
        for (let i = 0; i < N; i++) { const v = videos[i]; if (v && !v.paused) v.pause(); }
      } else {
        for (let i = 0; i < N; i++) if (vwant[i]) startVideo(i);
        measure();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    recacheRef.current = measure;

    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      window.removeEventListener("load", measure);
      document.removeEventListener("visibilitychange", onVis);
      ro?.disconnect();
      if (raf) cancelAnimationFrame(raf);
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

      {/* iPhone: in-flow per-section media (real <img> + <video>), positioned over each
          section — the same iOS-safe full-bleed pattern proven by the §10 journey. */}
      {ios && (
        <div className="ms-flow" ref={flowRef} aria-hidden="true">
          {MEDIA.map((m, i) => (
            <div className="ms-flow__sec" data-i={i} data-sec={m.id} key={m.id}>
              <img className="ms-flow__img" alt="" decoding="async" data-src={base(m.img + ".webp")} />
              {m.loop && (
                <video className="ms-flow__video" muted loop playsInline preload="none" disablePictureInPicture>
                  <source data-src={base(m.loop + ".mp4")} type="video/mp4" />
                </video>
              )}
              <span className="ms-flow__scrim" />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
