import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { dictionaries, type Content, type Lang } from "./content";

const STORAGE = "sp-lang";

function initialLang(): Lang {
  if (typeof window === "undefined") return "ar";
  const s = window.localStorage.getItem(STORAGE);
  return s === "en" || s === "ar" ? s : "ar";
}

interface Ctx {
  lang: Lang;
  dir: "rtl" | "ltr";
  content: Content;
  setLang: (l: Lang) => void;
}
const I18nContext = createContext<Ctx | null>(null);

/**
 * Bilingual provider. Switches language without a reload, persists the choice,
 * updates <html lang/dir>, keeps the user on the same section, and refreshes
 * ScrollTrigger once fonts/layout settle.
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  // {id, delta}: the section around the reading line + the scroll offset within
  // it, so the exact relative position survives a language-keyed remount.
  const restore = useRef<{ id: string; delta: number } | null>(null);
  const dir: "rtl" | "ltr" = lang === "ar" ? "rtl" : "ltr";

  // keep <html lang/dir> + persisted choice in sync (covers the initial mount)
  useEffect(() => {
    const el = document.documentElement;
    el.lang = lang;
    el.dir = dir;
    try {
      window.localStorage.setItem(STORAGE, lang);
    } catch {
      /* ignore */
    }
  }, [lang, dir]);

  // After a language change re-renders (and the motion layer remounts), wait for
  // direction + fonts + two frames to settle, then restore the reading position
  // and fully remeasure every ScrollTrigger. refresh(true) hard-resets so no
  // stale, stacked, or wrongly-measured triggers survive the switch.
  useEffect(() => {
    const r = restore.current;
    restore.current = null;
    if (!r) return; // initial mount — nothing to restore
    let raf1 = 0, raf2 = 0;
    const apply = () => {
      const el = document.getElementById(r.id);
      if (el) window.scrollTo({ top: Math.max(0, el.offsetTop + r.delta), behavior: "auto" });
      ScrollTrigger.refresh(true);
    };
    const run = () => { raf1 = requestAnimationFrame(() => { raf2 = requestAnimationFrame(apply); }); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(run);
    else run();
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); };
  }, [lang]);

  const setLang = useCallback(
    (l: Lang) => {
      if (l === lang) return;
      // capture the section at the reading line + how far into it we are scrolled
      const mark = window.scrollY + window.innerHeight * 0.35;
      let id: string | null = null, top = 0;
      document.querySelectorAll<HTMLElement>("section[id]").forEach((s) => {
        if (s.offsetTop <= mark) { id = s.id; top = s.offsetTop; }
      });
      restore.current = id ? { id, delta: window.scrollY - top } : null;
      // set direction/lang SYNCHRONOUSLY so the remounted motion layer measures
      // the new RTL/LTR layout from the very first frame (effects run bottom-up,
      // so a provider useEffect would otherwise apply dir too late).
      const el = document.documentElement;
      el.lang = l;
      el.dir = l === "ar" ? "rtl" : "ltr";
      setLangState(l);
    },
    [lang],
  );

  return (
    <I18nContext.Provider value={{ lang, dir, content: dictionaries[lang], setLang }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): Ctx {
  const c = useContext(I18nContext);
  if (!c) throw new Error("useI18n must be used within I18nProvider");
  return c;
}
export function useContent(): Content {
  return useI18n().content;
}
export function useLang() {
  const { lang, dir, setLang } = useI18n();
  return { lang, dir, setLang };
}
