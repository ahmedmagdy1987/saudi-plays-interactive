// QA harness for the §10 City Deep-Dive Journey (real WebKit by default).
// Verifies: cinematic upgrade, the Saudi→city→point→image hierarchy across scroll,
// reverse scroll, lazy image loads with no 404s, reduced-motion + frozen-rAF static
// fallback (iPhone safety), in Arabic and English, on desktop + mobile.
//
// Usage: node scripts/journey-qa.mjs [url] [webkit|chromium]
import { webkit, chromium, devices } from "playwright";
import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "__journey__");
mkdirSync(OUT, { recursive: true });
const URL = process.argv[2] || "http://localhost:4173/";
const ENGINE = process.argv[3] || "webkit";
const browserType = ENGINE === "chromium" ? chromium : webkit;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// scroll the document to an absolute Y, then let Lenis + the scrub settle
const scrollTo = async (page, y) => {
  await page.evaluate((yy) => window.scrollTo(0, yy), y);
  await wait(650);
};

const journeyState = () =>
  // returns the dominant visible panel/city + the journey geometry
  (() => {
    const sec = document.getElementById("journey");
    if (!sec) return { present: false };
    const mode = sec.className.includes("cj--cinematic") ? "cinematic" : "static";
    const track = sec.querySelector(".cj__track");
    const op = (el) => (el ? parseFloat(getComputedStyle(el).opacity) : 0);
    const panels = [...sec.querySelectorAll(".cj__panel")].map((p) => ({
      key: p.getAttribute("data-panel"),
      op: +op(p).toFixed(2),
      imgLoaded: !!p.querySelector(".cj__panel-img")?.getAttribute("src"),
      natW: p.querySelector(".cj__panel-img")?.naturalWidth ?? 0,
    }));
    const cities = [...sec.querySelectorAll(".cj__city")].map((c) => ({
      id: c.getAttribute("data-city"),
      op: +op(c).toFixed(2),
    }));
    const saudiOp = +op(sec.querySelector(".cj__saudi")).toFixed(2);
    const topPanel = panels.filter((p) => p.op > 0.5).sort((a, b) => b.op - a.op)[0]?.key || null;
    const topCity = cities.filter((c) => c.op > 0.5).sort((a, b) => b.op - a.op)[0]?.id || null;
    return {
      present: true, mode, saudiOp, topCity, topPanel,
      cities, panels,
      trackTop: track ? Math.round(track.getBoundingClientRect().top + window.scrollY) : 0,
      trackH: track ? track.offsetHeight : 0,
      vh: window.innerHeight,
    };
  })();

let browser;
async function run({ lang, ua, device, reduced, freezeRaf, label }) {
  const ctx = await browser.newContext({
    ...(device ? devices[device] : { viewport: { width: 1366, height: 820 } }),
    locale: lang === "en" ? "en-US" : "ar",
    reducedMotion: reduced ? "reduce" : "no-preference",
    ...(ua ? { userAgent: ua } : {}),
  });
  await ctx.addInitScript((seed) => {
    try { localStorage.setItem("sp-lang", seed.lang); } catch {}
    if (seed.freeze) { window.requestAnimationFrame = () => 0; window.cancelAnimationFrame = () => {}; }
  }, { lang, freeze: !!freezeRaf });

  const page = await ctx.newPage();
  const diag = { pageerrors: [], consoleErr: [], failed: [], media404: [] };
  page.on("pageerror", (e) => diag.pageerrors.push(`${e.name}: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && diag.consoleErr.push(m.text()));
  page.on("requestfailed", (r) => diag.failed.push(`${r.url().slice(-50)} ${r.failure()?.errorText || ""}`));
  page.on("response", (r) => { if (r.status() >= 400 && /\/media\//.test(r.url())) diag.media404.push(`${r.status()} ${r.url().slice(-40)}`); });

  await page.goto(URL, { waitUntil: "load", timeout: 30000 });
  await wait(reduced || freezeRaf ? 1200 : 2600); // allow cinematic upgrade

  const geo = await page.evaluate(journeyState);
  const result = { label, mode: geo.mode, saudiOp: geo.saudiOp, samples: [], reverse: [], diag };

  if (geo.mode === "cinematic" && geo.trackH > 0) {
    const range = geo.trackH - geo.vh;
    const fracs = [0, 0.1, 0.18, 0.26, 0.34, 0.46, 0.58, 0.7, 0.82, 0.92, 1];
    for (const fr of fracs) {
      await scrollTo(page, geo.trackTop + fr * range);
      const s = await page.evaluate(journeyState);
      result.samples.push({ fr, topCity: s.topCity, topPanel: s.topPanel, saudiOp: s.saudiOp });
      if ([0.18, 0.34, 0.7].includes(fr))
        await page.screenshot({ path: join(OUT, `${label}-f${String(fr).replace("0.", "")}.png`) });
    }
    // reverse: walk back up through a few beats and confirm state changes back
    for (const fr of [0.7, 0.46, 0.26, 0.1]) {
      await scrollTo(page, geo.trackTop + fr * range);
      const s = await page.evaluate(journeyState);
      result.reverse.push({ fr, topCity: s.topCity, topPanel: s.topPanel });
    }
    // image integrity for any panel that loaded
    const imgs = await page.evaluate(journeyState);
    result.brokenImgs = imgs.panels.filter((p) => p.imgLoaded && p.natW === 0).map((p) => p.key);
  } else {
    // static fallback: scroll the section into view, screenshot, verify cards visible
    await page.evaluate(() => document.getElementById("journey")?.scrollIntoView());
    await wait(600);
    await page.screenshot({ path: join(OUT, `${label}-static.png`), fullPage: false });
    result.staticCards = await page.evaluate(() => document.querySelectorAll("#journey .cj__static-card").length);
  }

  await ctx.close();
  return result;
}

(async () => {
  browser = await browserType.launch();
  const eng = browser.version();
  const scenarios = [
    { label: `${ENGINE}-ar-desktop`, lang: "ar" },
    { label: `${ENGINE}-en-desktop`, lang: "en" },
    { label: `${ENGINE}-ar-mobile`, lang: "ar", device: "iPhone 13" },
    { label: `${ENGINE}-ar-whatsapp`, lang: "ar", device: "iPhone 13",
      ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/WhatsApp]" },
    { label: `${ENGINE}-ar-reduced`, lang: "ar", reduced: true },
    { label: `${ENGINE}-ar-frozenRAF`, lang: "ar", device: "iPhone 13", freezeRaf: true },
  ];
  const results = [];
  for (const s of scenarios) { results.push(await run(s)); }
  await browser.close();

  console.log(`\n===== JOURNEY QA (${ENGINE} ${eng}) ${URL} =====\n`);
  for (const r of results) {
    console.log(`----- ${r.label} -----  mode=${r.mode}`);
    if (r.mode === "cinematic") {
      console.log("  scroll →  " + r.samples.map((s) => `${s.fr}:${s.topCity || "—"}/${s.topPanel || "—"}`).join("  "));
      console.log("  reverse ← " + r.reverse.map((s) => `${s.fr}:${s.topCity || "—"}/${s.topPanel || "—"}`).join("  "));
      const cities = new Set(r.samples.map((s) => s.topCity).filter(Boolean));
      const panels = new Set(r.samples.map((s) => s.topPanel).filter(Boolean));
      console.log(`  distinct cities shown: ${[...cities].join(", ") || "none"}`);
      console.log(`  distinct point images shown: ${panels.size} (${[...panels].join(", ")})`);
      if (r.brokenImgs?.length) console.log(`  ⚠ broken images: ${r.brokenImgs.join(", ")}`);
    } else {
      console.log(`  static cards rendered: ${r.staticCards}`);
    }
    const d = r.diag;
    console.log(`  pageerrors=${d.pageerrors.length} consoleErr=${d.consoleErr.length} failedReq=${d.failed.length} media404=${d.media404.length}`);
    if (d.pageerrors.length) console.log("   ! " + d.pageerrors.slice(0, 3).join(" | "));
    if (d.media404.length) console.log("   ! " + d.media404.slice(0, 4).join(" | "));
    if (d.failed.length) console.log("   ! " + d.failed.slice(0, 4).join(" | "));
    console.log("");
  }
  console.log("Screenshots in:", OUT);
})().catch((e) => { console.error("JOURNEY QA ERROR:", e); process.exit(1); });
