// QA harness: captures desktop + mobile screenshots of every section, checks
// for horizontal overflow, and collects console / page errors.
// Usage: node scripts/screenshots.mjs [url]
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outRoot = join(__dirname, "..", "__screenshots__");
const URL = process.argv[2] || "http://localhost:4173/";

const SECTIONS = ["intro", "vision", "market", "riyadh", "zones", "malahi", "governance", "revenue", "impact", "finale"];
const PROFILES = [
  { name: "desktop", width: 1440, height: 900, dpr: 1 },
  { name: "mobile", width: 390, height: 844, dpr: 2, isMobile: true },
];

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function run() {
  const browser = await chromium.launch();
  const report = { errors: [], overflow: [] };

  for (const p of PROFILES) {
    const dir = join(outRoot, p.name);
    mkdirSync(dir, { recursive: true });

    // ---- Pass A: reduced motion (clean final-state layout) ----
    const ctx = await browser.newContext({
      viewport: { width: p.width, height: p.height },
      deviceScaleFactor: p.dpr,
      isMobile: !!p.isMobile,
      hasTouch: !!p.isMobile,
      reducedMotion: "reduce",
    });
    const page = await ctx.newPage();
    page.on("console", (m) => m.type() === "error" && report.errors.push(`[${p.name}/reduced] ${m.text()}`));
    page.on("pageerror", (e) => report.errors.push(`[${p.name}/reduced] PAGEERROR ${e.message}`));

    await page.goto(URL, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts && document.fonts.ready);
    await wait(600);

    const ow = await page.evaluate(() => ({
      sw: document.documentElement.scrollWidth,
      cw: document.documentElement.clientWidth,
    }));
    if (ow.sw > ow.cw + 2) report.overflow.push(`[${p.name}] horizontal overflow: scrollWidth ${ow.sw} > clientWidth ${ow.cw}`);

    for (const id of SECTIONS) {
      const loc = page.locator(`#${id}`);
      if (!(await loc.count())) {
        report.errors.push(`[${p.name}] missing section #${id}`);
        continue;
      }
      await loc.scrollIntoViewIfNeeded();
      await wait(450);
      try {
        await loc.screenshot({ path: join(dir, `${String(SECTIONS.indexOf(id) + 1).padStart(2, "0")}-${id}.png`) });
      } catch (e) {
        // very tall element — fall back to viewport
        await page.screenshot({ path: join(dir, `${id}-viewport.png`) });
      }
    }
    await ctx.close();

    // ---- Pass B: full motion (drive animations, scan console) ----
    const ctx2 = await browser.newContext({
      viewport: { width: p.width, height: p.height },
      deviceScaleFactor: p.dpr,
      isMobile: !!p.isMobile,
      hasTouch: !!p.isMobile,
    });
    const page2 = await ctx2.newPage();
    page2.on("console", (m) => m.type() === "error" && report.errors.push(`[${p.name}/motion] ${m.text()}`));
    page2.on("pageerror", (e) => report.errors.push(`[${p.name}/motion] PAGEERROR ${e.message}`));
    await page2.goto(URL, { waitUntil: "networkidle" });
    await wait(500);
    // hero (animated state)
    await page2.screenshot({ path: join(dir, `00-hero-motion.png`) });
    // slow scroll to fire ScrollTriggers
    const steps = 16;
    for (let i = 1; i <= steps; i++) {
      await page2.evaluate((f) => window.scrollTo(0, document.documentElement.scrollHeight * f), i / steps);
      await wait(280);
    }
    await ctx2.close();
  }

  await browser.close();

  console.log("\n=== QA REPORT ===");
  console.log("Console/page errors:", report.errors.length);
  report.errors.slice(0, 50).forEach((e) => console.log("  •", e));
  console.log("Overflow issues:", report.overflow.length);
  report.overflow.forEach((e) => console.log("  •", e));
  console.log("Screenshots in:", outRoot);
  if (report.errors.length) process.exitCode = 1;
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
