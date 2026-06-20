// Decisive failure-mode reproduction in REAL WebKit.
// Simulates the one condition the current architecture cannot survive: the motion
// pipeline (GSAP ticker / Lenis) never advances — exactly what happens under iOS
// Low-Power-Mode rAF throttling, a backgrounded WhatsApp in-app-webview load, or
// an older-WebKit timing stall. We freeze requestAnimationFrame BEFORE any app
// code runs. React still mounts (it schedules via MessageChannel), gsap.set() still
// hides content synchronously, but no tween/ScrollTrigger ever reveals it.
//
// PASS (bug present, no fix)  = hero stuck at opacity 0  -> blank dark page.
// PASS (after fix)            = failsafe forces hero visible (opacity 1).
//
// Usage: node scripts/ios-failtest.mjs [url]
import { webkit, devices } from "playwright";

const URL = process.argv[2] || "http://localhost:4173/";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const FREEZE_RAF = () => {
  // no-op rAF: callbacks are registered but never invoked -> ticker/timelines stall
  window.requestAnimationFrame = function () { return 0; };
  window.cancelAnimationFrame = function () {};
};

const PROBE = () => {
  const op = (sel) => {
    const el = document.querySelector(sel);
    return el ? getComputedStyle(el).opacity : "absent";
  };
  // count foreground text actually visible in the first viewport
  let visible = 0, total = 0;
  document.querySelectorAll("h1,h2,h3,p,.stat__num").forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.top < innerHeight && r.bottom > 0 && r.width > 0) {
      total++;
      if (parseFloat(getComputedStyle(el).opacity) > 0.05) visible++;
    }
  });
  return {
    htmlClass: document.documentElement.className || "(none)",
    spRevealed: document.documentElement.classList.contains("sp-revealed"),
    heroEyebrow: op(".intro__eyebrow"),
    heroTitle: op(".intro__title"),
    heroTitleWrap: op(".intro__titlewrap"),
    heroSupporting: op(".intro__supporting"),
    firstViewportText: `${visible}/${total} visible`,
  };
};

(async () => {
  const browser = await webkit.launch();
  const ctx = await browser.newContext({ ...devices["iPhone 13"], locale: "ar" });
  await ctx.addInitScript(FREEZE_RAF);
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(`${e.name}: ${e.message}`));
  await page.goto(URL, { waitUntil: "load", timeout: 30000 }).catch((e) => errs.push("nav: " + e));
  // wait well past any reveal animation AND past the failsafe watchdog (~2.2s)
  await wait(4000);
  const probe = await page.evaluate(PROBE);
  await page.screenshot({ path: "C:/Users/bdstd/saudi-plays/__ios__/failtest.png" });
  await browser.close();

  console.log("\n===== rAF-FROZEN FAILURE TEST (real WebKit, iPhone 13) =====");
  console.log("URL:", URL);
  console.log("html class:", probe.htmlClass);
  console.log("sp-revealed (failsafe fired):", probe.spRevealed);
  console.log("hero eyebrow opacity   :", probe.heroEyebrow);
  console.log("hero title opacity     :", probe.heroTitle);
  console.log("hero titlewrap opacity :", probe.heroTitleWrap);
  console.log("hero supporting opacity:", probe.heroSupporting);
  console.log("first-viewport text    :", probe.firstViewportText);
  console.log("pageerrors:", errs.length ? errs.join(" | ") : "none");
  const heroVisible = parseFloat(probe.heroTitle) > 0.5 && parseFloat(probe.heroEyebrow) > 0.5;
  console.log("\nRESULT:", heroVisible ? "HERO VISIBLE  ✅ (failsafe works / no blank)" : "HERO BLANK  ❌ (content stuck hidden)");
})().catch((e) => { console.error("FAILTEST ERROR:", e); process.exit(1); });
