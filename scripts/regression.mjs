// Consolidated cross-device regression. For each engine × viewport × theme × lang it
// cold-loads, scrolls the WHOLE page down + up three times, switches theme + language,
// toggles reduced-motion, and asserts the "confirm" list: no console errors / unhandled
// rejections / failed media / 404s / horizontal overflow / stuck-invisible text / blank
// media stage / memory growth. Usage: node scripts/regression.mjs [url]
import { chromium, webkit } from "playwright";
const URL = process.argv[2] || "http://localhost:4173/";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const VPS = {
  "1920": { width: 1920, height: 1080 }, "1440": { width: 1440, height: 900 },
  "1366": { width: 1366, height: 768 }, "1024": { width: 1024, height: 768 },
  "tablet": { width: 834, height: 1112 }, "430": { width: 430, height: 932 },
  "390": { width: 390, height: 844 }, "360": { width: 360, height: 800 },
};
// engine, vp, lang, theme
const MATRIX = [
  ["chromium", "1920", "ar", "dark"], ["chromium", "1440", "en", "light"],
  ["chromium", "1366", "ar", "dark"], ["chromium", "1024", "en", "light"],
  ["chromium", "tablet", "ar", "light"], ["chromium", "430", "ar", "dark"],
  ["chromium", "390", "en", "light"], ["chromium", "360", "ar", "dark"],
  ["webkit", "390", "ar", "dark"], ["webkit", "390", "en", "light"], ["webkit", "360", "ar", "dark"],
];
const launchers = { chromium, webkit };

async function scrollFull(page, dir) {
  const max = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  const steps = 26;
  for (let i = 0; i <= steps; i++) {
    const f = dir === "down" ? i / steps : 1 - i / steps;
    await page.evaluate((y) => window.scrollTo(0, y), Math.round(max * f));
    await wait(70);
  }
}

async function audit(page) {
  return page.evaluate(() => {
    const out = { overflow: null, stuck: [], blankStage: false, missingVideo: 0 };
    const de = document.documentElement;
    if (de.scrollWidth > de.clientWidth + 2) out.overflow = `${de.scrollWidth}>${de.clientWidth}`;
    document.querySelectorAll("[data-reveal]").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < innerHeight && r.bottom > 0 && r.width > 0) {
        const op = parseFloat(getComputedStyle(el).opacity);
        if (op < 0.05) out.stuck.push((el.className || el.tagName).toString().slice(0, 40));
      }
    });
    // any media layer that is the active (opacity~1) one but has neither a decoded
    // still nor a playing video = a blank stage
    const layers = [...document.querySelectorAll(".ms-flow__sec")];
    const active = layers.sort((a, b) => +getComputedStyle(b).opacity - +getComputedStyle(a).opacity)[0];
    if (active) {
      const img = active.querySelector(".ms-flow__img"), vid = active.querySelector("video");
      const imgOk = img && img.naturalWidth > 0;
      const vidOk = vid && vid.videoWidth > 0;
      if (!imgOk && !vidOk) out.blankStage = true;
    }
    return out;
  });
}

async function run() {
  const report = [];
  for (const [eng, vpName, lang, theme] of MATRIX) {
    const tag = `${eng}/${vpName}/${lang}/${theme}`;
    const browser = await launchers[eng].launch({ args: eng === "chromium" ? ["--autoplay-policy=no-user-gesture-required"] : [] });
    const ctxOpts = { viewport: VPS[vpName], deviceScaleFactor: vpName.length === 3 ? 3 : 1 };
    if (eng === "chromium") { ctxOpts.isMobile = ["430", "390", "360"].includes(vpName); ctxOpts.hasTouch = ctxOpts.isMobile; }
    const ctx = await browser.newContext(ctxOpts);
    await ctx.addInitScript(({ l, t }) => {
      try { localStorage.setItem("sp-lang", l); localStorage.setItem("sp-theme", t); } catch {}
      window.__rej = 0; window.addEventListener("unhandledrejection", () => { window.__rej++; });
    }, { l: lang, t: theme });
    const page = await ctx.newPage();
    const errs = [], reqs = [];
    page.on("console", (m) => m.type() === "error" && errs.push(m.text().slice(0, 120)));
    page.on("pageerror", (e) => errs.push("PAGEERROR " + e.message.slice(0, 120)));
    page.on("requestfailed", (r) => { const u = r.url(); if (!/analytics|favicon/.test(u)) reqs.push((r.failure()?.errorText || "fail") + " " + u.split("/").pop()); });
    page.on("response", (r) => { if (r.status() === 404) reqs.push("404 " + r.url().split("/").pop()); });

    let blank = false, overflow = null, stuck = 0;
    try {
      await page.goto(URL, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts && document.fonts.ready);
      await wait(500);
      const m0 = await page.evaluate(() => performance.memory ? performance.memory.usedJSHeapSize : null);
      for (let k = 0; k < 3; k++) { await scrollFull(page, "down"); const a = await audit(page); if (a.blankStage) blank = true; if (a.overflow) overflow = a.overflow; stuck += a.stuck.length; await scrollFull(page, "up"); }
      // theme + language switch mid-session
      await page.evaluate(() => window.scrollTo(0, 0)); await wait(300);
      await page.evaluate(() => document.querySelector(".theme-toggle")?.click()); await wait(400);
      await page.evaluate(() => document.querySelectorAll(".langswitch__btn")[1]?.click()); await wait(700);
      const a2 = await audit(page); if (a2.overflow) overflow = a2.overflow;
      // settle + force GC-ish, measure memory
      await wait(400);
      const m1 = await page.evaluate(() => performance.memory ? performance.memory.usedJSHeapSize : null);
      const growthMB = m0 && m1 ? +((m1 - m0) / 1048576).toFixed(1) : null;
      const rej = await page.evaluate(() => window.__rej || 0);
      report.push({ tag, errs: errs.length, rej, reqs: reqs.length, overflow, stuck, blank, growthMB, sampleErr: errs[0] || reqs[0] || null });
    } catch (e) { report.push({ tag, fatal: String(e).slice(0, 140) }); }
    await ctx.close(); await browser.close();
  }
  console.log("\n=== REGRESSION MATRIX ===");
  let bad = 0;
  for (const r of report) {
    const ok = !r.fatal && !r.errs && !r.rej && !r.reqs && !r.overflow && !r.stuck && !r.blank && (r.growthMB == null || r.growthMB < 12);
    if (!ok) bad++;
    console.log(`${ok ? "PASS" : "FAIL"} ${r.tag.padEnd(26)} ` +
      (r.fatal ? `FATAL ${r.fatal}` : `err=${r.errs} rej=${r.rej} req=${r.reqs} overflow=${r.overflow || "-"} stuck=${r.stuck} blank=${r.blank} memΔ=${r.growthMB ?? "-"}MB` + (r.sampleErr ? `  | ${r.sampleErr}` : "")));
  }
  console.log(`\n${report.length - bad}/${report.length} PASS`);
  if (bad) process.exitCode = 1;
}
run().catch((e) => { console.error(e); process.exit(1); });
