// QA harness for the Saudi Plays revision.
// - "sections" pass (reduced motion): full-page + per-section shots at every
//   viewport; checks overflow, heading clipping, and stuck opacity:0 reveals.
// - "motion" pass (full motion): viewport shots at many scroll positions so
//   pinned-section stages and empty scroll ranges are visible.
// Usage: node scripts/screenshots.mjs [url] [mode=all|sections|motion]
import { chromium } from "playwright";
import { mkdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outRoot = join(__dirname, "..", "__screenshots__");
const URL = process.argv[2] || "http://localhost:4173/";
const MODE = process.argv[3] || "all";

const SECTIONS = ["intro", "vision", "market", "riyadh", "zones", "malahi", "governance", "revenue", "impact", "finale"];
const VIEWPORTS = [
  { name: "1920", width: 1920, height: 1080, dpr: 1 },
  { name: "1440", width: 1440, height: 900, dpr: 1 },
  { name: "1366", width: 1366, height: 768, dpr: 1 },
  { name: "390", width: 390, height: 844, dpr: 2, isMobile: true },
];
const MOTION_VPS = ["1440", "1366", "390"];

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const report = { errors: [], overflow: [], clipped: [], stuck: [] };

async function audit(page, vp) {
  const data = await page.evaluate(() => {
    const out = { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, clipped: [], stuck: [] };
    // heading horizontal overflow / clipping
    document.querySelectorAll("h1,h2,h3").forEach((h) => {
      if (h.scrollWidth > h.clientWidth + 2) out.clipped.push((h.textContent || "").trim().slice(0, 40) + ` [${h.scrollWidth}>${h.clientWidth}]`);
    });
    // [data-reveal] visible in viewport but stuck at opacity 0
    document.querySelectorAll("[data-reveal]").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) {
        const op = parseFloat(getComputedStyle(el).opacity);
        if (op < 0.05) out.stuck.push((el.className || el.tagName) + "");
      }
    });
    return out;
  });
  if (data.sw > data.cw + 2) report.overflow.push(`[${vp}] scrollWidth ${data.sw} > clientWidth ${data.cw}`);
  data.clipped.forEach((c) => report.clipped.push(`[${vp}] heading clipped: ${c}`));
  data.stuck.forEach((s) => report.stuck.push(`[${vp}] stuck opacity0: ${s}`));
}

async function run() {
  rmSync(outRoot, { recursive: true, force: true });
  const browser = await chromium.launch();

  // ---- SECTIONS PASS (reduced motion) ----
  if (MODE === "all" || MODE === "sections") {
    for (const vp of VIEWPORTS) {
      const dir = join(outRoot, vp.name);
      mkdirSync(dir, { recursive: true });
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: vp.dpr,
        isMobile: !!vp.isMobile,
        hasTouch: !!vp.isMobile,
        reducedMotion: "reduce",
      });
      const page = await ctx.newPage();
      page.on("console", (m) => m.type() === "error" && report.errors.push(`[${vp.name}/red] ${m.text()}`));
      page.on("pageerror", (e) => report.errors.push(`[${vp.name}/red] PAGEERROR ${e.message}`));
      await page.goto(URL, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts && document.fonts.ready);
      await wait(500);
      await audit(page, vp.name);
      await page.screenshot({ path: join(dir, "_full.png"), fullPage: true });
      for (const id of SECTIONS) {
        const loc = page.locator(`#${id}`);
        if (!(await loc.count())) { report.errors.push(`[${vp.name}] missing #${id}`); continue; }
        await loc.scrollIntoViewIfNeeded();
        await wait(300);
        try { await loc.screenshot({ path: join(dir, `${String(SECTIONS.indexOf(id) + 1).padStart(2, "0")}-${id}.png`) }); }
        catch { await page.screenshot({ path: join(dir, `${id}-vp.png`) }); }
      }
      await ctx.close();
    }
  }

  // ---- MOTION PASS (full motion, multiple scroll positions) ----
  if (MODE === "all" || MODE === "motion") {
    const fracs = [0, 0.02, 0.04, 0.06, 0.09, 0.13, 0.2, 0.3, 0.42, 0.55, 0.68, 0.8, 0.9, 0.96, 1];
    for (const vpName of MOTION_VPS) {
      const vp = VIEWPORTS.find((v) => v.name === vpName);
      const dir = join(outRoot, `motion-${vp.name}`);
      mkdirSync(dir, { recursive: true });
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: vp.dpr, isMobile: !!vp.isMobile, hasTouch: !!vp.isMobile,
      });
      const page = await ctx.newPage();
      page.on("console", (m) => m.type() === "error" && report.errors.push(`[${vp.name}/mot] ${m.text()}`));
      page.on("pageerror", (e) => report.errors.push(`[${vp.name}/mot] PAGEERROR ${e.message}`));
      await page.goto(URL, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts && document.fonts.ready);
      await wait(700);
      // fine-grained hero stages (within the pin) for the first viewport-heights
      const heroOffsets = [0, 0.45, 0.9, 1.4, 1.9].map((m) => Math.round(m * vp.height));
      for (let i = 0; i < heroOffsets.length; i++) {
        await page.evaluate((y) => window.scrollTo(0, y), heroOffsets[i]);
        await wait(450);
        await page.screenshot({ path: join(dir, `hero-${i}.png`) });
      }
      // whole-page sweep
      for (let i = 0; i < fracs.length; i++) {
        await page.evaluate((f) => window.scrollTo(0, (document.documentElement.scrollHeight - window.innerHeight) * f), fracs[i]);
        await wait(420);
        await page.screenshot({ path: join(dir, `sweep-${String(i).padStart(2, "0")}.png`) });
      }
      await ctx.close();
    }
  }

  await browser.close();
  const line = (t, a) => { console.log(`${t}: ${a.length}`); a.slice(0, 40).forEach((x) => console.log("  •", x)); };
  console.log("\n=== QA REPORT ===");
  line("Console/page errors", report.errors);
  line("Overflow", report.overflow);
  line("Clipped headings", report.clipped);
  line("Stuck opacity:0 (in-view)", report.stuck);
  console.log("Screenshots in:", outRoot);
  if (report.errors.length) process.exitCode = 1;
}
run().catch((e) => { console.error(e); process.exit(1); });
