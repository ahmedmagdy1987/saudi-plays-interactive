import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLang } from "@/i18n";
import { prefersReducedMotion } from "@/lib/hooks";
import "./SectionBackgroundStage.css";

/**
 * One persistent cinematic media backdrop for Sections 02–10. Each section owns a
 * real Higgsfield still (and three of them a short looping clip); a SINGLE
 * ScrollTrigger maps the live scroll position to a continuous "section float" and
 * each layer's opacity / scale / vertical drift is derived from its distance to
 * that float (gsap.quickSetters). So scrolling down makes the current scene fade +
 * recede (zoom-out) while the next fades + zooms toward the viewer, and scrolling
 * up reverses the exact same values (pure function of scrollY — no hysteresis on
 * the visuals).
 *
 * Video (desktop AND mobile): the ≤3 short loops play on every supported browser.
 * A loop is "wanted" by OPACITY hysteresis (enter at op>0.34, leave at op<0.12), so
 * exactly one loop plays inside a section and BOTH neighbours play through a
 * section→section crossfade (e.g. §09→§10) — a true video-to-video dissolve, never a
 * poster pop. The poster (the .ms__img still) stays on top until the video has a
 * REAL first frame (requestVideoFrameCallback / loadeddata); only then does the
 * 0.7s poster→video crossfade run, so there is never a black/blank flash. Videos are
 * muted + playsInline (set imperatively so autoplay is always permitted), the
 * play() promise is handled, load() is called at most once per clip (no restart/
 * abort spam on normal scrolling), a short dwell debounce skips fetches on fast
 * scroll-by, and everything pauses off-section + when the tab is hidden. Reduced
 * motion never autoplays. Mobile is lighter: no parallax/zoom, no idle rAF.
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

// opacity-driven video want hysteresis: a loop starts when its layer is clearly
// dominant, and only stops once it has nearly faded out — so a slow scroll parked
// on a section boundary can never flicker the video between play/pause.
const WANT_ENTER = 0.34;
const WANT_LEAVE = 0.12;
const DWELL_MS = 280; // skip fetching a loop the user only scrolls past (no wasted fetch)

export default function SectionBackgroundStage() {
  const { lang } = useLang();
  const rootRef = useRef<HTMLDivElement>(null);
  const recacheRef = useRef<() => void>(() => {});

  useEffect(() => {
    // The cinematic media controller must never blank the page: any failure during
    // setup falls through to the global fail-safe instead of unmounting the app.
    try {
    const root = rootRef.current!;
    const reduced = prefersReducedMotion();
    const lite = window.matchMedia("(max-width: 820px)").matches; // mobile = no parallax (lighter)
    const layers = Array.from(root.querySelectorAll<HTMLElement>(".ms__layer"));
    const imgs = layers.map((l) => l.querySelector<HTMLElement>(".ms__img")!);
    const videos = layers.map((l) => l.querySelector<HTMLVideoElement>(".ms__video"));
    const setO = layers.map((l) => gsap.quickSetter(l, "opacity") as (v: number) => void);
    // parallax/zoom is applied to BOTH the poster and the video so they share an
    // IDENTICAL transform (and box) — never revealing one beside/over the other.
    const setTImg = imgs.map((el) => gsap.quickSetter(el, "transform") as (v: string) => void);
    const setTVid = videos.map((v) => (v ? (gsap.quickSetter(v, "transform") as (val: string) => void) : null));
    const setT = (i: number, val: string) => { setTImg[i](val); setTVid[i]?.(val); };
    const loaded = new Array(N).fill(false);
    const vloaded = new Array(N).fill(false);  // src set + load() called (once)
    const vready = new Array(N).fill(false);   // a real first frame has rendered
    const vwant = new Array(N).fill(false);    // current hysteresis want-state
    const vpausePend = new Array(N).fill(false); // pause deferred until the fetch is safe
    const vtimer = new Array<number>(N).fill(0);

    // Guarantee muted + inline so muted-autoplay is always allowed (React's `muted`
    // attribute is unreliable; the *property* is what the policy checks). Also opt
    // out of PiP / remote playback chrome on mobile.
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

    // crossfade poster → video, but ONLY once a real frame exists (no black flash)
    const showVideo = (i: number) => {
      if (vready[i] && vwant[i] && !document.hidden) layers[i].classList.add("is-playing");
    };
    const reallyPause = (i: number) => {
      vpausePend[i] = false;
      const v = videos[i];
      if (v && !v.paused) v.pause();
    };
    // fired once the clip has buffered a usable point: safe to crossfade in, and
    // safe to honour a pause that was deferred while it was still fetching.
    const onReady = (i: number) => {
      vready[i] = true;
      if (vwant[i]) showVideo(i);
      else if (vpausePend[i]) reallyPause(i);
    };
    const startVideo = (i: number) => {
      const v = videos[i];
      if (!v) return;
      vpausePend[i] = false;                                 // re-wanted → cancel any deferred pause
      if (!vloaded[i]) {
        vloaded[i] = true;
        v.querySelectorAll("source").forEach((s) => {
          const d = s.getAttribute("data-src");
          if (d && !s.getAttribute("src")) s.setAttribute("src", d);
        });
        v.load();                                            // ONCE per clip — never re-load on scroll
        v.addEventListener("loadeddata", () => onReady(i), { once: true });
        v.addEventListener("canplay", () => onReady(i), { once: true });
        const rvfc = (v as unknown as { requestVideoFrameCallback?: (cb: () => void) => number }).requestVideoFrameCallback;
        if (rvfc) rvfc.call(v, () => onReady(i));
      } else if (vready[i]) {
        showVideo(i);                                        // re-entry: already buffered → crossfade now
      }
      const p = v.play?.();
      if (p && typeof p.catch === "function") p.catch(() => { /* benign autoplay rejection */ });
    };
    const stopVideo = (i: number) => {
      const v = videos[i];
      if (!v) return;
      if (vtimer[i]) { clearTimeout(vtimer[i]); vtimer[i] = 0; }
      layers[i].classList.remove("is-playing");             // crossfade back to the poster
      if (v.paused) { vpausePend[i] = false; return; }
      // Pausing a clip that is still fetching its first frames CANCELS the request
      // (ERR_ABORTED spam on fast scrolling). Only pause once it can play through;
      // otherwise defer until its canplay handler fires.
      if (v.readyState >= 3) reallyPause(i);
      else vpausePend[i] = true;
    };
    // drive play/pause from the layer's live opacity with hysteresis
    const wantVideo = (i: number, op: number) => {
      if (!videos[i] || reduced) return;
      const want = vwant[i] ? op > WANT_LEAVE : op > WANT_ENTER;
      if (want === vwant[i]) {
        // keep the active clip showing even if a stray pause/blur dropped is-playing
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
        // drop fully-faded layers out of the compositor (only ~2 ever paint)
        const vis = op > 0.001 ? "visible" : "hidden";
        if (layers[i].style.visibility !== vis) layers[i].style.visibility = vis;
        if (!reduced && !lite) {
          const sc = 1 - 0.05 * Math.min(ad, 1.6);   // recede = zoom out, active = 1
          setT(i, `translate3d(0,${(d * 20).toFixed(1)}px,0) scale(${sc.toFixed(4)})`);
        } else {
          setT(i, "none");
        }
        if (ad < 1.8) loadImg(i);                    // lazy-load within the window
        if (MEDIA[i].loop) wantVideo(i, op);         // opacity-hysteresis play/pause
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
        // pause everything; mark loops un-wanted so returning re-evaluates + replays
        for (let i = 0; i < N; i++) {
          if (vtimer[i]) { clearTimeout(vtimer[i]); vtimer[i] = 0; }
          vwant[i] = false;
          layers[i].classList.remove("is-playing");
          const v = videos[i];
          if (v && !v.paused) v.pause();
        }
      } else {
        render();                                    // re-derive want from current scroll → replay active
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
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => { recacheRef.current(); ScrollTrigger.refresh(); });
    return () => cancelAnimationFrame(id);
  }, [lang]);

  return (
    <div className="ms" ref={rootRef} aria-hidden="true">
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
    </div>
  );
}
