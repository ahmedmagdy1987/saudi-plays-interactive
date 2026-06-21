import { useEffect, useMemo, useRef } from "react";

/**
 * Opt-in production media diagnostic — renders NOTHING unless the page is opened with
 * `?debugMedia=1`. It is required because Playwright WebKit on desktop never reproduces
 * the physical-iPhone media failure, so the real-device state must be captured directly.
 *
 * When enabled it shows a compact fixed overlay (and logs the same structured object to
 * the console every 2s, plus exposes it as window.__mediaDebug) describing: the global
 * environment, the ACTIVE section's background still and video, and the media stage.
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

    const sample = () => {
      // active section = the MEDIA section crossing the viewport centre (else nearest)
      const cy = window.innerHeight / 2;
      let active: string | null = null, activeIdx = -1, best = Infinity;
      MEDIA_IDS.forEach((id, i) => {
        const el = document.getElementById(id);
        if (!el) return;
        const r = el.getBoundingClientRect();
        const dist = r.top <= cy && r.bottom >= cy ? 0 : Math.min(Math.abs(r.top - cy), Math.abs(r.bottom - cy));
        if (dist < best) { best = dist; active = id; activeIdx = i; }
      });
      const secEl = active ? document.getElementById(active) : null;

      let imgEl: Element | null = null, vidEl: HTMLVideoElement | null = null;
      if (ios) {
        const boxEl = document.querySelector(`.ms-flow__sec[data-sec="${active}"]`);
        imgEl = boxEl?.querySelector(".ms-flow__img") ?? null;
        vidEl = (boxEl?.querySelector(".ms-flow__video") as HTMLVideoElement) ?? null;
      } else {
        const layer = document.querySelectorAll(".ms__layer")[activeIdx];
        imgEl = layer?.querySelector(".ms__img") ?? null;
        vidEl = (layer?.querySelector(".ms__video") as HTMLVideoElement) ?? null;
      }

      const isImgTag = imgEl?.tagName === "IMG";
      const img = imgEl as HTMLImageElement | null;
      const image = imgEl
        ? {
            type: isImgTag ? "img" : "bg-div",
            src: isImgTag ? (img!.currentSrc || img!.getAttribute("src") || "(unset)") : (cs(imgEl)!.backgroundImage || "none").slice(0, 70),
            complete: isImgTag ? img!.complete : "n/a",
            naturalWidth: isImgTag ? img!.naturalWidth : "n/a",
            naturalHeight: isImgTag ? img!.naturalHeight : "n/a",
            decoded: isImgTag ? img!.naturalWidth > 0 : (cs(imgEl)!.backgroundImage !== "none"),
            bbox: rect(imgEl),
            display: cs(imgEl)!.display,
            visibility: cs(imgEl)!.visibility,
            opacity: cs(imgEl)!.opacity,
            zIndex: cs(imgEl)!.zIndex,
            transform: cs(imgEl)!.transform === "none" ? "none" : cs(imgEl)!.transform.slice(0, 30),
          }
        : null;

      const video = vidEl
        ? {
            src: vidEl.currentSrc || vidEl.querySelector("source")?.getAttribute("src") || "(unset)",
            readyState: vidEl.readyState,
            networkState: vidEl.networkState,
            paused: vidEl.paused,
            currentTime: +vidEl.currentTime.toFixed(2),
            videoWidth: vidEl.videoWidth,
            videoHeight: vidEl.videoHeight,
            errorCode: vidEl.error ? vidEl.error.code : null,
            bbox: rect(vidEl),
            opacity: cs(vidEl)!.opacity,
            visibility: cs(vidEl)!.visibility,
            frameRendered: vidEl.readyState >= 2 && vidEl.currentTime > 0,
          }
        : null;

      const msEl = document.querySelector(".ms");
      const flowEl = document.querySelector(".ms-flow");
      const stage = {
        ms: msEl ? { bbox: rect(msEl), position: cs(msEl)!.position, zIndex: cs(msEl)!.zIndex, classes: msEl.className } : null,
        msFlow: flowEl ? { bbox: rect(flowEl), position: cs(flowEl)!.position, zIndex: cs(flowEl)!.zIndex } : null,
        activeSecBg: secEl ? cs(secEl)!.backgroundColor : null,
        activeSecOpacity: secEl ? cs(secEl)!.opacity : null,
      };

      const data = {
        ts: undefined as unknown,
        ua: navigator.userAgent,
        iosDetected: ios,
        webkit: /WebKit/.test(navigator.userAgent) && !/Chrome|CriOS|Edg/.test(navigator.userAgent),
        viewport: { w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio },
        pageVisibility: document.visibilityState,
        reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        activeSection: active,
        activeSceneIdx: activeIdx,
        activeHasLoop: active ? LOOP_IDS.has(active) : false,
        spRevealed: document.documentElement.classList.contains("sp-revealed"),
        journeyCinematic: !!document.getElementById("journey")?.className.includes("cj--cinematic"),
        image,
        video,
        stage,
      };
      (window as unknown as Record<string, unknown>).__mediaDebug = data;

      if (boxRef.current) {
        const L: string[] = [];
        L.push(`debugMedia · iOS=${ios} wk=${data.webkit} ${data.viewport.w}x${data.viewport.h}@${data.viewport.dpr}`);
        L.push(`vis=${data.pageVisibility} reduced=${data.reducedMotion} sp-revealed=${data.spRevealed} §10cine=${data.journeyCinematic}`);
        L.push(`active=§${activeIdx + 2 <= 9 ? activeIdx + 2 : "11"} ${active} loop=${data.activeHasLoop}`);
        L.push(`stage.ms pos=${stage.ms?.position} z=${stage.ms?.zIndex} ${stage.ms?.bbox?.w}x${stage.ms?.bbox?.h}`);
        L.push(`stage.flow pos=${stage.msFlow?.position} z=${stage.msFlow?.zIndex} ${stage.msFlow?.bbox?.w}x${stage.msFlow?.bbox?.h ?? "—"}`);
        L.push(`secBg=${stage.activeSecBg}`);
        if (image) L.push(`IMG[${image.type}] decoded=${image.decoded} nat=${image.naturalWidth}x${image.naturalHeight} op=${image.opacity} vis=${image.visibility} z=${image.zIndex} box=${image.bbox?.w}x${image.bbox?.h}@${image.bbox?.y}`);
        else L.push(`IMG: (none for active section)`);
        if (image && typeof image.src === "string") L.push(`  src=${image.src.slice(-46)}`);
        if (video) {
          L.push(`VID rs=${video.readyState} ns=${video.networkState} paused=${video.paused} t=${video.currentTime} ${video.videoWidth}x${video.videoHeight} err=${video.errorCode} frame=${video.frameRendered} op=${video.opacity}`);
          L.push(`  vsrc=${String(video.src).slice(-40)}`);
        } else if (data.activeHasLoop) L.push(`VID: (loop section but no <video> for active)`);
        boxRef.current.textContent = L.join("\n");
      }
    };

    let raf = 0, stopped = false;
    const tick = () => {
      if (stopped) return;
      try { sample(); } catch (e) { if (boxRef.current) boxRef.current.textContent = "debugMedia error: " + String(e).slice(0, 120); }
      raf = window.setTimeout(() => requestAnimationFrame(tick), 350) as unknown as number;
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
        maxWidth: "94vw", maxHeight: "46vh", overflow: "auto",
        font: "10px/1.35 ui-monospace, SFMono-Regular, Menlo, monospace", color: "#9ff",
        background: "rgba(2,6,15,0.9)", border: "1px solid rgba(95,243,226,0.45)",
        borderRadius: "6px", padding: "5px 7px", pointerEvents: "none", whiteSpace: "pre-wrap",
      }}
    >
      debugMedia: initializing…
    </pre>
  );
}
