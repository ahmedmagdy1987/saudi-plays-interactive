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
 * up reverses the exact same values (pure function of scrollY — no hysteresis).
 *
 * Performance: images are lazy-loaded only within a window of the active section;
 * the ≤3 video loops only fetch + play while their section is active and pause
 * otherwise + when the tab is hidden; there is NO idle requestAnimationFrame (the
 * controller runs only inside ScrollTrigger.onUpdate, i.e. while scrolling). A
 * readability scrim keeps the centre content column calm; the imagery reads at the
 * sides + as depth. Mobile drops the video loops + parallax; reduced-motion drops
 * zoom/drift and never autoplays a loop.
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

export default function SectionBackgroundStage() {
  const { lang } = useLang();
  const rootRef = useRef<HTMLDivElement>(null);
  const recacheRef = useRef<() => void>(() => {});

  useEffect(() => {
    const root = rootRef.current!;
    const reduced = prefersReducedMotion();
    const lite = window.matchMedia("(max-width: 820px)").matches;
    const layers = Array.from(root.querySelectorAll<HTMLElement>(".ms__layer"));
    const imgs = layers.map((l) => l.querySelector<HTMLElement>(".ms__img")!);
    const videos = layers.map((l) => l.querySelector<HTMLVideoElement>(".ms__video"));
    const setO = layers.map((l) => gsap.quickSetter(l, "opacity") as (v: number) => void);
    const setT = imgs.map((el) => gsap.quickSetter(el, "transform") as (v: string) => void);
    const loaded = new Array(N).fill(false);
    const vloaded = new Array(N).fill(false);
    const vtimer = new Array<number>(N).fill(0);

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
    const startVideo = (i: number) => {
      const v = videos[i]!;
      if (!vloaded[i]) {
        vloaded[i] = true;
        v.querySelectorAll("source").forEach((s) => { const d = s.getAttribute("data-src"); if (d) s.setAttribute("src", d); });
        v.load();
      }
      const p = v.play?.();
      if (p) p.then(() => layers[i].classList.add("is-playing")).catch(() => {});
    };
    const activateVideo = (i: number, on: boolean) => {
      const v = videos[i];
      if (!v || reduced || lite) return;
      if (on) {
        if (vloaded[i]) { startVideo(i); return; }
        // debounce the FIRST fetch — only load if the section is still active after a
        // short dwell, so a fast scroll-by never starts (and then aborts) a request
        if (!vtimer[i]) vtimer[i] = window.setTimeout(() => { vtimer[i] = 0; startVideo(i); }, 320);
      } else {
        if (vtimer[i]) { clearTimeout(vtimer[i]); vtimer[i] = 0; }
        layers[i].classList.remove("is-playing");
        if (!v.paused) v.pause();
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
          setT[i](`translate3d(0,${(d * 20).toFixed(1)}px,0) scale(${sc.toFixed(4)})`);
        } else {
          setT[i]("none");
        }
        if (ad < 1.8) loadImg(i);                    // lazy-load within the window
        if (MEDIA[i].loop) activateVideo(i, ad < 0.5);
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
      if (hidden) videos.forEach((v) => v && !v.paused && v.pause());
      else render();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      trig.kill();
      document.removeEventListener("visibilitychange", onVis);
      vtimer.forEach((t) => t && clearTimeout(t));
      videos.forEach((v) => v && v.pause());
    };
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
              <video className="ms__video" muted loop playsInline preload="none">
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
