import { useEffect, useMemo, useRef } from "react";

/**
 * Opt-in production media diagnostic — renders NOTHING unless opened with
 * `?debugMedia=1`. Required because Playwright WebKit on desktop never reproduces the
 * physical-iPhone media behaviour, so the real-device state must be captured directly.
 *
 * Shows a compact fixed overlay (and logs window.__mediaDebug to the console every 2s)
 * with: the global environment; the section float/progress + entry/hold/exit phase;
 * the current + next layer opacity; the active media's transform/scale; the still and
 * (portrait) video state; and — to pinpoint pixelation — the SOURCE pixel dimensions vs
 * the rendered CSS/physical dimensions, the cover crop ratio, the source-pixels-per-
 * rendered-physical-pixel (a value < 1 means up-scaling), and which source is selected.
 */
const MEDIA_IDS = ["vision", "market", "riyadh", "zones", "malahi", "governance", "revenue", "impact", "finale"];
const LOOP_IDS = new Set(["zones", "impact", "finale"]);

const isIOSWebKit = () => {
  const ua = navigator.userAgent || "";
  if (/iP(hone|od|ad)/.test(ua)) return true;
  return navigator.platform === "MacIntel" && (navigator.maxTouchPoints || 0) > 1;
};

export default function MediaDebug() {
  const on = useMemo(
    () => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("debugMedia") === "1",
    [],
  );
  const boxRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (!on) return;
    const ios = isIOSWebKit();
    const cs = (el: Element | null) => (el ? getComputedStyle(el) : null);
    const rect = (el: Element | null) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    };
    const scaleOf = (el: Element | null) => {
      if (!el) return 1;
      const t = getComputedStyle(el).transform;
      if (!t || t === "none") return 1;
      const m = t.match(/matrix\(([^)]+)\)/);
      if (m) { const p = m[1].split(",").map(Number); return +Math.hypot(p[0], p[1]).toFixed(3); }
      return 1;
    };

    const sample = () => {
      const vh = window.innerHeight, dpr = window.devicePixelRatio || 1;

      // ---- section float / progress / phase (mirrors the stage controller) ----
      const centers = MEDIA_IDS.map((id) => {
        const el = document.getElementById(id);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { id, top: r.top + window.scrollY, h: el.offsetHeight, center: r.top + window.scrollY + el.offsetHeight / 2 };
      });
      const valid = centers.filter(Boolean) as { id: string; top: number; h: number; center: number }[];
      const c = window.scrollY + vh / 2;
      let fl = 0;
      if (valid.length) {
        if (c <= valid[0].center) fl = -Math.min(1.2, (valid[0].center - c) / vh);
        else if (c >= valid[valid.length - 1].center) fl = valid.length - 1;
        else for (let i = 0; i < valid.length - 1; i++) { const a = valid[i], b = valid[i + 1]; if (c >= a.center && c <= b.center) { fl = i + (c - a.center) / (b.center - a.center || 1); break; } }
      }
      const activeIdx = Math.max(0, Math.min(valid.length - 1, Math.round(fl)));
      const activeId = valid[activeIdx]?.id ?? null;
      const av = valid[activeIdx];
      const secProgress = av ? Math.max(0, Math.min(1, (c - av.top) / (av.h || 1))) : 0;
      const phase = secProgress < 0.16 ? "entry" : secProgress > 0.82 ? "exit" : "hold";

      // ---- layers (iOS .ms-flow__sec | desktop .ms__layer), opacity-sorted ----
      const layerSel = ios ? ".ms-flow__sec" : ".ms__layer";
      const layers = [...document.querySelectorAll(layerSel)].map((l, i) => ({ i, el: l, op: +(+(cs(l)!.opacity)).toFixed(3) }));
      const sorted = [...layers].sort((a, b) => b.op - a.op);
      const cur = sorted[0], nxt = sorted[1];

      const mediaOf = (layerEl: Element | undefined) => {
        if (!layerEl) return { img: null as Element | null, vid: null as HTMLVideoElement | null };
        return { img: layerEl.querySelector(ios ? ".ms-flow__img" : ".ms__img"), vid: layerEl.querySelector("video") as HTMLVideoElement | null };
      };
      const curMedia = mediaOf(cur?.el);
      const img = curMedia.img as HTMLImageElement | null;
      const vid = curMedia.vid;

      // ---- still: source vs rendered, cover crop, source-px-per-physical-px ----
      const isImgTag = img?.tagName === "IMG";
      const pin = cur?.el?.querySelector(ios ? ".ms-flow__pin" : ".ms__img") ?? cur?.el;
      const box = rect(pin) || rect(cur?.el ?? null);
      let still: Record<string, unknown> | null = null;
      if (img) {
        const natW = isImgTag ? (img as HTMLImageElement).naturalWidth : 0;
        const natH = isImgTag ? (img as HTMLImageElement).naturalHeight : 0;
        const physW = (box?.w ?? 0) * dpr, physH = (box?.h ?? 0) * dpr;
        const coverScale = natW && natH ? Math.max(physW / natW, physH / natH) : 0; // >1 = upscale
        const srcPxPerPhysPx = coverScale ? +(1 / coverScale).toFixed(3) : 0;       // <1 = upscaling
        const visibleWidthFrac = natW && coverScale ? +((physW / coverScale) / natW).toFixed(2) : 0;
        still = {
          type: isImgTag ? "img" : "bg-div",
          src: isImgTag ? ((img as HTMLImageElement).currentSrc || img.getAttribute("src") || "(unset)").slice(-40) : (cs(img)!.backgroundImage || "none").slice(0, 50),
          decoded: isImgTag ? (img as HTMLImageElement).naturalWidth > 0 : cs(img)!.backgroundImage !== "none",
          srcWxH: `${natW}x${natH}`,
          renderedCSS: `${box?.w}x${box?.h}`,
          renderedPhysical: `${Math.round(physW)}x${Math.round(physH)}`,
          coverUpscale: +coverScale.toFixed(2),
          srcPxPerPhysPx,
          visibleWidthFrac,
          scale: scaleOf(img),
          opacity: cs(img)!.opacity,
          verdict: coverScale > 1.6 ? "UPSCALED" : coverScale > 0 ? "ok" : "n/a",
        };
      }

      // ---- video (portrait variant on iOS | landscape loop on desktop) ----
      let video: Record<string, unknown> | null = null;
      if (vid) {
        const physW = (box?.w ?? 0) * dpr, physH = (box?.h ?? 0) * dpr;
        const coverScale = vid.videoWidth && vid.videoHeight ? Math.max(physW / vid.videoWidth, physH / vid.videoHeight) : 0;
        video = {
          src: (vid.currentSrc || vid.querySelector("source")?.getAttribute("src") || "(unset)").slice(-40),
          srcWxH: `${vid.videoWidth}x${vid.videoHeight}`,
          readyState: vid.readyState, networkState: vid.networkState, paused: vid.paused,
          currentTime: +vid.currentTime.toFixed(2), errorCode: vid.error ? vid.error.code : null,
          frameRendered: vid.readyState >= 2 && vid.currentTime > 0,
          coverUpscale: +coverScale.toFixed(2),
          opacity: cs(vid)!.opacity,
        };
      }

      const selectedSource = ios
        ? (vid ? "iPhone portrait video" : "iPhone still (no portrait video)")
        : "desktop/Android landscape video+still";

      const data = {
        ua: navigator.userAgent, iosDetected: ios,
        webkit: /WebKit/.test(navigator.userAgent) && !/Chrome|CriOS|Edg/.test(navigator.userAgent),
        viewport: { w: window.innerWidth, h: vh, dpr },
        pageVisibility: document.visibilityState,
        reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        spRevealed: document.documentElement.classList.contains("sp-revealed"),
        journeyCinematic: !!document.getElementById("journey")?.className.includes("cj--cinematic"),
        float: +fl.toFixed(3), activeSection: activeId, activeIdx, hasLoop: activeId ? LOOP_IDS.has(activeId) : false,
        sectionProgress: +secProgress.toFixed(3), phase,
        currentLayer: cur ? { idx: cur.i, opacity: cur.op } : null,
        nextLayer: nxt ? { idx: nxt.i, opacity: nxt.op } : null,
        selectedSource,
        still, video,
      };
      (window as unknown as Record<string, unknown>).__mediaDebug = data;

      if (boxRef.current) {
        const L: string[] = [];
        L.push(`debugMedia · iOS=${ios} wk=${data.webkit} ${data.viewport.w}x${data.viewport.h}@${dpr} vis=${data.pageVisibility} reduced=${data.reducedMotion}`);
        L.push(`sp-revealed=${data.spRevealed} §10cine=${data.journeyCinematic}`);
        L.push(`float=${data.float} active=${activeId} progress=${data.sectionProgress} PHASE=${phase}`);
        L.push(`layers: cur=#${cur?.i} op=${cur?.op}  next=#${nxt?.i} op=${nxt?.op}`);
        L.push(`source: ${selectedSource}`);
        if (still) {
          L.push(`STILL[${still.type}] decoded=${still.decoded} scale=${still.scale} op=${still.opacity}`);
          L.push(`  src=${still.srcWxH}  renderedCSS=${still.renderedCSS}  phys=${still.renderedPhysical}`);
          L.push(`  coverUpscale=${still.coverUpscale}x  srcPxPerPhysPx=${still.srcPxPerPhysPx}  visW=${still.visibleWidthFrac}  → ${still.verdict}`);
          if (typeof still.src === "string") L.push(`  ${still.src}`);
        }
        if (video) {
          L.push(`VIDEO src=${video.srcWxH} rs=${video.readyState} paused=${video.paused} t=${video.currentTime} frame=${video.frameRendered} err=${video.errorCode} up=${video.coverUpscale}x op=${video.opacity}`);
          if (typeof video.src === "string") L.push(`  ${video.src}`);
        } else if (data.hasLoop) {
          L.push(`VIDEO: none on iPhone for this loop section (landscape source too low-res; still used)`);
        }
        boxRef.current.textContent = L.join("\n");
      }
    };

    let raf = 0, stopped = false;
    const tick = () => {
      if (stopped) return;
      try { sample(); } catch (e) { if (boxRef.current) boxRef.current.textContent = "debugMedia error: " + String(e).slice(0, 160); }
      raf = window.setTimeout(() => requestAnimationFrame(tick), 300) as unknown as number;
    };
    tick();
    const ci = window.setInterval(() => {
      const d = (window as unknown as Record<string, unknown>).__mediaDebug;
      if (d) { try { console.log("[debugMedia]", JSON.parse(JSON.stringify(d))); } catch { /* noop */ } }
    }, 2000);

    return () => { stopped = true; clearTimeout(raf); clearInterval(ci); };
  }, [on]);

  if (!on) return null;
  return (
    <pre
      ref={boxRef}
      style={{
        position: "fixed", left: "6px", bottom: "6px", zIndex: 99999, margin: 0,
        maxWidth: "95vw", maxHeight: "48vh", overflow: "auto",
        font: "10px/1.32 ui-monospace, SFMono-Regular, Menlo, monospace", color: "#9ff",
        background: "rgba(2,6,15,0.92)", border: "1px solid rgba(95,243,226,0.45)",
        borderRadius: "6px", padding: "5px 7px", pointerEvents: "none", whiteSpace: "pre-wrap",
      }}
    >
      debugMedia: initializing…
    </pre>
  );
}
