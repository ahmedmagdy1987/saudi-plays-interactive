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
  const pendingSection = useRef<string | null>(null);
  const dir: "rtl" | "ltr" = lang === "ar" ? "rtl" : "ltr";

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

  // after the language re-renders, restore the active section and remeasure pins
  useEffect(() => {
    const sec = pendingSection.current;
    pendingSection.current = null;
    const restore = () => {
      ScrollTrigger.refresh();
      if (sec) {
        const el = document.getElementById(sec);
        if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY, behavior: "auto" });
      }
      ScrollTrigger.refresh();
    };
    let raf = 0;
    const run = () => { raf = requestAnimationFrame(restore); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(run);
    else run();
    return () => cancelAnimationFrame(raf);
  }, [lang]);

  const setLang = useCallback(
    (l: Lang) => {
      if (l === lang) return;
      // remember the section currently around the upper third of the viewport
      const mark = window.innerHeight * 0.35;
      let best: string | null = null;
      let bestDist = Infinity;
      document.querySelectorAll<HTMLElement>("section[id]").forEach((s) => {
        const r = s.getBoundingClientRect();
        if (r.top <= mark && r.bottom >= mark) {
          best = s.id;
          bestDist = -1;
        } else if (bestDist !== -1) {
          const d = Math.abs(r.top - mark);
          if (d < bestDist) { bestDist = d; best = s.id; }
        }
      });
      pendingSection.current = best;
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
