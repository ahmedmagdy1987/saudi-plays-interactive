import { useEffect } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { initSmoothScroll } from "@/lib/scroll";
import { prefersReducedMotion } from "@/lib/hooks";
import SectionProgressNavigation from "@/components/nav/SectionProgressNavigation";

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
  useEffect(() => {
    const reduced = prefersReducedMotion();
    if (reduced) document.documentElement.classList.add("reduced");

    const lenis = initSmoothScroll();

    // Recompute pin/trigger geometry once webfonts settle and after full load,
    // so measurements taken before fonts loaded don't leave pins misaligned.
    const refresh = () => ScrollTrigger.refresh();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
    window.addEventListener("load", refresh);

    // Generic scroll-reveal for [data-reveal] (CSS handles the transition).
    let obs: IntersectionObserver | null = null;
    if (!reduced && typeof IntersectionObserver !== "undefined") {
      obs = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) {
              e.target.classList.add("is-in");
              obs?.unobserve(e.target);
            }
          }
        },
        { threshold: 0.14, rootMargin: "0px 0px -8% 0px" },
      );
      document.querySelectorAll("[data-reveal]").forEach((el) => obs!.observe(el));
    } else {
      document.querySelectorAll("[data-reveal]").forEach((el) => el.classList.add("is-in"));
    }

    return () => {
      obs?.disconnect();
      window.removeEventListener("load", refresh);
      lenis?.destroy();
    };
  }, []);

  return (
    <div className="app-root">
      <a href="#intro" className="sr-only">
        تخطَّ إلى المحتوى
      </a>
      <SectionProgressNavigation />
      <main>
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
