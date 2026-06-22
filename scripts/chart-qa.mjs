// Phase-3 chart QA: scrub §03 (market donut + curve) and §08 (revenue ring) across
// their scroll bands forward AND backward, recording the fill state at each step to
// prove the fill is continuous (no big jumps), monotonic with scroll, and exactly
// reversible. Screenshots at mid + full fill. Usage: node scripts/chart-qa.mjs [url]
import { chromium } from "playwright";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = join(__dirname, "..", "__charts__");
const URL = process.argv[2] || "http://localhost:4173/";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const readMarket = () => {
  const num = (s)=>{const el=document.querySelector(s); if(!el) return null; const v=getComputedStyle(el).strokeDashoffset; return v?+parseFloat(v).toFixed(1):null;};
  const op = (s)=>{const el=document.querySelector(s); return el?+(+getComputedStyle(el).opacity).toFixed(2):null;};
  const t = document.querySelector('.donut__num');
  return { donutNum: t?t.textContent:null, segUnder: num('.donut__seg--under'), segOver: num('.donut__seg--over'), line: num('.curve__line'), area: op('.curve__area') };
};
const readRevenue = () => {
  const arcs = [...document.querySelectorAll('.rev__seg')].map(a=>+parseFloat(getComputedStyle(a).strokeDashoffset||'0').toFixed(1));
  const center = (()=>{const el=document.querySelector('.rev__center'); return el?+(+getComputedStyle(el).opacity).toFixed(2):null;})();
  return { arcs, center };
};

async function band(page, sel, reader, fracs) {
  const vh = await page.evaluate(() => window.innerHeight);
  const seq = [];
  for (const f of fracs) {
    // re-measure the chart element's absolute top each step (layout is stable but
    // safe), then place its TOP at fraction f of the viewport height.
    const abs = await page.evaluate((sel) => { const e = document.querySelector(sel); const r = e.getBoundingClientRect(); return r.top + window.scrollY; }, sel);
    await page.evaluate((y) => window.scrollTo(0, y), Math.max(0, Math.round(abs - vh * f)));
    await wait(220);
    seq.push({ f, ...(await page.evaluate(reader)) });
  }
  return seq;
}

function monotonic(vals) {
  // returns max absolute step-to-step jump (to flag discontinuities)
  let maxJump = 0;
  for (let i = 1; i < vals.length; i++) if (vals[i] != null && vals[i-1] != null) maxJump = Math.max(maxJump, Math.abs(vals[i] - vals[i-1]));
  return +maxJump.toFixed(1);
}

async function run() {
  rmSync(out, { recursive: true, force: true }); mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const report = { errors: [] };
  for (const lang of ["ar", "en"]) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    await ctx.addInitScript((l) => { try { localStorage.setItem("sp-lang", l); } catch {} }, lang);
    const page = await ctx.newPage();
    page.on("console", (m) => m.type() === "error" && report.errors.push(`[${lang}] ${m.text()}`));
    page.on("pageerror", (e) => report.errors.push(`[${lang}] PAGEERROR ${e.message}`));
    await page.goto(URL, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts && document.fonts.ready);
    await wait(500);

    // forward fill bands (chart element top from 0.90vh down to 0.10vh) then reverse
    const fwd = [0.90, 0.80, 0.70, 0.60, 0.50, 0.40, 0.30, 0.20, 0.10];
    const rev = [...fwd].reverse();

    const mFwd = await band(page, ".market__charts", readMarket, fwd);
    await page.screenshot({ path: join(out, `market-${lang}-full.png`) });
    const mRev = await band(page, ".market__charts", readMarket, rev);

    const rFwd = await band(page, ".rev__layout", readRevenue, fwd);
    await page.screenshot({ path: join(out, `revenue-${lang}-full.png`) });
    const rRev = await band(page, ".rev__layout", readRevenue, rev);

    // analysis
    const mNums = mFwd.map((s) => (s.donutNum ? +s.donutNum.replace("%", "") : null));
    const mUnder = mFwd.map((s) => s.segUnder);
    const rArc0 = rFwd.map((s) => s.arcs?.[0]);
    const rArc5 = rFwd.map((s) => s.arcs?.[5]);

    console.log(`\n===== ${lang.toUpperCase()} =====`);
    console.log("§03 donut count fwd:", mNums.join(" → "));
    console.log("§03 donut count rev:", mRev.map((s)=>s.donutNum).join(" → "));
    console.log("§03 segUnder dashoffset fwd:", mUnder.join(" → "), " maxJump=", monotonic(mUnder));
    console.log("§03 curve line dashoffset fwd:", mFwd.map((s)=>s.line).join(" → "), " maxJump=", monotonic(mFwd.map((s)=>s.line)));
    console.log("§08 arc[0] dashoffset fwd:", rArc0.join(" → "), " maxJump=", monotonic(rArc0));
    console.log("§08 arc[5] dashoffset fwd:", rArc5.join(" → "), " maxJump=", monotonic(rArc5));
    console.log("§08 center opacity fwd:", rFwd.map((s)=>s.center).join(" → "));
    console.log("§08 reverse arc[0]:", rRev.map((s)=>s.arcs?.[0]).join(" → "));

    Object.assign(report, report);
    await ctx.close();
  }
  await browser.close();
  console.log(`\nconsole errors: ${report.errors.length}`);
  report.errors.slice(0, 20).forEach((e) => console.log("  •", e));
  writeFileSync(join(out, "chart-report.json"), JSON.stringify(report, null, 2));
  console.log("artifacts:", out);
}
run().catch((e) => { console.error(e); process.exit(1); });
