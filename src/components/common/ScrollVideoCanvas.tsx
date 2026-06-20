import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import "./ScrollVideoCanvas.css";

/**
 * Frame-accurate, scroll-scrubbed cinematic canvas.
 *
 * It does NOT play a video — it draws a pre-extracted WebP frame sequence to a
 * <canvas>, mapping an externally-supplied scroll progress (0‒1) directly to a
 * frame index via Math.round(progress * (frameCount - 1)). The owning section
 * drives it imperatively (ref.renderProgress) from a single ScrollTrigger, so
 * forward AND reverse scrolling step through the exact same frames with no video
 * seek / keyframe stutter.
 *
 * Engineering notes (all in a perf-critical mutable ref, never React state):
 *  - decode via createImageBitmap where supported (HTMLImageElement fallback)
 *  - WINDOWED cache + eviction → bounded memory on mobile (bitmaps are closed once
 *    they fall outside the window around the current frame)
 *  - progressive preload: first frame immediately, then a window around the
 *    requested frame, then the remainder in the background — never blocking paint
 *  - a single rAF coalesces draws; we only redraw when the target frame changes
 *  - poster shown until the first real frame is decoded, and as the ultimate
 *    no-blank fallback; if 2D canvas is unavailable we reveal a muted <video>
 *  - preload + render paused while the tab is hidden
 *  - DPR-aware backing store (capped) with cover-style draw — never CSS-blurred
 */
export interface ScrollVideoHandle {
  renderProgress: (progress: number) => void;
}

export interface SourceSet {
  dir: string;     // /cinematic/<dir>/frame-####.webp
  poster: string;  // /cinematic/<poster>.webp
  mp4: string;     // /cinematic/<name>.mp4  (fallback)
  webm: string;    // unused (kept for API symmetry)
}

interface Props {
  frameCount: number;
  desktop: SourceSet;
  mobile: SourceSet;
  reduced?: boolean;
  className?: string;
}

const DPR_CAP = 2;
const MAX_INFLIGHT = 4;
const pad4 = (n: number) => String(n).padStart(4, "0");
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

type Frame = ImageBitmap | HTMLImageElement;
const fw = (f: Frame) => ("width" in f ? f.width : (f as HTMLImageElement).naturalWidth);
const fh = (f: Frame) => ("height" in f ? f.height : (f as HTMLImageElement).naturalHeight);

export default forwardRef<ScrollVideoHandle, Props>(function ScrollVideoCanvas(
  { frameCount, desktop, mobile, reduced = false, className = "" },
  ref,
) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const posterRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const eng = useRef({
    render: null as ((progress: number) => void) | null,
  });

  useImperativeHandle(ref, () => ({
    renderProgress(progress: number) { eng.current.render?.(progress); },
  }), []);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const wrap = wrapRef.current!;

    // pick the source set: portrait / narrow viewport → the 9:16 mobile clip
    const isMobile = Math.min(window.innerWidth, window.innerHeight) <= 820 || window.innerHeight > window.innerWidth;
    const set = isMobile ? mobile : desktop;
    const radius = isMobile ? 10 : 16;
    if (posterRef.current) posterRef.current.src = `/cinematic/${set.poster}`;

    const reducedMotion = reduced
      || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
      || document.documentElement.classList.contains("reduced");

    // ---- mutable engine state -------------------------------------------------
    const st = {
      ctx: null as CanvasRenderingContext2D | null,
      frames: new Map<number, Frame>(),
      loading: new Set<number>(),
      inflight: 0,
      requested: 0,
      drawn: -1,
      raf: 0,
      hidden: false,
      dead: false,
      posterHidden: false,
    };

    const framePath = (i: number) => `/cinematic/${set.dir}/frame-${pad4(i + 1)}.webp`;
    const valid = (i: number) => i >= 0 && i < frameCount;
    const close = (f?: Frame) => { if (f && "close" in f) (f as ImageBitmap).close(); };

    const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });
    if (!ctx) { revealVideoFallback(); return; }      // no 2D canvas → muted <video>
    st.ctx = ctx;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
      const w = Math.max(1, Math.round(wrap.clientWidth * dpr));
      const h = Math.max(1, Math.round(wrap.clientHeight * dpr));
      if (canvas.width === w && canvas.height === h) return;
      canvas.width = w; canvas.height = h;
      const f = st.frames.get(st.drawn);
      if (f) drawCover(f); else { st.drawn = -1; scheduleDraw(); }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    // REDUCED MOTION: the poster (a mid / Saudi-clear frame) is the whole static
    // experience — no scrubbing, no frame fetches.
    if (reducedMotion) {
      return () => { st.dead = true; cancelAnimationFrame(st.raf); ro.disconnect(); };
    }

    const onVis = () => { st.hidden = document.hidden; if (!st.hidden) pump(); };
    document.addEventListener("visibilitychange", onVis);

    // the imperative entry point the owning ScrollTrigger calls each update
    eng.current.render = (progress: number) => {
      if (st.dead || !st.ctx) return;
      const idx = Math.round(clamp01(progress) * (frameCount - 1));
      if (idx === st.requested && st.drawn === idx) return;
      st.requested = idx;
      ensureWindow(idx);
      scheduleDraw();
    };

    // first frame immediately, then fan the background preload out from it
    load(0).then(() => { fadePoster(); scheduleDraw(); pump(); });

    return () => {
      st.dead = true;
      cancelAnimationFrame(st.raf);
      document.removeEventListener("visibilitychange", onVis);
      ro.disconnect();
      eng.current.render = null;
      for (const f of st.frames.values()) close(f);
      st.frames.clear(); st.loading.clear();
    };

    // ---- engine (function declarations are hoisted) ---------------------------
    function decodeBlob(blob: Blob): Promise<Frame> {
      if ("createImageBitmap" in window) return createImageBitmap(blob);
      return new Promise((res, rej) => {
        const img = new Image();
        img.onload = () => res(img);
        img.onerror = rej;
        img.src = URL.createObjectURL(blob);
      });
    }

    function load(i: number): Promise<void> {
      if (!valid(i) || st.frames.has(i) || st.loading.has(i) || st.dead) return Promise.resolve();
      st.loading.add(i); st.inflight++;
      return fetch(framePath(i), { cache: "force-cache" })
        .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.blob(); })
        .then(decodeBlob)
        .then((frame) => {
          if (st.dead) { close(frame); return; }
          st.frames.set(i, frame);
          if (i === st.requested) scheduleDraw();
        })
        .catch(() => { /* a single missing/forbidden frame must never break the run */ })
        .finally(() => { st.loading.delete(i); st.inflight--; pump(); });
    }

    // queue the window around `center`, evict decoded frames well outside it so
    // bitmap memory stays bounded (especially important on mobile)
    function ensureWindow(center: number) {
      for (let r = 0; r <= radius; r++) { load(center + r); load(center - r); }
      const keepLo = center - radius - 6, keepHi = center + radius + 6;
      for (const [i, f] of st.frames) {
        if (i !== 0 && (i < keepLo || i > keepHi)) { close(f); st.frames.delete(i); }
      }
    }

    function pump() {
      if (st.hidden || st.dead) return;
      while (st.inflight < MAX_INFLIGHT) {
        const next = nextToLoad();
        if (next == null) break;
        load(next);
      }
    }
    function nextToLoad(): number | null {
      const c = st.requested;
      for (let r = 0; r <= frameCount; r++) {
        const a = c + r, b = c - r;
        if (valid(a) && !st.frames.has(a) && !st.loading.has(a)) return a;
        if (valid(b) && !st.frames.has(b) && !st.loading.has(b)) return b;
      }
      return null;
    }

    function nearest(idx: number): Frame | undefined {
      if (st.frames.has(idx)) return st.frames.get(idx);
      for (let r = 1; r < frameCount; r++) {
        if (st.frames.has(idx - r)) return st.frames.get(idx - r);
        if (st.frames.has(idx + r)) return st.frames.get(idx + r);
      }
      return undefined;
    }

    function scheduleDraw() {
      if (st.raf || st.dead) return;
      st.raf = requestAnimationFrame(() => {
        st.raf = 0;
        const want = st.requested;
        const exact = st.frames.get(want);
        const frame = exact ?? nearest(want);
        if (!frame) return;                 // nothing decoded yet → poster stays
        drawCover(frame);
        st.drawn = exact ? want : st.drawn; // only "settle" once the exact frame is in
        if (!exact) scheduleDraw();         // keep trying until the exact frame lands
      });
    }

    function drawCover(frame: Frame) {
      const ctx2 = st.ctx; if (!ctx2) return;
      const cw = canvas.width, ch = canvas.height;
      const iw = fw(frame), ih = fh(frame);
      if (!iw || !ih) return;
      const scale = Math.max(cw / iw, ch / ih);
      const dw = iw * scale, dh = ih * scale;
      ctx2.drawImage(frame, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
      if (!st.posterHidden) fadePoster();
    }

    function fadePoster() {
      st.posterHidden = true;
      if (posterRef.current) posterRef.current.style.opacity = "0";
    }

    function revealVideoFallback() {
      const v = videoRef.current;
      if (!v) return;
      v.style.display = "block";
      v.load();
      v.play?.().catch(() => { /* keep the poster if autoplay is blocked */ });
    }
  }, [frameCount, reduced, desktop, mobile]);

  return (
    <div className={`svc ${className}`} ref={wrapRef} aria-hidden="true">
      <img className="svc__poster" ref={posterRef} src={`/cinematic/${desktop.poster}`} alt="" decoding="async" />
      <canvas className="svc__canvas" ref={canvasRef} />
      <video className="svc__fallback" ref={videoRef} muted loop playsInline preload="none" poster={`/cinematic/${desktop.poster}`}>
        <source src={`/cinematic/${desktop.mp4}`} type="video/mp4" />
      </video>
    </div>
  );
});
