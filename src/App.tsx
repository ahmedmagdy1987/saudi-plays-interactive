import { useEffect, useLayoutEffect } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { initSmoothScroll } from "@/lib/scroll";
import { prefersReducedMotion } from "@/lib/hooks";
import { useContent, useLang } from "@/i18n";
import SectionProgressNavigation from "@/components/nav/SectionProgressNavigation";
import LanguageSwitcher from "@/components/nav/LanguageSwitcher";
import SectionBackgroundStage from "@/components/common/SectionBackgroundStage";

import IntroHero from "@/components/sections/IntroHero";
import NationalVision from "@/components/sections/NationalVision";
import MarketOpportunity from "@/components/sections/MarketOpportunity";
import RiyadhToSaudi from "@/components/sections/RiyadhToSaudi";
import ExperienceZones from "@/components/sections/ExperienceZones";
import MalahiOperating from "@/components/sections/MalahiOperating";
import Governance from "@/components/sections/Governance";
import RevenueEcosystem from "@/components/sections/RevenueEcosystem";
import ImpactDashboard from "@/components/sections/ImpactDashboard";
import Finale from "@/components/sections/Finale";
import Footer from "@/components/sections/Footer";

export default function App() {
  const { ui } = useContent();
  const { lang } = useLang(); // re-render + remount the motion layer on language change

  // smooth scroll + one-time geometry refresh (independent of language)
  useEffect(() => {
    const reduced = prefersReducedMotion();
    if (reduced) document.documentElement.classList.add("reduced");

    const lenis = initSmoothScroll();

    // Recompute pin/trigger geometry once webfonts settle and after full load,
    // so measurements taken before fonts loaded don't leave pins misaligned.
    const refresh = () => ScrollTrigger.refresh();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
    window.addEventListener("load", refresh);

    return () => {
      window.removeEventListener("load", refresh);
      lenis?.destroy();
    };
  }, []);

  // Reveal controller — re-armed on EVERY language change. Progressive
  // enhancement: content is visible by default (see global.css); we add the
  // `reveal-armed` hidden state only after marking already-in-view nodes as
  // revealed, so nothing ever flashes or stays stuck. Runs in a layout effect
  // (before paint) so the remounted, freshly-localized nodes are classified
  // before the first frame. A brand-new IntersectionObserver is created each
  // run and disconnected on cleanup, so triggers never stack across switches.
  useLayoutEffect(() => {
    const root = document.documentElement;
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") {
      root.classList.remove("reveal-armed");
      els.forEach((el) => el.classList.add("is-in"));
      return;
    }
    const vh = window.innerHeight;
    // reveal everything already in (or near) view BEFORE arming → no flash
    els.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < vh * 0.92 && r.bottom > 0) el.classList.add("is-in");
      else el.classList.remove("is-in");
    });
    root.classList.add("reveal-armed");
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            obs.unobserve(e.target);
          }
        }
      },
      { threshold: 0.14, rootMargin: "0px 0px -8% 0px" },
    );
    els.forEach((el) => { if (!el.classList.contains("is-in")) obs.observe(el); });
    return () => obs.disconnect();
  }, [lang]);

  // Motion gate — pause every decorative CSS animation inside a section once it
  // scrolls well out of view (profiling showed 120–200 infinite animations all
  // running at once, most in off-screen sections). A section gets `.sec-rest`
  // (CSS: animation-play-state:paused) when it leaves the viewport + a 150px
  // buffer, and resumes before it returns. Re-armed on each language remount; a
  // fresh observer is created/disconnected so triggers never stack.
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const sections = Array.from(document.querySelectorAll<HTMLElement>("main > section, footer"));
    const obs = new IntersectionObserver(
      (entries) => { for (const e of entries) e.target.classList.toggle("sec-rest", !e.isIntersecting); },
      { rootMargin: "150px 0px 150px 0px" },
    );
    sections.forEach((s) => obs.observe(s));
    return () => obs.disconnect();
  }, [lang]);

  return (
    <div className="app-root">
      <SectionBackgroundStage />
      <a href="#intro" className="sr-only">
        {ui.skip}
      </a>
      <LanguageSwitcher />
      <SectionProgressNavigation />
      {/* key={lang}: a controlled remount of the whole motion layer on language
          change. Every section's GSAP scene cleans up (gsap.context revert) and
          rebuilds against the new RTL/LTR layout — no stale timelines, no stale
          ScrollTriggers, no inline opacity/transform surviving the switch. */}
      <main key={lang}>
        <IntroHero />
        <NationalVision />
        <MarketOpportunity />
        <RiyadhToSaudi />
        <ExperienceZones />
        <MalahiOperating />
        <Governance />
        <RevenueEcosystem />
        <ImpactDashboard />
        <Finale />
      </main>
      <Footer />
    </div>
  );
}
