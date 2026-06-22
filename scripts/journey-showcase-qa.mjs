// §10 auto-showcase QA: confirms the cinematic stage upgrades, the Start button
// begins a controlled play-through, ANY user input cancels it and returns control,
// and the journey is never trapped. Screenshots overview/city/point in both langs.
// Usage: node scripts/journey-showcase-qa.mjs [url]
import { chromium } from "playwright";
import { dirname, join } from "node:path"; import { fileURLToPath } from "node:url"; import { mkdirSync, rmSync } from "node:fs";
const __dirname = dirname(fileURLToPath(import.meta.url));
const out = join(__dirname, "..", "__journeyqa__");
const URL = process.argv[2] || "http://localhost:4173/";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function gotoJourney(page) {
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await wait(500);
  // scroll toward §10 so the rAF-liveness probe upgrades static→cinematic
  await page.evaluate(() => document.getElementById("journey")?.scrollIntoView({ block: "start" }));
  for (let i = 0; i < 30; i++) {
    const cine = await page.evaluate(() => !!document.querySelector(".cj--cinematic"));
    if (cine) return true;
    await page.mouse.wheel(0, 60); await wait(200);
  }
  return false;
}

async function run() {
  rmSync(out, { recursive: true, force: true }); mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
  const report = { errors: [] };
  for (const lang of ["ar", "en"]) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript((l) => { try { localStorage.setItem("sp-lang", l); } catch {} }, lang);
    const page = await ctx.newPage();
    page.on("console", (m) => m.type() === "error" && report.errors.push(`[${lang}] ${m.text()}`));
    page.on("pageerror", (e) => report.errors.push(`[${lang}] PAGEERROR ${e.message}`));
    const cine = await gotoJourney(page);
    console.log(`\n===== ${lang} ===== cinematic=${cine}`);

    // park at the journey start (overview) and screenshot
    const top = await page.evaluate(() => { const t = document.querySelector(".cj__track"); return t ? t.offsetTop : 0; });
    await page.evaluate((y) => window.scrollTo(0, y + 20), top);
    await wait(900);
    await page.screenshot({ path: join(out, `${lang}-10-overview.png`) });

    // Start button present?
    const hasBtn = await page.evaluate(() => !!document.querySelector(".cj__start"));
    const btnText = await page.evaluate(() => document.querySelector(".cj__start")?.textContent?.trim() || null);
    console.log(`  start button present=${hasBtn} text="${btnText}"`);

    // click Start via JS dispatch (Playwright's click() would scroll the absolutely
    // bottom-positioned button into view — a test artifact, not the real UX).
    const y0 = await page.evaluate(() => window.scrollY);
    if (hasBtn) await page.evaluate(() => document.querySelector(".cj__start")?.click());
    const samples = [];
    for (let k = 0; k < 6; k++) { await wait(450); samples.push(await page.evaluate(() => Math.round(window.scrollY))); }
    const y1 = samples[samples.length - 1];
    const showcasing = await page.evaluate(() => !!document.querySelector(".cj__showhint"));
    const pace = Math.round((y1 - y0) / 2.7);
    console.log(`  after Start: y0=${Math.round(y0)} samples(450ms)=[${samples.join(", ")}] showcasing=${showcasing} (~${pace}px/s)`);

    // user input (wheel) must cancel the showcase and return control
    await page.mouse.wheel(0, 10);
    await wait(900);
    const y2 = await page.evaluate(() => window.scrollY);
    await wait(900);
    const y3 = await page.evaluate(() => window.scrollY);
    const stillShow = await page.evaluate(() => !!document.querySelector(".cj__showhint"));
    const btnBack = await page.evaluate(() => !!document.querySelector(".cj__start"));
    console.log(`  after wheel: showcasing=${stillShow} (want false), auto-advance stopped=${Math.abs(y3 - y2) < 6} (want true), button back=${btnBack}`);

    // manual scroll still works (not trapped)
    await page.evaluate((y) => window.scrollTo(0, y), top + 1600);
    await wait(700);
    await page.screenshot({ path: join(out, `${lang}-10-city.png`) });
    await page.evaluate((y) => window.scrollTo(0, y), top + 3200);
    await wait(700);
    await page.screenshot({ path: join(out, `${lang}-10-point.png`) });
    const moved = await page.evaluate(() => window.scrollY);
    console.log(`  manual scroll reached y=${Math.round(moved)} (not trapped)`);

    await ctx.close();
  }
  await browser.close();
  console.log(`\nconsole errors: ${report.errors.length}`); report.errors.slice(0, 12).forEach((e) => console.log("  •", e));
  console.log("artifacts:", out);
}
run().catch((e) => { console.error(e); process.exit(1); });
