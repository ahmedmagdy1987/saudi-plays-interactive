// REAL WebKit reproduction harness for the iPhone blank-page bug.
// Uses Playwright's bundled WebKit (the Safari engine family) — NOT Chromium
// emulation — at iPhone viewports. Captures pageerror, console errors/warnings,
// unhandled promise rejections, failed network requests, WebKit crashes, and the
// computed styles of the hero/content in the blank state. Also runs a binary
// isolation test (media stage / videos / GSAP-hidden / reveal-armed) to pinpoint
// the exact subsystem that hides the foreground.
//
// Usage: node scripts/ios-repro.mjs [url]
import { webkit, devices } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "__ios__");
mkdirSync(OUT, { recursive: true });
const URL = process.argv[2] || "http://localhost:4173/";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Probe run INSIDE the page: computed styles + stuck-reveal census.
const PROBE = () => {
  const cs = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return { sel, present: false };
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      sel, present: true,
      opacity: s.opacity, visibility: s.visibility, display: s.display,
      transform: s.transform === "none" ? "none" : s.transform.slice(0, 30),
      zIndex: s.zIndex, position: s.position,
      rect: { t: Math.round(r.top), h: Math.round(r.height), w: Math.round(r.width) },
    };
  };
  let inview = 0, stuck = 0; const stuckList = [];
  document.querySelectorAll("[data-reveal]").forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.top < innerHeight && r.bottom > 0 && r.height > 0) {
      inview++;
      if (parseFloat(getComputedStyle(el).opacity) < 0.05) {
        stuck++; stuckList.push((el.className || el.tagName).toString().slice(0, 46));
      }
    }
  });
  // Is the visible pixel at the hero centre actually foreground, or the stage?
  const mid = document.elementFromPoint(innerWidth / 2, innerHeight * 0.5);
  return {
    htmlClass: document.documentElement.className || "(none)",
    lang: document.documentElement.lang || "(unset)",
    dir: document.documentElement.dir || "(unset)",
    scrollH: document.documentElement.scrollHeight,
    innerH: innerHeight,
    revealArmed: document.documentElement.classList.contains("reveal-armed"),
    reduced: document.documentElement.classList.contains("reduced"),
    reveal: { inview, stuck, stuckList: stuckList.slice(0, 14) },
    topElementAtHeroCentre: mid ? (mid.className || mid.tagName).toString().slice(0, 50) : "(none)",
    els: {
      heroEyebrow: cs(".intro__eyebrow"),
      heroTitleWrap: cs(".intro__titlewrap"),
      heroTitle: cs(".intro__title"),
      heroCase: cs(".intro__case"),
      visionHeader: cs("#vision .sec-header"),
      finaleContent: cs(".finale__content"),
      msStage: cs(".ms"),
    },
  };
};

function wire(page) {
  const c = { pageerrors: [], consoleErr: [], consoleWarn: [], rejections: [], failed: [], badResp: [], crashed: false };
  page.on("pageerror", (e) => c.pageerrors.push(`${e.name || "Error"}: ${e.message} :: ${(e.stack || "").split("\n")[1]?.trim() || ""}`));
  page.on("console", (m) => {
    const t = m.type(), txt = m.text();
    if (t === "error") c.consoleErr.push(txt);
    else if (t === "warning") c.consoleWarn.push(txt);
  });
  page.on("requestfailed", (r) => c.failed.push(`${r.method()} ${r.url().slice(-60)} — ${r.failure()?.errorText || "?"}`));
  page.on("response", (r) => { if (r.status() >= 400) c.badResp.push(`${r.status()} ${r.url().slice(-60)}`); });
  page.on("crash", () => { c.crashed = true; });
  // surface unhandled promise rejections explicitly (WebKit routes these to pageerror,
  // but we also hook the window event in case the app swallows console)
  return c;
}

async function scenario(browser, { name, lang, ua, isolate }) {
  const device = devices["iPhone 13"];
  const ctx = await browser.newContext({
    ...device,
    userAgent: ua || device.userAgent,
    locale: lang === "en" ? "en-US" : "ar",
  });
  // Seed language + (optionally) install isolation hooks BEFORE any app code runs.
  await ctx.addInitScript((args) => {
    try { localStorage.setItem("sp-lang", args.lang); } catch {}
    window.addEventListener("unhandledrejection", (e) => {
      (window.__rej = window.__rej || []).push(String(e.reason && (e.reason.stack || e.reason.message || e.reason)));
    });
  }, { lang });

  const page = await ctx.newPage();
  const c = wire(page);

  let navErr = null;
  try {
    await page.goto(URL, { waitUntil: "load", timeout: 30000 });
  } catch (e) { navErr = String(e).split("\n")[0]; }
  // let GSAP/Lenis/IO settle + mobile hero autoplay reach its title beat (~4s)
  await wait(5000);

  const probe = await page.evaluate(PROBE).catch((e) => ({ probeError: String(e) }));
  const rejections = await page.evaluate(() => window.__rej || []).catch(() => []);
  await page.screenshot({ path: join(OUT, `${name}.png`) }).catch(() => {});

  // ---- Binary isolation: inject CSS overrides post-load and re-measure ----
  let isolationResults = null;
  if (isolate) {
    const tests = {
      // A: neutralize the reveal-armed CSS gate
      revealArmedOff: `html.reveal-armed [data-reveal]:not(.is-in){opacity:1 !important;transform:none !important;}`,
      // B: force GSAP-hidden inline-opacity content visible
      gsapHiddenOff: `.intro__titlewrap,.intro__supporting,.intro__eyebrow,.intro__overlay,.finale__content,.finale__content>*{opacity:1 !important;transform:none !important;visibility:visible !important;}`,
      // C: remove the fixed media stage entirely (stacking/coverage test)
      mediaStageOff: `.ms{display:none !important;}`,
      // D: A+B+C combined
      allOff: `html.reveal-armed [data-reveal]:not(.is-in){opacity:1 !important;transform:none !important;} .intro__titlewrap,.intro__supporting,.intro__eyebrow,.intro__overlay,.finale__content,.finale__content>*{opacity:1 !important;transform:none !important;} .ms{display:none !important;}`,
    };
    isolationResults = {};
    for (const [key, css] of Object.entries(tests)) {
      const handle = await page.addStyleTag({ content: css });
      await wait(400);
      const heroTitleOpacity = await page.evaluate(() => {
        const el = document.querySelector(".intro__title");
        return el ? getComputedStyle(el).opacity : "n/a";
      });
      const stillBlank = await page.evaluate(() => {
        // count foreground text nodes actually visible in viewport
        let visible = 0;
        document.querySelectorAll("h1,h2,h3,p,.stat__num").forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.top < innerHeight && r.bottom > 0 && r.width > 0) {
            if (parseFloat(getComputedStyle(el).opacity) > 0.05) visible++;
          }
        });
        return visible;
      });
      isolationResults[key] = { heroTitleOpacity, visibleTextEls: stillBlank };
      await page.evaluate((h) => h && h.remove(), handle).catch(() => {});
      // remove the injected tag by id-less handle: re-evaluate removal
      await page.evaluate((selCss) => {
        document.querySelectorAll("style").forEach((s) => { if (s.textContent === selCss) s.remove(); });
      }, css).catch(() => {});
    }
  }

  await ctx.close();
  return { name, lang, navErr, probe, rejections, diagnostics: c, isolationResults };
}

(async () => {
  const browser = await webkit.launch();
  const wkVersion = browser.version();
  const scenarios = [
    { name: "01-arabic-normal", lang: "ar", isolate: true },
    { name: "02-english-normal", lang: "en" },
    { name: "03-arabic-whatsapp", lang: "ar",
      ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/WhatsApp]" },
  ];
  const results = [];
  for (const s of scenarios) results.push(await scenario(browser, s));
  await browser.close();

  const report = { url: URL, webkitVersion: wkVersion, when: "build-preview", results };
  writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));

  // ---- console summary ----
  console.log(`\n===== REAL WEBKIT iPhone REPRO =====`);
  console.log(`WebKit engine: ${wkVersion}   URL: ${URL}\n`);
  for (const r of results) {
    const d = r.diagnostics;
    console.log(`----- ${r.name} (lang=${r.lang}) -----`);
    if (r.navErr) console.log(`  NAV ERROR: ${r.navErr}`);
    console.log(`  html: class="${r.probe.htmlClass}" lang=${r.probe.lang} dir=${r.probe.dir} revealArmed=${r.probe.revealArmed}`);
    console.log(`  scrollH=${r.probe.scrollH} innerH=${r.probe.innerH}  topElAtHeroCentre=${r.probe.topElementAtHeroCentre}`);
    console.log(`  reveal: ${r.probe.reveal.stuck}/${r.probe.reveal.inview} in-view [data-reveal] STUCK at opacity~0`);
    if (r.probe.reveal.stuckList?.length) console.log(`     stuck: ${r.probe.reveal.stuckList.join(" | ")}`);
    const e = r.probe.els || {};
    for (const [k, v] of Object.entries(e)) {
      if (!v?.present) { console.log(`  ${k}: (absent)`); continue; }
      console.log(`  ${k}: opacity=${v.opacity} vis=${v.visibility} disp=${v.display} z=${v.zIndex} pos=${v.position} rect(t=${v.rect.t},h=${v.rect.h})`);
    }
    console.log(`  pageerrors(${d.pageerrors.length}): ${d.pageerrors.slice(0, 4).join("  ||  ") || "none"}`);
    console.log(`  console.error(${d.consoleErr.length}): ${d.consoleErr.slice(0, 4).join("  ||  ") || "none"}`);
    console.log(`  console.warn(${d.consoleWarn.length}): ${d.consoleWarn.slice(0, 3).join("  ||  ") || "none"}`);
    console.log(`  unhandledRejections(${r.rejections.length}): ${r.rejections.slice(0, 3).join("  ||  ") || "none"}`);
    console.log(`  failedRequests(${d.failed.length}): ${d.failed.slice(0, 4).join("  ||  ") || "none"}`);
    console.log(`  badResponses(${d.badResp.length}): ${d.badResp.slice(0, 4).join("  ||  ") || "none"}`);
    console.log(`  webkitCrashed: ${d.crashed}`);
    if (r.isolationResults) {
      console.log(`  ISOLATION (visibleTextEls in viewport / hero title opacity):`);
      for (const [k, v] of Object.entries(r.isolationResults))
        console.log(`     ${k.padEnd(16)} -> visibleText=${v.visibleTextEls}  heroTitleOpacity=${v.heroTitleOpacity}`);
    }
    console.log("");
  }
  console.log(`Full JSON + screenshots in: ${OUT}`);
})().catch((e) => { console.error("REPRO FAILED:", e); process.exit(1); });
