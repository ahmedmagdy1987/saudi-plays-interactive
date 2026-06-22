// Cross-device PARITY test for the unified cinematic media engine.
//
// Compares the SAME build under two engines at identical viewports / scroll
// positions / languages and asserts they select the SAME media source with
// EQUIVALENT geometry, framing, and scene state:
//   • "android"  → Chromium  (Android Chrome emulation)
//   • "iphone"   → WebKit     (iOS Safari ENGINE emulation — NOT a physical iPhone)
//
// IMPORTANT: Playwright WebKit on Windows is the iOS rendering ENGINE, not a
// physical device. It validates DOM/source/geometry/scene parity and catches
// engine-level compositing/paint differences, but it is NOT a substitute for a
// real iPhone. Hardware confirmation must come from an actual device.
//
// Usage: node scripts/parity-qa.mjs [url]
import { chromium, webkit } from "playwright";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outRoot = join(__dirname, "..", "__parity__");
const URL = process.argv[2] || "http://localhost:4173/";

const UA_ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";
const UA_IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

const ENGINES = [
  { name: "android", launcher: chromium, ua: UA_ANDROID, chromium: true },
  { name: "iphone", launcher: webkit, ua: UA_IPHONE, chromium: false },
];
const VIEWPORTS = [
  { name: "390x844", width: 390, height: 844, dpr: 3 },
  { name: "430x932", width: 430, height: 932, dpr: 3 },
  { name: "360x800", width: 360, height: 800, dpr: 3 },
  { name: "tablet-834x1112", width: 834, height: 1112, dpr: 2 },
];
// run every viewport in Arabic; add an English pass at the primary iPhone viewport
const COMBOS = [
  ...VIEWPORTS.map((vp) => ({ vp, lang: "ar" })),
  { vp: VIEWPORTS[0], lang: "en" },
];

// section anchors: hero, §02, §05 (video), §09 (video), §11 finale (video)
const SECTION_TARGETS = ["intro", "vision", "zones", "impact", "finale"];

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const fileOf = (u) => (u ? String(u).split("/").pop().split("?")[0] : null);

// in-page reader: unified media engine state for the active layer + a named section
const reader = (secId) => {
  const cs = (el) => el ? getComputedStyle(el) : null;
  const rect = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; };
  const layers = [...document.querySelectorAll('.ms-flow__sec')].map((l) => ({ el: l, sec: l.getAttribute('data-sec'), op: +(+cs(l).opacity).toFixed(3) }));
  const active = layers.slice().sort((a,b)=>b.op-a.op)[0] || null;
  const readLayer = (L) => {
    if (!L) return null;
    const pin = L.el.querySelector('.ms-flow__pin');
    const img = L.el.querySelector('.ms-flow__img');
    const vid = L.el.querySelector('video');
    const box = rect(pin);
    const dpr = window.devicePixelRatio || 1;
    const imgCS = cs(img), vidCS = vid ? cs(vid) : null;
    const out = {
      sec: L.sec, layerOpacity: L.op,
      box,
      img: img ? {
        src: img.currentSrc || img.getAttribute('src') || null,
        natW: img.naturalWidth, natH: img.naturalHeight,
        objectFit: imgCS.objectFit, objectPosition: imgCS.objectPosition,
        transform: imgCS.transform, opacity: imgCS.opacity,
      } : null,
      video: vid ? {
        src: vid.currentSrc || (vid.querySelector('source') && vid.querySelector('source').getAttribute('src')) || null,
        videoW: vid.videoWidth, videoH: vid.videoHeight,
        readyState: vid.readyState, paused: vid.paused, currentTime: +vid.currentTime.toFixed(2),
        errorCode: vid.error ? vid.error.code : null,
        objectFit: vidCS.objectFit, objectPosition: vidCS.objectPosition,
        transform: vidCS.transform, opacity: vidCS.opacity,
        isPlaying: L.el.classList.contains('is-playing'),
      } : null,
    };
    if (box && out.video && out.video.videoW) {
      const pw = box.w*dpr, ph = box.h*dpr;
      out.video.coverScale = +Math.max(pw/out.video.videoW, ph/out.video.videoH).toFixed(3);
    }
    if (box && out.img && out.img.natW) {
      const pw = box.w*dpr, ph = box.h*dpr;
      out.img.coverScale = +Math.max(pw/out.img.natW, ph/out.img.natH).toFixed(3);
    }
    return out;
  };
  const target = layers.find((l) => l.sec === secId) || null;
  // §10 journey scene read (overview/city/point dominance)
  const saudi = document.querySelector('.cj__saudi');
  const panels = [...document.querySelectorAll('.cj__panel')].map(p => +(+cs(p).opacity).toFixed(2));
  const cities = [...document.querySelectorAll('.cj__city')].map(c => +(+cs(c).opacity).toFixed(2));
  const cjMode = (document.getElementById('journey')||{}).className || '';
  const cj = {
    cinematic: /cj--cinematic/.test(cjMode),
    saudiOpacity: saudi ? +(+cs(saudi).opacity).toFixed(2) : null,
    maxPanel: panels.length ? Math.max(...panels) : 0,
    maxCity: cities.length ? Math.max(...cities) : 0,
  };
  cj.scene = cj.maxPanel > 0.5 ? 'point' : cj.maxCity > 0.5 ? 'city' : 'overview';
  return {
    activeSection: active ? active.sec : null,
    activeOpacity: active ? active.op : null,
    target: readLayer(target),
    cj,
    scrollY: Math.round(window.scrollY),
    docH: document.documentElement.scrollHeight,
    vh: window.innerHeight,
  };
};

const report = { meta: { url: URL, note: "iphone=WebKit engine emulation, NOT a physical iPhone" }, captures: [], parity: [], errors: [], requestFailures: [], memory: [] };

async function scrollToSection(page, id, block = "center") {
  await page.evaluate(({ id, block }) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ block, behavior: "auto" });
  }, { id, block });
}

async function captureCombo(engine, combo, browser) {
  const { vp, lang } = combo;
  const ctxOpts = {
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.dpr,
    hasTouch: true,
    userAgent: engine.ua,
  };
  if (engine.chromium) ctxOpts.isMobile = true; // isMobile is chromium-only
  const ctx = await browser.newContext(ctxOpts);
  await ctx.addInitScript((lng) => { try { localStorage.setItem("sp-lang", lng); } catch {} }, lang);
  const page = await ctx.newPage();
  const tag = `${engine.name}/${vp.name}/${lang}`;
  page.on("console", (m) => { if (m.type() === "error") report.errors.push(`[${tag}] ${m.text()}`); });
  page.on("pageerror", (e) => report.errors.push(`[${tag}] PAGEERROR ${e.message}`));
  page.on("requestfailed", (r) => report.requestFailures.push(`[${tag}] ${r.failure()?.errorText} ${r.url()}`));
  page.on("response", (r) => { if (r.status() === 404) report.requestFailures.push(`[${tag}] 404 ${r.url()}`); });

  await page.goto(URL, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await wait(700);

  const dir = join(outRoot, `${vp.name}_${lang}`);
  mkdirSync(dir, { recursive: true });

  // ---- section anchors (hero, §02, §05 video, §09 video, §11 video) ----
  for (const id of SECTION_TARGETS) {
    await scrollToSection(page, id, id === "intro" ? "start" : "center");
    await wait(id === "intro" ? 500 : 1700); // give video sections time to want+load+play
    const data = await page.evaluate(reader, id);
    report.captures.push({ engine: engine.name, vp: vp.name, lang, target: id, data });
    await page.screenshot({ path: join(dir, `${engine.name}-${id}.png`) });
  }

  // ---- §10 City Journey sub-scenes: sweep the journey track ----
  await scrollToSection(page, "journey", "start");
  await wait(600);
  const jTop = await page.evaluate(() => { const e = document.getElementById("journey"); return e ? e.offsetTop : 0; });
  const jH = await page.evaluate(() => { const e = document.getElementById("journey"); return e ? e.offsetHeight : 0; });
  const subs = [
    { name: "10-overview", f: 0.03 },
    { name: "10-city", f: 0.11 },
    { name: "10-point", f: 0.35 },
  ];
  for (const s of subs) {
    await page.evaluate((y) => window.scrollTo(0, y), Math.round(jTop + jH * s.f));
    await wait(900);
    const data = await page.evaluate(reader, "finale");
    report.captures.push({ engine: engine.name, vp: vp.name, lang, target: s.name, data: { scene: data.cj.scene, cj: data.cj, scrollY: data.scrollY } });
    await page.screenshot({ path: join(dir, `${engine.name}-${s.name}.png`) });
  }

  // ---- memory: 3 full down/up scrolls (chromium exposes performance.memory) ----
  if (engine.chromium && vp.name === "390x844" && lang === "ar") {
    const m0 = await page.evaluate(() => performance.memory ? performance.memory.usedJSHeapSize : null);
    for (let k = 0; k < 3; k++) {
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await wait(700);
      await page.evaluate(() => window.scrollTo(0, 0));
      await wait(700);
    }
    const m1 = await page.evaluate(() => performance.memory ? performance.memory.usedJSHeapSize : null);
    report.memory.push({ engine: engine.name, vp: vp.name, before: m0, after: m1, growthMB: m0 && m1 ? +((m1 - m0) / 1048576).toFixed(2) : null });
  }

  await ctx.close();
}

function comparePair(a, b, vpName, lang, target) {
  // a, b are capture .data objects for the same target under the two engines
  const issues = [];
  const ta = a.target, tb = b.target;
  if (target.startsWith("10-")) {
    if (a.scene !== b.scene) issues.push(`§10 scene differs: ${a.scene} vs ${b.scene}`);
    return { vp: vpName, lang, target, scene: a.scene, ok: issues.length === 0, issues };
  }
  // Framing parity = SAME source file + SAME aspect ratio + SAME object-fit + SAME
  // box height. Box WIDTH is compared with a scrollbar tolerance (Playwright WebKit
  // on Windows renders a classic 10px scrollbar; real iOS Safari uses overlay
  // scrollbars). Raw videoWidth/Height pixel counts are NOT compared directly:
  // WebKit and Chromium report intrinsic <video> dimensions by different conventions
  // (display vs coded), so object-fit:cover framing depends only on the ASPECT RATIO.
  const ar = (w, h) => (w && h ? +(w / h).toFixed(3) : null);
  const SCROLLBAR_TOL = 12;
  if (a.activeSection !== b.activeSection) issues.push(`active section differs: ${a.activeSection} vs ${b.activeSection}`);
  if (ta && tb) {
    if (fileOf(ta.img?.src) !== fileOf(tb.img?.src)) issues.push(`still src differs: ${fileOf(ta.img?.src)} vs ${fileOf(tb.img?.src)}`);
    if (fileOf(ta.video?.src) !== fileOf(tb.video?.src)) issues.push(`video src differs: ${fileOf(ta.video?.src)} vs ${fileOf(tb.video?.src)}`);
    if (ta.video && tb.video) {
      const arA = ar(ta.video.videoW, ta.video.videoH), arB = ar(tb.video.videoW, tb.video.videoH);
      if (arA && arB && Math.abs(arA - arB) > 0.02) issues.push(`video aspect-ratio differs: ${arA} vs ${arB}`);
      if (ta.video.objectFit !== tb.video.objectFit) issues.push(`video object-fit differs: ${ta.video.objectFit} vs ${tb.video.objectFit}`);
    }
    if (ta.img && tb.img) {
      const arA = ar(ta.img.natW, ta.img.natH), arB = ar(tb.img.natW, tb.img.natH);
      if (arA && arB && Math.abs(arA - arB) > 0.02) issues.push(`img aspect-ratio differs: ${arA} vs ${arB}`);
      if (ta.img.objectFit !== tb.img.objectFit) issues.push(`img object-fit differs: ${ta.img.objectFit} vs ${tb.img.objectFit}`);
    }
    if (ta.box && tb.box) {
      if (ta.box.h !== tb.box.h) issues.push(`box height differs: ${ta.box.h} vs ${tb.box.h}`);
      if (Math.abs(ta.box.w - tb.box.w) > SCROLLBAR_TOL) issues.push(`box width differs beyond scrollbar tol: ${ta.box.w} vs ${tb.box.w}`);
    }
  } else if (ta || tb) {
    issues.push(`one engine missing target layer (${!!ta} vs ${!!tb})`);
  }
  return {
    vp: vpName, lang, target,
    source: fileOf(ta?.video?.src) || fileOf(ta?.img?.src),
    videoWxH: ta?.video ? `${ta.video.videoW}x${ta.video.videoH}` : null,
    box: ta?.box ? `${ta.box.w}x${ta.box.h}` : null,
    ok: issues.length === 0, issues,
  };
}

async function run() {
  rmSync(outRoot, { recursive: true, force: true });
  mkdirSync(outRoot, { recursive: true });

  for (const engine of ENGINES) {
    const browser = await engine.launcher.launch({
      args: engine.chromium ? ["--autoplay-policy=no-user-gesture-required"] : [],
    });
    for (const combo of COMBOS) {
      try { await captureCombo(engine, combo, browser); }
      catch (e) { report.errors.push(`[${engine.name}/${combo.vp.name}/${combo.lang}] CAPTURE FAILED ${String(e).slice(0, 200)}`); }
    }
    await browser.close();
  }

  // ---- pair up android vs iphone for each (vp, lang, target) ----
  const key = (c) => `${c.vp}|${c.lang}|${c.target}`;
  const byKey = {};
  for (const c of report.captures) { (byKey[key(c)] ||= {})[c.engine] = c.data; }
  for (const k of Object.keys(byKey)) {
    const [vp, lang, target] = k.split("|");
    const pair = byKey[k];
    if (pair.android && pair.iphone) report.parity.push(comparePair(pair.android, pair.iphone, vp, lang, target));
  }

  writeFileSync(join(outRoot, "parity-report.json"), JSON.stringify(report, null, 2));

  // ---- console summary ----
  const fails = report.parity.filter((p) => !p.ok);
  console.log("\n=== PARITY SUMMARY (android=Chromium vs iphone=WebKit engine) ===");
  console.log(`pairs compared: ${report.parity.length}  PASS: ${report.parity.length - fails.length}  FAIL: ${fails.length}`);
  for (const p of report.parity) {
    console.log(`  ${p.ok ? "PASS" : "FAIL"} [${p.vp}/${p.lang}] ${p.target}` +
      (p.source ? ` src=${p.source}` : "") + (p.videoWxH ? ` vid=${p.videoWxH}` : "") + (p.box ? ` box=${p.box}` : "") + (p.scene ? ` scene=${p.scene}` : "") +
      (p.ok ? "" : `  → ${p.issues.join("; ")}`));
  }
  console.log(`\nconsole/page errors: ${report.errors.length}`);
  report.errors.slice(0, 30).forEach((e) => console.log("  •", e));
  console.log(`request failures / 404s: ${report.requestFailures.length}`);
  report.requestFailures.slice(0, 30).forEach((e) => console.log("  •", e));
  console.log("memory:", JSON.stringify(report.memory));
  console.log("artifacts:", outRoot);
  if (fails.length || report.errors.length || report.requestFailures.length) process.exitCode = 1;
}
run().catch((e) => { console.error(e); process.exit(1); });
